import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Linking } from 'react-native';
import { Phone, MessageSquare, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  riderName: string;
  riderPhone?: string;
}

export default function ContactModal({ visible, onClose, riderName, riderPhone }: Props) {
  const { t, colors } = useTheme();

  const handleCall = () => {
    if (riderPhone) Linking.openURL(`tel:${riderPhone}`);
    onClose();
  };

  const handleText = () => {
    if (riderPhone) Linking.openURL(`sms:${riderPhone}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.card, { backgroundColor: t.card }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={18} color={t.textSecondary} strokeWidth={2} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: t.text }]}>Contact {riderName}</Text>

          <TouchableOpacity style={[styles.optionBtn, { backgroundColor: colors.orange }]} onPress={handleCall} activeOpacity={0.8}>
            <Phone size={18} color="#FFF" strokeWidth={2} />
            <Text style={styles.optionText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionBtn, { backgroundColor: t.background, borderColor: t.cardBorder, borderWidth: 1 }]} onPress={handleText} activeOpacity={0.8}>
            <MessageSquare size={18} color={t.text} strokeWidth={2} />
            <Text style={[styles.optionText, { color: t.text }]}>Text Message</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 32 },
  card: { borderRadius: 1, padding: 24, gap: 14 },
  closeBtn: { position: 'absolute', top: 14, right: 14, zIndex: 1 },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  optionBtn: {
    height: 48,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  optionText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
});
