'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/googleMapsLoader';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

// ─── E1 · Plan map · Google Maps drop-pin UX ────────────────────────────────
// Dark-navy Google Maps. Click anywhere to drop a pin in the active category.
// On pin select we use Places Service to fetch a photo + rating + review
// snippet, surfaced in a floating info card. Type-ahead in the top search
// bar uses Places Autocomplete and drops the selected place as a pin.
//
// Pins persist to localStorage keyed by tripId; a /api/trips/[id]/places db
// backing is a clean follow-up.

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

interface PlaceDetails {
  photo?: string;
  rating?: number;
  reviews?: number;
  reviewSnippet?: string;
  address?: string;
}

interface Pin {
  id: string;
  category: Category;
  label: string;
  lat: number;
  lon: number;
  place?: PlaceDetails;
}

interface TripData { id: string; location: string | null }

const STORAGE = (tripId: string) => `geknee_plan_pins_${tripId}`;

// Dark-navy Google Maps style — matches the design handoff (#0d1525 land,
// #1a1f3a districts, #1e3a5f water).
const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry',           stylers: [{ color: '#0d1525' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1525' }] },
  { elementType: 'labels.text.fill',   stylers: [{ color: '#6d7aa8' }] },
  { featureType: 'administrative',     elementType: 'geometry',           stylers: [{ color: '#1a1f3a' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#a78bfa' }] },
  { featureType: 'poi',                elementType: 'geometry',           stylers: [{ color: '#191e35' }] },
  { featureType: 'poi',                elementType: 'labels.text.fill',   stylers: [{ color: '#7d8aa8' }] },
  { featureType: 'poi.park',           elementType: 'geometry',           stylers: [{ color: '#1f3d2c' }] },
  { featureType: 'poi.park',           elementType: 'labels.text.fill',   stylers: [{ color: '#5fa676' }] },
  { featureType: 'road',               elementType: 'geometry',           stylers: [{ color: '#2a3050' }] },
  { featureType: 'road.arterial',      elementType: 'geometry',           stylers: [{ color: '#3d4570' }] },
  { featureType: 'road.highway',       elementType: 'geometry',           stylers: [{ color: '#3d4570' }] },
  { featureType: 'transit',            elementType: 'geometry',           stylers: [{ color: '#2a3050' }] },
  { featureType: 'water',              elementType: 'geometry',           stylers: [{ color: '#1e3a5f' }] },
  { featureType: 'water',              elementType: 'labels.text.fill',   stylers: [{ color: '#5b8fb8' }] },
];

export default function PlanMapPage() {
  const params = useParams<{ tripId: string }>();
  const tripId = params?.tripId ?? '';
  const router = useRouter();

  const [trip, setTrip] = useState<TripData | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('activities');
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const addPin = (lat: number, lon: number, label?: string, place?: PlaceDetails) => {
    const id = `pin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setPins(p => [...p, {
      id,
      category: activeCategory,
      label: label || `Pin ${p.length + 1}`,
      lat, lon,
      place,
    }]);
    setSelectedPinId(id);
    return id;
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
  const updatePinPlace = (id: string, place: PlaceDetails) => {
    setPins(p => p.map(x => x.id === id ? { ...x, place: { ...x.place, ...place } } : x));
  };

  const grouped = useMemo(() => {
    const out: Record<Category, Pin[]> = { food: [], activities: [], hotels: [], shopping: [], monument: [] };
    for (const p of pins) out[p.category].push(p);
    return out;
  }, [pins]);

  const generateItinerary = () => {
    const stops = pins.map(p => ({ city: p.label, lat: p.lat, lon: p.lon, category: p.category }));
    const q = new URLSearchParams({ savedTripId: tripId, stops: JSON.stringify(stops) });
    if (trip?.location) q.set('location', trip.location);
    router.push(`/plan/summary?${q.toString()}`);
  };

  const tokenMissing = !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const selectedPin = pins.find(p => p.id === selectedPinId) ?? null;

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

        {/* Search input — wired to Google Places Autocomplete via PlanMap */}
        <div style={{
          position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 18, width: 'min(440px, calc(100% - 32px))',
        }}>
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
              id="plan-map-search"
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
            }}>ENTER</span>
          </div>
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
          onUpdatePinPlace={updatePinPlace}
        />

        {/* Selected-pin info card — Google Places photo + rating + review */}
        {selectedPin && (
          <PinInfoCard
            pin={selectedPin}
            onClose={() => setSelectedPinId(null)}
            onRename={(label) => renamePin(selectedPin.id, label)}
          />
        )}

        {tokenMissing && (
          <div style={{
            position: 'absolute', inset: 64,
            display: 'grid', placeItems: 'center',
            color: 'var(--brand-ink-mute)', fontSize: 12,
            background: 'var(--brand-bg2)',
          }}>
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set — map preview disabled.
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
          Click the map to drop a pin in the active category. Search above to add by name. Click any pin to see Google place details.
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
  onAddPin, onSelectPin, onUpdatePinPlace,
}: {
  location: string | null;
  pins: Pin[];
  activeCategory: Category;
  selectedPinId: string | null;
  onAddPin: (lat: number, lon: number, label?: string, place?: PlaceDetails) => string;
  onSelectPin: (id: string | null) => void;
  onUpdatePinPlace: (id: string, place: PlaceDetails) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const markerMap = useRef<Map<string, google.maps.Marker>>(new Map());
  const onAddPinRef = useRef(onAddPin);
  onAddPinRef.current = onAddPin;
  const onSelectPinRef = useRef(onSelectPin);
  onSelectPinRef.current = onSelectPin;
  const onUpdatePinPlaceRef = useRef(onUpdatePinPlace);
  onUpdatePinPlaceRef.current = onUpdatePinPlace;
  const activeCategoryRef = useRef(activeCategory);
  activeCategoryRef.current = activeCategory;

  // Mount once
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(() => {
      if (cancelled || !containerRef.current) return;
      const map = new google.maps.Map(containerRef.current, {
        center: { lat: 35.0116, lng: 135.7681 }, // Kyoto until geocode resolves
        zoom: 12,
        styles: DARK_STYLE,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
      });
      mapRef.current = map;
      placesRef.current = new google.maps.places.PlacesService(map);

      // Click → drop pin. Use nearby PlacesService to look up the closest
      // place; if a match is found, attach photo/rating/review snippet.
      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        const lat = e.latLng?.lat();
        const lng = e.latLng?.lng();
        if (lat === undefined || lng === undefined) return;
        const id = onAddPinRef.current(lat, lng);
        // Defer the place lookup so the pin shows up immediately.
        if (placesRef.current) {
          placesRef.current.nearbySearch(
            { location: { lat, lng }, radius: 60 },
            (results, status) => {
              if (status !== google.maps.places.PlacesServiceStatus.OK) return;
              const top = results?.[0];
              if (!top?.place_id) return;
              hydratePinFromPlace(id, top.place_id);
            }
          );
        }
      });

      // Wire up Places Autocomplete on the search input.
      const input = document.getElementById('plan-map-search') as HTMLInputElement | null;
      if (input) {
        const ac = new google.maps.places.Autocomplete(input, {
          fields: ['name', 'geometry', 'place_id', 'photos', 'rating', 'user_ratings_total', 'formatted_address', 'reviews'],
        });
        ac.bindTo('bounds', map);
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (!place.geometry?.location) return;
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          onAddPinRef.current(lat, lng, place.name, placeToDetails(place));
          map.panTo({ lat, lng });
          if (input) input.value = '';
        });
      }
    }).catch(() => { /* ignore — no key */ });

    return () => {
      cancelled = true;
      markerMap.current.forEach(m => m.setMap(null));
      markerMap.current.clear();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function hydratePinFromPlace(pinId: string, placeId: string) {
    if (!placesRef.current) return;
    placesRef.current.getDetails(
      {
        placeId,
        fields: ['name', 'photos', 'rating', 'user_ratings_total', 'formatted_address', 'reviews'],
      },
      (res, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !res) return;
        const details = placeToDetails(res);
        if (details) onUpdatePinPlaceRef.current(pinId, details);
      }
    );
  }

  // Recenter when location resolves
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;
    loadGoogleMaps().then(() => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: location }, (results, status) => {
        if (status === 'OK' && results?.[0]?.geometry?.location) {
          map.panTo(results[0].geometry.location);
          map.setZoom(13);
        }
      });
    });
  }, [location]);

  // Sync markers with pins state
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<string>();
    pins.forEach((p, i) => {
      seen.add(p.id);
      const existing = markerMap.current.get(p.id);
      const icon = pinSvgIcon(i + 1, p.category, p.id === selectedPinId);
      if (existing) {
        existing.setPosition({ lat: p.lat, lng: p.lon });
        existing.setIcon(icon);
        existing.setZIndex(p.id === selectedPinId ? 1000 : 100);
      } else {
        const marker = new google.maps.Marker({
          position: { lat: p.lat, lng: p.lon },
          map,
          icon,
          zIndex: p.id === selectedPinId ? 1000 : 100,
        });
        marker.addListener('click', () => {
          onSelectPinRef.current(p.id);
        });
        markerMap.current.set(p.id, marker);
      }
    });
    Array.from(markerMap.current.entries()).forEach(([id, marker]) => {
      if (!seen.has(id)) {
        marker.setMap(null);
        markerMap.current.delete(id);
      }
    });
  }, [pins, selectedPinId]);

  return <div ref={containerRef} style={{ width: '100%', height: '100svh', background: '#0d1525' }} />;
}

function pinSvgIcon(num: number, category: Category, selected: boolean): google.maps.Icon {
  const color = CATEGORY_COLOR[category];
  const ring = selected ? '#a78bfa' : '#0a0a1f';
  const size = selected ? 36 : 28;
  const r = size / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${r}" cy="${r}" r="${r - 2}" fill="${color}" stroke="${ring}" stroke-width="2.5"/>
    <text x="${r}" y="${r + Math.round(size * 0.16)}" text-anchor="middle"
          font-family="ui-monospace,monospace" font-size="${Math.round(size * 0.42)}" font-weight="800"
          fill="#0a0a1f">${num}</text>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(r, r),
  };
}

function placeToDetails(p: google.maps.places.PlaceResult): PlaceDetails | undefined {
  const photo = p.photos?.[0]?.getUrl({ maxWidth: 600, maxHeight: 400 });
  const review = p.reviews?.[0]?.text;
  return {
    photo: photo,
    rating: p.rating,
    reviews: p.user_ratings_total,
    reviewSnippet: review ? review.slice(0, 180) + (review.length > 180 ? '…' : '') : undefined,
    address: p.formatted_address,
  };
}

// ─── Selected-pin info card ─────────────────────────────────────────────────

function PinInfoCard({ pin, onClose, onRename }: {
  pin: Pin;
  onClose: () => void;
  onRename: (label: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(pin.label);
  useEffect(() => { setDraft(pin.label); }, [pin.label]);

  const commit = () => {
    const t = draft.trim();
    if (t && t !== pin.label) onRename(t);
    setEditing(false);
  };

  return (
    <div style={{
      position: 'absolute', left: 24, bottom: 24, zIndex: 25,
      width: 'min(360px, calc(100% - 48px))',
      background: 'rgba(13,13,36,0.95)',
      backdropFilter: 'blur(16px)',
      border: '1px solid var(--brand-border-hi)',
      borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 16px 40px rgba(0,0,0,0.55)',
    }}>
      {pin.place?.photo ? (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9' }}>
          <img src={pin.place.photo} alt={pin.label}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <button onClick={onClose} style={{
            position: 'absolute', top: 10, right: 10,
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(10,10,31,0.7)',
            border: '1px solid var(--brand-border)',
            color: 'var(--brand-ink)', cursor: 'pointer',
            fontSize: 14, lineHeight: 1,
          }}>{String.fromCodePoint(0x00D7)}</button>
        </div>
      ) : (
        <div style={{
          padding: '10px 14px', display: 'flex', justifyContent: 'flex-end',
          borderBottom: '1px solid var(--brand-border)',
        }}>
          <button onClick={onClose} style={{
            width: 24, height: 24, borderRadius: '50%',
            background: 'transparent',
            border: '1px solid var(--brand-border)',
            color: 'var(--brand-ink-mute)', cursor: 'pointer',
            fontSize: 14, lineHeight: 1,
          }}>{String.fromCodePoint(0x00D7)}</button>
        </div>
      )}

      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', fontWeight: 700,
          color: CATEGORY_COLOR[pin.category],
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: CATEGORY_COLOR[pin.category] }} />
          {CATEGORY_LABEL[pin.category].toUpperCase()}
        </div>
        {editing ? (
          <input
            autoFocus value={draft} onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(pin.label); setEditing(false); } }}
            style={{
              fontFamily: DISPLAY, fontSize: 22, fontWeight: 400,
              letterSpacing: '-0.01em', color: 'var(--brand-ink)',
              background: 'transparent',
              border: 'none', borderBottom: '1px solid var(--brand-border)',
              outline: 'none', padding: '2px 0',
            }}
          />
        ) : (
          <div
            onClick={() => setEditing(true)}
            style={{
              fontFamily: DISPLAY, fontSize: 22, fontWeight: 400,
              letterSpacing: '-0.01em', color: 'var(--brand-ink)',
              cursor: 'text',
            }}
          >
            {pin.label}
          </div>
        )}

        {pin.place?.rating !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Stars value={Math.round(pin.place.rating)} />
            <span style={{ fontSize: 12, color: 'var(--brand-ink-dim)' }}>
              {pin.place.rating.toFixed(1)}
              {pin.place.reviews ? ` · ${pin.place.reviews.toLocaleString()} reviews` : ''}
            </span>
          </div>
        )}

        {pin.place?.address && (
          <div style={{ fontSize: 12, color: 'var(--brand-ink-mute)', lineHeight: 1.5 }}>
            {pin.place.address}
          </div>
        )}

        {pin.place?.reviewSnippet && (
          <blockquote style={{
            margin: '6px 0 0', padding: '10px 12px',
            borderLeft: '2px solid var(--brand-accent)',
            background: 'rgba(167,139,250,0.06)',
            borderRadius: '0 8px 8px 0',
            fontSize: 12, color: 'var(--brand-ink-dim)',
            lineHeight: 1.55, fontStyle: 'italic',
          }}>
            &ldquo;{pin.place.reviewSnippet}&rdquo;
          </blockquote>
        )}

        {!pin.place?.rating && !pin.place?.address && !pin.place?.reviewSnippet && (
          <div style={{ fontSize: 12, color: 'var(--brand-ink-mute)', fontStyle: 'italic' }}>
            No Google place match for this pin yet. Try the search bar to pin a named place instead of an empty patch of map.
          </div>
        )}
      </div>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, color: 'var(--brand-gold)' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ fontSize: 13, opacity: n <= value ? 1 : 0.3 }}>
          {String.fromCodePoint(0x2605)}
        </span>
      ))}
    </span>
  );
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
