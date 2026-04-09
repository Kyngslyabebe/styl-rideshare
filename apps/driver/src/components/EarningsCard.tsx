import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  label: string;
  amount: number;
  rides?: number;
}

export default function EarningsCard({ label, amount, rides }: Props) {
  const { t, colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
      <Text style={[styles.label, { color: t.textSecondary }]}>{label}</Text>
      <Text style={[styles.amount, { color: colors.orange }]}>
        ${amount.toFixed(2)}
      </Text>
      {rides !== undefined && (
        <Text style={[styles.rides, { color: t.textSecondary }]}>
          {rides} ride{rides !== 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amount: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 4,
  },
  rides: {
    fontSize: 10,
    fontWeight: '400',
    marginTop: 3,
  },
});
