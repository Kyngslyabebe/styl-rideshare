import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Menu, Crosshair, Zap, Eye, EyeOff, SlidersHorizontal } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useLocationBroadcast } from '../../hooks/useLocationBroadcast';
import { useRideRequests } from '../../hooks/useRideRequests';
import { usePushToken } from '../../hooks/usePushToken';
import { useNotificationListener } from '../../hooks/useNotificationListener';
import { supabase } from '../../services/supabase';
import { colors as appColors } from '../../theme/colors';
import DestinationFilterModal from '../../components/DestinationFilterModal';

const EARNINGS_HIDDEN_KEY = 'styl_earnings_hidden';

/** Returns the start of "today" using a 3 AM cutoff */
function getTodayStart(): string {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setHours(3, 0, 0, 0);
  if (now < cutoff) {
    // Before 3am — "today" started yesterday at 3am
    cutoff.setDate(cutoff.getDate() - 1);
  }
  return cutoff.toISOString();
}

export default function HomeScreen({ navigation }: any) {
  const { t } = useTheme();
  const { user } = useAuth();
  const { isOnline, toggleOnline } = useOnlineStatus();
  const { pendingRide } = useRideRequests(user?.id);
  usePushToken(user?.id);
  useNotificationListener();
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayRides, setTodayRides] = useState(0);
  const [earningsHidden, setEarningsHidden] = useState(false);
  const [surgeMult, setSurgeMult] = useState(1.0);
  const [subRemaining, setSubRemaining] = useState<number | null>(null);
  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [approvedTypes, setApprovedTypes] = useState<string[]>([]);
  const [toggling, setToggling] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  useLocationBroadcast(user?.id, isOnline);

  // Auto-navigate to AcceptRideScreen when a ride request comes in
  useEffect(() => {
    if (pendingRide) {
      navigation.navigate('RideFlow', { screen: 'AcceptRide', params: { rideId: pendingRide.id } });
    }
  }, [pendingRide]);

  // Location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        mapRef.current?.animateToRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.045,
          longitudeDelta: 0.045,
        }, 600);
      }
    })();
  }, []);

  // Load earnings hidden preference
  useEffect(() => {
    (async () => {
      try {
        const val = await AsyncStorage.getItem(EARNINGS_HIDDEN_KEY);
        if (val === 'true') setEarningsHidden(true);
      } catch {}
    })();
  }, []);

  // Fetch today's earnings (3am cutoff)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('driver_earnings')
        .select('net_amount')
        .eq('driver_id', user.id)
        .gte('created_at', getTodayStart());
      if (data) {
        setTodayEarnings(data.reduce((sum, r) => sum + Number(r.net_amount || 0), 0));
        setTodayRides(data.length);
      }
    })();
  }, [user]);

  // Fetch current surge — poll every 30s
  useEffect(() => {
    const fetchSurge = async () => {
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'current_surge')
          .single();
        if (data?.value) setSurgeMult(Number(data.value) || 1.0);
      } catch {}
    };
    fetchSurge();
    const interval = setInterval(fetchSurge, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch subscription remaining from drivers table
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('drivers')
          .select('subscription_status, subscription_collected, subscription_target')
          .eq('id', user.id)
          .single();
        setSubStatus(data?.subscription_status || null);
        if (data?.subscription_status === 'collecting') {
          const remaining = Number(data.subscription_target || 0) - Number(data.subscription_collected || 0);
          setSubRemaining(remaining > 0 ? remaining : null);
        } else {
          setSubRemaining(null);
        }
      } catch {
        setSubRemaining(null);
      }
    })();
  }, [user]);

  // Fetch admin-approved ride types for this driver
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('drivers')
          .select('approved_ride_types')
          .eq('id', user.id)
          .single();
        if (data?.approved_ride_types && Array.isArray(data.approved_ride_types)) {
          setApprovedTypes(data.approved_ride_types);
        }
      } catch {}
    })();
  }, [user]);

  const toggleEarningsVisibility = async () => {
    const next = !earningsHidden;
    setEarningsHidden(next);
    try {
      await AsyncStorage.setItem(EARNINGS_HIDDEN_KEY, String(next));
    } catch {}
  };

  const handleRecenter = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 500);
    } catch {}
  };

  const handleToggle = async () => {
    setToggling(true);
    await toggleOnline();
    setToggling(false);
  };

  const surgeActive = surgeMult > 1;
  const typeLabels: Record<string, string> = { standard: 'Standard', xl: 'XL', luxury: 'Luxury', electric: 'Eco' };
  const acceptingLabel = approvedTypes.length > 0
    ? `Accepting: ${approvedTypes.map((t) => typeLabels[t] || t).join(' · ')}`
    : 'Accepting:';

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={{
          latitude: userLocation?.latitude ?? 37.78825,
          longitude: userLocation?.longitude ?? -122.4324,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        }}
      />

      {/* Toggle spinner overlay */}
      {toggling && (
        <View style={styles.spinnerOverlay}>
          <View style={styles.spinnerBox}>
            <ActivityIndicator size="large" color={appColors.orange} />
            <Text style={styles.spinnerText}>
              {isOnline ? 'Going offline...' : 'Going online...'}
            </Text>
          </View>
        </View>
      )}

      {/* Top bar: Hamburger + Filter */}
      <TouchableOpacity
        style={[styles.menuBtn, { backgroundColor: t.card }]}
        onPress={() => navigation.openDrawer()}
        activeOpacity={0.8}
      >
        <Menu size={22} color={t.text} strokeWidth={2} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterBtn, { backgroundColor: t.card }]}
        onPress={() => setShowFilter(true)}
        activeOpacity={0.8}
      >
        <SlidersHorizontal size={18} color={appColors.orange} strokeWidth={2} />
      </TouchableOpacity>

      {/* Re-center button */}
      <TouchableOpacity
        style={[styles.recenterBtn, { backgroundColor: t.card }]}
        onPress={handleRecenter}
        activeOpacity={0.8}
      >
        <Crosshair size={20} color={appColors.orange} strokeWidth={2} />
      </TouchableOpacity>

      {/* Bottom panel */}
      <View style={styles.bottomWrapper}>
        {/* ON DUTY / OFF DUTY badge */}
        <View style={[styles.dutyBadge, { backgroundColor: isOnline ? 'rgba(0,200,83,0.92)' : 'rgba(40,40,40,0.92)' }]}>
          <View style={[styles.dutyDot, { backgroundColor: isOnline ? '#fff' : '#666' }]} />
          <Text style={[styles.dutyText, { color: isOnline ? '#fff' : '#999' }]}>
            {isOnline ? 'ON DUTY' : 'OFF DUTY'}
          </Text>
        </View>

        <View style={[styles.bottomPanel, { backgroundColor: t.card }]}>
          {/* Section label + privacy toggle */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>Today&apos;s Earnings</Text>
            <TouchableOpacity onPress={toggleEarningsVisibility} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              {earningsHidden
                ? <EyeOff size={15} color={t.textSecondary} strokeWidth={1.8} />
                : <Eye size={15} color={t.textSecondary} strokeWidth={1.8} />
              }
            </TouchableOpacity>
          </View>

          {/* Earnings row */}
          <View style={styles.earningsRow}>
            <View style={styles.earningsLeft}>
              <Text style={[styles.earningsAmount, { color: t.text }]}>
                {earningsHidden ? '••••' : `$${todayEarnings.toFixed(2)}`}
              </Text>
            </View>
            <View style={[styles.earningsDivider, { backgroundColor: t.cardBorder }]} />
            <View style={styles.earningsRight}>
              <Text style={[styles.ridesCount, { color: t.text }]}>
                {earningsHidden ? '•' : todayRides}
              </Text>
              <Text style={[styles.ridesLabel, { color: t.textSecondary }]}>
                {todayRides === 1 ? 'ride' : 'rides'}
              </Text>
            </View>
          </View>

          {/* Surge + Subscription row */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Zap
                size={13}
                color={surgeActive ? appColors.orange : t.textSecondary}
                fill={surgeActive ? appColors.orange : 'transparent'}
                strokeWidth={2}
              />
              <Text style={[
                styles.infoText,
                { color: surgeActive ? appColors.orange : t.textSecondary },
                surgeActive && { fontWeight: '700' },
              ]}>
                {surgeActive ? `${surgeMult.toFixed(1)}x Surge` : 'No surge'}
              </Text>
            </View>

            <Text style={[styles.infoDot, { color: t.cardBorder }]}>·</Text>

            <Text style={[styles.infoText, {
              color: subRemaining ? appColors.orange : subStatus === 'active' ? '#00C853' : t.textSecondary,
              fontWeight: subRemaining || subStatus === 'active' ? '600' : '400',
            }]}>
              {subRemaining
                ? `Sub: $${subRemaining.toFixed(0)} left`
                : subStatus === 'active'
                  ? 'Sub active ✓'
                  : subStatus === 'collecting'
                    ? 'Sub: collecting'
                    : 'No subscription'}
            </Text>
          </View>

          {/* Approved ride types (read-only, admin-assigned) */}
          <Text style={[styles.acceptingText, { color: t.textSecondary }]}>
            {acceptingLabel}
          </Text>

          {/* Drive Now / Stop Driving button */}
          <TouchableOpacity
            style={[
              styles.driveBtn,
              { backgroundColor: isOnline ? '#333' : appColors.orange },
            ]}
            onPress={handleToggle}
            disabled={toggling}
            activeOpacity={0.85}
          >
            <Text style={styles.driveBtnText}>
              {isOnline ? 'Stop Driving' : 'Drive Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <DestinationFilterModal
        visible={showFilter}
        onClose={() => setShowFilter(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },

  // Spinner overlay
  spinnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  spinnerBox: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 10,
  },
  spinnerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  menuBtn: {
    position: 'absolute',
    top: 54,
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  filterBtn: {
    position: 'absolute',
    top: 54,
    right: 23,
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  recenterBtn: {
    position: 'absolute',
    right: 23,
    bottom: 340,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  dutyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginBottom: 2,
    zIndex: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    gap: 6,
  },
  dutyDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dutyText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  bottomPanel: {
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 20,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Earnings
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  earningsLeft: {
    flex: 1,
  },
  earningsAmount: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  earningsDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 18,
  },
  earningsRight: {
    alignItems: 'center',
    minWidth: 50,
  },
  ridesCount: {
    fontSize: 22,
    fontWeight: '600',
  },
  ridesLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: -2,
  },

  // Info row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoDot: {
    fontSize: 14,
    fontWeight: '300',
  },

  // Accepting label
  acceptingText: {
    fontSize: 11,
    fontWeight: '400',
    marginBottom: 14,
  },

  // Drive button
  driveBtn: {
    height: 68,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 42,
  },
  driveBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
