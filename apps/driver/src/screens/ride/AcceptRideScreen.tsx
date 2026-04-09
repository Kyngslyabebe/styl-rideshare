import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { supabase } from '../../services/supabase';
import { useRideSound } from '../../hooks/useRideSound';
import { useRoutePolyline } from '../../hooks/useRoutePolyline';

const TIMEOUT_SEC = 10;

export default function AcceptRideScreen({ route, navigation }: any) {
  const { rideId } = route.params;
  const { t, colors } = useTheme();
  const [ride, setRide] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_SEC);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const { playRingtone, stopRingtone } = useRideSound();
  const routeCoords = useRoutePolyline(ride?.pickup_lat, ride?.pickup_lng, ride?.dropoff_lat, ride?.dropoff_lng);

  useEffect(() => {
    playRingtone();
    (async () => {
      const { data } = await supabase.from('rides').select('*').eq('id', rideId).single();
      setRide(data);
      // rider name fetched for future use if needed
    })();
    return () => { stopRingtone(); };
  }, [rideId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const handleAccept = async () => {
    stopRingtone();
    await supabase.from('rides').update({
      status: 'driver_arriving',
      accepted_at: new Date().toISOString(),
    }).eq('id', rideId);
    navigation.replace('EnRouteToPickup', { rideId });
  };

  const handleDecline = async () => {
    stopRingtone();
    await supabase.from('rides').update({
      driver_id: null,
      status: 'searching',
    }).eq('id', rideId);
    supabase.functions.invoke('match-driver', { body: { ride_id: rideId } }).catch(() => {});
    navigation.goBack();
  };

  if (!ride) return <View style={[styles.container, { backgroundColor: '#000' }]} />;

  const distanceMi = ((ride.estimated_distance_km || 0) * 0.621371).toFixed(1);
  const durationMin = ride.estimated_duration_min || Math.round((ride.estimated_distance_km || 0) * 2.5);
  const fare = Number(ride.estimated_fare || 0);
  const rideTypeLabel = {
    standard: 'Standard',
    xl: 'XL',
    luxury: 'Luxury',
    electric: 'Eco',
  }[ride.ride_type] || 'Ride';

  const surgeAmount = ride.surge_amount || 0;
  const surgeText = surgeAmount > 0
    ? `$${surgeAmount.toFixed(2)} surge`
    : surgeAmount < 0
    ? `$${Math.abs(surgeAmount).toFixed(2)} decrease`
    : null;

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: (ride.pickup_lat + ride.dropoff_lat) / 2,
          longitude: (ride.pickup_lng + ride.dropoff_lng) / 2,
          latitudeDelta: Math.abs(ride.pickup_lat - ride.dropoff_lat) * 2.5 + 0.02,
          longitudeDelta: Math.abs(ride.pickup_lng - ride.dropoff_lng) * 2.5 + 0.02,
        }}
      >
        <Marker coordinate={{ latitude: ride.pickup_lat, longitude: ride.pickup_lng }} pinColor={colors.success} />
        <Marker coordinate={{ latitude: ride.dropoff_lat, longitude: ride.dropoff_lng }} pinColor={colors.orange} />
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={3} strokeColor="#4285F4" />
        )}
      </MapView>

      <TouchableOpacity style={styles.declineBtn} onPress={handleDecline} activeOpacity={0.8}>
        <X size={14} color="#333" strokeWidth={2.5} />
        <Text style={styles.declineText}>Decline</Text>
      </TouchableOpacity>

      {/* Bottom panel */}
      <View style={[styles.bottomPanel, { backgroundColor: t.background }]}>
        {/* Countdown */}
        <View style={styles.countdownWrapper}>
          <Animated.View style={[styles.countdownPulse, { backgroundColor: colors.orange + '20', transform: [{ scale: pulseScale }] }]} />
          <View style={[styles.countdownCircle, { borderColor: colors.orange }]}>
            <Text style={[styles.countdownNum, { color: colors.orange }]}>{timeLeft}</Text>
          </View>
        </View>

        <Text style={[styles.rideType, { color: colors.orange }]}>{rideTypeLabel}</Text>

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: t.card }]}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Text style={[styles.infoLabel, { color: t.textSecondary }]}>Pick-up</Text>
              <View style={styles.addressRow}>
                <View style={[styles.dot, { backgroundColor: colors.success }]} />
                <Text style={[styles.infoAddress, { color: t.text }]} numberOfLines={1}>
                  {ride.pickup_address}
                </Text>
              </View>
            </View>
            <Text style={[styles.infoMeta, { color: t.textSecondary }]}>
              {Math.max(Math.round(durationMin * 0.3), 1)}m  {(Number(distanceMi) * 0.35).toFixed(1)}mi
            </Text>
          </View>

          <View style={[styles.infoDivider, { borderBottomColor: t.cardBorder }]} />

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Text style={[styles.infoLabel, { color: t.textSecondary }]}>Drop-off</Text>
              <View style={styles.addressRow}>
                <View style={[styles.dot, { backgroundColor: colors.orange }]} />
                <Text style={[styles.infoAddress, { color: t.text }]} numberOfLines={1}>
                  {ride.dropoff_address}
                </Text>
              </View>
            </View>
            <Text style={[styles.infoMeta, { color: t.textSecondary }]}>
              {durationMin}m  {distanceMi}mi
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.acceptBtn, { backgroundColor: colors.orange }]}
          onPress={handleAccept}
          activeOpacity={0.85}
        >
          <Text style={styles.acceptFare}>Accept ${fare.toFixed(2)}</Text>
          {surgeText && <Text style={styles.acceptSurge}>{surgeText}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  map: { flex: 1 },
  declineBtn: {
    position: 'absolute',
    top: 54,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  declineText: { fontSize: 12, fontWeight: '600', color: '#333' },
  bottomPanel: {
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 12,
  },
  countdownWrapper: { marginTop: -24, marginBottom: 8, alignItems: 'center', justifyContent: 'center' },
  countdownPulse: { position: 'absolute', width: 52, height: 52, borderRadius: 26 },
  countdownCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownNum: { fontSize: 16, fontWeight: '600' },
  rideType: { fontSize: 10, fontWeight: '600', marginBottom: 8 },
  infoCard: { width: '100%', borderRadius: 1, paddingHorizontal: 12, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  infoLeft: { flex: 1, marginRight: 8 },
  infoLabel: { fontSize: 8, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  infoAddress: { fontSize: 10, fontWeight: '500', flex: 1 },
  infoMeta: { fontSize: 9, fontWeight: '500', textAlign: 'right' },
  infoDivider: { borderBottomWidth: StyleSheet.hairlineWidth },
  acceptBtn: {
    width: '100%',
    height: 56,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
  },
  acceptFare: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  acceptSurge: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '500', marginTop: 1 },
});
