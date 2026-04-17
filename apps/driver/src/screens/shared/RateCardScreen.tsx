import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { supabase } from '../../services/supabase';
import { DEFAULT_FARE_SETTINGS } from '@styl/shared';

const D = DEFAULT_FARE_SETTINGS;

const SETTING_KEYS = [
  'fare_base', 'fare_minimum', 'fare_per_mile', 'fare_per_minute',
  'booking_fee', 'stripe_fee_pct', 'stripe_fee_fixed', 'dispute_protection_fee',
  'subscription_daily', 'subscription_weekly', 'subscription_monthly',
];

const fmt = (n: number) => `$${Number(n).toFixed(2)}`;

export default function RateCardScreen({ navigation }: any) {
  const { t, colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [cfg, setCfg] = useState({
    base_fare: D.base_fare,
    booking_fee: D.booking_fee,
    fare_minimum: D.fare_minimum,
    fare_per_mile: D.fare_per_mile as Record<string, number>,
    fare_per_minute: D.fare_per_minute,
    stripe_fee_pct: D.stripe_fee_pct,
    stripe_fee_flat: D.stripe_fee_flat,
    dispute_protection_fee: D.dispute_protection_fee,
    sub_daily: 20,
    sub_weekly: 100,
    sub_monthly: 360,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('key, value')
          .in('key', SETTING_KEYS);

        if (cancelled) return;
        const raw: Record<string, any> = {};
        (data || []).forEach((r: any) => { raw[r.key] = r.value; });

        setCfg({
          base_fare: Number(raw.fare_base ?? D.base_fare),
          booking_fee: Number(raw.booking_fee ?? D.booking_fee),
          fare_minimum: Number(raw.fare_minimum ?? D.fare_minimum),
          fare_per_mile: typeof raw.fare_per_mile === 'object' && raw.fare_per_mile !== null
            ? raw.fare_per_mile
            : (D.fare_per_mile as Record<string, number>),
          fare_per_minute: Number(raw.fare_per_minute ?? D.fare_per_minute),
          stripe_fee_pct: Number(raw.stripe_fee_pct ?? D.stripe_fee_pct),
          stripe_fee_flat: Number(raw.stripe_fee_fixed ?? D.stripe_fee_flat),
          dispute_protection_fee: Number(raw.dispute_protection_fee ?? D.dispute_protection_fee),
          sub_daily: Number(raw.subscription_daily ?? 20),
          sub_weekly: Number(raw.subscription_weekly ?? 100),
          sub_monthly: Number(raw.subscription_monthly ?? 360),
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const pm = cfg.fare_per_mile;
  const fareRates = [
    { label: 'Base fare', value: fmt(cfg.base_fare) },
    { label: 'Booking fee', value: fmt(cfg.booking_fee) },
    { label: 'Minimum fare', value: fmt(cfg.fare_minimum) },
    { label: 'Per mile (Standard)', value: fmt(pm.standard ?? D.fare_per_mile.standard) },
    { label: 'Per mile (XL)', value: fmt(pm.xl ?? D.fare_per_mile.xl) },
    { label: 'Per mile (Luxury)', value: fmt(pm.luxury ?? D.fare_per_mile.luxury) },
    { label: 'Per mile (Electric)', value: fmt(pm.electric ?? D.fare_per_mile.electric) },
    { label: 'Per minute', value: fmt(cfg.fare_per_minute) },
  ];

  const deductions = [
    {
      label: 'Stripe processing fee',
      value: `${(cfg.stripe_fee_pct * 100).toFixed(1)}% + ${fmt(cfg.stripe_fee_flat)}`,
      note: 'Per transaction',
    },
    {
      label: 'Dispute resolution & protection',
      value: fmt(cfg.dispute_protection_fee),
      note: 'Per completed ride',
    },
  ];

  const monthlyViaDaily = cfg.sub_daily * 30;
  const weeklyViaDaily = cfg.sub_daily * 7;
  const monthlySavings = Math.max(0, monthlyViaDaily - cfg.sub_monthly);
  const weeklySavings = Math.max(0, weeklyViaDaily - cfg.sub_weekly);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: t.background, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.highlight, { backgroundColor: colors.orange + '12' }]}>
        <Text style={[styles.highlightTitle, { color: colors.orange }]}>You keep 100% of every fare</Text>
        <Text style={[styles.highlightSub, { color: t.textSecondary }]}>
          Zero commission. Only Stripe processing and dispute protection are deducted. Surge goes straight to you.
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: t.text }]}>Fare Rates</Text>
      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        {fareRates.map((rate, i) => (
          <React.Fragment key={rate.label}>
            {i > 0 && <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />}
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: t.textSecondary }]}>{rate.label}</Text>
              <Text style={[styles.rowValue, { color: t.text }]}>{rate.value}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: t.text }]}>Deductions</Text>
      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        {deductions.map((d, i) => (
          <React.Fragment key={d.label}>
            {i > 0 && <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: t.textSecondary }]}>{d.label}</Text>
                <Text style={[styles.rowNote, { color: t.textSecondary }]}>{d.note}</Text>
              </View>
              <Text style={[styles.rowValue, { color: colors.error }]}>{d.value}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: t.text }]}>Subscription</Text>
      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: t.textSecondary }]}>Daily plan</Text>
          <Text style={[styles.rowValue, { color: t.text }]}>{fmt(cfg.sub_daily)}/day</Text>
        </View>
        <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: t.textSecondary }]}>Weekly plan</Text>
          <Text style={[styles.rowValue, { color: t.text }]}>{fmt(cfg.sub_weekly)}/week</Text>
        </View>
        <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: t.textSecondary }]}>Monthly plan</Text>
          <Text style={[styles.rowValue, { color: t.text }]}>{fmt(cfg.sub_monthly)}/month</Text>
        </View>
        {monthlySavings > 0 && (
          <>
            <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: t.textSecondary }]}>Monthly savings vs daily</Text>
              <Text style={[styles.rowValue, { color: colors.success }]}>Save {fmt(monthlySavings)}/mo</Text>
            </View>
          </>
        )}
        {weeklySavings > 0 && (
          <>
            <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: t.textSecondary }]}>Weekly savings vs daily</Text>
              <Text style={[styles.rowValue, { color: colors.success }]}>Save {fmt(weeklySavings)}/wk</Text>
            </View>
          </>
        )}
      </View>

      <Text style={[styles.footerNote, { color: t.textSecondary }]}>
        Rates may vary based on demand. Surge pricing applies during peak hours and is passed directly to you.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  highlight: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  highlightTitle: { fontSize: 14, fontWeight: '700' },
  highlightSub: { fontSize: 11, fontWeight: '400', marginTop: 3, lineHeight: 15 },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.7 },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
  },
  rowLabel: { fontSize: 12, fontWeight: '400' },
  rowValue: { fontSize: 12, fontWeight: '600' },
  rowNote: { fontSize: 10, fontWeight: '300', marginTop: 1 },
  footerNote: { fontSize: 10, fontWeight: '300', lineHeight: 14, marginBottom: 40, paddingHorizontal: 4 },
});
