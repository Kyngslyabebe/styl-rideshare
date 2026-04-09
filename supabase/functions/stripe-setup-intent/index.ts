// supabase/functions/stripe-setup-intent/index.ts
// Creates a Stripe Customer (if needed) + SetupIntent for saving a card.
// Returns client_secret + ephemeral_key + customer_id for the Stripe Payment Sheet.

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

async function stripeGet(path: string, key: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { 'Authorization': `Bearer ${key}` },
  });
  return res.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
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

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, stripe_customer_id')
      .eq('id', user_id)
      .single();

    let customerId = profile?.stripe_customer_id;

    // Create Stripe customer if none
    if (!customerId) {
      const customer = await stripePost('/customers', {
        ...(profile?.email ? { email: profile.email } : {}),
        ...(profile?.full_name ? { name: profile.full_name } : {}),
        'metadata[user_id]': user_id,
        'metadata[platform]': 'styl',
      }, stripeKey);

      if (customer.error) {
        return new Response(JSON.stringify({ error: customer.error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      customerId = customer.id;

      // Save to profiles
      await supabase.from('profiles').update({
        stripe_customer_id: customerId,
      }).eq('id', user_id);
    }

    // Create ephemeral key
    const ephemeralKey = await stripePost('/ephemeral_keys', {
      customer: customerId!,
    }, stripeKey);
    // Ephemeral keys need Stripe-Version header
    const ephRes = await fetch('https://api.stripe.com/v1/ephemeral_keys', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2023-10-16',
      },
      body: new URLSearchParams({ customer: customerId! }).toString(),
    });
    const ephData = await ephRes.json();

    if (ephData.error) {
      return new Response(JSON.stringify({ error: ephData.error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create SetupIntent
    const setupIntent = await stripePost('/setup_intents', {
      customer: customerId!,
      'payment_method_types[]': 'card',
      'metadata[user_id]': user_id,
    }, stripeKey);

    if (setupIntent.error) {
      return new Response(JSON.stringify({ error: setupIntent.error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      setup_intent_client_secret: setupIntent.client_secret,
      ephemeral_key_secret: ephData.secret,
      customer_id: customerId,
      publishable_key: Deno.env.get('STRIPE_PUBLISHABLE_KEY') || '',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('stripe-setup-intent error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
