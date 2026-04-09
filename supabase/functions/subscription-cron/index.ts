// supabase/functions/subscription-cron/index.ts
// Runs on a schedule (e.g. every hour via Supabase cron or external trigger).
// Handles subscription lifecycle:
// 1. Expired + fully collected → start new collection period (auto-renew)
// 2. Expired + NOT fully collected → mark as past_due, keep skimming
// 3. Grace period exceeded (7 days past due) → suspend driver

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GRACE_PERIOD_DAYS = 7;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const now = new Date();
    const results = { renewed: 0, pastDue: 0, suspended: 0, errors: [] as string[] };

    // ─── 1. Find all drivers with expired subscription periods ───
    // Active drivers whose period has ended → auto-renew (start new collection)
    const { data: expiredActive } = await supabase
      .from('drivers')
      .select('id, subscription_status, subscription_target, subscription_collected, subscription_expires_at')
      .eq('subscription_status', 'active')
      .lt('subscription_expires_at', now.toISOString());

    for (const driver of expiredActive || []) {
      try {
        // Get their latest subscription to know the plan
        const { data: latestSub } = await supabase
          .from('driver_subscriptions')
          .select('plan, price')
          .eq('driver_id', driver.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!latestSub) continue;

        const plan = latestSub.plan;
        const price = Number(latestSub.price);

        // Calculate new period
        const periodStart = new Date(now);
        const periodEnd = new Date(now);
        if (plan === 'daily') {
          periodEnd.setDate(periodEnd.getDate() + 1);
        } else if (plan === 'weekly') {
          periodEnd.setDate(periodEnd.getDate() + 7);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        // Create new subscription record
        await supabase.from('driver_subscriptions').insert({
          driver_id: driver.id,
          plan,
          price,
          status: 'collecting',
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
        });

        // Reset driver to collecting
        await supabase.from('drivers').update({
          subscription_status: 'collecting',
          subscription_target: price,
          subscription_collected: 0,
          subscription_expires_at: periodEnd.toISOString(),
        }).eq('id', driver.id);

        // Notify driver
        await supabase.from('notifications').insert({
          user_id: driver.id,
          title: 'Subscription Renewed',
          body: `Your ${plan} subscription ($${price.toFixed(2)}) has been renewed. 60% of ride earnings will be collected.`,
          type: 'subscription_renewed',
          data: { plan, price },
        });

        results.renewed++;
      } catch (err) {
        results.errors.push(`Renew failed for ${driver.id}: ${err.message}`);
      }
    }

    // ─── 2. Collecting drivers whose period expired but sub not fully collected ───
    // They're still being skimmed — mark as past_due but keep collecting
    const { data: expiredCollecting } = await supabase
      .from('drivers')
      .select('id, subscription_collected, subscription_target, subscription_expires_at')
      .eq('subscription_status', 'collecting')
      .lt('subscription_expires_at', now.toISOString());

    for (const driver of expiredCollecting || []) {
      try {
        const expiresAt = new Date(driver.subscription_expires_at);
        const daysPastDue = (now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60 * 24);

        if (daysPastDue > GRACE_PERIOD_DAYS) {
          // Grace period exceeded — suspend driver, they can't drive until sub is resolved
          await supabase.from('drivers').update({
            subscription_status: 'past_due',
            is_online: false,
          }).eq('id', driver.id);

          await supabase.from('notifications').insert({
            user_id: driver.id,
            title: 'Subscription Past Due',
            body: `Your subscription is ${Math.floor(daysPastDue)} days past due. Complete more rides to finish collection, or contact support.`,
            type: 'subscription_past_due',
            data: {
              collected: driver.subscription_collected,
              target: driver.subscription_target,
              days_past_due: Math.floor(daysPastDue),
            },
          });

          results.pastDue++;
        }
        // If within grace period, do nothing — process-payment will keep skimming
      } catch (err) {
        results.errors.push(`Past-due check failed for ${driver.id}: ${err.message}`);
      }
    }

    // ─── 3. Past-due drivers who have now been collected (edge case) ───
    // If skim completed while past_due, move them to active
    const { data: pastDueCompleted } = await supabase
      .from('drivers')
      .select('id, subscription_collected, subscription_target')
      .eq('subscription_status', 'past_due');

    for (const driver of pastDueCompleted || []) {
      const collected = Number(driver.subscription_collected || 0);
      const target = Number(driver.subscription_target || 0);
      if (target > 0 && collected >= target) {
        await supabase.from('drivers').update({
          subscription_status: 'active',
        }).eq('id', driver.id);

        await supabase.from('driver_subscriptions')
          .update({ status: 'active' })
          .eq('driver_id', driver.id)
          .eq('status', 'collecting');

        await supabase.from('notifications').insert({
          user_id: driver.id,
          title: 'Subscription Active',
          body: 'Your subscription has been fully collected. You now keep 100% of ride earnings!',
          type: 'subscription_active',
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      timestamp: now.toISOString(),
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('subscription-cron error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
