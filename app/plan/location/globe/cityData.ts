// Async loader for the GeoNames cities15000 dataset (~33K cities, pop > 15K).
// The curated CITIES array in LocationClient.tsx stays as the baseline; this
// merges in the long tail when the JSON arrives, deduped by name. The existing
// CityLabels spatial-dedup pipeline does the heavy lifting on what actually
// renders at each zoom level.

import { useEffect, useState } from "react";

export type City = { n: string; lat: number; lon: number; p?: number; c?: string };

let _extra: City[] = [];
let _loadPromise: Promise<void> | null = null;
let _version = 0;
const subscribers = new Set<() => void>();

export function getExtraCities(): City[] {
  return _extra;
}

export function subscribeCities(fn: () => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

// React hook — components depending on the extra cities include the returned
// version in their useMemo deps so they recompute once the JSON arrives.
export function useExtraCitiesVersion(): number {
  const [v, setV] = useState(_version);
  useEffect(() => subscribeCities(() => setV(_version)), []);
  return v;
}

export function loadExtraCities(seenNames: Set<string>): Promise<void> {
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    try {
      const res = await fetch("/data/cities-geonames-15k.json");
      if (!res.ok) return;
      const raw = (await res.json()) as { n: string; lat: number; lon: number; c: string; p: number }[];
      // Drop anything we already know about (curated list takes precedence).
      const lower = new Set(Array.from(seenNames).map((s) => s.toLowerCase()));
      _extra = raw
        .filter((c) => c.n && !lower.has(c.n.toLowerCase()))
        .map((c) => ({ n: c.n, lat: c.lat, lon: c.lon, p: c.p, c: c.c }));
      _version += 1;
      subscribers.forEach((fn) => fn());
    } catch {
      // Network/parse failure → keep the curated list only, no error surfaced.
    }
  })();
  return _loadPromise;
}
