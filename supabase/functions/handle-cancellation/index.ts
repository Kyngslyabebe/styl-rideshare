import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;

// Pre-pickup cancellation tiers (by rider)
const CANCEL_TIERS = [
  { maxMin: 3, fee: 0 },
  { maxMin: 6, fee: 2.00 },
  { maxMin: Infinity, fee: 4.00 },
];

const STOP_WAIT_THRESHOLD_SEC = 300; // 5 minutes

// Haversine to check distance between two points (in meters)
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

serve(async (req) => {
  try {
    const { ride_id, cancelled_by, reason } = await req.json();

    if (!ride_id || !cancelled_by) {
      return new Response(JSON.stringify({ error: 'ride_id and cancelled_by required' }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth: verify caller owns this ride
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
      return new Response(JSON.stringify({ error: 'Ride not found' }), { status: 404 });
    }

    if (callerId && callerId !== ride.rider_id && callerId !== ride.driver_id) {
      return new Response(JSON.stringify({ error: 'Not authorized for this ride' }), { status: 403 });
    }

    const cancellable = ['searching', 'accepted', 'driver_arriving', 'driver_arrived', 'in_progress'];
    if (!cancellable.includes(ride.status)) {
      return new Response(JSON.stringify({ error: 'Ride cannot be cancelled' }), { status: 400 });
    }

    // Fetch stops for this ride
    const { data: stops } = await supabase
      .from('ride_stops')
      .select('*')
      .eq('ride_id', ride_id)
      .order('stop_order');

    let cancelFee = 0;
    let driverPayout = 0;
    let cancelType = 'standard'; // standard | at_stop_full | at_stop_partial | in_progress

    // ──────── MULTI-STOP CANCELLATION LOGIC ────────
    if (ride.status === 'in_progress' && stops && stops.length > 0) {
      // Find the current stop (arrived but not completed, with wait time started)
      const activeStop = stops.find((s: any) => s.arrived_at && !s.completed_at && s.wait_started_at);

      if (activeStop) {
        const waitStarted = new Date(activeStop.wait_started_at).getTime();
        const waitedSec = (Date.now() - waitStarted) / 1000;
        const waitedPastThreshold = waitedSec >= STOP_WAIT_THRESHOLD_SEC;

        if (cancelled_by === 'driver') {
          if (waitedPastThreshold) {
            // Driver waited 5+ min at stop → full trip fare
            driverPayout = Number(ride.estimated_fare || 0);
            cancelFee = driverPayout; // charge rider full fare
            cancelType = 'at_stop_full';
          } else {
            // Driver cancelled before 5 min → partial payment (completed portion)
            driverPayout = await calculatePartialFare(supabase, ride, stops, activeStop);
            cancelFee = driverPayout;
            cancelType = 'at_stop_partial';
          }
        } else if (cancelled_by === 'rider') {
          if (waitedPastThreshold) {
            // Rider cancels after driver waited 5+ min → driver gets full fare
            driverPayout = Number(ride.estimated_fare || 0);
            cancelFee = driverPayout;
            cancelType = 'at_stop_full';
          } else {
            // Rider cancels before 5 min → partial payment
            driverPayout = await calculatePartialFare(supabase, ride, stops, activeStop);
            cancelFee = driverPayout;
            cancelType = 'at_stop_partial';
          }
        }
      } else {
        // In-progress but not at a stop — standard in-progress cancellation
        // Driver still gets partial fare for distance traveled
        driverPayout = await calculatePartialFare(supabase, ride, stops, null);
        cancelFee = driverPayout;
        cancelType = 'in_progress';
      }
    } else if (ride.status === 'in_progress') {
      // In-progress with no stops — partial fare
      driverPayout = await calculatePartialFare(supabase, ride, [], null);
      cancelFee = driverPayout;
      cancelType = 'in_progress';
    } else {
      // Pre-pickup cancellation (standard tier-based)
      if (cancelled_by === 'rider' && ride.accepted_at) {
        const elapsedMin = (Date.now() - new Date(ride.accepted_at).getTime()) / 60000;
        const tier = CANCEL_TIERS.find((t) => elapsedMin < t.maxMin);
        cancelFee = tier?.fee || 0;
      }
    }

    // Update ride status
    const { error: updateError } = await supabase
      .from('rides')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by,
        cancellation_reason: reason || null,
        final_fare: cancelFee > 0 ? cancelFee : null,
        driver_earnings: driverPayout > 0 ? driverPayout : null,
      })
      .eq('id', ride_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to cancel ride' }), { status: 500 });
    }

    // Charge cancellation fee via Stripe
    if (cancelFee > 0) {
      await chargeRider(supabase, ride, ride_id, cancelFee, driverPayout);
    }

    // Notify the other party
    const notifyUserId = cancelled_by === 'rider' ? ride.driver_id : ride.rider_id;
    if (notifyUserId) {
      const feeInfo = cancelFee > 0 ? ` ($${cancelFee.toFixed(2)} fee)` : '';
      const title = 'Ride Cancelled';
      let body = '';
      if (cancelled_by === 'rider') {
        body = `The rider cancelled the ride${feeInfo}`;
      } else {
        body = cancelType === 'at_stop_full'
          ? `Driver cancelled after 5-min wait. Full fare charged.`
          : `Your driver cancelled the ride${feeInfo}`;
      }
      await sendPush(supabase, notifyUserId, title, body, { type: 'ride_cancelled', rideId: ride_id });
    }

    return new Response(JSON.stringify({
      success: true,
      cancel_fee: cancelFee,
      driver_payout: driverPayout,
      cancel_type: cancelType,
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

// Calculate partial fare for the completed portion of the trip
async function calculatePartialFare(
  supabase: any, ride: any, stops: any[], activeStop: any | null
): Promise<number> {
  const totalFare = Number(ride.estimated_fare || 0);
  if (totalFare === 0) return 0;

  // If we have stops, calculate based on completed legs
  const completedStops = stops.filter((s: any) => s.completed_at);
  const totalStops = stops.length;

  if (totalStops === 0) {
    // No stops — estimate based on time elapsed in ride
    if (ride.started_at) {
      const elapsedMin = (Date.now() - new Date(ride.started_at).getTime()) / 60000;
      const totalMin = ride.estimated_duration_min || 10;
      const ratio = Math.min(elapsedMin / totalMin, 0.9); // cap at 90%
      return Math.round(totalFare * ratio * 100) / 100;
    }
    return 0;
  }

  // With stops: calculate proportional fare based on completed legs
  // Total legs = stops + 1 (pickup-to-stop1, stop1-to-stop2, ..., lastStop-to-dropoff)
  const totalLegs = totalStops + 1;
  const completedLegs = completedStops.length + (activeStop ? 0.5 : 0); // partial credit for active stop
  const ratio = completedLegs / totalLegs;
  return Math.round(totalFare * ratio * 100) / 100;
}

async function chargeRider(supabase: any, ride: any, ride_id: string, cancelFee: number, driverPayout: number) {
  const { data: riderProfile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', ride.rider_id)
    .single();

  if (!riderProfile?.stripe_customer_id) return;

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

  // Record payment
  await supabase.from('payments').insert({
    ride_id,
    rider_id: ride.rider_id,
    driver_id: ride.driver_id,
    amount: cancelFee,
    platform_fee: cancelFee - driverPayout,
    driver_payout: driverPayout,
    currency: 'usd',
    stripe_payment_intent_id: stripeData.id || null,
    status: stripeRes.ok ? 'succeeded' : 'failed',
  });

  // If driver gets a payout, record in earnings
  if (driverPayout > 0 && ride.driver_id) {
    await supabase.from('driver_earnings').insert({
      driver_id: ride.driver_id,
      ride_id,
      gross_amount: driverPayout,
      platform_fee: 0,
      net_amount: driverPayout,
      tip_amount: 0,
      payout_status: 'pending',
    });
  }
}

async function sendPush(supabase: any, userId: string, title: string, body: string, data: Record<string, string>) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', userId)
    .single();
  if (!profile?.expo_push_token) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: profile.expo_push_token, title, body, data, sound: 'default' }),
  }).catch(() => {});
}
