'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { BookTabProps } from '../lib/types';
import { fetchPlaceImage, imgCache } from '../lib/places';

// Locale → ISO 4217 currency map. Mirrors the SummaryView logic; kept
// inline rather than shared because BookView is its own dynamic import
// chunk and dragging in the bigger file's export would balloon it.
const LOCALE_TO_CURRENCY: Record<string, string> = {
  'en-US': 'USD', 'en-GB': 'GBP', 'en-CA': 'CAD', 'en-AU': 'AUD',
  'en-NZ': 'NZD', 'en-IN': 'INR', 'en-IE': 'EUR', 'en-ZA': 'ZAR',
  'ja': 'JPY', 'ja-JP': 'JPY',
  'zh': 'CNY', 'zh-CN': 'CNY', 'zh-TW': 'TWD', 'zh-HK': 'HKD',
  'ko': 'KRW', 'ko-KR': 'KRW', 'hi': 'INR', 'hi-IN': 'INR',
  'es': 'EUR', 'es-ES': 'EUR', 'es-MX': 'MXN', 'es-AR': 'ARS',
  'pt': 'EUR', 'pt-BR': 'BRL', 'pt-PT': 'EUR',
  'fr': 'EUR', 'fr-FR': 'EUR', 'fr-CA': 'CAD',
  'de': 'EUR', 'de-DE': 'EUR', 'de-CH': 'CHF',
  'it': 'EUR', 'nl': 'EUR', 'sv': 'SEK', 'no': 'NOK', 'da': 'DKK',
  'pl': 'PLN', 'tr': 'TRY', 'ru': 'RUB',
  'ar': 'AED', 'th': 'THB', 'id': 'IDR', 'ms': 'MYR', 'vi': 'VND',
};
function detectUserCurrency(): string {
  if (typeof navigator === 'undefined') return 'USD';
  const lang = navigator.language || 'en-US';
  return LOCALE_TO_CURRENCY[lang] ?? LOCALE_TO_CURRENCY[lang.split('-')[0]] ?? 'USD';
}

// Design-handoff booking surface: tabbed layout (Stays / Flights / Activities
// / Transport / Insurance) with badge counts, 3-column hotel cards, wide
// flight card. Built as a parallel implementation alongside the legacy
// BookTab.tsx — this is the v0 design port; real booking data wiring stays
// with the existing per-section logic in BookTab.tsx until that file is
// retired.

const MONO = 'var(--font-mono-display), ui-monospace, monospace';
const DISPLAY = 'var(--font-display), Georgia, serif';

type Tab = 'stays' | 'flights' | 'activities' | 'transport' | 'insurance';
const TABS: { id: Tab; label: string; glyph: string }[] = [
  { id: 'stays',      label: 'Stays',      glyph: String.fromCodePoint(0x25EC) },
  { id: 'flights',    label: 'Flights',    glyph: String.fromCodePoint(0x2708) },
  { id: 'activities', label: 'Activities', glyph: String.fromCodePoint(0x25C9) },
  { id: 'transport',  label: 'Transport',  glyph: String.fromCodePoint(0x25D0) },
  { id: 'insurance',  label: 'Insurance',  glyph: String.fromCodePoint(0x25C8) },
];

type Currency = '¥' | '$' | '€' | '£' | '₹';

interface Hotel {
  tier: "EDITORS' PICK" | 'LOCAL' | 'BUDGET';
  district: string;
  tag: 'HOTEL' | 'RYOKAN' | 'HOSTEL' | 'INN' | 'BNB' | 'RIAD' | 'RESORT';
  name: string;
  rating: number;
  features: string[];
  price: number;
  currency: Currency;
  booked?: boolean;
}

interface Flight {
  date: string;
  segments: {
    from: string;
    to: string;
    departTime: string;
    arriveTime: string;
    duration: string;
    via?: string; // optional connecting city; falls back to "Direct"
  }[];
  carrier: string;
  total: number;
  currency: Currency;
  status?: 'CONFIRMED' | 'PENDING';
}

interface Activity {
  tag: 'TEA' | 'CULTURE' | 'FOOD' | 'NATURE' | 'NIGHTLIFE';
  name: string;
  meta: string;
  price: number;
  currency: Currency;
  booked?: boolean;
}

// Booking suggestions are now generated per-trip by /api/booking-suggestions
// (Anthropic). The previous hardcoded MOCK_* data was Kyoto-specific and
// rendered the same Park Hyatt Kyoto cards regardless of destination —
// the user reported the bug for a Taj Mahal trip.

export default function BookView(props: BookTabProps) {
  const [tab, setTab] = useState<Tab>('stays');
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch trip-specific suggestions on mount (and any time the destination
  // or dates change). Cached server-side so navigating away and back is
  // instant. The previous version hardcoded Kyoto data so the cards never
  // matched the trip.
  useEffect(() => {
    if (!props.location) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetch('/api/booking-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: props.location,
        startDate: props.startDate,
        endDate: props.endDate,
        nights: props.nights,
        budget: props.budget,
        style: props.style,
        travelingFrom: props.travelingFrom,
        currency: detectUserCurrency(),
      }),
    })
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d?.hotels && d?.flight && d?.activities) {
          setHotels(d.hotels);
          setFlight(d.flight);
          setActivities(d.activities);
        } else {
          setLoadError(d?.error ?? 'No suggestions returned');
        }
      })
      .catch(() => { if (!cancelled) setLoadError('Network error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [props.location, props.startDate, props.endDate, props.nights, props.budget, props.style, props.travelingFrom]);

  const counts = useMemo(() => ({
    stays:      hotels.filter(h => h.booked).length,
    flights:    flight?.status === 'CONFIRMED' ? 1 : 0,
    activities: activities.filter(a => a.booked).length,
    transport:  0,
    insurance:  0,
  }), [hotels, flight, activities]);
  const totalSpent = useMemo(() => {
    const hotelTotal = hotels.find(h => h.booked)?.price ?? 0;
    const flightTotal = flight?.status === 'CONFIRMED' ? flight.total : 0;
    const actTotal = activities.filter(a => a.booked).reduce((s, a) => s + a.price, 0);
    return hotelTotal + flightTotal + actTotal;
  }, [hotels, flight, activities]);
  const totalBookings = counts.stays + counts.flights + counts.activities + counts.transport + counts.insurance;
  const headerCurrency: Currency = flight?.currency ?? hotels[0]?.currency ?? '$';

  return (
    <div style={{
      color: 'var(--brand-ink)',
      fontFamily: 'var(--font-ui), system-ui, sans-serif',
    }}>
      {/* Top status strip */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, gap: 12, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{
            fontFamily: MONO, fontSize: 10, letterSpacing: '0.22em',
            color: 'var(--brand-accent-2)', fontWeight: 600,
          }}>
            {String.fromCodePoint(0x00A7)} BOOKING · {(props.location || 'TRIP').toUpperCase()}
          </div>
          <div style={{
            fontFamily: DISPLAY, fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400,
            letterSpacing: '-0.025em', lineHeight: 1.05, marginTop: 6,
          }}>
            Pin it down.
          </div>
        </div>
        <div style={{
          fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em',
          color: 'var(--brand-ink-dim)', fontWeight: 700,
        }}>
          {headerCurrency}{totalSpent.toLocaleString()} · {totalBookings} OF 5 BOOKED
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 28, overflowX: 'auto',
        paddingBottom: 4,
      }}>
        {TABS.map(t => {
          const active = t.id === tab;
          const c = counts[t.id];
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 999,
              background: active ? 'rgba(167,139,250,0.16)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${active ? 'var(--brand-border-hi)' : 'var(--brand-border)'}`,
              color: active ? 'var(--brand-accent)' : 'var(--brand-ink-dim)',
              fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              <span style={{ opacity: 0.8 }}>{t.glyph}</span>
              <span>{t.label}</span>
              {c > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 18, height: 18, padding: '0 5px',
                  borderRadius: 999,
                  background: active ? 'var(--brand-accent)' : 'rgba(167,139,250,0.6)',
                  color: 'var(--brand-bg)',
                  fontFamily: MONO, fontSize: 10, fontWeight: 800,
                }}>{c}</span>
              )}
            </button>
          );
        })}
      </div>

      {loading && (
        <div style={{
          padding: '40px 24px', borderRadius: 16,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--brand-border)',
          fontFamily: MONO, fontSize: 11, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--brand-ink-dim)',
          textAlign: 'center',
        }}>
          <span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: 'var(--brand-accent)', marginRight: 8,
            animation: 'pulse 1.4s ease-in-out infinite', verticalAlign: 'middle',
          }} />
          Generating booking options for {props.location}…
        </div>
      )}
      {!loading && loadError && (
        <div style={{
          padding: '24px', borderRadius: 16,
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#fca5a5', fontSize: 13,
        }}>
          Couldn&apos;t load booking suggestions ({loadError}). Try again in a moment.
        </div>
      )}
      {!loading && !loadError && tab === 'stays'      && <StaysSection hotels={hotels} location={props.location} startDate={props.startDate} endDate={props.endDate} nights={props.nights} />}
      {!loading && !loadError && tab === 'flights'    && flight && <FlightsSection flight={flight} />}
      {!loading && !loadError && tab === 'activities' && <ActivitiesSection activities={activities} />}
      {tab === 'transport'  && <PlaceholderSection title="Local transport" detail="Suica/Pasmo IC card setup, day passes, and intercity train suggestions land here once you confirm dates." />}
      {tab === 'insurance'  && <PlaceholderSection title="Travel insurance" detail="World Nomads, SafetyWing, and Allianz quotes appear here based on your trip length and origin country." />}
    </div>
  );
}

// ─── Stays ─────────────────────────────────────────────────────────────────

function StaysSection({ hotels, location, startDate, endDate, nights }: {
  hotels: Hotel[]; location: string; startDate: string; endDate: string; nights: string;
}) {
  const datesLabel = startDate && endDate
    ? `APR ${new Date(startDate).getDate()}–${new Date(endDate).getDate()}`
    : 'YOUR DATES';
  return (
    <section>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14, gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{
          fontFamily: MONO, fontSize: 10, letterSpacing: '0.22em',
          color: 'var(--brand-ink-mute)', fontWeight: 700,
        }}>
          {String.fromCodePoint(0x00A7)} {(location || 'STAYS').toUpperCase()} · {nights || '–'} NIGHT{nights === '1' ? '' : 'S'} · {datesLabel}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <SortChip label="Price" />
          <SortChip label="Rating" />
        </div>
      </div>

      <h2 style={{
        fontFamily: DISPLAY, fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 400,
        letterSpacing: '-0.02em', lineHeight: 1.1, margin: '0 0 20px',
      }}>
        Where will you sleep?
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {hotels.map((h, i) => <HotelCard key={i} hotel={h} city={location} />)}
      </div>
    </section>
  );
}

function SortChip({ label }: { label: string }) {
  return (
    <button style={{
      padding: '5px 12px', borderRadius: 999,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid var(--brand-border)',
      color: 'var(--brand-ink-dim)',
      fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
      cursor: 'pointer',
    }}>
      {String.fromCodePoint(0x21C5)} {label}
    </button>
  );
}

const TIER_COLOR: Record<Hotel['tier'], string> = {
  'EDITORS\' PICK': 'var(--brand-accent)',
  'LOCAL':          'var(--brand-accent-2)',
  'BUDGET':         'var(--brand-ink-dim)',
};

// Module-scoped gallery cache so re-mounting a HotelCard during the
// session doesn't re-hit /api/place-images. Keyed on "<name>||<city>".
const galleryCache = new Map<string, string[]>();

function HotelCard({ hotel, city }: { hotel: Hotel; city: string }) {
  const tierColor = TIER_COLOR[hotel.tier];
  // Lazy-load a real photo of the hotel via the existing fetchPlaceImage
  // chain (Google Places → Wikidata → Wikipedia → Commons), keyed on
  // hotel name + city. Same imgCache as the day-card thumbs so a hotel
  // referenced in the itinerary is already warm.
  const cacheKey = `${hotel.name}||${city}`;
  const cachedImg = imgCache.has(cacheKey) ? (imgCache.get(cacheKey) || null) : undefined;
  const [imgSrc, setImgSrc] = useState<string | null | undefined>(cachedImg);
  // Multi-image gallery for the lightbox — populated on first open via
  // /api/place-images (Google Places returns up to 5 photos per place).
  // Falls back to [thumbnailSrc] when Google has nothing extra.
  const cachedGallery = galleryCache.get(cacheKey);
  const [gallery, setGallery] = useState<string[] | null>(cachedGallery ?? null);
  const [open, setOpen] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);

  useEffect(() => {
    if (imgCache.has(cacheKey)) { setImgSrc(imgCache.get(cacheKey) || null); return; }
    let cancelled = false;
    fetchPlaceImage(hotel.name, city).then(url => {
      if (cancelled) return;
      imgCache.set(cacheKey, url ?? '');
      setImgSrc(url);
    });
    return () => { cancelled = true; };
  }, [cacheKey, hotel.name, city]);

  // Esc-closes lightbox; lock body scroll while open so the page
  // behind doesn't drift.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowLeft' && gallery && gallery.length > 1) {
        setGalleryIdx(i => (i - 1 + gallery.length) % gallery.length);
      }
      if (e.key === 'ArrowRight' && gallery && gallery.length > 1) {
        setGalleryIdx(i => (i + 1) % gallery.length);
      }
    };
    const prev = document.body.style.overflow;
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, gallery]);

  async function openLightbox() {
    if (!imgSrc) return;
    setGalleryIdx(0);
    setOpen(true);
    if (gallery) return;
    // Fetch the full image set the first time the user opens the box.
    try {
      const params = new URLSearchParams({ name: hotel.name, location: city });
      const r = await fetch(`/api/place-images?${params}`);
      if (r.ok) {
        const d = await r.json() as { images?: string[] };
        const images = d.images && d.images.length > 0 ? d.images : [imgSrc];
        galleryCache.set(cacheKey, images);
        setGallery(images);
        return;
      }
    } catch { /* network */ }
    // Fallback: show just the thumbnail in the lightbox.
    galleryCache.set(cacheKey, [imgSrc]);
    setGallery([imgSrc]);
  }

  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${hotel.booked ? 'var(--brand-border-hi)' : 'var(--brand-border)'}`,
      display: 'flex', flexDirection: 'column',
    }}>
      <button
        type="button"
        onClick={openLightbox}
        disabled={!imgSrc}
        aria-label={imgSrc ? `View photos of ${hotel.name}` : hotel.name}
        style={{
          position: 'relative',
          aspectRatio: '16/10',
          background: imgSrc
            ? '#0a0a1f'
            : 'linear-gradient(135deg, rgba(167,139,250,0.10), rgba(125,211,252,0.06))',
          display: 'grid', placeItems: 'center',
          color: 'rgba(167,139,250,0.4)', fontSize: 28,
          fontFamily: DISPLAY, overflow: 'hidden',
          padding: 0, border: 'none',
          cursor: imgSrc ? 'zoom-in' : 'default',
        }}
      >
        {imgSrc ? (
          <img
            src={imgSrc} alt={hotel.name} loading="lazy"
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            }}
          />
        ) : (
          String.fromCodePoint(0x25EC)
        )}
        <div style={{
          position: 'absolute', top: 12, left: 12,
          fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em',
          padding: '4px 10px', borderRadius: 4,
          background: 'rgba(10,10,31,0.78)', color: tierColor,
          border: `1px solid ${tierColor}`, fontWeight: 700,
          backdropFilter: 'blur(6px)',
        }}>{hotel.tier}</div>
        {imgSrc && (
          <div style={{
            position: 'absolute', bottom: 10, right: 10,
            fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em',
            padding: '4px 9px', borderRadius: 4,
            background: 'rgba(10,10,31,0.7)', color: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(255,255,255,0.12)', fontWeight: 700,
            backdropFilter: 'blur(6px)',
          }}>+ Photos</div>
        )}
        {hotel.booked && (
          <div style={{
            position: 'absolute', top: 12, right: 12,
            fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em',
            padding: '4px 10px', borderRadius: 4,
            background: 'rgba(125,211,252,0.18)',
            color: 'var(--brand-accent-2)',
            border: '1px solid var(--brand-accent-2)', fontWeight: 700,
          }}>{String.fromCodePoint(0x2713)} BOOKED</div>
        )}
      </button>

      {/* Lightbox carousel — rendered through createPortal so the sticky
          tab nav and any transformed ancestors don't clip it. */}
      {open && gallery && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setOpen(false)}
          role="dialog"
          aria-label={`Photos of ${hotel.name}`}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.94)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '5vh 5vw', cursor: 'zoom-out',
          }}
        >
          <img
            src={gallery[galleryIdx]} alt={hotel.name}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
              borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              cursor: 'default',
            }}
          />
          {gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setGalleryIdx(i => (i - 1 + gallery.length) % gallery.length); }}
                aria-label="Previous photo"
                style={{
                  position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)',
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.12)', border: 'none',
                  color: '#fff', fontSize: 22, cursor: 'pointer', lineHeight: 1,
                }}
              >‹</button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setGalleryIdx(i => (i + 1) % gallery.length); }}
                aria-label="Next photo"
                style={{
                  position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)',
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.12)', border: 'none',
                  color: '#fff', fontSize: 22, cursor: 'pointer', lineHeight: 1,
                }}
              >›</button>
              <div style={{
                position: 'absolute', bottom: 24, left: 0, right: 0,
                textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 12,
                fontFamily: MONO, letterSpacing: '0.12em',
              }}>
                {galleryIdx + 1} / {gallery.length} · {hotel.name.toUpperCase()}
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            style={{
              position: 'absolute', top: 'max(20px, env(safe-area-inset-top))', right: 20,
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)', border: 'none',
              color: '#fff', fontSize: 20, cursor: 'pointer', lineHeight: 1,
            }}
          >×</button>
        </div>,
        document.body,
      )}

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{
          fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em',
          color: 'var(--brand-ink-mute)', fontWeight: 700,
        }}>
          {hotel.district.toUpperCase()} · {hotel.tag}
        </div>
        <div style={{
          fontFamily: DISPLAY, fontSize: 18, fontWeight: 400,
          letterSpacing: '-0.005em', lineHeight: 1.2,
          color: 'var(--brand-ink)',
        }}>
          {hotel.name}
        </div>
        <Stars value={hotel.rating} />
        <ul style={{
          margin: 0, padding: 0, listStyle: 'none',
          fontSize: 12, color: 'var(--brand-ink-dim)', lineHeight: 1.6,
        }}>
          {hotel.features.map((f, i) => (
            <li key={i} style={{ display: 'flex', gap: 6 }}>
              <span style={{ color: 'var(--brand-ink-mute)' }}>·</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <div style={{
          marginTop: 4, paddingTop: 12,
          borderTop: '1px solid var(--brand-border)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8,
        }}>
          <div>
            <div style={{
              fontFamily: DISPLAY, fontSize: 22, fontWeight: 400,
              letterSpacing: '-0.015em', color: 'var(--brand-ink)', lineHeight: 1,
            }}>
              {hotel.currency}{hotel.price.toLocaleString()}
            </div>
            <div style={{
              fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em',
              color: 'var(--brand-ink-mute)', marginTop: 4, fontWeight: 700,
            }}>
              PER NIGHT
            </div>
          </div>
          <button style={{
            padding: '8px 14px', borderRadius: 10,
            background: hotel.booked ? 'transparent' : 'var(--brand-accent)',
            color: hotel.booked ? 'var(--brand-accent)' : 'var(--brand-bg)',
            border: hotel.booked ? '1px solid var(--brand-border-hi)' : 'none',
            fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            {hotel.booked ? 'Manage' : `Book ${String.fromCodePoint(0x2192)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, color: 'var(--brand-gold)' }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ fontSize: 13, opacity: n <= value ? 1 : 0.25 }}>
          {String.fromCodePoint(0x2605)}
        </span>
      ))}
    </div>
  );
}

// ─── Flights ───────────────────────────────────────────────────────────────

function FlightsSection({ flight }: { flight: Flight }) {
  return (
    <section>
      <div style={{
        fontFamily: MONO, fontSize: 10, letterSpacing: '0.22em',
        color: 'var(--brand-ink-mute)', fontWeight: 700, marginBottom: 14,
      }}>
        {String.fromCodePoint(0x00A7)} FLIGHTS · ROUND TRIP · {flight.status === 'CONFIRMED' ? '1' : '0'} BOOKED
      </div>
      <h2 style={{
        fontFamily: DISPLAY, fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 400,
        letterSpacing: '-0.02em', lineHeight: 1.1, margin: '0 0 20px',
      }}>
        How will you get there?
      </h2>

      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${flight.status === 'CONFIRMED' ? 'var(--brand-border-hi)' : 'var(--brand-border)'}`,
        borderRadius: 14, padding: '20px 22px',
        display: 'grid',
        gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {flight.segments.map((s, i) => (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center', gap: 18,
            }}>
              {/* From */}
              <div>
                <div style={{
                  fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em',
                  color: 'var(--brand-ink-mute)', fontWeight: 700,
                }}>
                  {flight.date.split('–')[i]?.trim() ?? flight.date} · {i === 0 ? 'OUTBOUND' : 'RETURN'}
                </div>
                <div style={{
                  fontFamily: DISPLAY, fontSize: 32, fontWeight: 400,
                  letterSpacing: '-0.02em', color: 'var(--brand-ink)', marginTop: 4,
                }}>
                  {s.from}
                </div>
                <div style={{
                  fontFamily: MONO, fontSize: 11,
                  color: 'var(--brand-ink-dim)', marginTop: 2,
                }}>
                  {s.departTime}
                </div>
              </div>

              {/* Center: arrow + via city or "Direct" + duration */}
              <div style={{ textAlign: 'center', color: 'var(--brand-ink-mute)' }}>
                <div style={{ fontSize: 14 }}>
                  {String.fromCodePoint(0x2192)} {s.via && s.via.trim() ? s.via : 'Direct'} · {s.duration}
                </div>
                <div style={{ height: 1, background: 'var(--brand-border)', marginTop: 6 }} />
              </div>

              {/* To */}
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: DISPLAY, fontSize: 32, fontWeight: 400,
                  letterSpacing: '-0.02em', color: 'var(--brand-ink)',
                }}>
                  {s.to}
                </div>
                <div style={{
                  fontFamily: MONO, fontSize: 11,
                  color: 'var(--brand-ink-dim)', marginTop: 2,
                }}>
                  {s.arriveTime}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total + status */}
        <div style={{ textAlign: 'right', borderLeft: '1px solid var(--brand-border)', paddingLeft: 24, alignSelf: 'stretch', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
          <div style={{
            fontFamily: DISPLAY, fontSize: 28, fontWeight: 400,
            letterSpacing: '-0.015em', color: 'var(--brand-ink)', lineHeight: 1,
          }}>
            {flight.currency}{flight.total.toLocaleString()}
          </div>
          <div style={{
            fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em',
            color: flight.status === 'CONFIRMED' ? 'var(--brand-success)' : 'var(--brand-ink-mute)',
            fontWeight: 700,
          }}>
            {flight.carrier} · {flight.status}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Activities ────────────────────────────────────────────────────────────

function ActivitiesSection({ activities }: { activities: Activity[] }) {
  return (
    <section>
      <div style={{
        fontFamily: MONO, fontSize: 10, letterSpacing: '0.22em',
        color: 'var(--brand-ink-mute)', fontWeight: 700, marginBottom: 14,
      }}>
        {String.fromCodePoint(0x00A7)} ACTIVITIES · {activities.filter(a => a.booked).length} OF {activities.length} BOOKED
      </div>
      <h2 style={{
        fontFamily: DISPLAY, fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 400,
        letterSpacing: '-0.02em', lineHeight: 1.1, margin: '0 0 20px',
      }}>
        What will you do?
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 14,
      }}>
        {activities.map((a, i) => (
          <div key={i} style={{
            padding: '16px 18px',
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${a.booked ? 'var(--brand-border-hi)' : 'var(--brand-border)'}`,
            borderRadius: 14,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{
                fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em',
                color: 'var(--brand-accent-2)', fontWeight: 700,
              }}>
                {a.tag}
              </div>
              {a.booked && (
                <div style={{
                  fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em',
                  color: 'var(--brand-success)', fontWeight: 700,
                }}>{String.fromCodePoint(0x2713)} BOOKED</div>
              )}
            </div>
            <div style={{
              fontFamily: DISPLAY, fontSize: 18, fontWeight: 400,
              letterSpacing: '-0.005em', lineHeight: 1.25, color: 'var(--brand-ink)',
            }}>
              {a.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--brand-ink-dim)', lineHeight: 1.5 }}>
              {a.meta}
            </div>
            <div style={{
              marginTop: 6, paddingTop: 10,
              borderTop: '1px solid var(--brand-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{
                fontFamily: DISPLAY, fontSize: 18, fontWeight: 400,
                color: 'var(--brand-ink)',
              }}>
                {a.currency}{a.price.toLocaleString()}
              </div>
              <button style={{
                padding: '6px 12px', borderRadius: 8,
                background: a.booked ? 'transparent' : 'var(--brand-accent)',
                color: a.booked ? 'var(--brand-accent)' : 'var(--brand-bg)',
                border: a.booked ? '1px solid var(--brand-border-hi)' : 'none',
                fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                cursor: 'pointer',
              }}>
                {a.booked ? 'Manage' : 'Book'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Placeholder ───────────────────────────────────────────────────────────

function PlaceholderSection({ title, detail }: { title: string; detail: string }) {
  return (
    <section>
      <div style={{
        padding: '40px 24px', textAlign: 'center',
        border: '1.5px dashed var(--brand-border)',
        borderRadius: 14,
      }}>
        <div style={{
          fontFamily: DISPLAY, fontSize: 22, fontWeight: 400,
          color: 'var(--brand-ink)', marginBottom: 8,
        }}>
          {title}
        </div>
        <p style={{
          fontSize: 13, color: 'var(--brand-ink-dim)', lineHeight: 1.55,
          maxWidth: 460, margin: '0 auto',
        }}>
          {detail}
        </p>
      </div>
    </section>
  );
}
