'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

// ─── E1 · Plan map · Mapbox 2D drop-pin UX ──────────────────────────────────
// Place-marking step that runs alongside the AI-first Atlas flow. Users drop
// pins on a real Mapbox map for places they want to hit, group them by
// category, then hand the list to the itinerary generator.
//
// v0 persists pins to localStorage keyed by tripId. A db-backed
// `/api/trips/[id]/places` route is a clean follow-up once the shape stays
// put for a while.

const MONO = 'var(--font-mono-display), ui-monospace, monospace';
const DISPLAY = 'var(--font-display), Georgia, serif';

type Category = 'food' | 'activities' | 'hotels' | 'shopping' | 'monument';
const CATEGORIES: Category[] = ['food', 'activities', 'hotels', 'shopping', 'monument'];
const CATEGORY_COLOR: Record<Category, string> = {
  food:       '#fb923c',
  activities: '#a78bfa',
  hotels:     '#7dd3fc',
  shopping:   '#fbbf24',
  monument:   '#f5f1e8',
};
const CATEGORY_LABEL: Record<Category, string> = {
  food: 'Food', activities: 'Activities', hotels: 'Hotels', shopping: 'Shopping', monument: 'Monument',
};

interface Pin {
  id: string;
  category: Category;
  label: string;
  lat: number;
  lon: number;
  note?: string;
}

interface TripData { id: string; location: string | null }

const STORAGE = (tripId: string) => `geknee_plan_pins_${tripId}`;

export default function PlanMapPage() {
  const params = useParams<{ tripId: string }>();
  const tripId = params?.tripId ?? '';
  const router = useRouter();

  const [trip, setTrip] = useState<TripData | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('activities');
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBusy, setSearchBusy] = useState(false);

  // Load trip + restore pins
  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    fetch(`/api/trips/${encodeURIComponent(tripId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d?.trip) setTrip({ id: d.trip.id, location: d.trip.location ?? null }); });
    try {
      const raw = localStorage.getItem(STORAGE(tripId));
      if (raw) setPins(JSON.parse(raw));
    } catch { /* ignore */ }
    return () => { cancelled = true; };
  }, [tripId]);

  // Persist on change
  useEffect(() => {
    if (!tripId) return;
    try { localStorage.setItem(STORAGE(tripId), JSON.stringify(pins)); } catch { /* ignore */ }
  }, [tripId, pins]);

  const addPin = (lat: number, lon: number, label?: string) => {
    const id = `pin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const next: Pin = {
      id,
      category: activeCategory,
      label: label || `Pin ${pins.length + 1}`,
      lat, lon,
    };
    setPins(p => [...p, next]);
    setSelectedPinId(id);
  };
  const removePin = (id: string) => {
    setPins(p => p.filter(x => x.id !== id));
    if (selectedPinId === id) setSelectedPinId(null);
  };
  const renamePin = (id: string, label: string) => {
    setPins(p => p.map(x => x.id === id ? { ...x, label } : x));
  };
  const recategorise = (id: string, category: Category) => {
    setPins(p => p.map(x => x.id === id ? { ...x, category } : x));
  };

  // Mapbox geocoding for the top-center search. Falls back gracefully if no
  // token is set; result drops a pin at the matched coords.
  const handleSearch = async () => {
    const q = searchQuery.trim();
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!q || !token) return;
    setSearchBusy(true);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&limit=1`;
      const res = await fetch(url);
      const data = await res.json() as { features?: Array<{ center: [number, number]; place_name: string }> };
      const f = data.features?.[0];
      if (f) {
        const [lon, lat] = f.center;
        addPin(lat, lon, q);
        setSearchQuery('');
      }
    } finally {
      setSearchBusy(false);
    }
  };

  const grouped = useMemo(() => {
    const out: Record<Category, Pin[]> = { food: [], activities: [], hotels: [], shopping: [], monument: [] };
    for (const p of pins) out[p.category].push(p);
    return out;
  }, [pins]);

  const generateItinerary = () => {
    // Ship pins along to the summary as a stops query param; the existing
    // flow already accepts `stops` JSON for multi-city. Same shape gives us
    // place-of-interest passthrough for free.
    const stops = pins.map(p => ({ city: p.label, lat: p.lat, lon: p.lon, category: p.category }));
    const q = new URLSearchParams({ savedTripId: tripId, stops: JSON.stringify(stops) });
    if (trip?.location) q.set('location', trip.location);
    router.push(`/plan/summary?${q.toString()}`);
  };

  const tokenMissing = !process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  return (
    <div style={{
      minHeight: '100svh',
      background: 'var(--brand-bg)',
      color: 'var(--brand-ink)',
      fontFamily: 'var(--font-ui), system-ui, sans-serif',
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) 360px',
    }}>
      {/* Map column */}
      <div style={{ position: 'relative', minHeight: '100svh' }}>
        {/* Top app bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
          height: 64, padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(5,5,15,0.85)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--brand-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/plan" style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '6px 12px', borderRadius: 999,
              border: '1px solid rgba(167,139,250,0.35)',
              background: 'rgba(167,139,250,0.08)',
              color: 'var(--brand-accent)',
              fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', fontWeight: 700,
              textDecoration: 'none',
            }}>
              {String.fromCodePoint(0x2190)} BACK TO GLOBE
            </Link>
            <div style={{ fontFamily: DISPLAY, fontSize: 17, color: 'var(--brand-ink)' }}>
              {trip?.location ?? '—'} · <span style={{ color: 'var(--brand-accent)', fontStyle: 'italic' }}>plan your stops</span>
            </div>
          </div>
          <button
            onClick={generateItinerary}
            disabled={pins.length === 0}
            style={{
              padding: '8px 14px', borderRadius: 999,
              background: pins.length === 0 ? 'rgba(167,139,250,0.2)' : 'var(--brand-accent)',
              color: 'var(--brand-bg)',
              border: 'none', fontSize: 12, fontWeight: 700,
              fontFamily: 'inherit',
              cursor: pins.length === 0 ? 'not-allowed' : 'pointer',
              opacity: pins.length === 0 ? 0.55 : 1,
            }}
          >
            Generate itinerary {String.fromCodePoint(0x2192)}
          </button>
        </div>

        {/* Search input */}
        <div style={{
          position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 18, width: 'min(440px, calc(100% - 32px))',
        }}>
          <form onSubmit={e => { e.preventDefault(); handleSearch(); }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'rgba(13,13,36,0.92)', backdropFilter: 'blur(16px)',
              border: '1px solid var(--brand-border)', borderRadius: 12,
              padding: '0 12px',
            }}>
              <span style={{ color: 'var(--brand-ink-mute)', fontSize: 14, marginRight: 8 }}>
                {String.fromCodePoint(0x2315)}
              </span>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search a place to add to your trip"
                style={{
                  flex: 1, padding: '10px 0',
                  background: 'transparent', border: 'none',
                  color: 'var(--brand-ink)', fontFamily: 'inherit', fontSize: 14,
                  outline: 'none',
                }}
              />
              <span style={{
                fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em',
                color: 'var(--brand-ink-mute)',
                padding: '3px 8px', border: '1px solid var(--brand-border)', borderRadius: 6,
              }}>{searchBusy ? '…' : 'ENTER'}</span>
            </div>
          </form>
        </div>

        {/* Category filter */}
        <div style={{
          position: 'absolute', top: 80, right: 24, zIndex: 18,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {CATEGORIES.map(c => {
            const active = activeCategory === c;
            return (
              <button key={c} onClick={() => setActiveCategory(c)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', borderRadius: 999,
                background: active ? `${CATEGORY_COLOR[c]}22` : 'rgba(13,13,36,0.85)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${active ? CATEGORY_COLOR[c] : 'var(--brand-border)'}`,
                color: active ? CATEGORY_COLOR[c] : 'var(--brand-ink-dim)',
                fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLOR[c] }} />
                {CATEGORY_LABEL[c]}
              </button>
            );
          })}
        </div>

        {/* Map */}
        <PlanMap
          location={trip?.location ?? null}
          pins={pins}
          activeCategory={activeCategory}
          selectedPinId={selectedPinId}
          onAddPin={addPin}
          onSelectPin={setSelectedPinId}
        />

        {tokenMissing && (
          <div style={{
            position: 'absolute', inset: 64,
            display: 'grid', placeItems: 'center',
            color: 'var(--brand-ink-mute)', fontSize: 12,
            background: 'var(--brand-bg2)',
          }}>
            NEXT_PUBLIC_MAPBOX_TOKEN not set — map preview disabled.
          </div>
        )}
      </div>

      {/* Right rail */}
      <aside style={{
        borderLeft: '1px solid var(--brand-border)',
        background: 'var(--brand-bg2)',
        padding: '24px 20px',
        overflowY: 'auto',
        maxHeight: '100svh',
      }}>
        <div style={{
          fontFamily: MONO, fontSize: 10, letterSpacing: '0.22em',
          color: 'var(--brand-accent-2)', marginBottom: 12, fontWeight: 600,
        }}>
          {String.fromCodePoint(0x00A7)} YOUR PINS · {pins.length}
        </div>
        <h2 style={{
          margin: '0 0 16px',
          fontFamily: DISPLAY, fontSize: 24, fontWeight: 400, letterSpacing: '-0.01em',
        }}>
          Drop, label, <em style={{ fontStyle: 'italic', color: 'var(--brand-accent)' }}>generate.</em>
        </h2>
        <p style={{ fontSize: 12, color: 'var(--brand-ink-dim)', marginTop: 0, lineHeight: 1.5 }}>
          Click the map to drop a pin in the active category. Use search above to add by name.
        </p>

        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {CATEGORIES.map(c => grouped[c].length > 0 && (
            <div key={c}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', fontWeight: 700,
                color: CATEGORY_COLOR[c], textTransform: 'uppercase', marginBottom: 8,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLOR[c] }} />
                {CATEGORY_LABEL[c]} · {grouped[c].length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {grouped[c].map(p => (
                  <PinRow
                    key={p.id}
                    pin={p}
                    selected={selectedPinId === p.id}
                    onSelect={() => setSelectedPinId(p.id)}
                    onRemove={() => removePin(p.id)}
                    onRename={label => renamePin(p.id, label)}
                    onRecategorise={cat => recategorise(p.id, cat)}
                  />
                ))}
              </div>
            </div>
          ))}
          {pins.length === 0 && (
            <div style={{
              padding: 24, textAlign: 'center',
              border: '1.5px dashed var(--brand-border)', borderRadius: 12,
              color: 'var(--brand-ink-mute)', fontSize: 12,
            }}>
              No pins yet. Drop one to get started.
            </div>
          )}
        </div>

        {/* Ready-to-plan card — sticky bottom CTA per the design handoff. */}
        {pins.length > 0 && (
          <div style={{
            position: 'sticky', bottom: 0,
            marginTop: 24, marginInline: -20, padding: '16px 20px',
            background: 'linear-gradient(180deg, rgba(13,13,36,0), rgba(13,13,36,0.95) 30%)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid var(--brand-border)',
          }}>
            <div style={{
              padding: 16, borderRadius: 14,
              background: 'rgba(167,139,250,0.10)',
              border: '1px solid var(--brand-border-hi)',
            }}>
              <div style={{
                fontFamily: DISPLAY, fontSize: 15, fontWeight: 400,
                color: 'var(--brand-ink)', marginBottom: 6,
              }}>
                Ready to plan?
              </div>
              <div style={{
                fontSize: 12, color: 'var(--brand-ink-dim)',
                lineHeight: 1.5, marginBottom: 12,
              }}>
                We&apos;ll order your {pins.length} stop{pins.length === 1 ? '' : 's'} into a daily route, with timing and walking distance.
              </div>
              <button
                onClick={generateItinerary}
                style={{
                  width: '100%',
                  padding: '10px 14px', borderRadius: 10,
                  background: 'var(--brand-accent)',
                  color: 'var(--brand-bg)',
                  border: 'none',
                  fontSize: 13, fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(167,139,250,0.35)',
                }}
              >
                + Generate itinerary
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

// ─── Map component ──────────────────────────────────────────────────────────

function PlanMap({
  location, pins, activeCategory, selectedPinId,
  onAddPin, onSelectPin,
}: {
  location: string | null;
  pins: Pin[];
  activeCategory: Category;
  selectedPinId: string | null;
  onAddPin: (lat: number, lon: number) => void;
  onSelectPin: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerMap = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const onAddPinRef = useRef(onAddPin);
  onAddPinRef.current = onAddPin;
  const onSelectPinRef = useRef(onSelectPin);
  onSelectPinRef.current = onSelectPin;
  const activeCategoryRef = useRef(activeCategory);
  activeCategoryRef.current = activeCategory;

  // Mount once
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !containerRef.current) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [135.768, 35.0116],
      zoom: 12,
      attributionControl: false,
    });
    mapRef.current = map;

    map.on('click', (e) => {
      onAddPinRef.current(e.lngLat.lat, e.lngLat.lng);
    });

    return () => {
      markerMap.current.forEach(m => m.remove());
      markerMap.current.clear();
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter when location resolves
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;
    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${token}&limit=1`)
      .then(r => r.json())
      .then(d => {
        const f = d?.features?.[0];
        if (f?.center) map.flyTo({ center: f.center as [number, number], zoom: 12, duration: 1500 });
      })
      .catch(() => { /* ignore */ });
  }, [location]);

  // Sync markers with pins state
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<string>();
    pins.forEach((p, i) => {
      seen.add(p.id);
      const existing = markerMap.current.get(p.id);
      if (existing) {
        existing.setLngLat([p.lon, p.lat]);
        const el = existing.getElement();
        // Refresh visual state (color, selected ring)
        styleMarkerEl(el, p, i + 1, p.id === selectedPinId);
      } else {
        const el = document.createElement('button');
        styleMarkerEl(el, p, i + 1, p.id === selectedPinId);
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          onSelectPinRef.current(p.id);
        });
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([p.lon, p.lat]).addTo(map);
        markerMap.current.set(p.id, marker);
      }
    });
    // Remove stale markers
    Array.from(markerMap.current.entries()).forEach(([id, marker]) => {
      if (!seen.has(id)) {
        marker.remove();
        markerMap.current.delete(id);
      }
    });
  }, [pins, selectedPinId]);

  return <div ref={containerRef} style={{ width: '100%', height: '100svh', background: '#0d1525' }} />;
}

function styleMarkerEl(el: HTMLElement, pin: Pin, num: number, selected: boolean) {
  const color = CATEGORY_COLOR[pin.category];
  el.style.cssText = `
    cursor: pointer;
    width: 28px; height: 28px; border-radius: 50%;
    background: ${color};
    color: #0a0a1f;
    font-family: var(--font-mono-display), ui-monospace, monospace;
    font-size: 11px; font-weight: 800; letter-spacing: 0.04em;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid #0a0a1f;
    box-shadow: ${selected ? `0 0 0 4px rgba(167,139,250,0.45), 0 4px 14px rgba(167,139,250,0.5)` : '0 2px 8px rgba(0,0,0,0.6)'};
    transform: ${selected ? 'scale(1.1)' : 'scale(1)'};
    transition: transform 200ms var(--ease-out, cubic-bezier(0.23,1,0.32,1)), box-shadow 200ms;
  `;
  el.textContent = String(num);
}

// ─── Sidebar pin row ────────────────────────────────────────────────────────

function PinRow({
  pin, selected, onSelect, onRemove, onRename, onRecategorise,
}: {
  pin: Pin;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onRename: (label: string) => void;
  onRecategorise: (c: Category) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(pin.label);

  const commit = () => {
    const t = draft.trim();
    if (t && t !== pin.label) onRename(t);
    setEditing(false);
  };

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 8,
        background: selected ? 'rgba(167,139,250,0.10)' : 'transparent',
        border: `1px solid ${selected ? 'var(--brand-border-hi)' : 'transparent'}`,
        cursor: 'pointer',
      }}
    >
      <span style={{
        flexShrink: 0,
        width: 8, height: 8, borderRadius: '50%',
        background: CATEGORY_COLOR[pin.category],
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            autoFocus value={draft} onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(pin.label); setEditing(false); } }}
            style={{
              width: '100%',
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--brand-ink)', fontFamily: 'inherit', fontSize: 13,
            }}
          />
        ) : (
          <div
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); setDraft(pin.label); }}
            style={{
              fontSize: 13, color: 'var(--brand-ink)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >{pin.label}</div>
        )}
        <select
          value={pin.category}
          onClick={e => e.stopPropagation()}
          onChange={e => onRecategorise(e.target.value as Category)}
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--brand-ink-mute)', fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em',
            textTransform: 'uppercase', padding: 0, cursor: 'pointer',
          }}
        >
          {CATEGORIES.map(c => <option key={c} value={c} style={{ color: '#000' }}>{CATEGORY_LABEL[c]}</option>)}
        </select>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        title="Remove pin"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--brand-ink-mute)', fontSize: 16, padding: 0,
        }}
      >{String.fromCodePoint(0x00D7)}</button>
    </div>
  );
}
