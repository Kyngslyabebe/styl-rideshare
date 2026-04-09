// supabase/functions/request-instant-payout/index.ts
// Creates an instant Stripe payout to the driver's connected bank account.
// Stripe charges 1.5% for instant payouts (passed to driver).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const INSTANT_PAYOUT_FEE_PCT = 0.015; // 1.5% Stripe instant payout fee

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { driver_id } = await req.json();

    if (!driver_id) {
      return new Response(JSON.stringify({ error: 'driver_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    // Auth: verify caller is the driver requesting payout
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user && user.id !== driver_id) {
        return new Response(JSON.stringify({ error: 'Not authorized' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get driver's Stripe connected account
    const { data: driver } = await supabase
      .from('drivers')
      .select('stripe_account_id')
      .eq('id', driver_id)
      .single();

    if (!driver?.stripe_account_id) {
      return new Response(JSON.stringify({ error: 'No Stripe account connected' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check the connected account's available balance
    const balanceRes = await fetch('https://api.stripe.com/v1/balance', {
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Stripe-Account': driver.stripe_account_id,
      },
    });
    const balance = await balanceRes.json();

    if (balance.error) {
      return new Response(JSON.stringify({ error: 'Could not fetch balance' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find available USD balance
    const available = balance.available?.find((b: any) => b.currency === 'usd');
    const availableAmount = available?.amount || 0; // in cents

    if (availableAmount < 100) { // minimum $1.00
      return new Response(JSON.stringify({
        error: 'Insufficient balance',
        available: availableAmount / 100,
        minimum: 1.00,
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate fee and payout amount
    const feeCents = Math.ceil(availableAmount * INSTANT_PAYOUT_FEE_PCT);
    const payoutCents = availableAmount - feeCents;

    // Create instant payout on the connected account
    const payoutRes = await fetch('https://api.stripe.com/v1/payouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Account': driver.stripe_account_id,
      },
      body: new URLSearchParams({
        amount: payoutCents.toString(),
        currency: 'usd',
        method: 'instant',
        'metadata[driver_id]': driver_id,
        'metadata[type]': 'instant_payout',
        'metadata[fee_cents]': feeCents.toString(),
      }).toString(),
    });

    const payout = await payoutRes.json();

    if (payout.error) {
      // If instant payout not available, fall back to standard
      if (payout.error.code === 'instant_payouts_unsupported') {
        return new Response(JSON.stringify({
          error: 'Instant payouts are not available for your bank. Use standard (1-2 business days).',
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: payout.error.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send notification
    await supabase.from('notifications').insert({
      user_id: driver_id,
      title: 'Instant Payout Sent',
      body: `$${(payoutCents / 100).toFixed(2)} is on the way to your bank (fee: $${(feeCents / 100).toFixed(2)}).`,
      type: 'payout',
      data: { payout_id: payout.id, amount: payoutCents / 100, fee: feeCents / 100 },
    });

    return new Response(JSON.stringify({
      success: true,
      payout_id: payout.id,
      amount: payoutCents / 100,
      fee: feeCents / 100,
      gross: availableAmount / 100,
      status: payout.status,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('request-instant-payout error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
