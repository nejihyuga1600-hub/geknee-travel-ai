// SerpAPI proxy for Google Maps popular-times.
// Google's official Places API doesn't expose this — SerpAPI scrapes the
// public maps.google.com response. Proxying server-side keeps the API key
// off the client and lets us cache repeat calls.

const KEY = process.env.SERPAPI_KEY;

interface SerpHour { time: string; info?: string; busyness_score?: number }
interface SerpDay { day: string; busyness: SerpHour[] }
interface SerpResult {
  popular_times?: SerpDay[] | { graph_results?: SerpDay[] };
  title?: string;
  position?: number;
}

export async function GET(req: Request) {
  if (!KEY) return Response.json({ error: 'SERPAPI_KEY not set' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const place = searchParams.get('place');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  if (!place) return Response.json({ error: 'place required' }, { status: 400 });

  const params = new URLSearchParams({
    engine: 'google_maps',
    q: place,
    type: 'search',
    api_key: KEY,
  });
  if (lat && lon) params.set('ll', `@${lat},${lon},14z`);

  const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
    next: { revalidate: 60 * 60 * 6 }, // popular-times barely changes — 6h cache
  });
  if (!res.ok) {
    return Response.json({ error: `SerpAPI ${res.status}` }, { status: res.status });
  }
  const data = await res.json() as { local_results?: SerpResult[]; place_results?: SerpResult };
  const candidate = data.place_results ?? data.local_results?.[0];
  if (!candidate) return Response.json({ name: place, hours: null });

  // SerpAPI emits two shapes for popular_times across query types:
  //   { popular_times: SerpDay[] }
  //   { popular_times: { graph_results: SerpDay[] } }
  const popular = Array.isArray(candidate.popular_times)
    ? candidate.popular_times
    : (candidate.popular_times?.graph_results ?? null);

  if (!popular || popular.length === 0) {
    return Response.json({ name: candidate.title ?? place, hours: null });
  }

  // Pick today's day. SerpAPI labels them by short name ("Mon", "Tue", …).
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'short' });
  const today = popular.find(d => d.day?.startsWith(todayLabel)) ?? popular[0];

  // Flatten into a 24-bin array indexed 0..23. SerpAPI's `time` is "6 AM",
  // "12 AM", etc. Score is busyness_score (0–100) when present.
  const hours: number[] = Array(24).fill(0);
  for (const h of today.busyness ?? []) {
    const m = h.time?.match(/^(\d{1,2})\s*(AM|PM)/i);
    if (!m) continue;
    let hour = parseInt(m[1], 10) % 12;
    if (m[2].toUpperCase() === 'PM') hour += 12;
    hours[hour] = typeof h.busyness_score === 'number' ? h.busyness_score : 0;
  }

  return Response.json({
    name: candidate.title ?? place,
    hours,
    day: today.day ?? todayLabel,
  });
}
