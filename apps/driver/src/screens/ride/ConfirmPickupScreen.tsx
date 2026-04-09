import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { HelpCircle, X, Smartphone } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { supabase } from '../../services/supabase';
import SlideButton from '../../components/SlideButton';
import { useRoutePolyline } from '../../hooks/useRoutePolyline';
import ContactModal from '../../components/ContactModal';
import CancelRideModal from '../../components/CancelRideModal';

export default function ConfirmPickupScreen({ route, navigation }: any) {
  const { rideId } = route.params;
  const { t, colors } = useTheme();
  const [ride, setRide] = useState<any>(null);
  const [riderName, setRiderName] = useState('Rider');
  const [riderPhone, setRiderPhone] = useState<string | undefined>();
  const [showContact, setShowContact] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const routeCoords = useRoutePolyline(ride?.pickup_lat, ride?.pickup_lng, ride?.dropoff_lat, ride?.dropoff_lng);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('rides').select('*').eq('id', rideId).single();
      setRide(data);
      if (data?.rider_id) {
        const { data: p } = await supabase.from('profiles').select('full_name, phone').eq('id', data.rider_id).single();
        if (p?.full_name) setRiderName(p.full_name.split(' ')[0]);
        if (p?.phone) setRiderPhone(p.phone);
      }
    })();
  }, [rideId]);

  const handleSlidePickup = async () => {
    await supabase.from('rides').update({
      status: 'in_progress',
      picked_up_at: new Date().toISOString(),
    }).eq('id', rideId);
    navigation.replace('DropOff', { rideId });
  };

  const handleCancelConfirm = async () => {
    setShowCancel(false);
    try {
      await supabase.functions.invoke('handle-cancellation', {
        body: { ride_id: rideId, cancelled_by: 'driver', reason: 'Driver cancelled at pickup' },
      });
    } catch {
      await supabase.from('rides').update({
        status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: 'driver',
      }).eq('id', rideId);
    }
    navigation.popToTop();
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
          latitude: ride.pickup_lat,
          longitude: ride.pickup_lng,
          latitudeDelta: 0.035,
          longitudeDelta: 0.035,
        }}
      >
        <Marker coordinate={{ latitude: ride.pickup_lat, longitude: ride.pickup_lng }} pinColor={colors.success} />
        <Marker coordinate={{ latitude: ride.dropoff_lat, longitude: ride.dropoff_lng }} pinColor={colors.orange} />
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={3} strokeColor="#4285F4" />
        )}
      </MapView>

      <View style={styles.topBar}>
        <TouchableOpacity style={[styles.topBtn, { backgroundColor: t.card }]} activeOpacity={0.8}>
          <HelpCircle size={16} color={colors.orange} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Bottom panel */}
      <View style={[styles.panel, { backgroundColor: t.card }]}>
        <Text style={[styles.heading, { color: colors.orange }]}>Pick up Rider</Text>
        <Text style={[styles.riderName, { color: t.text }]}>{riderName}</Text>

        {/* Trip summary */}
        <View style={[styles.tripCard, { backgroundColor: t.background }]}>
          <View style={styles.tripRow}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <View style={styles.tripContent}>
              <Text style={[styles.tripLabel, { color: t.textSecondary }]}>PICK-UP</Text>
              <Text style={[styles.tripAddress, { color: t.text }]} numberOfLines={1}>
                {ride.pickup_address}
              </Text>
            </View>
          </View>
          <View style={[styles.tripDivider, { borderLeftColor: t.cardBorder }]} />
          <View style={styles.tripRow}>
            <View style={[styles.dot, { backgroundColor: colors.orange }]} />
            <View style={styles.tripContent}>
              <Text style={[styles.tripLabel, { color: t.textSecondary }]}>DROP-OFF</Text>
              <Text style={[styles.tripAddress, { color: t.text }]} numberOfLines={1}>
                {ride.dropoff_address}
              </Text>
            </View>
            <Text style={[styles.tripMeta, { color: t.textSecondary }]}>
              {durationMin}m  {distanceMi}mi
            </Text>
          </View>
        </View>

        <Text style={[styles.fareText, { color: t.textSecondary }]}>
          Est. <Text style={{ color: t.text, fontWeight: '700' }}>${fare.toFixed(2)}</Text>
        </Text>

        <SlideButton
          label="Slide to pick up"
          onSlideComplete={handleSlidePickup}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  topBar: { position: 'absolute', top: 54, right: 16 },
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
    paddingBottom: 16,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 10,
  },
  heading: { fontSize: 11, fontWeight: '500', textAlign: 'center', marginBottom: 2 },
  riderName: { fontSize: 14, fontWeight: '400', textAlign: 'center', marginBottom: 10 },
  tripCard: { borderRadius: 0, padding: 10, marginBottom: 10, gap: 0 },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tripContent: { flex: 1 },
  tripLabel: { fontSize: 8, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1 },
  tripAddress: { fontSize: 11, fontWeight: '500' },
  tripMeta: { fontSize: 9, fontWeight: '500' },
  tripDivider: { borderLeftWidth: 1.5, marginLeft: 3.5, height: 12 },
  fareText: { fontSize: 11, fontWeight: '500', textAlign: 'center', marginBottom: 10 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  actionBtn: { alignItems: 'center', gap: 6 },
  actionCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 10, fontWeight: '500' },
});
