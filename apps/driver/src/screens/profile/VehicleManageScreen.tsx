import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';

export default function VehicleManageScreen() {
  const { t, colors } = useTheme();
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [plate, setPlate] = useState('');

  useEffect(() => {
    if (user) fetchVehicles();
  }, [user]);

  const fetchVehicles = async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('driver_id', user!.id)
      .order('created_at', { ascending: false });
    setVehicles(data || []);
  };

  const handleAdd = async () => {
    if (!make.trim() || !model.trim() || !year.trim() || !color.trim() || !plate.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await supabase.from('vehicles').insert({
        driver_id: user!.id,
        make: make.trim(),
        model: model.trim(),
        year: parseInt(year, 10),
        color: color.trim(),
        license_plate: plate.trim().toUpperCase(),
      });
      setMake(''); setModel(''); setYear(''); setColor(''); setPlate('');
      setShowForm(false);
      await fetchVehicles();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]} showsVerticalScrollIndicator={false}>
      {vehicles.map((v) => (
        <View key={v.id} style={[styles.vehicleCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
          <Text style={[styles.vehicleName, { color: t.text }]}>
            {v.year} {v.make} {v.model}
          </Text>
          <Text style={[styles.vehicleDetail, { color: t.textSecondary }]}>
            {v.color} · {v.license_plate}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: colors.orange + '15' }]}>
            <Text style={[styles.typeText, { color: colors.orange }]}>{v.vehicle_type}</Text>
          </View>
        </View>
      ))}

      {!showForm ? (
        <TouchableOpacity
          style={[styles.addButton, { borderColor: colors.orange }]}
          onPress={() => setShowForm(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.addText, { color: colors.orange }]}>+ Add Vehicle</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.form, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
            placeholder="Make (e.g. Toyota)"
            placeholderTextColor={t.textSecondary}
            value={make}
            onChangeText={setMake}
          />
          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
            placeholder="Model (e.g. Camry)"
            placeholderTextColor={t.textSecondary}
            value={model}
            onChangeText={setModel}
          />
          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
            placeholder="Year (e.g. 2022)"
            placeholderTextColor={t.textSecondary}
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
            maxLength={4}
          />
          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
            placeholder="Color"
            placeholderTextColor={t.textSecondary}
            value={color}
            onChangeText={setColor}
          />
          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
            placeholder="License Plate"
            placeholderTextColor={t.textSecondary}
            value={plate}
            onChangeText={setPlate}
            autoCapitalize="characters"
          />

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.orange }, loading && { opacity: 0.7 }]}
            onPress={handleAdd}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.submitText}>Save Vehicle</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowForm(false)} style={styles.cancelFormLink}>
            <Text style={[styles.cancelFormText, { color: t.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  vehicleCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  vehicleName: { fontSize: 13, fontWeight: '600' },
  vehicleDetail: { fontSize: 11, fontWeight: '400', marginTop: 3 },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  typeText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  addButton: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  addText: { fontSize: 12, fontWeight: '600' },
  form: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    marginTop: 4,
    marginBottom: 40,
  },
  input: {
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '400',
  },
  submitButton: {
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  submitText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  cancelFormLink: { alignItems: 'center', paddingVertical: 6 },
  cancelFormText: { fontSize: 12, fontWeight: '500' },
});
