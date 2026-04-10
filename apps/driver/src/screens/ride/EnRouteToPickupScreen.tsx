import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Navigation, Filter, HelpCircle, X, Smartphone } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { supabase } from '../../services/supabase';
import { useNavPreference, openNavigation } from '../../hooks/useNavPreference';
import SlideButton from '../../components/SlideButton';
import { useRoutePolyline } from '../../hooks/useRoutePolyline';
import ContactModal from '../../components/ContactModal';
import CancelRideModal from '../../components/CancelRideModal';
import DestinationFilterModal from '../../components/DestinationFilterModal';
import { ARRIVAL_RADIUS_METERS } from '@styl/shared';
import { haversineMeters } from '../../utils/geo';

export default function EnRouteToPickupScreen({ route, navigation }: any) {
  const { rideId } = route.params;
  const { t, colors } = useTheme();
  const [ride, setRide] = useState<any>(null);
  const [riderName, setRiderName] = useState('Rider');
  const [riderPhone, setRiderPhone] = useState<string | undefined>();
  const [showContact, setShowContact] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const { navApp } = useNavPreference();

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

  const routeCoords = useRoutePolyline(userLoc?.lat, userLoc?.lng, ride?.pickup_lat, ride?.pickup_lng);

  const handleSlideArrive = async () => {
    // GPS proximity check — must be within ARRIVAL_RADIUS_METERS of pickup
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const distM = haversineMeters(loc.coords.latitude, loc.coords.longitude, ride.pickup_lat, ride.pickup_lng);

      if (distM > ARRIVAL_RADIUS_METERS) {
        // Flag early arrival swipe attempt
        await supabase.from('ride_flags').insert({
          ride_id: rideId,
          driver_id: ride.driver_id,
          flag_type: 'early_arrival_swipe',
          description: `Driver swiped arrived ${Math.round(distM)}m from pickup (limit: ${ARRIVAL_RADIUS_METERS}m)`,
          driver_lat: loc.coords.latitude,
          driver_lng: loc.coords.longitude,
          expected_lat: ride.pickup_lat,
          expected_lng: ride.pickup_lng,
          distance_meters: Math.round(distM),
        });
        Alert.alert(
          'Too far from pickup',
          `You need to be within ${ARRIVAL_RADIUS_METERS}m of the pickup location. You are currently ${Math.round(distM)}m away.`
        );
        return;
      }
    } catch {
      // If location fails, allow the swipe but don't block the driver
    }

    await supabase.from('rides').update({
      status: 'driver_arrived',
      driver_arrived_at: new Date().toISOString(),
    }).eq('id', rideId);
    navigation.replace('ConfirmPickup', { rideId });
  };

  const handleOpenNav = () => {
    if (!ride) return;
    openNavigation(ride.pickup_lat, ride.pickup_lng, navApp);
  };

  const handleCancelConfirm = async () => {
    setShowCancel(false);
    try {
      await supabase.functions.invoke('handle-cancellation', {
        body: { ride_id: rideId, cancelled_by: 'driver', reason: 'Driver cancelled en route' },
      });
    } catch {
      await supabase.from('rides').update({
        status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: 'driver',
      }).eq('id', rideId);
    }
    navigation.popToTop();
  };

  if (!ride) return <View style={[styles.container, { backgroundColor: t.background }]} />;

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        initialRegion={{
          latitude: ride.pickup_lat,
          longitude: ride.pickup_lng,
          latitudeDelta: 0.035,
          longitudeDelta: 0.035,
        }}
      >
        <Marker coordinate={{ latitude: ride.pickup_lat, longitude: ride.pickup_lng }} pinColor={colors.orange} />
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={3} strokeColor="#4285F4" />
        )}
      </MapView>

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={[styles.topBtn, { backgroundColor: t.card }]} onPress={() => setShowFilter(true)} activeOpacity={0.8}>
          <Filter size={16} color={colors.orange} strokeWidth={2} />
        </TouchableOpacity>

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
        <Text style={[styles.heading, { color: colors.orange }]}>Arrive</Text>
        <Text style={[styles.address, { color: t.text }]} numberOfLines={1}>
          {ride.pickup_address}
        </Text>

        <SlideButton
          label="Slide to arrive"
          onSlideComplete={handleSlideArrive}
          color={colors.orange}
        />

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowCancel(true)} activeOpacity={0.7}>
            <View style={[styles.actionCircle, { backgroundColor: 'rgba(255,23,68,0.1)' }]}>
              <X size={20} color="#FF1744" strokeWidth={2} />
            </View>
            <Text style={[styles.actionLabel, { color: t.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowContact(true)} activeOpacity={0.7}>
            <View style={[styles.actionCircle, { backgroundColor: colors.orange + '12' }]}>
              <Smartphone size={20} color={colors.orange} strokeWidth={2} />
            </View>
            <Text style={[styles.actionLabel, { color: t.textSecondary }]}>Contact</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ContactModal visible={showContact} onClose={() => setShowContact(false)} riderName={riderName} riderPhone={riderPhone} />
      <CancelRideModal visible={showCancel} onClose={() => setShowCancel(false)} onConfirmCancel={handleCancelConfirm} />
      <DestinationFilterModal visible={showFilter} onClose={() => setShowFilter(false)} />
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
    justifyContent: 'space-between',
    gap: 8,
  },
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
  panel: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 10,
  },
  heading: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  address: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 14 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14 },
  actionBtn: { alignItems: 'center', gap: 6 },
  actionCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 10, fontWeight: '500' },
});
