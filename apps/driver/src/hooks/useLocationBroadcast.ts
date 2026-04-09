import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../services/supabase';

export function useLocationBroadcast(driverId: string | undefined, isOnline: boolean) {
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!isOnline || !driverId) {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      return;
    }

    let mounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !mounted) return;

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 10,
        },
        async (location) => {
          if (!mounted) return;
          await supabase.from('driver_locations').upsert({
            driver_id: driverId,
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            heading: location.coords.heading,
            speed: location.coords.speed,
            is_online: true,
            updated_at: new Date().toISOString(),
          });
        }
      );
    })();

    return () => {
      mounted = false;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [isOnline, driverId]);
}
