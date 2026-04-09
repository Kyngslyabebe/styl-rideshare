// supabase/functions/process-payment/index.ts
// Processes payment after ride completion.
// Creates a Stripe PaymentIntent, records payment, updates driver earnings.
// No-commission model: driver gets 100% minus Stripe fee + dispute protection.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_FEE_PCT = 0.029;
const STRIPE_FEE_FIXED = 0.30;
const DISPUTE_PROTECTION_FEE = 0.30;

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
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    // Auth: verify caller is the driver on this ride (if token provided)
    const authHeader = req.headers.get('Authorization');
    let callerId: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) callerId = user.id;
    }

    // Fetch ride
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', ride_id)
      .single();

    if (rideError || !ride) {
      return new Response(JSON.stringify({ error: 'Ride not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller owns this ride (driver or rider)
    if (callerId && callerId !== ride.driver_id && callerId !== ride.rider_id) {
      return new Response(JSON.stringify({ error: 'Not authorized for this ride' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (ride.status !== 'completed') {
      return new Response(JSON.stringify({ error: 'Ride must be completed before processing payment' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use final_fare if available, otherwise estimated_fare
    const fareAmount = Number(ride.final_fare || ride.estimated_fare || 0);
    const stripeFee = Math.round((fareAmount * STRIPE_FEE_PCT + STRIPE_FEE_FIXED) * 100) / 100;
    const disputeFee = DISPUTE_PROTECTION_FEE;
    const driverPayout = Math.round((fareAmount - stripeFee - disputeFee) * 100) / 100;

    let paymentIntentId: string | null = null;
    let paymentStatus = 'succeeded'; // default for cash rides

    // Process Stripe payment for card rides
    if (ride.payment_method === 'card' && stripeKey) {
      try {
        // Create PaymentIntent via Stripe API
        const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            amount: String(Math.round(fareAmount * 100)), // cents
            currency: 'usd',
            'metadata[ride_id]': ride_id,
            'metadata[rider_id]': ride.rider_id,
            'metadata[driver_id]': ride.driver_id || '',
            confirm: 'true',
            automatic_payment_methods: 'false',
            // In production, use customer's saved payment method
            // payment_method: savedPaymentMethodId,
          }).toString(),
        });

        const stripeData = await stripeRes.json();

        if (stripeData.error) {
          console.error('Stripe error:', stripeData.error);
          paymentStatus = 'failed';
        } else {
          paymentIntentId = stripeData.id;
          paymentStatus = stripeData.status === 'succeeded' ? 'succeeded' : 'pending';
        }
      } catch (stripeErr) {
        console.error('Stripe request failed:', stripeErr);
        paymentStatus = 'failed';
      }
    }

    // Record payment
    const { error: paymentError } = await supabase.from('payments').insert({
      ride_id,
      rider_id: ride.rider_id,
      driver_id: ride.driver_id,
      amount: fareAmount,
      stripe_fee: stripeFee,
      dispute_protection_fee: disputeFee,
      driver_payout: driverPayout,
      currency: 'usd',
      stripe_payment_intent_id: paymentIntentId,
      status: paymentStatus,
    });

    if (paymentError) {
      console.error('Payment record error:', paymentError);
    }

    // Record driver earnings + subscription skim
    let subscriptionSkim = 0;
    let driverNetAfterSkim = driverPayout;

    if (ride.driver_id) {
      // Check if driver is in subscription collection mode
      const { data: driver } = await supabase
        .from('drivers')
        .select('total_earnings, total_rides, subscription_status, subscription_collected, subscription_target')
        .eq('id', ride.driver_id)
        .single();

      if (driver && driver.subscription_status === 'collecting') {
        // Fetch skim percentage from platform settings (default 60%)
        const { data: skimSetting } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'subscription_skim_pct')
          .single();

        const skimPct = Number(skimSetting?.value ?? 0.60);
        const collected = Number(driver.subscription_collected || 0);
        const target = Number(driver.subscription_target || 0);
        const remaining = target - collected;

        if (remaining > 0) {
          // Skim up to 60% of net payout, but not more than remaining balance
          subscriptionSkim = Math.min(
            Math.round(driverPayout * skimPct * 100) / 100,
            Math.round(remaining * 100) / 100
          );
          driverNetAfterSkim = Math.round((driverPayout - subscriptionSkim) * 100) / 100;

          const newCollected = Math.round((collected + subscriptionSkim) * 100) / 100;
          const fullyCollected = newCollected >= target;

          // Update driver subscription progress
          await supabase.from('drivers').update({
            subscription_collected: newCollected,
            subscription_status: fullyCollected ? 'active' : 'collecting',
          }).eq('id', ride.driver_id);

          // If fully collected, also update the driver_subscriptions record
          if (fullyCollected) {
            await supabase.from('driver_subscriptions')
              .update({ status: 'active' })
              .eq('driver_id', ride.driver_id)
              .eq('status', 'collecting');
          }
        }
      }

      // Record earnings (net after skim)
      await supabase.from('driver_earnings').insert({
        driver_id: ride.driver_id,
        ride_id,
        gross_amount: fareAmount,
        stripe_fee: stripeFee,
        dispute_protection_fee: disputeFee,
        net_amount: driverNetAfterSkim,
        subscription_skim: subscriptionSkim,
        payout_status: 'pending',
      });

      // Update driver's total earnings and ride count
      if (driver) {
        await supabase.from('drivers').update({
          total_earnings: Number(driver.total_earnings || 0) + driverNetAfterSkim,
          total_rides: (driver.total_rides || 0) + 1,
        }).eq('id', ride.driver_id);
      }

      // ─── Stripe Connect Transfer: send money to driver's connected account ───
      // Only transfer if payment succeeded and driver has a Connect account
      if (paymentStatus === 'succeeded' && driverNetAfterSkim > 0 && stripeKey) {
        const { data: driverRecord } = await supabase
          .from('drivers')
          .select('stripe_account_id')
          .eq('id', ride.driver_id)
          .single();

        if (driverRecord?.stripe_account_id) {
          try {
            const transferAmountCents = Math.round(driverNetAfterSkim * 100);
            const transferRes = await fetch('https://api.stripe.com/v1/transfers', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${stripeKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                amount: transferAmountCents.toString(),
                currency: 'usd',
                destination: driverRecord.stripe_account_id,
                'metadata[ride_id]': ride_id,
                'metadata[driver_id]': ride.driver_id,
                'metadata[type]': 'ride_payout',
                'metadata[subscription_skim]': subscriptionSkim.toFixed(2),
              }).toString(),
            });

            const transferData = await transferRes.json();

            if (transferData.error) {
              console.error('Stripe Transfer error:', transferData.error);
              // Mark payout as failed but don't block the rest
              await supabase.from('driver_earnings')
                .update({ payout_status: 'failed' })
                .eq('ride_id', ride_id)
                .eq('driver_id', ride.driver_id);
            } else {
              // Mark payout as completed
              await supabase.from('driver_earnings')
                .update({
                  payout_status: 'completed',
                  stripe_transfer_id: transferData.id,
                })
                .eq('ride_id', ride_id)
                .eq('driver_id', ride.driver_id);
            }
          } catch (transferErr) {
            console.error('Stripe Transfer failed:', transferErr);
          }
        }
      }
    }

    // Update ride payment status
    await supabase.from('rides').update({
      payment_status: paymentStatus === 'succeeded' ? 'captured' : paymentStatus,
      payment_intent_id: paymentIntentId,
      driver_earnings: driverNetAfterSkim,
      subscription_skim: subscriptionSkim,
      final_fare: fareAmount,
    }).eq('id', ride_id);

    // Notify rider
    await supabase.from('notifications').insert({
      user_id: ride.rider_id,
      title: 'Payment Processed',
      body: `$${fareAmount.toFixed(2)} has been charged for your ride.`,
      type: 'payment_received',
      data: { ride_id, amount: fareAmount },
    });

    // Notify driver of earnings
    if (ride.driver_id) {
      const earningsMsg = subscriptionSkim > 0
        ? `You earned $${driverNetAfterSkim.toFixed(2)} from this ride ($${subscriptionSkim.toFixed(2)} applied to subscription).`
        : `You earned $${driverNetAfterSkim.toFixed(2)} from this ride.`;

      await supabase.from('notifications').insert({
        user_id: ride.driver_id,
        title: 'Earnings Added',
        body: earningsMsg,
        type: 'payment_received',
        data: { ride_id, amount: driverNetAfterSkim, subscription_skim: subscriptionSkim },
      });

      // Send push notifications
      try {
        await Promise.all([
          supabase.functions.invoke('send-notification', {
            body: {
              user_id: ride.rider_id,
              title: 'Payment Processed',
              body: `$${fareAmount.toFixed(2)} charged.`,
              data: { ride_id, type: 'payment' },
            },
          }),
          supabase.functions.invoke('send-notification', {
            body: {
              user_id: ride.driver_id,
              title: 'Earnings Added',
              body: subscriptionSkim > 0
                ? `+$${driverNetAfterSkim.toFixed(2)} (sub: -$${subscriptionSkim.toFixed(2)})`
                : `+$${driverNetAfterSkim.toFixed(2)}`,
              data: { ride_id, type: 'earnings' },
            },
          }),
        ]);
      } catch (e) {
        console.error('Push notification failed (non-blocking):', e);
      }
    }

    // Award rider reward points (1 point per mile, 2x on weekends)
    try {
      const distanceKm = Number(ride.estimated_distance_km || 0);
      const distanceMi = Math.round(distanceKm * 0.621371);
      const dayOfWeek = new Date().getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const points = Math.max(distanceMi * (isWeekend ? 2 : 1), 1); // minimum 1 point

      await supabase.from('rider_rewards').insert({
        rider_id: ride.rider_id,
        ride_id,
        points,
        type: 'earned',
        description: `${points} pts for ${distanceMi} mi ride${isWeekend ? ' (2x weekend bonus)' : ''}`,
      });

      // Update cached total on profile
      await supabase.rpc('increment_reward_points', { p_rider_id: ride.rider_id, p_points: points }).catch(() => {
        // Fallback: direct update if RPC doesn't exist yet
        supabase.from('profiles')
          .update({ reward_points: Number((ride as any)._currentPoints || 0) + points })
          .eq('id', ride.rider_id).then(() => {});
      });
    } catch (e) {
      console.error('Reward points failed (non-blocking):', e);
    }

    // Send email receipt to rider (non-blocking)
    supabase.functions.invoke('send-rider-receipt', {
      body: { ride_id },
    }).catch((e: any) => console.error('Receipt email failed (non-blocking):', e));

    return new Response(JSON.stringify({
      success: true,
      fare: fareAmount,
      stripe_fee: stripeFee,
      dispute_protection_fee: disputeFee,
      styl_commission: 0,
      driver_payout_before_skim: driverPayout,
      subscription_skim: subscriptionSkim,
      driver_payout: driverNetAfterSkim,
      payment_status: paymentStatus,
      stripe_payment_intent_id: paymentIntentId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('process-payment error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
