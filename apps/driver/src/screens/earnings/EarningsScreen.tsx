import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { DollarSign, TrendingUp, Zap, AlertCircle, ExternalLink, ArrowUpRight } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { useStripeConnect } from '../../hooks/useStripeConnect';

type Period = 'today' | 'week' | 'month';

export default function EarningsScreen() {
  const { t, colors } = useTheme();
  const { user } = useAuth();
  const stripe = useStripeConnect(user?.id);
  const [period, setPeriod] = useState<Period>('today');
  const [earnings, setEarnings] = useState({ gross: 0, stripeFees: 0, disputeFees: 0, net: 0, rides: 0 });
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('drivers').select('total_earnings, total_rides, subscription_status')
      .eq('id', user.id).single().then(({ data }) => setDriver(data));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchEarnings();
  }, [user, period]);

  const fetchEarnings = async () => {
    if (!user) return;
    setLoading(true);

    const now = new Date();
    let fromDate: string;

    if (period === 'today') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (period === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      fromDate = new Date(now.getFullYear(), now.getMonth(), diff).toISOString();
    } else {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

    const { data } = await supabase
      .from('driver_earnings')
      .select('gross_amount, net_amount, stripe_fee, dispute_fee')
      .eq('driver_id', user.id)
      .gte('created_at', fromDate);

    const rows = data || [];
    const gross = rows.reduce((s, e) => s + Number(e.gross_amount || e.net_amount || 0), 0);
    const stripeFees = rows.reduce((s, e) => s + Number(e.stripe_fee || 0), 0);
    const disputeFees = rows.reduce((s, e) => s + Number(e.dispute_fee || 0), 0);
    const net = rows.reduce((s, e) => s + Number(e.net_amount || 0), 0);
    setEarnings({ gross, stripeFees, disputeFees, net, rides: rows.length });
    setLoading(false);
  };

  const [payoutLoading, setPayoutLoading] = useState(false);

  const handleInstantPayout = () => {
    if (!user || !stripe.onboardingComplete) return;
    Alert.alert(
      'Instant Payout',
      'Transfer your available balance to your bank instantly. A 1.5% fee applies.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Payout',
          onPress: async () => {
            setPayoutLoading(true);
            try {
              const { data, error } = await supabase.functions.invoke('request-instant-payout', {
                body: { driver_id: user.id },
              });
              if (error || data?.error) {
                Alert.alert('Payout Failed', data?.error || error?.message || 'Something went wrong.');
              } else {
                Alert.alert(
                  'Payout Sent!',
                  `$${Number(data.amount).toFixed(2)} is on the way to your bank.\nFee: $${Number(data.fee).toFixed(2)}`,
                );
              }
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not process payout.');
            }
            setPayoutLoading(false);
          },
        },
      ],
    );
  };

  const needsStripeSetup = !stripe.loading && !stripe.accountId;
  const stripeIncomplete = !stripe.loading && stripe.accountId && !stripe.onboardingComplete;

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]} showsVerticalScrollIndicator={false}>
      {/* Stripe setup banner */}
      {needsStripeSetup && (
        <TouchableOpacity
          style={[styles.setupBanner, { backgroundColor: colors.orange + '12', borderColor: colors.orange }]}
          onPress={stripe.startOnboarding}
          activeOpacity={0.8}
        >
          <AlertCircle size={16} color={colors.orange} strokeWidth={2} />
          <View style={styles.setupBannerContent}>
            <Text style={[styles.setupTitle, { color: colors.orange }]}>Set up payouts</Text>
            <Text style={[styles.setupDesc, { color: t.textSecondary }]}>
              Connect your bank account to receive ride earnings via Stripe.
            </Text>
          </View>
          <ExternalLink size={14} color={colors.orange} strokeWidth={2} />
        </TouchableOpacity>
      )}

      {stripeIncomplete && (
        <TouchableOpacity
          style={[styles.setupBanner, { backgroundColor: 'rgba(255,193,7,0.1)', borderColor: '#FFC107' }]}
          onPress={stripe.startOnboarding}
          activeOpacity={0.8}
        >
          <AlertCircle size={16} color="#FFC107" strokeWidth={2} />
          <View style={styles.setupBannerContent}>
            <Text style={[styles.setupTitle, { color: '#FFC107' }]}>Complete payout setup</Text>
            <Text style={[styles.setupDesc, { color: t.textSecondary }]}>
              Your Stripe account needs more info before payouts can be enabled.
            </Text>
          </View>
          <ExternalLink size={14} color="#FFC107" strokeWidth={2} />
        </TouchableOpacity>
      )}

      {/* Period tabs */}
      <View style={styles.tabs}>
        {(['today', 'week', 'month'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.tab, { backgroundColor: period === p ? colors.orange : 'transparent', borderColor: period === p ? colors.orange : t.cardBorder }]}
            onPress={() => setPeriod(p)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, { color: period === p ? '#FFF' : t.textSecondary }]}>
              {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main earnings display */}
      <View style={[styles.mainCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        {loading ? (
          <ActivityIndicator color={colors.orange} style={{ paddingVertical: 20 }} />
        ) : (
          <>
            <Text style={[styles.mainLabel, { color: t.textSecondary }]}>Net Earnings</Text>
            <Text style={[styles.mainAmount, { color: colors.orange }]}>${earnings.net.toFixed(2)}</Text>
            <Text style={[styles.ridesCount, { color: t.textSecondary }]}>
              {earnings.rides} ride{earnings.rides !== 1 ? 's' : ''}
            </Text>
          </>
        )}
      </View>

      {/* Breakdown */}
      <Text style={[styles.sectionTitle, { color: t.textSecondary }]}>Breakdown</Text>
      <View style={[styles.breakdownCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <View style={styles.breakdownRow}>
          <Text style={[styles.breakdownLabel, { color: t.textSecondary }]}>Gross fares</Text>
          <Text style={[styles.breakdownValue, { color: t.text }]}>${earnings.gross.toFixed(2)}</Text>
        </View>
        <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />
        <View style={styles.breakdownRow}>
          <Text style={[styles.breakdownLabel, { color: t.textSecondary }]}>Stripe fees (2.9% + $0.30)</Text>
          <Text style={[styles.breakdownValue, { color: colors.error }]}>-${earnings.stripeFees.toFixed(2)}</Text>
        </View>
        <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />
        <View style={styles.breakdownRow}>
          <Text style={[styles.breakdownLabel, { color: t.textSecondary }]}>Dispute protection ($0.30/ride)</Text>
          <Text style={[styles.breakdownValue, { color: colors.error }]}>-${earnings.disputeFees.toFixed(2)}</Text>
        </View>
        <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />
        <View style={styles.breakdownRow}>
          <Text style={[styles.breakdownLabel, { color: t.text }]}>You keep</Text>
          <Text style={[styles.breakdownValue, { color: colors.success }]}>${earnings.net.toFixed(2)}</Text>
        </View>
      </View>

      {/* 100% fare banner */}
      <View style={[styles.banner, { backgroundColor: colors.orange + '10' }]}>
        <TrendingUp size={13} color={colors.orange} strokeWidth={2} />
        <Text style={[styles.bannerText, { color: colors.orange }]}>
          You keep 100% of every fare — no commission
        </Text>
      </View>

      {/* Lifetime stats */}
      <Text style={[styles.sectionTitle, { color: t.textSecondary }]}>Lifetime</Text>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
          <DollarSign size={14} color={colors.orange} strokeWidth={1.8} />
          <Text style={[styles.statValue, { color: t.text }]}>${Number(driver?.total_earnings || 0).toFixed(0)}</Text>
          <Text style={[styles.statLabel, { color: t.textSecondary }]}>Total earned</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
          <Zap size={14} color={colors.orange} strokeWidth={1.8} />
          <Text style={[styles.statValue, { color: t.text }]}>{driver?.total_rides || 0}</Text>
          <Text style={[styles.statLabel, { color: t.textSecondary }]}>Total rides</Text>
        </View>
      </View>

      {/* Payouts */}
      <Text style={[styles.sectionTitle, { color: t.textSecondary }]}>Payouts</Text>
      <View style={[styles.breakdownCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <View style={styles.breakdownRow}>
          <Text style={[styles.breakdownLabel, { color: t.textSecondary }]}>Payout method</Text>
          <Text style={[styles.breakdownValue, { color: t.text }]}>Stripe Connect</Text>
        </View>
        <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />
        <View style={styles.breakdownRow}>
          <Text style={[styles.breakdownLabel, { color: t.textSecondary }]}>Account status</Text>
          <Text style={[styles.breakdownValue, {
            color: stripe.onboardingComplete ? colors.success : colors.orange,
          }]}>
            {stripe.loading ? '...' : stripe.onboardingComplete ? 'Connected' : stripe.accountId ? 'Incomplete' : 'Not set up'}
          </Text>
        </View>
        <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />
        <View style={styles.breakdownRow}>
          <Text style={[styles.breakdownLabel, { color: t.textSecondary }]}>Schedule</Text>
          <Text style={[styles.breakdownValue, { color: t.text }]}>Weekly (automatic)</Text>
        </View>
        <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />
        <TouchableOpacity
          style={styles.breakdownRow}
          onPress={stripe.accountId ? stripe.openDashboard : stripe.startOnboarding}
          activeOpacity={0.7}
        >
          <Text style={[styles.breakdownLabel, { color: colors.orange, fontWeight: '500' }]}>
            {stripe.accountId ? 'Open Stripe Dashboard' : 'Set up payout account'}
          </Text>
          <ExternalLink size={13} color={colors.orange} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Instant payout button */}
      {stripe.onboardingComplete && (
        <TouchableOpacity
          style={[styles.instantPayoutBtn, { backgroundColor: colors.orange }]}
          onPress={handleInstantPayout}
          disabled={payoutLoading}
          activeOpacity={0.85}
        >
          {payoutLoading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <ArrowUpRight size={15} color="#FFF" strokeWidth={2} />
              <Text style={styles.instantPayoutText}>Instant Payout</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <Text style={[styles.footerNote, { color: t.textSecondary }]}>
        Earnings are deposited to your Stripe account weekly. Instant payouts incur a 1.5% Stripe fee.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  setupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  setupBannerContent: { flex: 1 },
  setupTitle: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  setupDesc: { fontSize: 10, fontWeight: '400', lineHeight: 14 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 7, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  tabText: { fontSize: 11, fontWeight: '500' },
  mainCard: { borderRadius: 10, borderWidth: 1, padding: 18, alignItems: 'center', marginBottom: 18 },
  mainLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  mainAmount: { fontSize: 32, fontWeight: '700', marginTop: 4 },
  ridesCount: { fontSize: 11, fontWeight: '400', marginTop: 4 },
  sectionTitle: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginLeft: 2 },
  breakdownCard: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, marginBottom: 16 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  breakdownLabel: { fontSize: 11, fontWeight: '400', flex: 1 },
  breakdownValue: { fontSize: 11, fontWeight: '600' },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, marginBottom: 18 },
  bannerText: { fontSize: 11, fontWeight: '500' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 12, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontWeight: '600' },
  statLabel: { fontSize: 9, fontWeight: '400', textTransform: 'uppercase', letterSpacing: 0.3 },
  instantPayoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 44, borderRadius: 8, marginBottom: 14,
  },
  instantPayoutText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  footerNote: { fontSize: 9, fontWeight: '300', lineHeight: 13, marginBottom: 40, paddingHorizontal: 2 },
});
