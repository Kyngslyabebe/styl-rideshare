import { useEffect, useState } from 'react';
import polyline from '@mapbox/polyline';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY!;

interface LatLng {
  latitude: number;
  longitude: number;
}

export function useRoutePolyline(
  originLat?: number,
  originLng?: number,
  destLat?: number,
  destLng?: number,
) {
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);

  useEffect(() => {
    if (!originLat || !originLng || !destLat || !destLng) return;

    (async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&key=${GOOGLE_API_KEY}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.routes?.[0]?.overview_polyline?.points) {
          const decoded = polyline.decode(json.routes[0].overview_polyline.points);
          setRouteCoords(decoded.map(([lat, lng]: number[]) => ({ latitude: lat, longitude: lng })));
        }
      } catch (err) {
        console.warn('Route polyline fetch error:', err);
      }
    })();
  }, [originLat, originLng, destLat, destLng]);

  return routeCoords;
}
