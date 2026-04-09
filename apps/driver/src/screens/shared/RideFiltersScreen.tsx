import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const RIDE_TYPES = [
  { key: 'standard', label: 'Accept Standard' },
  { key: 'xl', label: 'Accept XL' },
  { key: 'luxury', label: 'Accept Luxury' },
  { key: 'electric', label: 'Accept Electric' },
];

export default function RideFiltersScreen({ navigation }: any) {
  const { t, colors } = useTheme();
  const [filters, setFilters] = useState<Record<string, boolean>>({
    standard: true,
    xl: true,
    luxury: true,
    electric: true,
  });

  const toggle = (key: string) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        {RIDE_TYPES.map((type, index) => (
          <React.Fragment key={type.key}>
            {index > 0 && <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />}
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: t.text }]}>{type.label}</Text>
              <Switch
                value={filters[type.key]}
                onValueChange={() => toggle(type.key)}
                trackColor={{ false: t.inputBorder, true: colors.orange }}
                thumbColor="#FFFFFF"
              />
            </View>
          </React.Fragment>
        ))}
      </View>

      <Text style={[styles.note, { color: t.textSecondary }]}>
        Turn off ride types you don't want to receive
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
  },
  rowLabel: { fontSize: 12, fontWeight: '500' },
  note: { fontSize: 10, fontWeight: '300', textAlign: 'center', marginBottom: 40 },
});
