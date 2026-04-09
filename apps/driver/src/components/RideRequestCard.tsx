import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const TIMEOUT_SEC = 20;

interface Props {
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFare: number;
  distanceKm: number;
  onAccept: () => void;
  onReject: () => void;
}

export default function RideRequestCard({
  pickupAddress, dropoffAddress, estimatedFare, distanceKm,
  onAccept, onReject,
}: Props) {
  const { t, colors } = useTheme();
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_SEC);
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: TIMEOUT_SEC * 1000,
      useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const distanceMi = (distanceKm * 0.621371).toFixed(1);

  return (
    <View style={[styles.container, { backgroundColor: t.card, borderColor: colors.orange }]}>
      <View style={styles.timerBar}>
        <Animated.View style={[styles.timerFill, { width: barWidth, backgroundColor: colors.orange }]} />
      </View>

      <Text style={[styles.timerText, { color: colors.orange }]}>{timeLeft}s</Text>

      <Text style={[styles.label, { color: t.textSecondary }]}>PICKUP</Text>
      <Text style={[styles.address, { color: t.text }]} numberOfLines={1}>
        {pickupAddress}
      </Text>

      <Text style={[styles.label, { color: t.textSecondary }]}>DROPOFF</Text>
      <Text style={[styles.address, { color: t.text }]} numberOfLines={1}>
        {dropoffAddress}
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: t.text }]}>
            ${estimatedFare.toFixed(2)}
          </Text>
          <Text style={[styles.statLabel, { color: t.textSecondary }]}>Est. Fare</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: t.text }]}>
            {distanceMi} mi
          </Text>
          <Text style={[styles.statLabel, { color: t.textSecondary }]}>Distance</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.rejectButton, { borderColor: t.inputBorder }]}
          onPress={onReject}
          activeOpacity={0.8}
        >
          <Text style={[styles.rejectText, { color: t.text }]}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: colors.orange }]}
          onPress={onAccept}
          activeOpacity={0.8}
        >
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    overflow: 'hidden',
  },
  timerBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    marginBottom: 10,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 2,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 10,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  address: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 16,
  },
  stat: {},
  statValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '400',
    marginTop: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectText: {
    fontSize: 13,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
