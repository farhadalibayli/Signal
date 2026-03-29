import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export type UserCoords = { lat: number; lng: number } | null;

export function useUserLocation() {
  const [coords,    setCoords   ] = useState<UserCoords>(null);
  const [permitted, setPermitted] = useState(false);
  const [loading,   setLoading  ] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setPermitted(true);
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch (_) {
        // GPS unavailable — silently fail, distance just won't show
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { coords, permitted, loading };
}