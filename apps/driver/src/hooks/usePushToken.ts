import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '../services/supabase';

// Register for Expo push notifications and save token to profile
export function usePushToken(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    (async () => {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;

      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        process.env.EXPO_PUBLIC_PROJECT_ID;

      if (!projectId) {
        console.warn('Push notifications: no projectId found. Skipping token registration.');
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

      await supabase
        .from('profiles')
        .update({ expo_push_token: tokenData.data })
        .eq('id', userId);

      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('ride-updates', {
          name: 'Ride Updates',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        });
      }
    })().catch((err) => console.warn('Push token registration failed:', err));
  }, [userId]);
}
