import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import {
  ARRIVAL_RADIUS_METERS,
  PICKUP_RADIUS_METERS,
  MAX_IGNORED_REQUESTS,
  STOP_WAIT_THRESHOLD_SEC,
} from '@styl/shared';

export interface PlatformConfig {
  arrivalRadiusM: number;
  pickupRadiusM: number;
  maxIgnoredRequests: number;
  stopWaitThresholdSec: number;
  loading: boolean;
}

const KEYS = [
  'arrival_radius_meters', 'pickup_radius_meters',
  'max_ignored_requests', 'stop_wait_threshold_sec',
];

export function usePlatformConfig(): PlatformConfig {
  const [cfg, setCfg] = useState<PlatformConfig>({
    arrivalRadiusM: ARRIVAL_RADIUS_METERS,
    pickupRadiusM: PICKUP_RADIUS_METERS,
    maxIgnoredRequests: MAX_IGNORED_REQUESTS,
    stopWaitThresholdSec: STOP_WAIT_THRESHOLD_SEC,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('key, value')
          .in('key', KEYS);
        if (cancelled) return;

        const raw: Record<string, any> = {};
        (data || []).forEach((r: any) => { raw[r.key] = r.value; });

        setCfg({
          arrivalRadiusM: Number(raw.arrival_radius_meters ?? ARRIVAL_RADIUS_METERS),
          pickupRadiusM: Number(raw.pickup_radius_meters ?? PICKUP_RADIUS_METERS),
          maxIgnoredRequests: Number(raw.max_ignored_requests ?? MAX_IGNORED_REQUESTS),
          stopWaitThresholdSec: Number(raw.stop_wait_threshold_sec ?? STOP_WAIT_THRESHOLD_SEC),
          loading: false,
        });
      } catch {
        if (!cancelled) setCfg((p) => ({ ...p, loading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return cfg;
}
