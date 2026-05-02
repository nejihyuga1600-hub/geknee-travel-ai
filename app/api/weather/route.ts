// Weather endpoint with two-layer behavior:
//  1. Trips within the 14-day forecast window → OpenWeather forecast
//     (existing behavior, free 5-day/3-hour window).
//  2. Trips outside the window (far future, in the past, or any time
//     forecast is unavailable) → fall back to climate normals computed
//     from Open-Meteo's free Archive API. We average the same calendar
//     dates from the last 3 years so users get a sensible "what's the
//     weather usually like in Kyoto in mid-April" answer instead of the
//     "Weather unavailable" empty state.
//
// Open-Meteo's Archive + Geocoding APIs are free, no key required.

const API_KEY = process.env.OPENWEATHER_API_KEY;
const FORECAST_BASE = "https://api.openweathermap.org/data/2.5";

export interface DayWeather {
  date:      string;   // "YYYY-MM-DD"
  tempMin:   number;   // °C
  tempMax:   number;   // °C
  condition: string;   // e.g. "Partly Cloudy"
  icon:      string;   // OpenWeather icon code (we reuse for visual continuity)
  iconUrl:   string;
  pop:       number;   // max precipitation probability 0–1
}

// WMO weather code → OpenWeather icon equivalent. Open-Meteo Archive
// returns WMO codes; mapping to OWM icons keeps WeatherBar visuals
// identical regardless of source. Simplified per-bucket.
const WMO_TO_ICON: Record<number, { icon: string; condition: string }> = {
  0:  { icon: "01d", condition: "Clear" },
  1:  { icon: "02d", condition: "Mainly clear" },
  2:  { icon: "03d", condition: "Partly cloudy" },
  3:  { icon: "04d", condition: "Overcast" },
  45: { icon: "50d", condition: "Fog" },
  48: { icon: "50d", condition: "Fog" },
  51: { icon: "09d", condition: "Light drizzle" },
  53: { icon: "09d", condition: "Drizzle" },
  55: { icon: "09d", condition: "Heavy drizzle" },
  56: { icon: "09d", condition: "Freezing drizzle" },
  57: { icon: "09d", condition: "Freezing drizzle" },
  61: { icon: "10d", condition: "Light rain" },
  63: { icon: "10d", condition: "Rain" },
  65: { icon: "10d", condition: "Heavy rain" },
  66: { icon: "13d", condition: "Freezing rain" },
  67: { icon: "13d", condition: "Freezing rain" },
  71: { icon: "13d", condition: "Light snow" },
  73: { icon: "13d", condition: "Snow" },
  75: { icon: "13d", condition: "Heavy snow" },
  77: { icon: "13d", condition: "Snow grains" },
  80: { icon: "09d", condition: "Rain showers" },
  81: { icon: "09d", condition: "Heavy rain showers" },
  82: { icon: "09d", condition: "Violent showers" },
  85: { icon: "13d", condition: "Snow showers" },
  86: { icon: "13d", condition: "Heavy snow" },
  95: { icon: "11d", condition: "Thunderstorm" },
  96: { icon: "11d", condition: "Thunderstorm w/ hail" },
  99: { icon: "11d", condition: "Severe thunderstorm" },
};

function shiftYears(dateStr: string, years: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

async function fetchClimateNormals(
  city: string, start: string, end: string,
): Promise<DayWeather[] | null> {
  // Step 1 — geocode city via Open-Meteo (free, no key).
  let lat: number, lng: number;
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en`;
    const r = await fetch(geoUrl, { next: { revalidate: 86400 } });
    if (!r.ok) return null;
    const d = await r.json() as { results?: { latitude: number; longitude: number }[] };
    const loc = d.results?.[0];
    if (!loc) return null;
    lat = loc.latitude;
    lng = loc.longitude;
  } catch { return null; }

  // Step 2 — pull the same calendar dates from the last 3 years and
  // average. Three years is enough to smooth out any single anomalous
  // year (heatwave, freak storm) without too much API load.
  type Acc = { temps_max: number[]; temps_min: number[]; precips: number[]; codes: Map<number, number> };
  const accum = new Map<string, Acc>();

  await Promise.all([1, 2, 3].map(async yearOffset => {
    const sStart = shiftYears(start, -yearOffset);
    const sEnd   = shiftYears(end,   -yearOffset);
    const archUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${sStart}&end_date=${sEnd}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto`;
    try {
      const r = await fetch(archUrl, { next: { revalidate: 86400 } });
      if (!r.ok) return;
      const d = await r.json() as {
        daily?: {
          time: string[];
          temperature_2m_max: number[];
          temperature_2m_min: number[];
          precipitation_sum: (number | null)[];
          weathercode: number[];
        };
      };
      const dates = d.daily?.time ?? [];
      dates.forEach((origDate, i) => {
        const outDate = shiftYears(origDate, yearOffset);
        if (!accum.has(outDate)) {
          accum.set(outDate, { temps_max: [], temps_min: [], precips: [], codes: new Map() });
        }
        const a = accum.get(outDate)!;
        a.temps_max.push(d.daily!.temperature_2m_max[i]);
        a.temps_min.push(d.daily!.temperature_2m_min[i]);
        a.precips.push(d.daily!.precipitation_sum[i] ?? 0);
        const code = d.daily!.weathercode[i];
        a.codes.set(code, (a.codes.get(code) ?? 0) + 1);
      });
    } catch { /* swallow per-year errors; other years may still succeed */ }
  }));

  if (accum.size === 0) return null;

  const avg = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
  const days: DayWeather[] = [...accum.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, a]) => {
      const tempMax = Math.round(avg(a.temps_max));
      const tempMin = Math.round(avg(a.temps_min));
      const avgPrecip = avg(a.precips);
      // Mode of weather codes across the years.
      const topCode = [...a.codes.entries()].sort(([, x], [, y]) => y - x)[0]?.[0] ?? 0;
      const meta = WMO_TO_ICON[topCode] ?? { icon: "01d", condition: "Clear" };
      // Crude pop: ≥5 mm/day reads as 100% chance, scale linearly below.
      const pop = Math.min(1, avgPrecip / 5);
      return {
        date, tempMin, tempMax,
        condition: meta.condition,
        icon: meta.icon,
        iconUrl: `https://openweathermap.org/img/wn/${meta.icon}@2x.png`,
        pop,
      };
    });

  return days;
}

async function fetchForecast(city: string): Promise<DayWeather[] | null> {
  if (!API_KEY) return null;
  const url = `${FORECAST_BASE}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&cnt=40`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;

  const data = await res.json() as {
    list?: Array<{
      dt_txt: string;
      main: { temp_min: number; temp_max: number };
      pop?: number;
      weather?: { icon: string; description: string }[];
    }>;
    city?: { name: string };
  };

  const byDate = new Map<string, {
    temps: number[]; pops: number[];
    icons: Map<string, number>;
    conditions: Map<string, number>;
  }>();

  for (const item of data.list ?? []) {
    const date = item.dt_txt.slice(0, 10);
    if (!byDate.has(date)) {
      byDate.set(date, { temps: [], pops: [], icons: new Map(), conditions: new Map() });
    }
    const d = byDate.get(date)!;
    d.temps.push(item.main.temp_min, item.main.temp_max);
    d.pops.push(item.pop ?? 0);
    const icon      = item.weather?.[0]?.icon ?? "01d";
    const condition = item.weather?.[0]?.description ?? "";
    d.icons.set(icon, (d.icons.get(icon) ?? 0) + 1);
    d.conditions.set(condition, (d.conditions.get(condition) ?? 0) + 1);
  }

  return [...byDate.entries()].map(([date, d]) => {
    const icon      = [...d.icons.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "01d";
    const condition = [...d.conditions.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    return {
      date,
      tempMin:   Math.round(Math.min(...d.temps)),
      tempMax:   Math.round(Math.max(...d.temps)),
      condition: condition.replace(/\b\w/g, c => c.toUpperCase()),
      icon,
      iconUrl:   `https://openweathermap.org/img/wn/${icon}@2x.png`,
      pop:       Math.max(...d.pops),
    };
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city  = searchParams.get("city");
  const start = searchParams.get("start"); // YYYY-MM-DD, optional
  const end   = searchParams.get("end");   // YYYY-MM-DD, optional
  if (!city) return Response.json({ error: "city required" }, { status: 400 });

  // Pick source: forecast for trips starting within ~14 days from
  // today; climate normals (last-3-year average) for anything else.
  // If the trip dates aren't known, default to forecast.
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const useNormals = !!(start && end) && (() => {
    const startMs = new Date(start + "T00:00:00Z").getTime();
    const endMs   = new Date(end   + "T00:00:00Z").getTime();
    return startMs - now > 14 * day || endMs < now;
  })();

  if (useNormals && start && end) {
    const days = await fetchClimateNormals(city, start, end);
    if (days && days.length > 0) {
      return Response.json({ city, days, source: "climate_normals" });
    }
    // Climate normals failed — fall through to forecast as a last try.
  }

  const days = await fetchForecast(city);
  if (days && days.length > 0) {
    return Response.json({ city, days, source: "forecast" });
  }

  // Both layers failed — try climate normals as a last-ditch fallback
  // even without explicit dates (use the next 7 days of "this time
  // last year") so the strip still shows something sensible.
  if (start && end) {
    const days2 = await fetchClimateNormals(city, start, end);
    if (days2 && days2.length > 0) {
      return Response.json({ city, days: days2, source: "climate_normals" });
    }
  }

  return Response.json({ error: "weather unavailable", days: [] }, { status: 200 });
}
