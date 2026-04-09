import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { X, Clock, DollarSign, Navigation } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { useRoutePolyline } from '../../hooks/useRoutePolyline';

type Tab = 'daily' | 'weekly' | 'monthly' | 'yearly';

const TABS: { key: Tab; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

function getDateRange(tab: Tab): Date {
  const now = new Date();
  switch (tab) {
    case 'daily':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'weekly': {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'yearly':
      return new Date(now.getFullYear(), 0, 1);
  }
}

export default function RideHistoryScreen() {
  const { t, colors } = useTheme();
  const { user } = useAuth();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('daily');
  const [selectedRide, setSelectedRide] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', user.id)
        .in('status', ['completed', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(200);
      setRides(data || []);
      setLoading(false);
    })();
  }, [user]);

  const filteredRides = useMemo(() => {
    const cutoff = getDateRange(activeTab);
    return rides.filter((r) => new Date(r.created_at) >= cutoff);
  }, [rides, activeTab]);

  const totalEarnings = useMemo(() => {
    return filteredRides
      .filter((r) => r.status === 'completed')
      .reduce((sum, r) => sum + Number(r.final_fare || r.estimated_fare || 0), 0);
  }, [filteredRides]);

  const completedCount = filteredRides.filter((r) => r.status === 'completed').length;
  const cancelledCount = filteredRides.filter((r) => r.status === 'cancelled').length;

  const renderRide = ({ item }: { item: any }) => {
    const fare = Number(item.final_fare || item.estimated_fare || 0);
    const date = new Date(item.created_at);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}
        onPress={() => setSelectedRide(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, {
            backgroundColor: item.status === 'completed' ? colors.success + '15' : colors.error + '15',
          }]}>
            <Text style={[styles.statusText, {
              color: item.status === 'completed' ? colors.success : colors.error,
            }]}>
              {item.status === 'completed' ? 'Completed' : 'Cancelled'}
            </Text>
          </View>
          <Text style={[styles.fare, { color: t.text }]}>${fare.toFixed(2)}</Text>
        </View>

        <View style={styles.addressSection}>
          <View style={styles.addressRow}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={[styles.address, { color: t.text }]} numberOfLines={1}>
              {item.pickup_address}
            </Text>
          </View>
          <View style={[styles.addressLine, { borderLeftColor: t.cardBorder }]} />
          <View style={styles.addressRow}>
            <View style={[styles.dot, { backgroundColor: colors.orange }]} />
            <Text style={[styles.address, { color: t.text }]} numberOfLines={1}>
              {item.dropoff_address}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.dateText, { color: t.textSecondary }]}>{dateStr}</Text>
          <Text style={[styles.dateText, { color: t.textSecondary }]}>{timeStr}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && { backgroundColor: colors.orange },
            ]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.key ? '#FFF' : t.textSecondary },
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary bar */}
      <View style={[styles.summaryBar, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.orange }]}>${totalEarnings.toFixed(2)}</Text>
          <Text style={[styles.summaryLabel, { color: t.textSecondary }]}>Earnings</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: t.cardBorder }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>{completedCount}</Text>
          <Text style={[styles.summaryLabel, { color: t.textSecondary }]}>Completed</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: t.cardBorder }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.error }]}>{cancelledCount}</Text>
          <Text style={[styles.summaryLabel, { color: t.textSecondary }]}>Cancelled</Text>
        </View>
      </View>

      {/* Ride list */}
      <FlatList
        data={filteredRides}
        keyExtractor={(item) => item.id}
        renderItem={renderRide}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: t.textSecondary }]}>
            {loading ? 'Loading...' : 'No rides for this period'}
          </Text>
        }
      />

      {/* Ride detail modal */}
      {selectedRide && (
        <RideDetailModal
          ride={selectedRide}
          onClose={() => setSelectedRide(null)}
          t={t}
          colors={colors}
        />
      )}
    </View>
  );
}

function RideDetailModal({ ride, onClose, t, colors }: { ride: any; onClose: () => void; t: any; colors: any }) {
  const fare = Number(ride.final_fare || ride.estimated_fare || 0);
  const distanceMi = ((ride.estimated_distance_km || 0) * 0.621371).toFixed(1);
  const durationMin = ride.estimated_duration_min || Math.round((ride.estimated_distance_km || 0) * 2.5);
  const date = new Date(ride.created_at);
  const dateStr = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const routeCoords = useRoutePolyline(ride.pickup_lat, ride.pickup_lng, ride.dropoff_lat, ride.dropoff_lng);

  const rideTypeLabel: Record<string, string> = {
    standard: 'Standard',
    xl: 'XL',
    luxury: 'Luxury',
    electric: 'Eco',
  };

  const midLat = (ride.pickup_lat + ride.dropoff_lat) / 2;
  const midLng = (ride.pickup_lng + ride.dropoff_lng) / 2;
  const latDelta = Math.abs(ride.pickup_lat - ride.dropoff_lat) * 2 + 0.02;
  const lngDelta = Math.abs(ride.pickup_lng - ride.dropoff_lng) * 2 + 0.02;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={detailStyles.overlay}>
        <View style={[detailStyles.sheet, { backgroundColor: t.card }]}>
          {/* Header */}
          <View style={detailStyles.header}>
            <Text style={[detailStyles.title, { color: t.text }]}>Ride Details</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={20} color={t.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Map */}
            <View style={detailStyles.mapContainer}>
              <MapView
                style={detailStyles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: midLat,
                  longitude: midLng,
                  latitudeDelta: latDelta,
                  longitudeDelta: lngDelta,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                <Marker coordinate={{ latitude: ride.pickup_lat, longitude: ride.pickup_lng }} pinColor={colors.success} />
                <Marker coordinate={{ latitude: ride.dropoff_lat, longitude: ride.dropoff_lng }} pinColor={colors.orange} />
                {routeCoords.length > 0 && (
                  <Polyline coordinates={routeCoords} strokeWidth={3} strokeColor="#4285F4" />
                )}
              </MapView>
            </View>

            {/* Status + Date */}
            <View style={detailStyles.statusRow}>
              <View style={[detailStyles.statusBadge, {
                backgroundColor: ride.status === 'completed' ? colors.success + '15' : colors.error + '15',
              }]}>
                <Text style={[detailStyles.statusText, {
                  color: ride.status === 'completed' ? colors.success : colors.error,
                }]}>
                  {ride.status === 'completed' ? 'Completed' : 'Cancelled'}
                </Text>
              </View>
              <Text style={[detailStyles.rideType, { color: colors.orange }]}>
                {rideTypeLabel[ride.ride_type] || 'Ride'}
              </Text>
            </View>

            <Text style={[detailStyles.dateText, { color: t.textSecondary }]}>{dateStr} at {timeStr}</Text>

            {/* Addresses */}
            <View style={[detailStyles.addressCard, { backgroundColor: t.background }]}>
              <View style={detailStyles.addressRow}>
                <View style={[detailStyles.dot, { backgroundColor: colors.success }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[detailStyles.addressLabel, { color: t.textSecondary }]}>PICK-UP</Text>
                  <Text style={[detailStyles.addressText, { color: t.text }]}>{ride.pickup_address}</Text>
                </View>
              </View>
              <View style={[detailStyles.addressDivider, { borderLeftColor: t.cardBorder }]} />
              <View style={detailStyles.addressRow}>
                <View style={[detailStyles.dot, { backgroundColor: colors.orange }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[detailStyles.addressLabel, { color: t.textSecondary }]}>DROP-OFF</Text>
                  <Text style={[detailStyles.addressText, { color: t.text }]}>{ride.dropoff_address}</Text>
                </View>
              </View>
            </View>

            {/* Stats grid */}
            <View style={detailStyles.statsGrid}>
              <View style={[detailStyles.statCard, { backgroundColor: t.background }]}>
                <DollarSign size={16} color={colors.orange} strokeWidth={2} />
                <Text style={[detailStyles.statValue, { color: t.text }]}>${fare.toFixed(2)}</Text>
                <Text style={[detailStyles.statLabel, { color: t.textSecondary }]}>Fare</Text>
              </View>
              <View style={[detailStyles.statCard, { backgroundColor: t.background }]}>
                <Navigation size={16} color={colors.orange} strokeWidth={2} />
                <Text style={[detailStyles.statValue, { color: t.text }]}>{distanceMi} mi</Text>
                <Text style={[detailStyles.statLabel, { color: t.textSecondary }]}>Distance</Text>
              </View>
              <View style={[detailStyles.statCard, { backgroundColor: t.background }]}>
                <Clock size={16} color={colors.orange} strokeWidth={2} />
                <Text style={[detailStyles.statValue, { color: t.text }]}>{durationMin} min</Text>
                <Text style={[detailStyles.statLabel, { color: t.textSecondary }]}>Duration</Text>
              </View>
            </View>

            {/* Fare breakdown */}
            <View style={[detailStyles.breakdownCard, { backgroundColor: t.background }]}>
              <Text style={[detailStyles.breakdownTitle, { color: t.text }]}>Fare Breakdown</Text>
              <View style={detailStyles.breakdownRow}>
                <Text style={[detailStyles.breakdownLabel, { color: t.textSecondary }]}>Base fare</Text>
                <Text style={[detailStyles.breakdownValue, { color: t.text }]}>
                  ${Number(ride.estimated_fare || 0).toFixed(2)}
                </Text>
              </View>
              {ride.surge_amount > 0 && (
                <View style={detailStyles.breakdownRow}>
                  <Text style={[detailStyles.breakdownLabel, { color: t.textSecondary }]}>Surge</Text>
                  <Text style={[detailStyles.breakdownValue, { color: colors.orange }]}>
                    +${Number(ride.surge_amount).toFixed(2)}
                  </Text>
                </View>
              )}
              {ride.tip_amount > 0 && (
                <View style={detailStyles.breakdownRow}>
                  <Text style={[detailStyles.breakdownLabel, { color: t.textSecondary }]}>Tip</Text>
                  <Text style={[detailStyles.breakdownValue, { color: colors.success }]}>
                    +${Number(ride.tip_amount).toFixed(2)}
                  </Text>
                </View>
              )}
              <View style={[detailStyles.breakdownDivider, { borderBottomColor: t.cardBorder }]} />
              <View style={detailStyles.breakdownRow}>
                <Text style={[detailStyles.breakdownLabel, { color: t.text, fontWeight: '700' }]}>Total</Text>
                <Text style={[detailStyles.breakdownValue, { color: colors.orange, fontWeight: '700' }]}>
                  ${fare.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Timestamps */}
            {ride.status === 'completed' && (
              <View style={detailStyles.timestamps}>
                {ride.accepted_at && (
                  <Text style={[detailStyles.tsText, { color: t.textSecondary }]}>
                    Accepted: {new Date(ride.accepted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
                {ride.picked_up_at && (
                  <Text style={[detailStyles.tsText, { color: t.textSecondary }]}>
                    Picked up: {new Date(ride.picked_up_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
                {ride.completed_at && (
                  <Text style={[detailStyles.tsText, { color: t.textSecondary }]}>
                    Completed: {new Date(ride.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  tabText: { fontSize: 11, fontWeight: '600' },
  summaryBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 16, fontWeight: '700' },
  summaryLabel: { fontSize: 9, fontWeight: '500', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  summaryDivider: { width: 1 },
  list: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 40 },
  card: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  fare: { fontSize: 16, fontWeight: '700' },
  addressSection: { marginBottom: 8 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  address: { fontSize: 11, fontWeight: '500', flex: 1 },
  addressLine: { borderLeftWidth: 1.5, marginLeft: 3.5, height: 10 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dateText: { fontSize: 10, fontWeight: '400' },
  empty: { textAlign: 'center', fontSize: 12, fontWeight: '400', marginTop: 40 },
});

const detailStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: '700' },
  mapContainer: {
    height: 180,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 14,
  },
  map: { flex: 1 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  rideType: { fontSize: 11, fontWeight: '600' },
  dateText: { fontSize: 11, fontWeight: '400', marginBottom: 14 },
  addressCard: { borderRadius: 8, padding: 12, marginBottom: 14 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  addressLabel: { fontSize: 8, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  addressText: { fontSize: 12, fontWeight: '500' },
  addressDivider: { borderLeftWidth: 1.5, marginLeft: 3.5, height: 10 },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: 14, fontWeight: '700' },
  statLabel: { fontSize: 8, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  breakdownCard: { borderRadius: 8, padding: 12, marginBottom: 14 },
  breakdownTitle: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: { fontSize: 11, fontWeight: '400' },
  breakdownValue: { fontSize: 11, fontWeight: '500' },
  breakdownDivider: { borderBottomWidth: StyleSheet.hairlineWidth, marginVertical: 4 },
  timestamps: { gap: 2 },
  tsText: { fontSize: 10, fontWeight: '400' },
});
