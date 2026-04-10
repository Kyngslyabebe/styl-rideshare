import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Animated,
  ScrollView,
} from 'react-native';
import { CheckCircle, Star, X, ChevronDown, ChevronUp, MapPin, Heart } from 'lucide-react-native';
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
  const [stops, setStops] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (visible) {
      (async () => {
        const { data } = await supabase.from('rides').select('*').eq('id', rideId).single();
        setRide(data);

        // Fetch stops
        const { data: stopsData } = await supabase
          .from('ride_stops')
          .select('*')
          .eq('ride_id', rideId)
          .order('stop_order');
        setStops(stopsData || []);

        // Fetch earnings record
        if (data?.driver_id) {
          const { data: earningsData } = await supabase
            .from('driver_earnings')
            .select('*')
            .eq('ride_id', rideId)
            .eq('driver_id', data.driver_id)
            .limit(1)
            .single();
          setEarnings(earningsData);
        }
      })();
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
      setRating(0);
      setShowDetails(false);
    }
  }, [visible, rideId]);

  const handleRate = async (stars: number) => {
    setRating(stars);
    await supabase.from('rides').update({
      driver_rating: stars,
    }).eq('id', rideId);
  };

  const fare = Number(ride?.final_fare || ride?.estimated_fare || 0);
  const tipAmount = Number(ride?.tip_amount || earnings?.tip_amount || 0);
  const stripeFee = Number(earnings?.stripe_fee ?? (fare * 0.029 + 0.30));
  const disputeFee = Number(earnings?.dispute_protection_fee ?? 0.30);
  const subscriptionSkim = Number(earnings?.subscription_skim || ride?.subscription_skim || 0);
  const netEarnings = Number(earnings?.net_amount ?? Math.max(fare - stripeFee - disputeFee - subscriptionSkim + tipAmount, 0));
  const distanceMi = ((ride?.estimated_distance_km || 0) * 0.621371).toFixed(1);
  const durationMin = ride?.estimated_duration_min || Math.round((ride?.estimated_distance_km || 0) * 2.5);
  const rideType = ride?.ride_type || 'standard';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={[styles.card, { backgroundColor: t.card }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={18} color={t.textSecondary} strokeWidth={2} />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <CheckCircle size={36} color={colors.success} strokeWidth={1.5} />
            <Text style={[styles.title, { color: t.text }]}>Ride Complete</Text>

            {/* Fare */}
            <Text style={[styles.fareAmount, { color: colors.orange }]}>${fare.toFixed(2)}</Text>

            {/* Tip indicator */}
            {tipAmount > 0 && (
              <View style={[styles.tipBadge, { backgroundColor: colors.success + '12' }]}>
                <Heart size={12} color={colors.success} strokeWidth={2} fill={colors.success} />
                <Text style={[styles.tipBadgeText, { color: colors.success }]}>
                  +${tipAmount.toFixed(2)} tip
                </Text>
              </View>
            )}

            {/* Quick breakdown */}
            <View style={[styles.breakdownCard, { backgroundColor: t.background }]}>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: t.textSecondary }]}>Rider paid</Text>
                <Text style={[styles.rowValue, { color: t.text }]}>${fare.toFixed(2)}</Text>
              </View>
              {tipAmount > 0 && (
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, { color: t.textSecondary }]}>Tip</Text>
                  <Text style={[styles.rowValue, { color: colors.success }]}>+${tipAmount.toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: t.textSecondary }]}>Stripe fees</Text>
                <Text style={[styles.rowValue, { color: colors.error }]}>-${stripeFee.toFixed(2)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: t.textSecondary }]}>Dispute protection</Text>
                <Text style={[styles.rowValue, { color: colors.error }]}>-${disputeFee.toFixed(2)}</Text>
              </View>
              {subscriptionSkim > 0 && (
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, { color: t.textSecondary }]}>Subscription</Text>
                  <Text style={[styles.rowValue, { color: colors.error }]}>-${subscriptionSkim.toFixed(2)}</Text>
                </View>
              )}
              <View style={[styles.divider, { borderBottomColor: t.cardBorder }]} />
              <View style={styles.row}>
                <Text style={[styles.rowLabelBold, { color: t.text }]}>You earn</Text>
                <Text style={[styles.rowValueBold, { color: colors.success }]}>${netEarnings.toFixed(2)}</Text>
              </View>
            </View>

            {/* View Details toggle */}
            <TouchableOpacity
              style={styles.detailsToggle}
              onPress={() => setShowDetails(!showDetails)}
              activeOpacity={0.7}
            >
              <Text style={[styles.detailsToggleText, { color: colors.orange }]}>
                {showDetails ? 'Hide details' : 'View full details'}
              </Text>
              {showDetails
                ? <ChevronUp size={14} color={colors.orange} strokeWidth={2} />
                : <ChevronDown size={14} color={colors.orange} strokeWidth={2} />
              }
            </TouchableOpacity>

            {/* Expanded details */}
            {showDetails && (
              <View style={[styles.detailsCard, { backgroundColor: t.background }]}>
                {/* Route */}
                <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>ROUTE</Text>
                <View style={styles.routeRow}>
                  <View style={[styles.routeDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.routeText, { color: t.text }]} numberOfLines={1}>
                    {ride?.pickup_address || '—'}
                  </Text>
                </View>
                {stops.filter((s: any) => s.status !== 'declined').map((stop: any, i: number) => (
                  <View key={stop.id} style={styles.routeRow}>
                    <View style={[styles.routeDot, { backgroundColor: colors.warning }]} />
                    <Text style={[styles.routeText, { color: t.text }]} numberOfLines={1}>
                      Stop {i + 1}: {stop.address}
                    </Text>
                    {stop.additional_fare > 0 && (
                      <Text style={[styles.stopFare, { color: t.textSecondary }]}>
                        +${Number(stop.additional_fare).toFixed(2)}
                      </Text>
                    )}
                  </View>
                ))}
                <View style={styles.routeRow}>
                  <View style={[styles.routeDot, { backgroundColor: colors.orange }]} />
                  <Text style={[styles.routeText, { color: t.text }]} numberOfLines={1}>
                    {ride?.dropoff_address || '—'}
                  </Text>
                </View>

                <View style={[styles.detailsDivider, { borderBottomColor: t.cardBorder }]} />

                {/* Trip stats */}
                <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>TRIP DETAILS</Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: t.textSecondary }]}>Ride type</Text>
                  <Text style={[styles.detailValue, { color: t.text }]}>{rideType.charAt(0).toUpperCase() + rideType.slice(1)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: t.textSecondary }]}>Distance</Text>
                  <Text style={[styles.detailValue, { color: t.text }]}>{distanceMi} mi</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: t.textSecondary }]}>Duration</Text>
                  <Text style={[styles.detailValue, { color: t.text }]}>{durationMin} min</Text>
                </View>
                {ride?.surge_multiplier && ride.surge_multiplier > 1 && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: t.textSecondary }]}>Surge</Text>
                    <Text style={[styles.detailValue, { color: colors.orange }]}>{ride.surge_multiplier}x</Text>
                  </View>
                )}
                {stops.length > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: t.textSecondary }]}>Stops</Text>
                    <Text style={[styles.detailValue, { color: t.text }]}>
                      {stops.filter((s: any) => s.status !== 'declined').length} completed
                    </Text>
                  </View>
                )}

                <View style={[styles.detailsDivider, { borderBottomColor: t.cardBorder }]} />

                {/* Fare breakdown */}
                <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>FARE BREAKDOWN</Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: t.textSecondary }]}>Base fare</Text>
                  <Text style={[styles.detailValue, { color: t.text }]}>$2.50</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: t.textSecondary }]}>Distance ({distanceMi} mi)</Text>
                  <Text style={[styles.detailValue, { color: t.text }]}>
                    ${(Number(distanceMi) * ({ standard: 1.93, xl: 2.90, luxury: 4.02, electric: 2.25 }[rideType] || 1.93)).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: t.textSecondary }]}>Time ({durationMin} min)</Text>
                  <Text style={[styles.detailValue, { color: t.text }]}>${(durationMin * 0.25).toFixed(2)}</Text>
                </View>
                {stops.filter((s: any) => s.additional_fare > 0 && s.status !== 'declined').length > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: t.textSecondary }]}>Stop additions</Text>
                    <Text style={[styles.detailValue, { color: t.text }]}>
                      +${stops.filter((s: any) => s.status !== 'declined').reduce((sum: number, s: any) => sum + Number(s.additional_fare || 0), 0).toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* 100% message */}
            <View style={[styles.badge, { backgroundColor: colors.orange + '12' }]}>
              <Text style={[styles.badgeText, { color: colors.orange }]}>
                You keep 100% of the fare{tipAmount > 0 ? ' + tips' : ''}. Only payment processing fees deducted.
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
          </ScrollView>
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
    maxHeight: '85%',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  closeBtn: { position: 'absolute', top: 12, right: 12, zIndex: 1 },
  title: { fontSize: 15, fontWeight: '600', marginTop: 8, marginBottom: 2 },
  fareAmount: { fontSize: 24, fontWeight: '800' },
  tipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  tipBadgeText: { fontSize: 11, fontWeight: '700' },
  breakdownCard: { width: '100%', borderRadius: 10, padding: 10, marginTop: 10, marginBottom: 4, gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 10, fontWeight: '400' },
  rowValue: { fontSize: 10, fontWeight: '600' },
  rowLabelBold: { fontSize: 11, fontWeight: '700' },
  rowValueBold: { fontSize: 12, fontWeight: '800' },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, marginVertical: 2 },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    marginBottom: 4,
  },
  detailsToggleText: { fontSize: 11, fontWeight: '600' },
  detailsCard: { width: '100%', borderRadius: 10, padding: 12, marginBottom: 8, gap: 6 },
  sectionLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
    marginTop: 4,
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeText: { flex: 1, fontSize: 10, fontWeight: '500' },
  stopFare: { fontSize: 9, fontWeight: '600' },
  detailsDivider: { borderBottomWidth: StyleSheet.hairlineWidth, marginVertical: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 10, fontWeight: '400' },
  detailValue: { fontSize: 10, fontWeight: '600' },
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
