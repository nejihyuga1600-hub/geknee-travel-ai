// Synchronous lookup of well-known destination names to lat/lng coords.
// Used as a fast path so the map can land on famous locations (Taj Mahal,
// Eiffel Tower, etc.) the instant it mounts, without waiting on a
// Geocoder roundtrip — and to skip burning Geocoder API quota for the
// most common cases.
//
// Source of truth is MONUMENT_LATLON in app/plan/location/globe/skins.ts
// (camelCase key → {lat, lon}). This module wraps that with a
// human-readable name lookup so callers don't need to know the keys.

import { MONUMENT_LATLON } from '@/app/plan/location/globe/skins';

const LABELS: Record<string, string> = {
  eiffelTower:    'eiffel tower',
  colosseum:      'colosseum',
  tajMahal:       'taj mahal',
  greatWall:      'great wall of china',
  statueLiberty:  'statue of liberty',
  sagradaFamilia: 'sagrada familia',
  machuPicchu:    'machu picchu',
  christRedeem:   'christ the redeemer',
  angkorWat:      'angkor wat',
  pyramidGiza:    'pyramids of giza',
  goldenGate:     'golden gate bridge',
  bigBen:         'big ben',
  acropolis:      'acropolis',
  sydneyOpera:    'sydney opera house',
  neuschwanstein: 'neuschwanstein castle',
  stonehenge:     'stonehenge',
  iguazuFalls:    'iguazu falls',
  tokyoSkytree:   'tokyo skytree',
  victoriaFalls:  'victoria falls',
};

export const NAME_TO_COORDS: Record<string, { lat: number; lng: number }> = (() => {
  const out: Record<string, { lat: number; lng: number }> = {};
  for (const [key, label] of Object.entries(LABELS)) {
    const ll = MONUMENT_LATLON[key];
    if (ll) out[label] = { lat: ll.lat, lng: ll.lon };
  }
  return out;
})();

/**
 * Returns coords for a known monument name (case- and whitespace-insensitive),
 * or null if the location isn't in the lookup table. Caller should fall back
 * to a Geocoder call when null is returned.
 */
export function lookupKnownCoords(location: string | null | undefined): { lat: number; lng: number } | null {
  if (!location) return null;
  const key = location.trim().toLowerCase();
  return NAME_TO_COORDS[key] ?? null;
}
