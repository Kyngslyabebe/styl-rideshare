import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTheme } from '../../theme/ThemeContext';
import { supabase } from '../../services/supabase';
import { useRideSound } from '../../hooks/useRideSound';
import { useRoutePolyline } from '../../hooks/useRoutePolyline';

export default function InProgressScreen({ route, navigation }: any) {
  const { rideId } = route.params;
  const { t, colors } = useTheme();
  const [ride, setRide] = useState<any>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const { playRingtone, stopRingtone, playNotification } = useRideSound();
  const routeCoords = useRoutePolyline(userLoc?.lat, userLoc?.lng, ride?.dropoff_lat, ride?.dropoff_lng);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('rides').select('*').eq('id', rideId).single();
      setRide(data);
      const loc = await Location.getCurrentPositionAsync({});
      setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();

    const channel = supabase
      .channel(`ride-stops-${rideId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ride_stops',
        filter: `ride_id=eq.${rideId}`,
      }, () => {
        playRingtone(); // Alert driver of route change
        Alert.alert('Stop Added', 'The rider added a new stop. Fare has been updated.', [
          { text: 'OK', onPress: () => stopRingtone() },
        ]);
        supabase.from('rides').select('*').eq('id', rideId).single()
          .then(({ data }) => setRide(data));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [rideId]);

  const handleComplete = async () => {
    await supabase.from('rides').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', rideId);

    supabase.functions.invoke('process-payment', {
      body: { ride_id: rideId },
    }).catch((err: any) => console.warn('process-payment error:', err));

    navigation.replace('RideComplete', { rideId });
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel In-Progress Ride',
      'This will flag your account and the rider will get a partial refund. Are you sure?',
      [
        { text: 'No' },
        {
          text: 'Yes, Cancel', style: 'destructive',
          onPress: async () => {
            try {
              await supabase.functions.invoke('handle-cancellation', {
                body: { ride_id: rideId, cancelled_by: 'driver', reason: 'Driver cancelled in-progress' },
              });
            } catch {
              await supabase.from('rides').update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                cancelled_by: 'driver',
                cancellation_reason: 'Driver cancelled in-progress',
              }).eq('id', rideId);
            }
            navigation.popToTop();
          },
        },
      ]
    );
  };

  if (!ride) {
    return (
      <View style={[styles.container, { backgroundColor: t.background }]}>
        <Text style={[styles.loadingText, { color: t.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        initialRegion={{
          latitude: ride.dropoff_lat,
          longitude: ride.dropoff_lng,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
      >
        <Marker
          coordinate={{ latitude: ride.dropoff_lat, longitude: ride.dropoff_lng }}
          title="Dropoff"
          pinColor={colors.orange}
        />
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={3} strokeColor="#4285F4" />
        )}
      </MapView>

      <View style={[styles.panel, { backgroundColor: t.card }]}>
        <View style={[styles.statusBadge, { backgroundColor: colors.orange + '15' }]}>
          <Text style={[styles.statusText, { color: colors.orange }]}>RIDE IN PROGRESS</Text>
        </View>

        <Text style={[styles.label, { color: t.textSecondary }]}>DROPPING OFF AT</Text>
        <Text style={[styles.address, { color: t.text }]} numberOfLines={2}>
          {ride.dropoff_address}
        </Text>

        {ride.estimated_fare && (
          <Text style={[styles.fare, { color: t.text }]}>
            Est. ${Number(ride.estimated_fare).toFixed(2)}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.completeButton, { backgroundColor: colors.success }]}
          onPress={handleComplete}
          activeOpacity={0.8}
        >
          <Text style={styles.completeText}>Complete Ride</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelLink} onPress={handleCancel}>
          <Text style={[styles.cancelText, { color: colors.error }]}>Cancel Ride</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingText: { textAlign: 'center', marginTop: 100, fontSize: 12, fontWeight: '400' },
  panel: {
    padding: 20,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  label: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  address: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  fare: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  completeButton: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelLink: {
    alignItems: 'center',
    marginTop: 12,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
