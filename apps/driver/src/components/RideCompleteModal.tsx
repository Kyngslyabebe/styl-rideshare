import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated } from 'react-native';
import { CheckCircle, Star, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { supabase } from '../services/supabase';

interface Props {
  visible: boolean;
  rideId: string;
  onClose: () => void;
}

export default function RideCompleteModal({ visible, rideId, onClose }: Props) {
  const { t, colors } = useTheme();
  const [ride, setRide] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (visible) {
      (async () => {
        const { data } = await supabase.from('rides').select('*').eq('id', rideId).single();
        setRide(data);
      })();
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
      setRating(0);
    }
  }, [visible, rideId]);

  const handleRate = async (stars: number) => {
    setRating(stars);
    await supabase.from('rides').update({
      driver_rating: stars,
    }).eq('id', rideId);
  };

  const fare = Number(ride?.final_fare || ride?.estimated_fare || 0);
  const stripeFee = fare * 0.029 + 0.30;
  const disputeFee = 0.30;
  const netEarnings = Math.max(fare - stripeFee - disputeFee, 0);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={[styles.card, { backgroundColor: t.card }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={18} color={t.textSecondary} strokeWidth={2} />
          </TouchableOpacity>

          <CheckCircle size={36} color={colors.success} strokeWidth={1.5} />
          <Text style={[styles.title, { color: t.text }]}>Ride Complete</Text>

          {/* Fare */}
          <Text style={[styles.fareAmount, { color: colors.orange }]}>${fare.toFixed(2)}</Text>

          {/* Breakdown */}
          <View style={[styles.breakdownCard, { backgroundColor: t.background }]}>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: t.textSecondary }]}>Rider paid</Text>
              <Text style={[styles.rowValue, { color: t.text }]}>${fare.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: t.textSecondary }]}>Stripe fees</Text>
              <Text style={[styles.rowValue, { color: colors.error }]}>-${stripeFee.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: t.textSecondary }]}>Dispute protection</Text>
              <Text style={[styles.rowValue, { color: colors.error }]}>-${disputeFee.toFixed(2)}</Text>
            </View>
            <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />
            <View style={styles.row}>
              <Text style={[styles.rowLabelBold, { color: t.text }]}>You earn</Text>
              <Text style={[styles.rowValueBold, { color: colors.success }]}>${netEarnings.toFixed(2)}</Text>
            </View>
          </View>

          {/* 100% message */}
          <View style={[styles.badge, { backgroundColor: colors.orange + '12' }]}>
            <Text style={[styles.badgeText, { color: colors.orange }]}>
              You keep 100% of the fare. Only payment processing fees deducted.
            </Text>
          </View>

          {/* Star rating */}
          <Text style={[styles.rateLabel, { color: t.text }]}>Rate rider</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => handleRate(star)} activeOpacity={0.7}>
                <Star
                  size={28}
                  color={star <= rating ? colors.orange : t.cardBorder}
                  fill={star <= rating ? colors.orange : 'transparent'}
                  strokeWidth={1.5}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.orange }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    borderRadius: 1,
    padding: 20,
    alignItems: 'center',
  },
  closeBtn: { position: 'absolute', top: 12, right: 12, zIndex: 1 },
  title: { fontSize: 15, fontWeight: '600', marginTop: 8, marginBottom: 2 },
  fareAmount: { fontSize: 24, fontWeight: '800' },
  breakdownCard: { width: '100%', borderRadius: 10, padding: 10, marginTop: 10, marginBottom: 8, gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 10, fontWeight: '400' },
  rowValue: { fontSize: 10, fontWeight: '600' },
  rowLabelBold: { fontSize: 11, fontWeight: '700' },
  rowValueBold: { fontSize: 12, fontWeight: '800' },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, marginVertical: 2 },
  badge: { width: '100%', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 12 },
  badgeText: { fontSize: 10, fontWeight: '600', textAlign: 'center', lineHeight: 14 },
  rateLabel: { fontSize: 11, fontWeight: '600', marginBottom: 8 },
  starsRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  doneBtn: {
    width: '100%',
    height: 46,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
});
