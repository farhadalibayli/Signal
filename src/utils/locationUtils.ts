import type { LocationData } from '../types/signal';
import type { UserCoords }   from '../hooks/useUserLocation';

// ── Haversine distance (returns metres) ──────────────────────────────────────
export function haversineMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R   = 6_371_000; // Earth radius in metres
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Auto-switch m / km ────────────────────────────────────────────────────────
export function formatDistance(metres: number): string {
  if (metres < 50)   return 'Here';
  if (metres < 1000) return `${Math.round(metres / 10) * 10} m`;
  if (metres < 10000) return `${(metres / 1000).toFixed(1)} km`;
  return `${Math.round(metres / 1000)} km`;
}

// ── Distance from user location to a signal location ─────────────────────────
export function distanceToSignal(
  userCoords: UserCoords,
  location:   LocationData | undefined,
): string | null {
  if (
    !userCoords ||
    !location?.latitude ||
    !location?.longitude ||
    location.privacy === 'general' ||
    location.privacy === 'none'
  ) return null;

  const m = haversineMetres(
    userCoords.lat, userCoords.lng,
    location.latitude, location.longitude,
  );
  return formatDistance(m);
}

// ── Static map thumbnail URL (OpenStreetMap — free, no API key) ───────────────
export function staticMapUrl(
  lat: number,
  lng: number,
  width  = 400,
  height = 180,
  zoom   = 15,
): string {
  return (
    `https://staticmap.openstreetmap.de/staticmap.php` +
    `?center=${lat},${lng}` +
    `&zoom=${zoom}` +
    `&size=${width}x${height}` +
    `&markers=${lat},${lng},lightblue-marker-standalone`
  );
}

// ── Location edit window ──────────────────────────────────────────────────────
// Returns seconds remaining in edit window (10 % of signal duration).
// Returns 0 if window has closed.
export function locationEditSecondsLeft(
  createdAt:    number | undefined,
  minutesLeft:  number,
  totalMinutes: number,
): number {
  if (!createdAt) return 0;
  const windowMs  = totalMinutes * 60 * 1000 * 0.10;  // 10 % of total
  const elapsedMs = Date.now() - createdAt;
  const remaining = windowMs - elapsedMs;
  return Math.max(0, Math.floor(remaining / 1000));
}

// ── Nominatim search (OpenStreetMap — free, no API key) ───────────────────────
export type NominatimPlace = {
  place_id:    number;
  display_name: string;
  name:        string;
  lat:         string;
  lon:         string;
  address: {
    city?:         string;
    town?:         string;
    village?:      string;
    suburb?:       string;
    neighbourhood?: string;
    country?:      string;
  };
};

export async function searchPlaces(query: string): Promise<NominatimPlace[]> {
  if (!query.trim()) return [];
  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(query)}` +
      `&format=json&limit=6&addressdetails=1&accept-language=en`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SignalApp/1.0' },
    });
    return await res.json();
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?lat=${lat}&lon=${lng}&format=json&accept-language=en`;
    const res  = await fetch(url, { headers: { 'User-Agent': 'SignalApp/1.0' } });
    const json = await res.json();
    const a    = json.address ?? {};
    const parts = [
      json.name,
      a.road,
      a.suburb ?? a.neighbourhood,
      a.city ?? a.town ?? a.village,
    ].filter(Boolean);
    return parts.slice(0, 3).join(', ') || json.display_name?.split(',')[0] || 'Selected location';
  } catch {
    return 'Selected location';
  }
}

// ── Short label for display ───────────────────────────────────────────────────
export function shortPlaceLabel(place: NominatimPlace): string {
  const a = place.address;
  const parts = [
    place.name || place.display_name.split(',')[0],
    a.city ?? a.town ?? a.village ?? a.suburb,
  ].filter(Boolean);
  return parts.join(', ');
}