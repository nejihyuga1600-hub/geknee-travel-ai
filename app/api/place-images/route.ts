// Returns proxy URLs for place photos.
// Pipeline: Google Places → Foursquare → empty array

import { auth } from "@/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ images: [] }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name     = searchParams.get("name")     ?? "";
  const location = searchParams.get("location") ?? "";

  if (!name) return Response.json({ images: [] });

  const query = `${name} ${location}`.trim();

  // ── 1. Google Places ────────────────────────────────────────────────────────
  const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY;
  if (GOOGLE_KEY) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_KEY}`
      );
      const data = await res.json() as {
        results?: Array<{
          photos?: Array<{ photo_reference: string; width?: number; height?: number }>;
          types?: string[];
        }>;
      };
      const top = data.results?.[0];
      const photos = top?.photos ?? [];
      // Bias against generic POI types where Google Places returns lots
      // of user-uploaded portrait selfies (markets, bazaars, restaurants
      // where customers pose). For those we'd rather skip Google entirely
      // and fall through to Wikipedia / Wikidata which give exterior
      // shots. Type list per Google Places API.
      const SELFIE_PRONE_TYPES = new Set([
        'restaurant', 'cafe', 'bar', 'food', 'meal_takeaway', 'meal_delivery',
        'bakery', 'night_club', 'beauty_salon', 'hair_care', 'spa', 'gym',
        'clothing_store', 'shopping_mall', 'store',
      ]);
      const isSelfieProne = (top?.types ?? []).some(t => SELFIE_PRONE_TYPES.has(t));
      // Sort landscape-first by width/height ratio.
      const ranked = [...photos].sort((a, b) => {
        const ar = (a.width ?? 0) / Math.max(1, a.height ?? 0);
        const br = (b.width ?? 0) / Math.max(1, b.height ?? 0);
        return br - ar;
      });
      const landscape = ranked.filter(p => {
        if (!p.width || !p.height) return false; // unknown dims = reject (was: accept)
        return p.width / p.height >= 1.05;
      });
      // For selfie-prone types: only return if we found *at least one*
      // landscape photo. For trustworthy types (museums, monuments,
      // parks) we accept the whole pool since those rarely surface
      // selfies. Either way, never return ranked-with-portraits as a
      // last resort — let the fallback chain handle it.
      const pool = isSelfieProne
        ? landscape
        : (landscape.length > 0 ? landscape : ranked.filter(p => p.width && p.height));
      if (pool.length > 0) {
        const images = pool.slice(0, 5).map(
          (p) => `/api/place-photo?ref=${encodeURIComponent(p.photo_reference)}`
        );
        return Response.json({ images });
      }
      // No qualifying photo from Google — fall through to Foursquare /
      // empty rather than returning a likely-bad portrait.
    } catch (err) {
      console.error("Google Places error:", err);
    }
  }

  // ── 2. Foursquare Places ────────────────────────────────────────────────────
  const FSQ_KEY = process.env.FOURSQUARE_API_KEY;
  if (FSQ_KEY) {
    try {
      // Search for the place
      const searchRes = await fetch(
        `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(query)}&limit=1&fields=fsq_id,name`,
        { headers: { Authorization: FSQ_KEY, Accept: "application/json" } }
      );
      const searchData = await searchRes.json() as {
        results?: Array<{ fsq_id: string }>;
      };
      const fsqId = searchData.results?.[0]?.fsq_id;

      if (fsqId) {
        // Fetch photos for that place
        const photoRes = await fetch(
          `https://api.foursquare.com/v3/places/${fsqId}/photos?limit=5`,
          { headers: { Authorization: FSQ_KEY, Accept: "application/json" } }
        );
        const photoData = await photoRes.json() as Array<{
          prefix: string; suffix: string;
        }>;
        const images = (photoData ?? []).map(
          (p) => `${p.prefix}800x600${p.suffix}`
        );
        if (images.length > 0) return Response.json({ images });
      }
    } catch (err) {
      console.error("Foursquare error:", err);
    }
  }

  return Response.json({ images: [] });
}
