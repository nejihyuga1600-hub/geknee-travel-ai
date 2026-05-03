// User's home location — persisted in localStorage so the booking
// suggestions endpoint can fly the user from their actual nearest
// airport instead of guessing from locale. Captured once via the
// permission banner on the globe page; cleared when the user opts
// out so we don't keep re-prompting.

import { nearestAirport, type AirportRec } from './airport-coords';

const STORAGE_KEY = 'geknee_home_v1';
const ASKED_KEY   = 'geknee_home_asked_v1';

export interface UserHome {
  iata: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  capturedAt: number; // ms epoch
}

export function loadUserHome(): UserHome | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserHome;
    if (!parsed?.iata || !Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng)) return null;
    return parsed;
  } catch { return null; }
}

export function saveUserHome(rec: UserHome): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rec)); } catch { /* full / unavailable */ }
}

export function clearUserHome(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export function hasAskedForHome(): boolean {
  if (typeof window === 'undefined') return true;
  try { return localStorage.getItem(ASKED_KEY) === '1'; } catch { return true; }
}

export function markAskedForHome(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(ASKED_KEY, '1'); } catch { /* ignore */ }
}

// Ask the browser for geolocation, then resolve to the closest known
// airport in our hardcoded list. Returns null on denial / error.
export async function captureUserHomeFromGeolocation(): Promise<UserHome | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        const rec: AirportRec | null = nearestAirport(latitude, longitude);
        if (!rec) return resolve(null);
        const home: UserHome = {
          iata: rec.iata,
          city: rec.city,
          country: rec.country,
          countryCode: rec.countryCode,
          lat: latitude,
          lng: longitude,
          capturedAt: Date.now(),
        };
        saveUserHome(home);
        markAskedForHome();
        resolve(home);
      },
      () => { markAskedForHome(); resolve(null); },
      { timeout: 8000, enableHighAccuracy: false, maximumAge: 60 * 60 * 1000 },
    );
  });
}
