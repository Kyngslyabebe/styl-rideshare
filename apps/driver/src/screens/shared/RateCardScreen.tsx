import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const FARE_RATES = [
  { label: 'Base fare', value: '$8.00' },
  { label: 'Booking fee', value: '$1.50' },
  { label: 'Minimum fare', value: '$8.00' },
  { label: 'Per mile (Standard)', value: '$1.93' },
  { label: 'Per mile (XL)', value: '$2.90' },
  { label: 'Per mile (Luxury)', value: '$4.02' },
  { label: 'Per mile (Eco)', value: '$2.25' },
  { label: 'Per minute', value: '$0.25' },
];

const DEDUCTIONS = [
  { label: 'Stripe processing fee', value: '2.9% + $0.30', note: 'Per transaction' },
  { label: 'Dispute resolution & protection', value: '$0.50', note: 'Per completed ride' },
];

export default function RateCardScreen({ navigation }: any) {
  const { t, colors } = useTheme();

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
        {FARE_RATES.map((rate, i) => (
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
        {DEDUCTIONS.map((d, i) => (
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
          <Text style={[styles.rowValue, { color: t.text }]}>$20/day</Text>
        </View>
        <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: t.textSecondary }]}>Weekly plan</Text>
          <Text style={[styles.rowValue, { color: t.text }]}>$100/week</Text>
        </View>
        <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: t.textSecondary }]}>Monthly plan</Text>
          <Text style={[styles.rowValue, { color: t.text }]}>$360/month</Text>
        </View>
        <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: t.textSecondary }]}>Monthly savings vs daily</Text>
          <Text style={[styles.rowValue, { color: colors.success }]}>Save $240/mo</Text>
        </View>
        <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: t.textSecondary }]}>Weekly savings vs daily</Text>
          <Text style={[styles.rowValue, { color: colors.success }]}>Save $40/wk</Text>
        </View>
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
