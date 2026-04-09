// supabase/functions/send-rider-receipt/index.ts
// Sends a styled ride receipt email to the rider after payment is processed.

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
    const { ride_id } = await req.json();

    if (!ride_id) {
      return new Response(JSON.stringify({ error: 'ride_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch ride details
    const { data: ride } = await supabase
      .from('rides')
      .select('*')
      .eq('id', ride_id)
      .single();

    if (!ride) {
      return new Response(JSON.stringify({ error: 'Ride not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch rider profile
    const { data: rider } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', ride.rider_id)
      .single();

    if (!rider?.email) {
      return new Response(JSON.stringify({ error: 'Rider email not found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch driver name
    let driverName = 'Your Driver';
    if (ride.driver_id) {
      const { data: driverProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', ride.driver_id)
        .single();
      driverName = driverProfile?.full_name || 'Your Driver';
    }

    // Fetch payment details
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('ride_id', ride_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Fetch payment method details
    let cardInfo = 'Card';
    const { data: pm } = await supabase
      .from('payment_methods')
      .select('brand, last4')
      .eq('user_id', ride.rider_id)
      .eq('is_default', true)
      .limit(1)
      .single();
    if (pm) {
      cardInfo = `${(pm.brand || 'Card').charAt(0).toUpperCase() + (pm.brand || 'card').slice(1)} •••• ${pm.last4}`;
    }

    const fare = Number(ride.final_fare || ride.estimated_fare || 0);
    const promoDiscount = Number(ride.promo_discount || 0);
    const riderFirstName = rider.full_name?.split(' ')[0] || 'Rider';
    const rideDate = new Date(ride.completed_at || ride.created_at);
    const distanceMi = (Number(ride.estimated_distance_km || 0) * 0.621371).toFixed(1);
    const duration = ride.estimated_duration_min || 0;

    const rideTypeLabels: Record<string, string> = {
      standard: 'Styl Standard',
      xl: 'Styl XL',
      luxury: 'Styl Lux',
      electric: 'Styl Eco',
    };
    const rideLabel = rideTypeLabels[ride.ride_type] || 'Styl Standard';

    const subject = `Your Styl receipt — $${fare.toFixed(2)}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#FF6B00,#FF8C00);padding:28px 24px;text-align:center;">
        <h1 style="color:#fff;font-size:28px;font-weight:900;letter-spacing:-0.5px;margin:0;">styl</h1>
        <p style="color:rgba(255,255,255,0.85);font-size:11px;margin:6px 0 0;font-weight:500;">Ride Receipt</p>
      </td>
    </tr>

    <!-- Greeting -->
    <tr>
      <td style="padding:24px 24px 8px;">
        <p style="color:#333;font-size:14px;margin:0;">Thanks for riding, <strong>${riderFirstName}</strong>!</p>
      </td>
    </tr>

    <!-- Fare amount -->
    <tr>
      <td style="padding:8px 24px 20px;text-align:center;">
        <p style="color:#FF6B00;font-size:36px;font-weight:800;margin:0;">$${fare.toFixed(2)}</p>
        <p style="color:#999;font-size:11px;margin:4px 0 0;">${rideDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · ${rideDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
      </td>
    </tr>

    <!-- Ride details -->
    <tr>
      <td style="padding:0 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:12px 14px;border-bottom:1px solid #eee;">
              <p style="color:#999;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Pick-up</p>
              <p style="color:#333;font-size:13px;margin:0;font-weight:500;">${ride.pickup_address || '—'}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 14px;border-bottom:1px solid #eee;">
              <p style="color:#999;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Drop-off</p>
              <p style="color:#333;font-size:13px;margin:0;font-weight:500;">${ride.dropoff_address || '—'}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 14px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td><p style="color:#999;font-size:10px;margin:0;">Ride type</p><p style="color:#333;font-size:12px;font-weight:600;margin:2px 0 0;">${rideLabel}</p></td>
                  <td><p style="color:#999;font-size:10px;margin:0;">Distance</p><p style="color:#333;font-size:12px;font-weight:600;margin:2px 0 0;">${distanceMi} mi</p></td>
                  <td><p style="color:#999;font-size:10px;margin:0;">Duration</p><p style="color:#333;font-size:12px;font-weight:600;margin:2px 0 0;">~${duration} min</p></td>
                  <td><p style="color:#999;font-size:10px;margin:0;">Driver</p><p style="color:#333;font-size:12px;font-weight:600;margin:2px 0 0;">${driverName.split(' ')[0]}</p></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Fare breakdown -->
    <tr>
      <td style="padding:20px 24px 0;">
        <p style="color:#333;font-size:13px;font-weight:700;margin:0 0 10px;">Fare Breakdown</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:6px 0;color:#666;font-size:12px;">Ride fare</td>
            <td style="padding:6px 0;color:#333;font-size:12px;font-weight:600;text-align:right;">$${(fare + promoDiscount).toFixed(2)}</td>
          </tr>
          ${promoDiscount > 0 ? `
          <tr>
            <td style="padding:6px 0;color:#00C853;font-size:12px;">Promo discount</td>
            <td style="padding:6px 0;color:#00C853;font-size:12px;font-weight:600;text-align:right;">-$${promoDiscount.toFixed(2)}</td>
          </tr>` : ''}
          <tr>
            <td colspan="2" style="border-bottom:1px solid #eee;padding:4px 0;"></td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#333;font-size:14px;font-weight:700;">Total charged</td>
            <td style="padding:8px 0;color:#FF6B00;font-size:14px;font-weight:800;text-align:right;">$${fare.toFixed(2)}</td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Payment method -->
    <tr>
      <td style="padding:16px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:6px;padding:10px 14px;">
          <tr>
            <td>
              <p style="color:#999;font-size:10px;margin:0;">Paid with</p>
              <p style="color:#333;font-size:12px;font-weight:600;margin:2px 0 0;">${cardInfo}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td style="padding:0 24px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#FF6B00;border-radius:8px;text-align:center;padding:12px;">
              <a href="styl-rider://home" style="color:#fff;font-size:13px;font-weight:700;text-decoration:none;">Open Styl</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background:#fafafa;padding:16px 24px;text-align:center;border-top:1px solid #eee;">
        <p style="color:#999;font-size:10px;margin:0;">Styl Technologies Inc. · Ride ID: ${ride_id.slice(0, 8)}</p>
        <p style="color:#bbb;font-size:9px;margin:4px 0 0;">If you have questions about this charge, contact support in the Styl app.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Send via Resend
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
          to: [rider.email],
          subject,
          html,
        }),
      });

      const result = await res.json();
      if (result.error) {
        console.error('Resend error:', result.error);
        return new Response(JSON.stringify({ error: 'Failed to send receipt' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      console.log(`[DEV] Would send receipt "${subject}" to ${rider.email}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('send-rider-receipt error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
