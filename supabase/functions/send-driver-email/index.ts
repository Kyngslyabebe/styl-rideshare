// supabase/functions/send-driver-email/index.ts
// Sends emails to drivers: document submission confirmation, approval, rejection.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { driver_id, type } = await req.json();

    if (!driver_id || !type) {
      return new Response(JSON.stringify({ error: 'driver_id and type are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Get driver profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', driver_id)
      .single();

    if (!profile?.email) {
      return new Response(JSON.stringify({ error: 'Driver email not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const firstName = profile.full_name?.split(' ')[0] || 'Driver';
    let subject = '';
    let html = '';

    if (type === 'documents_submitted') {
      subject = 'Documents Received — Styl';
      html = buildEmail(firstName, 'Documents Received', [
        `Hi ${firstName},`,
        'Thank you for submitting your documents. We\'ve received everything and our support team is now reviewing your application.',
        '<strong>What happens next?</strong>',
        '• Our team will review your documents within <strong>24 hours</strong>.',
        '• You\'ll receive an email once your account is approved.',
        '• Once approved, you can go online and start accepting rides.',
        'If we need any additional information, we\'ll reach out to you directly.',
        'Thanks for choosing to drive with Styl!',
      ]);
    } else if (type === 'approved') {
      subject = "You're Approved! Welcome to Styl 🎉";
      html = buildEmail(firstName, "You're Approved!", [
        `Congratulations ${firstName}!`,
        'Your documents have been reviewed and your driver account has been <strong>approved</strong>.',
        '<strong>You can now:</strong>',
        '• Go online and start accepting ride requests.',
        '• View your approved ride types in the app.',
        '• Set up your Stripe account to receive payouts.',
        'Open the Styl Driver app and tap "Drive Now" to start earning!',
        'Welcome to the team. Drive safe!',
      ]);
    } else if (type === 'rejected') {
      subject = 'Document Review Update — Styl';
      html = buildEmail(firstName, 'Document Review Update', [
        `Hi ${firstName},`,
        'After reviewing your submitted documents, we were unable to approve your driver account at this time.',
        '<strong>Common reasons include:</strong>',
        '• Blurry or unreadable document photos.',
        '• Expired license or insurance.',
        '• Missing or incomplete documents.',
        'Please re-upload your documents in the Styl Driver app and submit again. Our team will review your updated submission within 24 hours.',
        'If you have questions, contact our support team through the app.',
      ]);
    } else {
      return new Response(JSON.stringify({ error: 'Unknown email type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send email via Resend (or fallback SMTP)
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'Styl <noreply@styl.app>';

    if (resendKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [profile.email],
          subject,
          html,
        }),
      });

      const result = await res.json();
      if (result.error) {
        console.error('Resend error:', result.error);
        return new Response(JSON.stringify({ error: 'Failed to send email' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Log if no email provider configured (dev mode)
      console.log(`[DEV] Would send "${subject}" to ${profile.email}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('send-driver-email error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildEmail(name: string, heading: string, lines: string[]): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;">
    <tr>
      <td style="background:linear-gradient(135deg,#FF6B00,#FF8C00);padding:28px 24px;text-align:center;">
        <h1 style="color:#fff;font-size:28px;font-weight:900;letter-spacing:-0.5px;margin:0;">styl</h1>
        <p style="color:rgba(255,255,255,0.85);font-size:11px;margin:6px 0 0;font-weight:500;">Driver</p>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 24px;">
        <h2 style="color:#1a1a1a;font-size:18px;font-weight:700;margin:0 0 16px;">${heading}</h2>
        ${lines.map((l) => `<p style="color:#333;font-size:13px;line-height:20px;margin:0 0 12px;">${l}</p>`).join('')}
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#FF6B00;border-radius:8px;text-align:center;padding:12px;">
              <a href="styl-driver://home" style="color:#fff;font-size:13px;font-weight:700;text-decoration:none;">Open Styl Driver</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background:#fafafa;padding:16px 24px;text-align:center;border-top:1px solid #eee;">
        <p style="color:#999;font-size:10px;margin:0;">Styl Technologies Inc. · You're receiving this because you signed up as a Styl driver.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
