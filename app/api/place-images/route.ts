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
        results?: Array<{ photos?: Array<{ photo_reference: string; width?: number; height?: number }> }>;
      };
      const photos = data.results?.[0]?.photos ?? [];
      // Prefer landscape photos: portrait orientation is a strong signal
      // of a user-uploaded selfie/headshot rather than a real shot of
      // the place. Sort landscape-first; fall back to any if none qualify.
      const ranked = [...photos].sort((a, b) => {
        const ar = (a.width ?? 0) / Math.max(1, a.height ?? 0);
        const br = (b.width ?? 0) / Math.max(1, b.height ?? 0);
        return br - ar;
      });
      const landscape = ranked.filter(p => {
        if (!p.width || !p.height) return true;
        return p.width / p.height >= 1.05;
      });
      const pool = landscape.length > 0 ? landscape : ranked;
      if (pool.length > 0) {
        const images = pool.slice(0, 5).map(
          (p) => `/api/place-photo?ref=${encodeURIComponent(p.photo_reference)}`
        );
        return Response.json({ images });
      }
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
