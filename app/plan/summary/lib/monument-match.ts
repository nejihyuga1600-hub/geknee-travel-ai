// Match a free-text place name (a destination string or a pinned bookmark
// name) to a monument key in app/plan/location/globe/info.ts. Returns the
// camelCase key on match, null otherwise. Used by the itinerary fetcher
// to enrich the AI prompt with the monument's quest list when a user is
// traveling to or has pinned a monument that has quests defined.

import { INFO } from '@/app/plan/location/globe/info';

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function findMonumentKey(name: string | undefined | null): string | null {
  if (!name) return null;
  const target = normalize(name);
  if (!target || target.length < 3) return null;

  // Pass 1: exact normalized match against the monument's display name.
  for (const [key, info] of Object.entries(INFO)) {
    if (normalize(info.name) === target) return key;
  }

  // Pass 2: containment either way. Catches "Trip to Taj Mahal" → tajMahal,
  // and a bookmark named "Eiffel" → eiffelTower. Length guard avoids tiny
  // common substrings (e.g. "the") spuriously matching everything.
  for (const [key, info] of Object.entries(INFO)) {
    const monumentNorm = normalize(info.name);
    if (monumentNorm.length < 4) continue;
    if (target.includes(monumentNorm) || monumentNorm.includes(target)) return key;
  }

  return null;
}
