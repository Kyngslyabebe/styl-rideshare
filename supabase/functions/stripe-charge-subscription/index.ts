// supabase/functions/stripe-charge-subscription/index.ts
// Charges a driver's saved card for upfront subscription payment.
// On success, activates the subscription immediately (driver keeps 100% of fares).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function stripePost(path: string, body: Record<string, string>, key: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });
  return res.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { driver_id, plan, amount } = await req.json();

    if (!driver_id || !plan || !amount) {
      return new Response(JSON.stringify({ error: 'driver_id, plan, and amount are required' }), {
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

    // Get driver's profile for Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', driver_id)
      .single();

    if (!profile?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No payment method on file. Please add a card first.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get default payment method
    const custRes = await fetch(
      `https://api.stripe.com/v1/customers/${profile.stripe_customer_id}`,
      { headers: { 'Authorization': `Bearer ${stripeKey}` } },
    );
    const customer = await custRes.json();
    const defaultPm = customer.invoice_settings?.default_payment_method;

    if (!defaultPm) {
      // Try to get the first payment method
      const pmRes = await fetch(
        `https://api.stripe.com/v1/payment_methods?customer=${profile.stripe_customer_id}&type=card&limit=1`,
        { headers: { 'Authorization': `Bearer ${stripeKey}` } },
      );
      const pmData = await pmRes.json();
      const firstPm = pmData.data?.[0]?.id;

      if (!firstPm) {
        return new Response(JSON.stringify({ error: 'No card on file. Please add a payment method first.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use first available card
      var paymentMethodId = firstPm;
    } else {
      var paymentMethodId = defaultPm;
    }

    // Create PaymentIntent (amount in cents)
    const amountCents = Math.round(amount * 100);
    const paymentIntent = await stripePost('/payment_intents', {
      amount: amountCents.toString(),
      currency: 'usd',
      customer: profile.stripe_customer_id,
      payment_method: paymentMethodId,
      confirm: 'true',
      off_session: 'true',
      description: `Styl Driver ${plan} subscription`,
      'metadata[driver_id]': driver_id,
      'metadata[plan]': plan,
      'metadata[type]': 'subscription',
    }, stripeKey);

    if (paymentIntent.error) {
      return new Response(JSON.stringify({ error: paymentIntent.error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (paymentIntent.status !== 'succeeded') {
      return new Response(JSON.stringify({ error: `Payment ${paymentIntent.status}. Please try again.` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Payment succeeded — activate subscription
    const now = new Date();
    const periodEnd = new Date(now);
    if (plan === 'daily') {
      periodEnd.setDate(periodEnd.getDate() + 1);
    } else if (plan === 'weekly') {
      periodEnd.setDate(periodEnd.getDate() + 7);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Create subscription record
    await supabase.from('driver_subscriptions').insert({
      driver_id,
      plan,
      price: amount,
      status: 'active',
      payment_intent_id: paymentIntent.id,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    });

    // Update driver status
    await supabase.from('drivers').update({
      subscription_status: 'active',
      subscription_target: amount,
      subscription_collected: amount,
      subscription_expires_at: periodEnd.toISOString(),
    }).eq('id', driver_id);

    return new Response(JSON.stringify({
      success: true,
      payment_intent_id: paymentIntent.id,
      expires_at: periodEnd.toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('stripe-charge-subscription error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
