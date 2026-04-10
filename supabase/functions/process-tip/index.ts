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
    const { ride_id, tip_amount, tip_pct } = await req.json();

    if (!ride_id || !tip_amount || tip_amount <= 0) {
      return json({ error: 'ride_id and positive tip_amount required' }, 400);
    }

    if (tip_amount > 500) {
      return json({ error: 'Maximum tip is $500' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    // Auth: verify caller is the rider on this ride
    const authHeader = req.headers.get('Authorization');
    let callerId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) callerId = user.id;
    }

    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', ride_id)
      .single();

    if (rideError || !ride) {
      return json({ error: 'Ride not found' }, 404);
    }

    if (callerId && callerId !== ride.rider_id) {
      return json({ error: 'Not authorized — only the rider can tip' }, 403);
    }

    if (!ride.driver_id) {
      return json({ error: 'No driver assigned to this ride' }, 400);
    }

    const tipCents = Math.round(tip_amount * 100);

    // Update ride with tip info
    await supabase.from('rides').update({
      tip_amount: tip_amount,
      tip_pct: tip_pct || null,
    }).eq('id', ride_id);

    // Charge tip via Stripe (100% goes to driver — no platform cut on tips)
    let paymentIntentId: string | null = null;
    let paymentStatus = 'succeeded';

    if (stripeKey) {
      const { data: riderProfile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', ride.rider_id)
        .single();

      if (riderProfile?.stripe_customer_id) {
        try {
          const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${stripeKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              amount: String(tipCents),
              currency: 'usd',
              customer: riderProfile.stripe_customer_id,
              description: `Tip for ride ${ride_id}`,
              'metadata[ride_id]': ride_id,
              'metadata[type]': 'tip',
              'metadata[driver_id]': ride.driver_id,
              off_session: 'true',
              confirm: 'true',
            }).toString(),
          });

          const stripeData = await stripeRes.json();
          if (stripeData.error) {
            console.error('Stripe tip error:', stripeData.error);
            paymentStatus = 'failed';
          } else {
            paymentIntentId = stripeData.id;
            paymentStatus = stripeData.status === 'succeeded' ? 'succeeded' : 'pending';
          }
        } catch (err) {
          console.error('Stripe tip request failed:', err);
          paymentStatus = 'failed';
        }
      }
    }

    // Record tip payment
    await supabase.from('payments').insert({
      ride_id,
      rider_id: ride.rider_id,
      driver_id: ride.driver_id,
      amount: tip_amount,
      platform_fee: 0, // 100% to driver
      driver_payout: tip_amount,
      currency: 'usd',
      stripe_payment_intent_id: paymentIntentId,
      status: paymentStatus,
      payment_type: 'tip',
    });

    // Update driver earnings — add tip to existing record or create new one
    const { data: existingEarning } = await supabase
      .from('driver_earnings')
      .select('id, tip_amount, net_amount')
      .eq('ride_id', ride_id)
      .eq('driver_id', ride.driver_id)
      .limit(1)
      .single();

    if (existingEarning) {
      // Add tip to existing earnings record
      const newTip = (Number(existingEarning.tip_amount) || 0) + tip_amount;
      const newNet = Number(existingEarning.net_amount) + tip_amount;
      await supabase.from('driver_earnings').update({
        tip_amount: newTip,
        net_amount: newNet,
      }).eq('id', existingEarning.id);
    } else {
      // Create tip-only earnings record
      await supabase.from('driver_earnings').insert({
        driver_id: ride.driver_id,
        ride_id,
        gross_amount: 0,
        net_amount: tip_amount,
        tip_amount: tip_amount,
        payout_status: 'pending',
      });
    }

    // Update driver total earnings
    const { data: driver } = await supabase
      .from('drivers')
      .select('total_earnings')
      .eq('id', ride.driver_id)
      .single();

    if (driver) {
      await supabase.from('drivers').update({
        total_earnings: Number(driver.total_earnings || 0) + tip_amount,
      }).eq('id', ride.driver_id);
    }

    // Transfer tip to driver's Stripe Connect account
    if (paymentStatus === 'succeeded' && stripeKey) {
      const { data: driverRecord } = await supabase
        .from('drivers')
        .select('stripe_account_id')
        .eq('id', ride.driver_id)
        .single();

      if (driverRecord?.stripe_account_id) {
        try {
          await fetch('https://api.stripe.com/v1/transfers', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${stripeKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              amount: String(tipCents),
              currency: 'usd',
              destination: driverRecord.stripe_account_id,
              'metadata[ride_id]': ride_id,
              'metadata[type]': 'tip',
            }).toString(),
          });
        } catch (err) {
          console.error('Stripe tip transfer failed:', err);
        }
      }
    }

    // Notify driver
    const { data: riderProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', ride.rider_id)
      .single();

    const riderName = riderProfile?.full_name?.split(' ')[0] || 'Your rider';

    await supabase.from('notifications').insert({
      user_id: ride.driver_id,
      title: 'Tip Received!',
      body: `${riderName} tipped you $${tip_amount.toFixed(2)}!`,
      type: 'tip_received',
      data: { ride_id, tip_amount },
    });

    // Push notification
    const { data: driverPushProfile } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', ride.driver_id)
      .single();

    if (driverPushProfile?.expo_push_token) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: driverPushProfile.expo_push_token,
          title: 'Tip Received! 🎉',
          body: `${riderName} tipped you $${tip_amount.toFixed(2)}!`,
          data: { type: 'tip_received', rideId: ride_id },
          sound: 'default',
        }),
      }).catch(() => {});
    }

    return json({
      success: true,
      tip_amount,
      payment_status: paymentStatus,
    }, 200);

  } catch (err) {
    console.error('process-tip error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(data: Record<string, any>, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
