'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Mapbox-based per-day map. Replaces the previous Google Maps implementation
// (Geocoder + DirectionsService + PlacesService + InfoWindow) with a much
// lighter pipeline: server-cached geocode lookups via /api/geocode, numbered
// HTML markers, and a single dashed GeoJSON line between points. No
// directions API call — the dashed segment between numbered pins reads as
// "this day's stops" without trying to mimic actual road routing.

type TransportMode = 'walking' | 'cycling' | 'driving' | 'transit' | 'flight';

const GENERIC_WORDS = new Set([
  'Morning', 'Afternoon', 'Evening', 'Night', 'Midnight',
  'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Brunch',
  'Day', 'Week', 'Weekend', 'Hour', 'Time',
  'Overview', 'Summary', 'Introduction', 'Highlights', 'Highlight',
  'Tips', 'Tip', 'Note', 'Notes', 'Important', 'Reminder',
  'Transportation', 'Transport', 'Getting', 'Travel', 'Traveling',
  'Budget', 'Cost', 'Price', 'Money', 'Currency',
  'Option', 'Optional', 'Alternative', 'Recommendation',
  'Activities', 'Accommodation', 'Hotel', 'Hostel',
]);

const MODE_LABEL: Record<TransportMode, string> = {
  walking: 'Walking route',
  cycling: 'Cycling route',
  transit: 'Transit route',
  driving: 'Driving route',
  flight:  'Flight path',
};

function detectMode(lines: string[]): TransportMode {
  const text = lines.join(' ').toLowerCase();
  const flightKeywords = /\b(take.*flight|board.*plane|depart.*airport|fly from|flight from|fly to)\b/;
  if (flightKeywords.test(text)) return 'flight';
  if (/\b(subway|metro|tube|underground|tram|train|rail|bus|transit|shuttle)\b/.test(text)) return 'transit';
  if (/\b(bike|cycling|cycle|bicycle|scooter)\b/.test(text)) return 'cycling';
  if (/\b(walk|stroll|on foot|hike|hiking|pedestrian|wander|wanders|strolling)\b/.test(text)) return 'walking';
  return 'driving';
}

function extractPlaces(lines: string[]): Array<{ name: string }> {
  const seen = new Set<string>();
  const results: Array<{ name: string }> = [];
  for (const line of lines) {
    const boldMatches = [...line.matchAll(/\*\*([A-Z][^*]{1,50})\*\*/g)];
    for (const m of boldMatches) {
      const name = m[1].trim();
      if (GENERIC_WORDS.has(name.split(/[\s(]/)[0])) continue;
      if (!seen.has(name)) {
        seen.add(name);
        results.push({ name });
      }
    }
    if (results.length >= 12) break;
  }
  return results;
}

interface Place { name: string; coords: [number, number] }  // [lng, lat]

interface DayMapProps {
  heading: string;
  lines: string[];
  location: string;
  height?: number;
  namedPlaces?: string[];
  onPlacesResolved?: (names: string[]) => void;
}

export default function DayMap({
  heading, lines, location, height = 220, namedPlaces, onPlacesResolved,
}: DayMapProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const loadKeyRef = useRef('');

  const [isVisible, setIsVisible] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [mode, setMode] = useState<TransportMode>('driving');
  const [stopCount, setStopCount] = useState(0);

  // Lazy-mount: only init the map when the card scrolls into view.
  useEffect(() => {
    const el = divRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); obs.disconnect(); } },
      { threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Init map once visible.
  useEffect(() => {
    if (!isVisible || mapRef.current || !divRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) { setTokenMissing(true); return; }
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: divRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [139.6917, 35.6895],
      zoom: 11,
      attributionControl: false,
      cooperativeGestures: true,
    });

    map.on('load', () => {
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [] },
          properties: {},
        },
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#a78bfa',
          'line-width': 3,
          'line-dasharray': [1.5, 1.5],
          'line-opacity': 0.85,
        },
      });
      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      try { map.remove(); } catch { /* already gone */ }
      mapRef.current = null;
    };
  }, [isVisible]);

  // Geocode + render route + markers.
  useEffect(() => {
    if (!mapReady) return;

    const placeTokens = namedPlaces ?? lines.filter(l => /\*\*[A-Z]/.test(l)).slice(0, 20);
    const loadKey = JSON.stringify({ heading, location, placeTokens });
    if (loadKey === loadKeyRef.current) return;
    loadKeyRef.current = loadKey;

    let cancelled = false;

    // Clear previous markers and route line.
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    const src = mapRef.current?.getSource('route') as mapboxgl.GeoJSONSource | undefined;
    src?.setData({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [] },
      properties: {},
    });

    async function geocode(address: string): Promise<[number, number] | null> {
      const cacheKey = `geo:${address}`;
      try {
        const hit = sessionStorage.getItem(cacheKey);
        if (hit) {
          const c = JSON.parse(hit) as { lat: number; lng: number };
          return [c.lng, c.lat];
        }
      } catch { /* sessionStorage unavailable */ }
      try {
        const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
        if (res.ok) {
          const c = await res.json() as { lat: number; lng: number } | null;
          if (c) {
            try { sessionStorage.setItem(cacheKey, JSON.stringify(c)); } catch { /* ignore */ }
            return [c.lng, c.lat];
          }
        }
      } catch { /* network */ }
      return null;
    }

    async function loadData() {
      const detectedMode = detectMode(lines);
      if (!cancelled) setMode(detectedMode);

      const anchor = await geocode(location);
      if (!anchor || cancelled || !mapRef.current) return;

      const cityMatch = heading.match(/:\s*([^—–\-|,\n]+)/);
      const rawCity = cityMatch ? cityMatch[1].trim() : '';
      const city = rawCity || location;

      let center = anchor;
      if (rawCity && rawCity.toLowerCase() !== location.toLowerCase()) {
        const cc = await geocode(city);
        if (cc) center = cc;
      }
      if (cancelled) return;

      const rawPlaces = namedPlaces
        ? namedPlaces.map(n => ({ name: n }))
        : extractPlaces(lines);

      const results = await Promise.all(rawPlaces.map(async p => {
        const coords = await geocode(`${p.name}, ${city}`);
        // Continent guard: reject anything more than ~1.5° lat / 2° lng off
        // the city anchor — stops "Space Needle" landing in Europe.
        if (coords && Math.abs(coords[1] - center[1]) < 1.5 && Math.abs(coords[0] - center[0]) < 2.0) {
          return { name: p.name, coords } as Place;
        }
        return null;
      }));
      if (cancelled || !mapRef.current) return;

      const resolved = results.filter((p): p is Place => !!p);
      onPlacesResolved?.(resolved.map(p => p.name));
      setStopCount(resolved.length);

      if (resolved.length === 0) {
        // Center on city, no markers.
        mapRef.current.flyTo({ center, zoom: 11, duration: 400 });
        if (!cancelled) setReady(true);
        return;
      }

      // Add numbered pin markers. Gold for monument-ish names so the visual
      // matches the per-row gold treatment in ActivityBlock.
      resolved.forEach((p, i) => {
        const isMonument = /monument|quest|⏚|temple|shrine|cathedral|landmark|tower|palace|castle/i.test(p.name);
        const isFirst = i === 0;
        const color = isMonument ? '#fbbf24' : '#a78bfa';
        const size = isFirst ? 32 : 26;

        const el = document.createElement('div');
        el.style.cssText = `
          width: ${size}px; height: ${size}px; border-radius: 50%;
          background: ${color}; color: #0a0a1f;
          border: 2px solid #0a0a1f;
          box-shadow: 0 2px 10px rgba(0,0,0,0.5);
          font-size: ${isFirst ? 13 : 11}px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          font-family: ui-monospace, monospace;
        `;
        el.textContent = String(i + 1);

        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat(p.coords)
          .addTo(mapRef.current!);
        markersRef.current.push(marker);
      });

      // Update the dashed route line.
      const lineSrc = mapRef.current.getSource('route') as mapboxgl.GeoJSONSource | undefined;
      lineSrc?.setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: resolved.map(p => p.coords) },
        properties: {},
      });

      // Fit bounds to all markers + city anchor with generous padding.
      const bounds = new mapboxgl.LngLatBounds();
      resolved.forEach(p => bounds.extend(p.coords));
      bounds.extend(center);
      mapRef.current.fitBounds(bounds, {
        padding: { top: 40, right: 40, bottom: 50, left: 40 },
        maxZoom: 14, duration: 600,
      });

      if (!cancelled) setReady(true);
    }

    loadData();
    return () => { cancelled = true; };
  }, [heading, lines, location, namedPlaces, mapReady, onPlacesResolved]);

  if (tokenMissing) {
    return (
      <div style={{
        height, borderRadius: 12, padding: 16,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.5)', fontSize: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      }}>
        Map unavailable — set <code style={{ color: '#a78bfa' }}>NEXT_PUBLIC_MAPBOX_TOKEN</code>.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
      <div ref={divRef} style={{ width: '100%', height }} />

      {ready && stopCount > 0 && (
        <div style={{
          position: 'absolute', bottom: 10, left: 10,
          background: 'rgba(10,10,31,0.88)',
          border: '1px solid rgba(167,139,250,0.4)',
          borderRadius: 6, padding: '4px 10px',
          color: '#a78bfa', fontSize: 10.5, fontWeight: 700,
          fontFamily: 'var(--font-mono-display), ui-monospace, monospace',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          pointerEvents: 'none',
        }}>
          {stopCount} stop{stopCount === 1 ? '' : 's'} · {MODE_LABEL[mode]}
        </div>
      )}

      {!ready && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(10,10,31,0.6)', pointerEvents: 'none',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Loading map…</span>
        </div>
      )}
    </div>
  );
}
