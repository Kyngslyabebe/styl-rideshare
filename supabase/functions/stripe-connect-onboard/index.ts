// supabase/functions/stripe-connect-onboard/index.ts
// Creates or retrieves a Stripe Connect Express account for a driver,
// then returns an Account Link URL for onboarding.
// Also handles refreshing an onboarding link if the driver returns incomplete.

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
    // Handle GET requests (Stripe redirect back) — just close the browser
    if (req.method === 'GET') {
      return new Response('<html><body><h2>Done! You can close this page and return to the app.</h2></body></html>', {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    const { driver_id, return_url, refresh_url } = await req.json();

    if (!driver_id) {
      return new Response(JSON.stringify({ error: 'driver_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch driver + profile
    const { data: driver } = await supabase
      .from('drivers')
      .select('stripe_account_id')
      .eq('id', driver_id)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', driver_id)
      .single();

    let accountId = driver?.stripe_account_id;

    // Create Stripe Connect Express account if none exists
    if (!accountId) {
      const createRes = await fetch('https://api.stripe.com/v1/accounts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          type: 'express',
          country: 'US',
          'capabilities[card_payments][requested]': 'true',
          'capabilities[transfers][requested]': 'true',
          ...(profile?.email && profile.email.includes('@') ? { email: profile.email } : {}),
          ...(profile?.full_name ? { 'business_profile[name]': profile.full_name } : {}),
          'metadata[driver_id]': driver_id,
          'metadata[platform]': 'styl',
        }).toString(),
      });

      const account = await createRes.json();
      if (account.error) {
        return new Response(JSON.stringify({ error: account.error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      accountId = account.id;

      // Save to drivers table
      await supabase.from('drivers').update({
        stripe_account_id: accountId,
      }).eq('id', driver_id);
    }

    // Create Account Link for onboarding
    // Stripe requires valid HTTPS URLs for return/refresh — use a simple redirect page
    const defaultReturn = 'https://nlmuhkjeeoasvmuzgdru.supabase.co/functions/v1/stripe-connect-onboard?status=complete';
    const defaultRefresh = 'https://nlmuhkjeeoasvmuzgdru.supabase.co/functions/v1/stripe-connect-onboard?status=refresh';

    const linkRes = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        account: accountId!,
        type: 'account_onboarding',
        return_url: return_url || defaultReturn,
        refresh_url: refresh_url || defaultRefresh,
      }).toString(),
    });

    const link = await linkRes.json();
    if (link.error) {
      return new Response(JSON.stringify({ error: link.error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if account is already fully onboarded
    const accountRes = await fetch(`https://api.stripe.com/v1/accounts/${accountId}`, {
      headers: { 'Authorization': `Bearer ${stripeKey}` },
    });
    const accountData = await accountRes.json();

    return new Response(JSON.stringify({
      url: link.url,
      account_id: accountId,
      charges_enabled: accountData.charges_enabled || false,
      payouts_enabled: accountData.payouts_enabled || false,
      onboarding_complete: accountData.details_submitted || false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('stripe-connect-onboard error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
