import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Check, Crown, Zap, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { colors as appColors } from '../../theme/colors';

const PLANS = [
  {
    id: 'daily',
    name: 'Daily',
    price: 20,
    period: 'day',
    features: ['Drive for the day', '100% fare earnings', 'No commitment'],
  },
  {
    id: 'weekly',
    name: 'Weekly',
    price: 100,
    period: 'week',
    savings: 'Save $40/wk vs daily',
    features: ['Drive unlimited hours', '100% fare earnings', 'Priority support'],
  },
  {
    id: 'monthly',
    name: 'Monthly',
    price: 360,
    period: 'month',
    savings: 'Save $240/mo vs daily',
    features: ['Everything in Weekly', '100% fare earnings', 'Priority support', 'Earnings analytics'],
    best: true,
  },
];

export default function SubscriptionScreen() {
  const { t, colors } = useTheme();
  const { user } = useAuth();
  const [driver, setDriver] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [{ data: d }, { data: subs }] = await Promise.all([
      supabase.from('drivers').select('subscription_status, subscription_expires_at, subscription_collected, subscription_target').eq('id', user.id).single(),
      supabase.from('driver_subscriptions').select('*').eq('driver_id', user.id)
        .order('created_at', { ascending: false }).limit(1),
    ]);
    setDriver(d);
    setSubscription(subs?.[0] || null);
    setLoading(false);
  };

  const isActive = driver?.subscription_status === 'active';
  const isCollecting = driver?.subscription_status === 'collecting';
  const collected = Number(driver?.subscription_collected || 0);
  const target = Number(driver?.subscription_target || 0);
  const collectionProgress = target > 0 ? Math.min(collected / target, 1) : 0;
  const remaining = Math.max(target - collected, 0);

  const handleSubscribe = async (planId: string, price: number) => {
    if (!user) return;

    const planLabel = planId === 'daily' ? 'Daily' : planId === 'weekly' ? 'Weekly' : 'Monthly';
    const periodLabel = planId === 'daily' ? 'day' : planId === 'weekly' ? 'wk' : 'mo';

    Alert.alert(
      `Subscribe to ${planLabel}`,
      `$${price}/${periodLabel} — 60% of your ride earnings will go toward this subscription until fully collected. Then you keep 100%.`,
      [
        { text: 'Cancel' },
        { text: 'Subscribe', onPress: () => startCollection(planId, price) },
      ],
    );
  };

  const startCollection = async (planId: string, price: number) => {
    setSubscribing(planId);
    try {
      const now = new Date();
      const periodEnd = new Date(now);
      if (planId === 'daily') {
        periodEnd.setDate(periodEnd.getDate() + 1);
      } else if (planId === 'weekly') {
        periodEnd.setDate(periodEnd.getDate() + 7);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // Create subscription record in collecting state
      await supabase.from('driver_subscriptions').insert({
        driver_id: user!.id,
        plan: planId,
        price,
        status: 'collecting',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      });

      // Update driver — start 60% skim
      await supabase.from('drivers').update({
        subscription_status: 'collecting',
        subscription_target: price,
        subscription_collected: 0,
        subscription_expires_at: periodEnd.toISOString(),
      }).eq('id', user!.id);

      await fetchData();
      Alert.alert(
        'Collection Started',
        `60% of your ride earnings will go toward your $${price} subscription. Once collected, you keep 100% for the rest of the period.`,
      );
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    Alert.alert('Cancel Subscription', 'Are you sure? You won\'t be able to go online.', [
      { text: 'Keep Plan' },
      {
        text: 'Cancel', style: 'destructive',
        onPress: async () => {
          if (!user) return;
          await supabase.from('drivers').update({
            subscription_status: 'canceled',
            subscription_collected: 0,
            subscription_target: 0,
          }).eq('id', user.id);
          if (subscription?.id) {
            await supabase.from('driver_subscriptions').update({ status: 'canceled' }).eq('id', subscription.id);
          }
          await fetchData();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: t.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={appColors.orange} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]} showsVerticalScrollIndicator={false}>
      {/* Status card */}
      <View style={[styles.statusCard, {
        backgroundColor: t.card,
        borderColor: isActive ? colors.success : isCollecting ? appColors.orange : t.cardBorder,
      }]}>
        <View style={styles.statusRow}>
          <View>
            <Text style={[styles.statusLabel, { color: t.textSecondary }]}>Subscription Status</Text>
            <Text style={[styles.statusValue, {
              color: isActive ? colors.success : isCollecting ? appColors.orange : colors.error,
            }]}>
              {isActive ? 'Active' : isCollecting ? 'Collecting' : driver?.subscription_status || 'Inactive'}
            </Text>
          </View>
          {(isActive || isCollecting) && subscription?.plan && (
            <View style={[styles.planBadge, { backgroundColor: appColors.orange + '15' }]}>
              <Text style={[styles.planBadgeText, { color: appColors.orange }]}>
                {subscription.plan === 'monthly' ? 'Monthly' : subscription.plan === 'weekly' ? 'Weekly' : 'Daily'}
              </Text>
            </View>
          )}
        </View>

        {/* Collection progress bar */}
        {isCollecting && target > 0 && (
          <View style={styles.collectionSection}>
            <View style={styles.collectionRow}>
              <Text style={[styles.collectionLabel, { color: t.textSecondary }]}>Collected</Text>
              <Text style={[styles.collectionValue, { color: t.text }]}>
                ${collected.toFixed(2)} / ${target.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: t.cardBorder }]}>
              <View style={[styles.progressFill, {
                backgroundColor: appColors.orange,
                width: `${collectionProgress * 100}%`,
              }]} />
            </View>
            <Text style={[styles.remainingText, { color: t.textSecondary }]}>
              ${remaining.toFixed(2)} remaining · 60% of ride earnings
            </Text>
          </View>
        )}

        {/* Skim explainer when collecting */}
        {isCollecting && (
          <View style={[styles.skimBanner, { backgroundColor: appColors.orange + '10' }]}>
            <AlertTriangle size={12} color={appColors.orange} strokeWidth={2} />
            <Text style={[styles.skimText, { color: appColors.orange }]}>
              60% of each ride fare goes toward your subscription. Once fully collected, you keep 100%.
            </Text>
          </View>
        )}

        {subscription?.current_period_end && isActive && (
          <Text style={[styles.renewText, { color: t.textSecondary }]}>
            Renews {new Date(subscription.current_period_end).toLocaleDateString()}
          </Text>
        )}

        {(isActive || isCollecting) && (
          <TouchableOpacity onPress={handleCancel} style={styles.cancelLink}>
            <Text style={[styles.cancelLinkText, { color: colors.error }]}>Cancel subscription</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* How it works */}
      <View style={[styles.howItWorks, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <Text style={[styles.howTitle, { color: t.text }]}>How Subscription Works</Text>
        <View style={styles.howRow}>
          <Zap size={12} color={appColors.orange} strokeWidth={2} />
          <Text style={[styles.howText, { color: t.textSecondary }]}>
            <Text style={{ fontWeight: '700', color: t.text }}>Subscribe</Text> — choose a plan and start driving. No card needed.
          </Text>
        </View>
        <View style={styles.howRow}>
          <AlertTriangle size={12} color={appColors.orange} strokeWidth={2} />
          <Text style={[styles.howText, { color: t.textSecondary }]}>
            <Text style={{ fontWeight: '700', color: t.text }}>60% skim</Text> — 60% of each ride fare goes toward your subscription until fully collected.
          </Text>
        </View>
        <View style={styles.howRow}>
          <Crown size={12} color={appColors.orange} strokeWidth={2} />
          <Text style={[styles.howText, { color: t.textSecondary }]}>
            <Text style={{ fontWeight: '700', color: t.text }}>Keep 100%</Text> — once your subscription is paid off, you keep 100% of fares for the rest of the period.
          </Text>
        </View>
      </View>

      {/* No commission banner */}
      <View style={[styles.banner, { backgroundColor: colors.success + '10' }]}>
        <Crown size={14} color={colors.success} strokeWidth={2} />
        <Text style={[styles.bannerText, { color: colors.success }]}>
          No commission ever — keep 100% of your fares after subscription
        </Text>
      </View>

      {/* Plans */}
      <Text style={[styles.sectionTitle, { color: t.textSecondary }]}>Choose a plan</Text>

      {PLANS.map((plan) => {
        const isCurrent = (isActive || isCollecting) && subscription?.plan === plan.id;
        return (
          <View
            key={plan.id}
            style={[
              styles.planCard,
              { backgroundColor: t.card, borderColor: plan.best ? appColors.orange : t.cardBorder },
            ]}
          >
            {plan.best && (
              <View style={[styles.bestBadge, { backgroundColor: appColors.orange }]}>
                <Text style={styles.bestText}>BEST VALUE</Text>
              </View>
            )}
            <View style={styles.planHeader}>
              <Text style={[styles.planName, { color: t.text }]}>{plan.name}</Text>
              <Text style={[styles.planPrice, { color: t.text }]}>
                ${plan.price}<Text style={[styles.planPer, { color: t.textSecondary }]}>/{plan.period}</Text>
              </Text>
            </View>
            {plan.savings && (
              <Text style={[styles.savings, { color: colors.success }]}>{plan.savings}</Text>
            )}
            <View style={styles.features}>
              {plan.features.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Check size={12} color={colors.success} strokeWidth={2.5} />
                  <Text style={[styles.featureText, { color: t.textSecondary }]}>{f}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[
                styles.subscribeBtn,
                { backgroundColor: isCurrent ? t.cardBorder : appColors.orange },
              ]}
              onPress={() => handleSubscribe(plan.id, plan.price)}
              disabled={subscribing !== null || isCurrent}
              activeOpacity={0.8}
            >
              {subscribing === plan.id ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.subscribeBtnText}>
                  {isCurrent ? 'Current Plan' : 'Subscribe'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        );
      })}

      {/* Stripe fees note */}
      <Text style={[styles.footerNote, { color: t.textSecondary }]}>
        Subscription covers platform access, GPS matching, and rider connections. Stripe processing fees (2.9% + $0.30) and dispute protection ($0.30) apply per ride.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  statusCard: { padding: 14, borderRadius: 10, borderWidth: 1.5, marginBottom: 14 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statusLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusValue: { fontSize: 18, fontWeight: '800', marginTop: 2, textTransform: 'capitalize' },
  planBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  planBadgeText: { fontSize: 10, fontWeight: '600' },
  collectionSection: { marginTop: 14 },
  collectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  collectionLabel: { fontSize: 10, fontWeight: '500' },
  collectionValue: { fontSize: 13, fontWeight: '700' },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  remainingText: { fontSize: 10, fontWeight: '400', marginTop: 4 },
  skimBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 6, marginTop: 12 },
  skimText: { fontSize: 10, fontWeight: '500', flex: 1, lineHeight: 14 },
  renewText: { fontSize: 10, fontWeight: '400', marginTop: 10 },
  cancelLink: { marginTop: 8 },
  cancelLinkText: { fontSize: 11, fontWeight: '500' },
  howItWorks: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 14, gap: 10 },
  howTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  howText: { fontSize: 11, lineHeight: 16, flex: 1 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, marginBottom: 18 },
  bannerText: { fontSize: 11, fontWeight: '600', flex: 1 },
  sectionTitle: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  planCard: { padding: 14, borderRadius: 10, borderWidth: 1.5, marginBottom: 12, overflow: 'hidden' },
  bestBadge: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 8, paddingVertical: 3, borderBottomLeftRadius: 8 },
  bestText: { color: '#FFF', fontSize: 8, fontWeight: '700', letterSpacing: 0.8 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  planName: { fontSize: 14, fontWeight: '600' },
  planPrice: { fontSize: 20, fontWeight: '700' },
  planPer: { fontSize: 11, fontWeight: '400' },
  savings: { fontSize: 10, fontWeight: '500', marginTop: 2 },
  features: { marginTop: 10, gap: 6 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureText: { fontSize: 11, fontWeight: '400' },
  subscribeBtn: { height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  subscribeBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  footerNote: { fontSize: 9, fontWeight: '300', lineHeight: 13, marginTop: 4, marginBottom: 40, paddingHorizontal: 2 },
});
