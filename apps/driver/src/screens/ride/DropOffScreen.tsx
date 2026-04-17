import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Navigation, HelpCircle, Smartphone } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { supabase } from '../../services/supabase';
import { useNavPreference, openNavigation } from '../../hooks/useNavPreference';
import SlideButton from '../../components/SlideButton';
import { useRoutePolyline } from '../../hooks/useRoutePolyline';
import ContactModal from '../../components/ContactModal';
import { usePlatformConfig } from '../../hooks/usePlatformConfig';
import { haversineMeters } from '../../utils/geo';

export default function DropOffScreen({ route, navigation }: any) {
  const { rideId } = route.params;
  const { t, colors } = useTheme();
  const [ride, setRide] = useState<any>(null);
  const [riderName, setRiderName] = useState('Rider');
  const [riderPhone, setRiderPhone] = useState<string | undefined>();
  const [showContact, setShowContact] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const { navApp } = useNavPreference();
  const { arrivalRadiusM } = usePlatformConfig();
  const routeCoords = useRoutePolyline(userLoc?.lat, userLoc?.lng, ride?.dropoff_lat, ride?.dropoff_lng);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('rides').select('*').eq('id', rideId).single();
      setRide(data);
      if (data?.rider_id) {
        const { data: p } = await supabase.from('profiles').select('full_name, phone').eq('id', data.rider_id).single();
        if (p?.full_name) setRiderName(p.full_name.split(' ')[0]);
        if (p?.phone) setRiderPhone(p.phone);
      }
      const loc = await Location.getCurrentPositionAsync({});
      setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, [rideId]);

  const handleSlideDropoff = async () => {
    // GPS proximity check — must be within arrivalRadiusM of dropoff
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const distM = haversineMeters(loc.coords.latitude, loc.coords.longitude, ride.dropoff_lat, ride.dropoff_lng);

      if (distM > arrivalRadiusM) {
        await supabase.from('ride_flags').insert({
          ride_id: rideId,
          driver_id: ride.driver_id,
          flag_type: 'gps_mismatch',
          description: `Driver swiped dropoff ${Math.round(distM)}m from destination (limit: ${arrivalRadiusM}m)`,
          driver_lat: loc.coords.latitude,
          driver_lng: loc.coords.longitude,
          expected_lat: ride.dropoff_lat,
          expected_lng: ride.dropoff_lng,
          distance_meters: Math.round(distM),
        });
        Alert.alert(
          'Too far from drop-off',
          `You need to be within ${arrivalRadiusM}m of the drop-off location. You are ${Math.round(distM)}m away.`
        );
        return;
      }
    } catch {
      // If location fails, allow the swipe
    }

    // Set status to completed FIRST — process-payment requires it
    await supabase.from('rides').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', rideId);

    // Then process payment (non-blocking)
    supabase.functions.invoke('process-payment', {
      body: { ride_id: rideId },
    }).catch((err: any) => console.warn('process-payment error:', err));

    navigation.replace('RideComplete', { rideId });
  };

  const handleOpenNav = () => {
    if (!ride) return;
    openNavigation(ride.dropoff_lat, ride.dropoff_lng, navApp);
  };

  if (!ride) return <View style={[styles.container, { backgroundColor: t.background }]} />;

  const distanceMi = ((ride.estimated_distance_km || 0) * 0.621371).toFixed(1);
  const durationMin = ride.estimated_duration_min || Math.round((ride.estimated_distance_km || 0) * 2.5);
  const fare = Number(ride.estimated_fare || 0);

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        initialRegion={{
          latitude: ride.dropoff_lat,
          longitude: ride.dropoff_lng,
          latitudeDelta: 0.035,
          longitudeDelta: 0.035,
        }}
      >
        <Marker coordinate={{ latitude: ride.dropoff_lat, longitude: ride.dropoff_lng }} pinColor={colors.orange} />
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#FF6B00" geodesic lineCap="round" lineJoin="round" />
        )}
      </MapView>

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.orange }]} onPress={handleOpenNav} activeOpacity={0.85}>
          <Navigation size={14} color="#FFF" strokeWidth={2} />
          <Text style={styles.navBtnText}>Navigate</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.topBtn, { backgroundColor: t.card }]} activeOpacity={0.8}>
          <HelpCircle size={16} color={colors.orange} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Bottom panel */}
      <View style={[styles.panel, { backgroundColor: t.card }]}>
        <Text style={[styles.heading, { color: colors.orange }]}>Drop off</Text>
        <Text style={[styles.address, { color: t.text }]} numberOfLines={1}>
          {ride.dropoff_address}
        </Text>

        {/* Trip info row */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={[styles.infoValue, { color: t.text }]}>{distanceMi}mi</Text>
            <Text style={[styles.infoLabel, { color: t.textSecondary }]}>Dist</Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: t.cardBorder }]} />
          <View style={styles.infoItem}>
            <Text style={[styles.infoValue, { color: t.text }]}>{durationMin}m</Text>
            <Text style={[styles.infoLabel, { color: t.textSecondary }]}>ETA</Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: t.cardBorder }]} />
          <View style={styles.infoItem}>
            <Text style={[styles.infoValue, { color: t.text }]}>${fare.toFixed(2)}</Text>
            <Text style={[styles.infoLabel, { color: t.textSecondary }]}>Fare</Text>
          </View>
        </View>

        <SlideButton
          label="Slide to drop off"
          onSlideComplete={handleSlideDropoff}
          color={colors.orange}
        />

        {/* Contact row */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowContact(true)} activeOpacity={0.7}>
            <View style={[styles.actionCircle, { backgroundColor: colors.orange + '12' }]}>
              <Smartphone size={20} color={colors.orange} strokeWidth={2} />
            </View>
            <Text style={[styles.actionLabel, { color: t.textSecondary }]}>Contact</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ContactModal visible={showContact} onClose={() => setShowContact(false)} riderName={riderName} riderPhone={riderPhone} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  navBtn: {
    paddingHorizontal: 18,
    height: 36,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  navBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  topBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  panel: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 10,
  },
  heading: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  address: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 14,
    paddingVertical: 6,
  },
  infoItem: { alignItems: 'center', gap: 1 },
  infoValue: { fontSize: 13, fontWeight: '700' },
  infoLabel: { fontSize: 8, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  infoDivider: { width: 1, height: 22 },
  actionRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 14 },
  actionBtn: { alignItems: 'center', gap: 6 },
  actionCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 10, fontWeight: '500' },
});
