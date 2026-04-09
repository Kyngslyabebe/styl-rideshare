import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { useRideSound } from './useRideSound';

// Handle notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Listens for incoming push notifications and plays sounds / navigates.
 *
 * Sound behavior:
 *   - ride_request / stop_added → ringtone (looping, urgent)
 *   - address_changed / route_updated → notification chime (single)
 *   - All others → notification chime
 */
export function useNotificationListener() {
  const navigation = useNavigation<any>();
  const responseListener = useRef<Notifications.Subscription>();
  const notificationListener = useRef<Notifications.Subscription>();
  const { playRingtone, playNotification } = useRideSound();

  useEffect(() => {
    // Foreground notification — play appropriate sound
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as { type?: string };
      const type = data?.type;

      if (type === 'ride_request' || type === 'stop_added') {
        playRingtone();
      } else {
        playNotification();
      }
    });

    // User tapped a notification — navigate
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        type?: string;
        rideId?: string;
      };

      if (!data?.rideId) return;
      const { type, rideId } = data;

      switch (type) {
        case 'ride_request':
          navigation.navigate('RideFlow', { screen: 'AcceptRide', params: { rideId } });
          break;
        case 'ride_cancelled':
          navigation.popToTop();
          break;
        default:
          break;
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [navigation]);
}
