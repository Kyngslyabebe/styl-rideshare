import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '../../theme/ThemeContext';
import { supabase } from '../../services/supabase';
import { useRoutePolyline } from '../../hooks/useRoutePolyline';

export default function NavigatingToPickupScreen({ route, navigation }: any) {
  const { rideId } = route.params;
  const { t, colors } = useTheme();
  const [ride, setRide] = useState<any>(null);
  const routeCoords = useRoutePolyline(
    ride?.pickup_lat, ride?.pickup_lng,
    ride?.dropoff_lat, ride?.dropoff_lng,
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('rides')
        .select('*')
        .eq('id', rideId)
        .single();
      setRide(data);
    })();
  }, [rideId]);

  const handleArrived = async () => {
    await supabase.from('rides').update({
      status: 'driver_arrived',
      driver_arrived_at: new Date().toISOString(),
    }).eq('id', rideId);
    navigation.replace('Arrived', { rideId });
  };

  const handleCancel = () => {
    Alert.alert('Cancel Ride', 'Are you sure you want to cancel?', [
      { text: 'No' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          await supabase.from('rides').update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancelled_by: 'driver',
          }).eq('id', rideId);
          navigation.popToTop();
        },
      },
    ]);
  };

  if (!ride) {
    return (
      <View style={[styles.container, { backgroundColor: t.background }]}>
        <Text style={[styles.loadingText, { color: t.textSecondary }]}>Loading ride...</Text>
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
          latitude: ride.pickup_lat,
          longitude: ride.pickup_lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker
          coordinate={{ latitude: ride.pickup_lat, longitude: ride.pickup_lng }}
          title="Pickup"
          pinColor={colors.orange}
        />
        <Marker
          coordinate={{ latitude: ride.dropoff_lat, longitude: ride.dropoff_lng }}
          title="Dropoff"
          pinColor={colors.success}
        />
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#FF6B00" geodesic lineCap="round" lineJoin="round" />
        )}
      </MapView>

      <View style={[styles.panel, { backgroundColor: t.card }]}>
        <Text style={[styles.heading, { color: colors.orange }]}>Navigating to Pickup</Text>
        <Text style={[styles.address, { color: t.text }]} numberOfLines={2}>
          {ride.pickup_address}
        </Text>

        <TouchableOpacity
          style={[styles.arrivedButton, { backgroundColor: colors.orange }]}
          onPress={handleArrived}
          activeOpacity={0.8}
        >
          <Text style={styles.arrivedText}>I've Arrived</Text>
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
  heading: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  address: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
  arrivedButton: {
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrivedText: {
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
