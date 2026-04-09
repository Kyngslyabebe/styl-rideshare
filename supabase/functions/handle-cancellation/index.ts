import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;

const CANCEL_TIERS = [
  { maxMin: 3, fee: 0 },
  { maxMin: 6, fee: 2.00 },
  { maxMin: Infinity, fee: 4.00 },
];

serve(async (req) => {
  try {
    const { ride_id, cancelled_by, reason } = await req.json();

    if (!ride_id || !cancelled_by) {
      return new Response(JSON.stringify({ error: 'ride_id and cancelled_by required' }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth: verify caller owns this ride
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) {
        // Will verify ownership after fetching ride below
        (req as any)._userId = user.id;
      }
    }

    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', ride_id)
      .single();

    if (rideError || !ride) {
      return new Response(JSON.stringify({ error: 'Ride not found' }), { status: 404 });
    }

    // Verify caller is the rider or driver on this ride
    const callerId = (req as any)._userId;
    if (callerId && callerId !== ride.rider_id && callerId !== ride.driver_id) {
      return new Response(JSON.stringify({ error: 'Not authorized for this ride' }), { status: 403 });
    }

    const cancellable = ['searching', 'accepted', 'driver_arriving', 'driver_arrived', 'in_progress'];
    if (!cancellable.includes(ride.status)) {
      return new Response(JSON.stringify({ error: 'Ride cannot be cancelled' }), { status: 400 });
    }

    // Calculate cancellation fee
    let cancelFee = 0;
    if (cancelled_by === 'rider' && ride.accepted_at) {
      const elapsedMin = (Date.now() - new Date(ride.accepted_at).getTime()) / 60000;
      const tier = CANCEL_TIERS.find((t) => elapsedMin < t.maxMin);
      cancelFee = tier?.fee || 0;
    }

    const { error: updateError } = await supabase
      .from('rides')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by,
        cancellation_reason: reason || null,
        final_fare: cancelFee > 0 ? cancelFee : null,
      })
      .eq('id', ride_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to cancel ride' }), { status: 500 });
    }

    // Charge cancellation fee to rider's card via Stripe
    if (cancelFee > 0) {
      const { data: riderProfile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', ride.rider_id)
        .single();

      if (riderProfile?.stripe_customer_id) {
        const params = new URLSearchParams();
        params.append('amount', String(Math.round(cancelFee * 100)));
        params.append('currency', 'usd');
        params.append('customer', riderProfile.stripe_customer_id);
        params.append('description', `Cancellation fee for ride ${ride_id}`);
        params.append('off_session', 'true');
        params.append('confirm', 'true');

        const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        const stripeData = await stripeRes.json();

        // Record the payment
        await supabase.from('payments').insert({
          ride_id,
          rider_id: ride.rider_id,
          driver_id: ride.driver_id,
          amount: cancelFee,
          platform_fee: cancelFee,
          driver_payout: 0,
          currency: 'usd',
          stripe_payment_intent_id: stripeData.id || null,
          status: stripeRes.ok ? 'completed' : 'failed',
        });
      }
    }

    // Notify the other party
    const notifyUserId = cancelled_by === 'rider' ? ride.driver_id : ride.rider_id;
    if (notifyUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('expo_push_token')
        .eq('id', notifyUserId)
        .single();

      if (profile?.expo_push_token) {
        const title = 'Ride Cancelled';
        const body = cancelled_by === 'rider'
          ? 'The rider has cancelled the ride'
          : 'Your driver has cancelled the ride';

        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: profile.expo_push_token,
            title,
            body,
            data: { type: 'ride_cancelled', rideId: ride_id },
            sound: 'default',
          }),
        }).catch(() => {});
      }
    }

    return new Response(JSON.stringify({ success: true, cancel_fee: cancelFee }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
