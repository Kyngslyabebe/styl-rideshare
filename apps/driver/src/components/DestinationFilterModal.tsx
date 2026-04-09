import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

const STORAGE_KEY = 'styl_ride_filters';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function DestinationFilterModal({ visible, onClose }: Props) {
  const { t, colors } = useTheme();
  const [destination, setDestination] = useState('');
  const [maxEta, setMaxEta] = useState('15');
  const [chainedRides, setChainedRides] = useState(true);
  const [editingEta, setEditingEta] = useState(false);

  // Load persisted filters
  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.destination) setDestination(parsed.destination);
          if (parsed.maxEta) setMaxEta(parsed.maxEta);
          if (parsed.chainedRides !== undefined) setChainedRides(parsed.chainedRides);
        }
      } catch {}
    })();
  }, [visible]);

  const persist = async (updates: Record<string, any>) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const current = stored ? JSON.parse(stored) : {};
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...updates }));
    } catch {}
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.card, { backgroundColor: t.card }]} onStartShouldSetResponder={() => true}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={18} color={t.textSecondary} strokeWidth={2} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: t.text }]}>Ride Preferences</Text>

          {/* Destination filter */}
          <Text style={[styles.label, { color: t.text }]}>
            Destination filter: <Text style={{ color: t.textSecondary, fontWeight: '400' }}>{destination || 'Off'}</Text>
          </Text>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.orange }]} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>Set destination</Text>
          </TouchableOpacity>

          {/* Max pickup ETA */}
          <Text style={[styles.label, { color: t.text }]}>
            Max pickup ETA: <Text style={{ color: t.textSecondary, fontWeight: '400' }}>{maxEta} min</Text>
          </Text>
          {editingEta ? (
            <View style={styles.editRow}>
              <TextInput
                style={[styles.input, { color: t.text, borderColor: t.cardBorder }]}
                value={maxEta}
                onChangeText={setMaxEta}
                keyboardType="numeric"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.orange, flex: 1 }]}
                onPress={() => { setEditingEta(false); persist({ maxEta }); }}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.orange }]} onPress={() => setEditingEta(true)} activeOpacity={0.8}>
              <Text style={styles.actionBtnText}>Customize</Text>
            </TouchableOpacity>
          )}

          {/* Chained rides */}
          <Text style={[styles.label, { color: t.text }]}>
            Chained rides: <Text style={{ color: t.textSecondary, fontWeight: '400' }}>{chainedRides ? 'Allowed' : 'Blocked'}</Text>
          </Text>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.orange }]}
            onPress={() => {
              const next = !chainedRides;
              setChainedRides(next);
              persist({ chainedRides: next });
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>{chainedRides ? 'Block' : 'Allow'}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 28 },
  card: { borderRadius: 12, padding: 24, gap: 10 },
  closeBtn: { position: 'absolute', top: 14, right: 14, zIndex: 1 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  actionBtn: { height: 44, borderRadius: 5, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  editRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, height: 42, borderWidth: 1, borderRadius: 5, paddingHorizontal: 12, fontSize: 14 },
});
