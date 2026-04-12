import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Clock, AlertTriangle, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { supabase } from '../../services/supabase';
import { useRideSound } from '../../hooks/useRideSound';
import { useRoutePolyline } from '../../hooks/useRoutePolyline';
import { STOP_WAIT_THRESHOLD_SEC } from '@styl/shared';

export default function InProgressScreen({ route, navigation }: any) {
  const { rideId } = route.params;
  const { t, colors } = useTheme();
  const [ride, setRide] = useState<any>(null);
  const [stops, setStops] = useState<any[]>([]);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [waitSec, setWaitSec] = useState(0);
  const [activeStop, setActiveStop] = useState<any>(null);
  const { playRingtone, stopRingtone } = useRideSound();
  const routeCoords = useRoutePolyline(userLoc?.lat, userLoc?.lng, ride?.dropoff_lat, ride?.dropoff_lng);
  const waitInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load ride + stops
  const loadRide = useCallback(async () => {
    const { data } = await supabase.from('rides').select('*').eq('id', rideId).single();
    setRide(data);
    const { data: s } = await supabase.from('ride_stops').select('*').eq('ride_id', rideId).order('stop_order');
    setStops(s || []);
  }, [rideId]);

  useEffect(() => {
    loadRide();
    (async () => {
      const loc = await Location.getCurrentPositionAsync({});
      setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();

    // Listen for new stops added by rider (mid-trip)
    const channel = supabase
      .channel(`ride-stops-${rideId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ride_stops',
        filter: `ride_id=eq.${rideId}`,
      }, (payload: any) => {
        if (payload.eventType === 'INSERT' && payload.new?.status === 'pending_driver') {
          playRingtone();
          // Show accept/decline alert for mid-trip stop
          Alert.alert(
            'New Stop Requested',
            `The rider wants to add a stop:\n${payload.new.address}\nAdditional fare: $${Number(payload.new.additional_fare || 0).toFixed(2)}`,
            [
              {
                text: 'Decline', style: 'destructive',
                onPress: async () => {
                  stopRingtone();
                  await supabase.from('ride_stops').update({ status: 'declined' }).eq('id', payload.new.id);
                },
              },
              {
                text: 'Accept',
                onPress: async () => {
                  stopRingtone();
                  await supabase.from('ride_stops').update({ status: 'accepted' }).eq('id', payload.new.id);
                  // Update ride fare with additional amount
                  if (payload.new.additional_fare) {
                    const currentFare = Number(ride?.estimated_fare || 0);
                    await supabase.from('rides').update({
                      estimated_fare: currentFare + Number(payload.new.additional_fare),
                    }).eq('id', rideId);
                  }
                  loadRide();
                },
              },
            ]
          );
        } else {
          loadRide();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (waitInterval.current) clearInterval(waitInterval.current);
    };
  }, [rideId]);

  // Track active stop wait time
  useEffect(() => {
    const current = stops.find((s) => s.arrived_at && !s.completed_at && s.wait_started_at);
    setActiveStop(current);
    if (waitInterval.current) clearInterval(waitInterval.current);

    if (current?.wait_started_at) {
      const update = () => {
        const elapsed = (Date.now() - new Date(current.wait_started_at).getTime()) / 1000;
        setWaitSec(Math.floor(elapsed));
      };
      update();
      waitInterval.current = setInterval(update, 1000);
    } else {
      setWaitSec(0);
    }
  }, [stops]);

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

  // Mark arrived at stop (start wait timer)
  const handleArrivedAtStop = async (stop: any) => {
    const now = new Date().toISOString();
    await supabase.from('ride_stops').update({
      arrived_at: now,
      wait_started_at: now,
    }).eq('id', stop.id);
    loadRide();
  };

  // Mark stop completed (rider returned)
  const handleStopCompleted = async (stop: any) => {
    await supabase.from('ride_stops').update({
      completed_at: new Date().toISOString(),
    }).eq('id', stop.id);
    loadRide();
  };

  const waitPastThreshold = waitSec >= STOP_WAIT_THRESHOLD_SEC;
  const waitMin = Math.floor(waitSec / 60);
  const waitSecDisplay = waitSec % 60;

  const handleCancelConfirm = async () => {
    setShowCancelModal(false);
    try {
      const reasonText = activeStop
        ? waitPastThreshold
          ? 'Driver cancelled at stop after 5-min wait (full fare)'
          : 'Driver cancelled at stop before 5-min wait (partial fare)'
        : 'Driver cancelled in-progress';

      await supabase.functions.invoke('handle-cancellation', {
        body: { ride_id: rideId, cancelled_by: 'driver', reason: reasonText },
      });
    } catch {
      await supabase.from('rides').update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'driver',
      }).eq('id', rideId);
    }
    navigation.popToTop();
  };

  if (!ride) {
    return (
      <View style={[styles.container, { backgroundColor: t.background }]}>
        <Text style={[styles.loadingText, { color: t.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  // Find next incomplete stop
  const nextStop = stops.find((s) => s.status === 'accepted' && !s.completed_at);

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
        {stops.filter(s => s.status === 'accepted').map((stop) => (
          <Marker
            key={stop.id}
            coordinate={{ latitude: stop.lat, longitude: stop.lng }}
            title={`Stop ${stop.stop_order}`}
            pinColor={stop.completed_at ? colors.success : colors.warning}
          />
        ))}
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#FF6B00" geodesic lineCap="round" lineJoin="round" />
        )}
      </MapView>

      <View style={[styles.panel, { backgroundColor: t.card }]}>
        <View style={[styles.statusBadge, { backgroundColor: colors.orange + '15' }]}>
          <Text style={[styles.statusText, { color: colors.orange }]}>RIDE IN PROGRESS</Text>
        </View>

        {/* Active stop wait indicator */}
        {activeStop && (
          <View style={[styles.waitBanner, {
            backgroundColor: waitPastThreshold ? colors.success + '15' : colors.warning + '15',
            borderColor: waitPastThreshold ? colors.success + '30' : colors.warning + '30',
          }]}>
            <Clock size={14} color={waitPastThreshold ? colors.success : colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.waitTitle, { color: t.text }]}>
                Waiting at Stop {activeStop.stop_order}
              </Text>
              <Text style={[styles.waitTime, { color: waitPastThreshold ? colors.success : colors.warning }]}>
                {waitMin}:{waitSecDisplay.toString().padStart(2, '0')}
                {waitPastThreshold ? ' — Full fare eligible' : ` — ${Math.ceil((STOP_WAIT_THRESHOLD_SEC - waitSec) / 60)} min until full fare`}
              </Text>
            </View>
          </View>
        )}

        {/* Next stop or dropoff info */}
        {nextStop && !activeStop ? (
          <>
            <Text style={[styles.label, { color: t.textSecondary }]}>NEXT STOP</Text>
            <Text style={[styles.address, { color: t.text }]} numberOfLines={2}>
              {nextStop.address}
            </Text>
            <TouchableOpacity
              style={[styles.arriveBtn, { backgroundColor: colors.info }]}
              onPress={() => handleArrivedAtStop(nextStop)}
              activeOpacity={0.8}
            >
              <Text style={styles.arriveBtnText}>Arrived at Stop</Text>
            </TouchableOpacity>
          </>
        ) : activeStop ? (
          <>
            <Text style={[styles.label, { color: t.textSecondary }]}>WAITING AT</Text>
            <Text style={[styles.address, { color: t.text }]} numberOfLines={2}>
              {activeStop.address}
            </Text>
            <TouchableOpacity
              style={[styles.completeButton, { backgroundColor: colors.success }]}
              onPress={() => handleStopCompleted(activeStop)}
              activeOpacity={0.8}
            >
              <Text style={styles.completeText}>Rider Returned — Continue</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.label, { color: t.textSecondary }]}>DROPPING OFF AT</Text>
            <Text style={[styles.address, { color: t.text }]} numberOfLines={2}>
              {ride.dropoff_address}
            </Text>
          </>
        )}

        {ride.estimated_fare && (
          <Text style={[styles.fare, { color: t.text }]}>
            Est. ${Number(ride.estimated_fare).toFixed(2)}
          </Text>
        )}

        {!activeStop && !nextStop && (
          <TouchableOpacity
            style={[styles.completeButton, { backgroundColor: colors.success }]}
            onPress={handleComplete}
            activeOpacity={0.8}
          >
            <Text style={styles.completeText}>Complete Ride</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.cancelLink} onPress={() => setShowCancelModal(true)}>
          <Text style={[styles.cancelText, { color: colors.error }]}>Cancel Ride</Text>
        </TouchableOpacity>
      </View>

      {/* Cancel confirmation modal */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: t.card }]}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowCancelModal(false)}>
              <X size={20} color={t.textSecondary} />
            </TouchableOpacity>

            <AlertTriangle size={36} color={colors.warning} />
            <Text style={[styles.modalTitle, { color: t.text }]}>Cancel Ride?</Text>

            {activeStop ? (
              <View style={{ width: '100%' }}>
                <View style={[styles.waitInfo, {
                  backgroundColor: waitPastThreshold ? colors.success + '10' : colors.warning + '10',
                  borderColor: waitPastThreshold ? colors.success + '25' : colors.warning + '25',
                }]}>
                  <Text style={[styles.waitInfoTitle, { color: t.text }]}>
                    Wait time: {waitMin}:{waitSecDisplay.toString().padStart(2, '0')}
                  </Text>
                  {waitPastThreshold ? (
                    <Text style={[styles.waitInfoDesc, { color: colors.success }]}>
                      You've waited 5+ minutes. You will receive the full trip fare.
                    </Text>
                  ) : (
                    <Text style={[styles.waitInfoDesc, { color: colors.warning }]}>
                      You haven't waited 5 minutes yet. You will only receive partial payment for the completed portion.
                      Wait {Math.ceil((STOP_WAIT_THRESHOLD_SEC - waitSec) / 60)} more minute(s) for full fare.
                    </Text>
                  )}
                </View>
              </View>
            ) : (
              <Text style={[styles.modalDesc, { color: t.textSecondary }]}>
                Cancelling an in-progress ride may affect your account. The rider will receive a partial refund.
              </Text>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: t.background }]}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: t.text }]}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.error }]}
                onPress={handleCancelConfirm}
              >
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>
                  {activeStop && waitPastThreshold ? 'Cancel (Full Fare)' : 'Cancel Ride'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  waitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  waitTitle: { fontSize: 11, fontWeight: '600' },
  waitTime: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  label: { fontSize: 9, fontWeight: '600', letterSpacing: 0.8, marginBottom: 3 },
  address: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  fare: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  arriveBtn: {
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  arriveBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  completeButton: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  cancelLink: { alignItems: 'center', marginTop: 12 },
  cancelText: { fontSize: 12, fontWeight: '500' },
  // Modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  modalClose: { position: 'absolute', top: 14, right: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginTop: 10, marginBottom: 8 },
  modalDesc: { fontSize: 12, fontWeight: '400', textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  waitInfo: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  waitInfoTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  waitInfoDesc: { fontSize: 11, fontWeight: '400', lineHeight: 17 },
  modalActions: { flexDirection: 'row', gap: 10, width: '100%' },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: { fontSize: 12, fontWeight: '600' },
});
