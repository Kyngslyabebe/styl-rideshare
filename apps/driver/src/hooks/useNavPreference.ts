import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';

export type NavApp = 'google' | 'waze' | 'apple';

const STORAGE_KEY = 'styl_nav_preference';

export function useNavPreference() {
  const [navApp, setNavApp] = useState<NavApp>('google');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === 'google' || val === 'waze' || val === 'apple') setNavApp(val);
    });
  }, []);

  const setPreference = async (app: NavApp) => {
    setNavApp(app);
    await AsyncStorage.setItem(STORAGE_KEY, app);
  };

  return { navApp, setPreference };
}

export function openNavigation(lat: number, lng: number, navApp: NavApp) {
  const urls: Record<NavApp, { primary: string; fallback: string }> = {
    waze: {
      primary: `waze://?ll=${lat},${lng}&navigate=yes`,
      fallback: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
    },
    google: {
      primary: Platform.OS === 'ios'
        ? `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`
        : `google.navigation:q=${lat},${lng}`,
      fallback: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    },
    apple: {
      primary: `maps://app?daddr=${lat},${lng}`,
      fallback: `https://maps.apple.com/?daddr=${lat},${lng}`,
    },
  };

  const { primary, fallback } = urls[navApp];
  Linking.openURL(primary).catch(() => {
    Linking.openURL(fallback);
  });
}
