import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirmCancel: () => void;
}

export default function CancelRideModal({ visible, onClose, onConfirmCancel }: Props) {
  const { t, colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.card, { backgroundColor: t.card }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={18} color={t.textSecondary} strokeWidth={2} />
          </TouchableOpacity>

          <AlertTriangle size={28} color={colors.orange} strokeWidth={2} />
          <Text style={[styles.title, { color: t.text }]}>Cancel this ride?</Text>
          <Text style={[styles.body, { color: t.textSecondary }]}>
            Wait at least 5 minutes after arriving to qualify for a $4 cancellation fee. Try reaching the rider first.
          </Text>

          <TouchableOpacity
            style={[styles.cancelBtn, { backgroundColor: colors.error }]}
            onPress={onConfirmCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelBtnText}>Yes, Cancel Ride</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.keepBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={[styles.keepBtnText, { color: colors.orange }]}>Keep Waiting</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 32 },
  card: { borderRadius: 1, padding: 24, alignItems: 'center', gap: 12 },
  closeBtn: { position: 'absolute', top: 14, right: 14, zIndex: 1 },
  title: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 13, fontWeight: '400', textAlign: 'center', lineHeight: 19 },
  cancelBtn: { width: '100%', height: 52, borderRadius: 5, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  keepBtn: { paddingVertical: 8 },
  keepBtnText: { fontSize: 12, fontWeight: '500' },
});
