import { useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

// Sound files — place in assets/sounds/
// For now, uses system notification sounds as fallback
const SOUNDS = {
  // Incoming ride request — urgent ringtone (loops)
  rideRequest: require('../../assets/sounds/ride_request.mp3'),
  // Add stop / route change — notification chime
  notification: require('../../assets/sounds/notification.mp3'),
};

/**
 * Hook to play ride-related sounds.
 *
 * Usage:
 *   const { playRingtone, stopRingtone, playNotification } = useRideSound();
 *   playRingtone();  // loops until stopped or 15s timeout
 *   stopRingtone();  // manual stop
 *   playNotification();  // plays once
 */
export function useRideSound() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
  }, []);

  const playRingtone = useCallback(async () => {
    await cleanup();
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(SOUNDS.rideRequest, {
        isLooping: true,
        volume: 1.0,
      });
      soundRef.current = sound;
      await sound.playAsync();

      // Auto-stop after 15 seconds
      timeoutRef.current = setTimeout(() => cleanup(), 15000);
    } catch (err) {
      console.warn('Failed to play ringtone:', err);
    }
  }, [cleanup]);

  const stopRingtone = useCallback(async () => {
    await cleanup();
  }, [cleanup]);

  const playNotification = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(SOUNDS.notification, {
        volume: 0.8,
      });
      await sound.playAsync();

      // Unload after it finishes
      sound.setOnPlaybackStatusUpdate((status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch (err) {
      console.warn('Failed to play notification:', err);
    }
  }, []);

  return { playRingtone, stopRingtone, playNotification };
}
