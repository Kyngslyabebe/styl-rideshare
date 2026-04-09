import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { supabase } from '../../services/supabase';

export default function ArrivedScreen({ route, navigation }: any) {
  const { rideId } = route.params;
  const { t, colors } = useTheme();
  const [ride, setRide] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('rides').select('*').eq('id', rideId).single();
      setRide(data);
    })();
  }, [rideId]);

  const handleStartRide = async () => {
    await supabase.from('rides').update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
    }).eq('id', rideId);
    navigation.replace('InProgress', { rideId });
  };

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      <View style={styles.content}>
        <View style={[styles.badge, { backgroundColor: colors.orange + '15' }]}>
          <Text style={[styles.badgeText, { color: colors.orange }]}>ARRIVED</Text>
        </View>

        <Text style={[styles.title, { color: t.text }]}>Waiting for rider</Text>
        <Text style={[styles.subtitle, { color: t.textSecondary }]}>
          {ride?.pickup_address || 'Loading...'}
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.orange }]}
          onPress={handleStartRide}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Start Ride</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
