'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// ─── E5 · Live Trip · in-the-field companion ────────────────────────────────
// In-trip companion: glanceable LEAVE-BY card on top of a focused city map,
// flanked by next-stop / weather / crowds context cards and a horizontal
// day-timeline strip. v0: shipping the visual surface with realistic mock
// data; geolocation, Mapbox Directions ETA, and Google Places popular-times
// hookups land in follow-ups.

interface TripData {
  id: string;
  title: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  nights: number | null;
}

const MONO = 'var(--font-mono-display), ui-monospace, monospace';
const DISPLAY = 'var(--font-display), Georgia, serif';

export default function LiveTripPage() {
  const params = useParams<{ tripId: string }>();
  const tripId = params?.tripId ?? '';
  const [trip, setTrip] = useState<TripData | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    fetch(`/api/trips/${encodeURIComponent(tripId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d?.trip) setTrip({
        id: d.trip.id,
        title: d.trip.title,
        location: d.trip.location ?? null,
        startDate: d.trip.startDate ?? null,
        endDate: d.trip.endDate ?? null,
        nights: d.trip.nights ?? null,
      }); })
      .finally(() => { if (!cancelled) setLoadingTrip(false); });
    return () => { cancelled = true; };
  }, [tripId]);

  // Trip-day calculation — what day are we on out of total nights+1?
  const dayInfo = (() => {
    if (!trip?.startDate || !trip?.nights) return { day: 1, total: 1 };
    const start = new Date(trip.startDate + 'T00:00:00');
    const today = new Date(now.toISOString().slice(0, 10) + 'T00:00:00');
    const diff = Math.floor((today.getTime() - start.getTime()) / 86400000);
    const total = trip.nights + 1;
    const day = Math.max(1, Math.min(total, diff + 1));
    return { day, total };
  })();

  const cityName = (trip?.location ?? 'YOUR CITY').toUpperCase();
  const clockText = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <div style={{
      minHeight: '100svh',
      background: 'var(--brand-bg)',
      color: 'var(--brand-ink)',
      fontFamily: 'var(--font-ui), system-ui, sans-serif',
      paddingBottom: 80,
    }}>
      {/* ── Top app bar ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 22px',
        background: 'rgba(5,5,15,0.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--brand-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
            background: 'var(--brand-success)',
            boxShadow: '0 0 12px var(--brand-success)',
            animation: 'livePulse 1.6s ease-in-out infinite',
          }} />
          <span style={{
            fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em',
            color: 'var(--brand-ink-dim)', fontWeight: 600,
          }}>
            LIVE · DAY {dayInfo.day} OF {dayInfo.total} · {cityName}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--brand-ink-dim)' }}>{clockText}</span>
          <span style={{
            fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em',
            padding: '4px 10px', borderRadius: 999,
            border: '1px solid var(--brand-border)',
            color: 'var(--brand-ink-mute)',
          }}>
            {String.fromCodePoint(0x25D0)} OFFLINE MAPS CACHED
          </span>
          <Link href={`/plan/summary?tripId=${encodeURIComponent(tripId)}`}
            style={{
              fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em',
              color: 'var(--brand-accent)', textDecoration: 'none',
              padding: '4px 10px', borderRadius: 999,
              border: '1px solid var(--brand-border-hi)',
            }}>
            ITINERARY {String.fromCodePoint(0x2197)}
          </Link>
        </div>
      </div>

      {/* ── Map area ───────────────────────────────────────────────────── */}
      <LiveMap city={trip?.location ?? null} />

      {/* ── Hero LEAVE-BY card ─────────────────────────────────────────── */}
      <div style={{ padding: '24px 22px 0' }}>
        <LeaveByCard />
      </div>

      {/* ── Three context cards ────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 14, padding: '20px 22px 0',
      }}>
        <NextStopCard />
        <WeatherAlertCard />
        <CrowdsCard />
      </div>

      {/* ── Day timeline strip ─────────────────────────────────────────── */}
      <div style={{ padding: '24px 22px 0' }}>
        <DayTimeline />
      </div>

      {loadingTrip && (
        <div style={{ padding: '24px 22px', color: 'var(--brand-ink-mute)', fontSize: 12 }}>
          Loading trip…
        </div>
      )}

      <style>{`
        @keyframes livePulse {
          0%, 100% { transform: scale(1);   opacity: 1; }
          50%      { transform: scale(1.6); opacity: 0.5; }
        }
        @keyframes routeDash {
          to { stroke-dashoffset: -32; }
        }
      `}</style>
    </div>
  );
}

// ─── Live Map ───────────────────────────────────────────────────────────────

function LiveMap({ city }: { city: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !containerRef.current) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      // Default to Kyoto until we wire geolocation. Geocoder lookup can come
      // online once we plumb the trip city through here.
      center: [135.768, 35.0116],
      zoom: 13,
      pitch: 0,
      attributionControl: false,
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [city]);

  const tokenMissing = !process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  return (
    <div style={{ position: 'relative' }}>
      <div ref={containerRef} style={{
        width: '100%',
        height: 'min(56vh, 480px)',
        background: 'var(--brand-bg2)',
        borderBottom: '1px solid var(--brand-border)',
      }} />
      {tokenMissing && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'grid', placeItems: 'center',
          color: 'var(--brand-ink-mute)', fontSize: 12, padding: 24, textAlign: 'center',
        }}>
          NEXT_PUBLIC_MAPBOX_TOKEN not set — map preview disabled.
        </div>
      )}

      {/* Floating overlays — desktop only (hidden on narrow screens) */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        display: 'flex', flexDirection: 'column', gap: 10,
        pointerEvents: 'none',
      }}>
        <MiniWeatherCard />
        <MiniTransitCard />
      </div>

      {/* NEXT label-pill above the next stop pin (mocked centered) */}
      <div style={{
        position: 'absolute', top: '40%', left: '50%',
        transform: 'translate(-50%, -100%)',
        background: 'var(--brand-accent)',
        color: 'var(--brand-bg)',
        padding: '6px 12px', borderRadius: 999,
        fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 16px rgba(167,139,250,0.4)',
        pointerEvents: 'none',
      }}>
        NEXT · TEA CEREMONY · 14 MIN
      </div>
    </div>
  );
}

function MiniWeatherCard() {
  return (
    <div style={{
      pointerEvents: 'auto',
      background: 'rgba(13,13,36,0.85)', backdropFilter: 'blur(12px)',
      border: '1px solid var(--brand-border)', borderRadius: 12,
      padding: '10px 14px', minWidth: 160,
    }}>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', color: 'var(--brand-ink-mute)', marginBottom: 4 }}>
        WEATHER
      </div>
      <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 400, color: 'var(--brand-accent-2)' }}>
        15° {String.fromCodePoint(0x2601)}
      </div>
      <div style={{ fontSize: 11, color: 'var(--brand-ink-dim)' }}>
        Cloudy · light rain in 3h
      </div>
    </div>
  );
}

function MiniTransitCard() {
  const [mode, setMode] = useState<'walk' | 'bus'>('walk');
  return (
    <div style={{
      pointerEvents: 'auto',
      background: 'rgba(13,13,36,0.85)', backdropFilter: 'blur(12px)',
      border: '1px solid var(--brand-border)', borderRadius: 12,
      padding: '10px 14px', minWidth: 160,
    }}>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', color: 'var(--brand-ink-mute)', marginBottom: 6 }}>
        TRANSIT
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {(['walk', 'bus'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: '6px 10px', borderRadius: 8,
            background: mode === m ? 'rgba(167,139,250,0.16)' : 'transparent',
            border: `1px solid ${mode === m ? 'var(--brand-border-hi)' : 'var(--brand-border)'}`,
            color: mode === m ? 'var(--brand-accent)' : 'var(--brand-ink-dim)',
            fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
            textTransform: 'capitalize', cursor: 'pointer',
          }}>{m}</button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--brand-ink-dim)', marginTop: 6 }}>
        {mode === 'walk' ? '14 min · 1.1 km' : '6 min · bus 5 line'}
      </div>
    </div>
  );
}

// ─── Hero LEAVE-BY card ─────────────────────────────────────────────────────

function LeaveByCard() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(167,139,250,0.18), rgba(125,211,252,0.10))',
      border: '1px solid var(--brand-border-hi)',
      borderRadius: 18,
      padding: '22px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 18, flexWrap: 'wrap',
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em',
          color: 'var(--brand-accent)', fontWeight: 700, marginBottom: 8,
        }}>
          {String.fromCodePoint(0x2728)} LEAVE IN 6 MIN · TO MAKE 1:00 PM
        </div>
        <h2 style={{
          margin: 0,
          fontFamily: DISPLAY, fontSize: 'clamp(28px, 4vw, 44px)',
          fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 1.05,
          color: 'var(--brand-ink)',
        }}>
          Tea ceremony at <em style={{ fontStyle: 'italic', color: 'var(--brand-accent)' }}>Camellia</em>.
        </h2>
        <div style={{
          marginTop: 10, fontSize: 13, lineHeight: 1.5,
          color: 'var(--brand-ink-dim)', maxWidth: 480,
        }}>
          14 min walk through Kōdaiji. The shop closes its tatami room at 1:30 PM, so leaving at 12:54 lands you with breathing room.
        </div>
      </div>
      <button style={{
        flexShrink: 0,
        background: 'var(--brand-accent)',
        color: 'var(--brand-bg)',
        border: 'none', borderRadius: 14,
        padding: '14px 22px',
        fontFamily: 'inherit', fontSize: 14, fontWeight: 700, letterSpacing: '0.02em',
        cursor: 'pointer',
        boxShadow: '0 8px 24px rgba(167,139,250,0.35)',
      }}>
        {String.fromCodePoint(0x2197)} Navigate
      </button>
    </div>
  );
}

// ─── Context cards ──────────────────────────────────────────────────────────

function CardShell({ accent, label, children }: {
  accent: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderLeft: `3px solid ${accent}`,
      border: '1px solid var(--brand-border)',
      borderLeftWidth: 3,
      borderRadius: 12,
      padding: '14px 16px',
    }}>
      <div style={{
        fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em',
        color: accent, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase',
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function NextStopCard() {
  return (
    <CardShell accent="var(--brand-accent-2)" label="NEXT STOP">
      <div style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 400, color: 'var(--brand-ink)' }}>
        Kyoto Ramen Lab
      </div>
      <div style={{ fontSize: 12, color: 'var(--brand-ink-dim)', marginTop: 4 }}>
        7:00 PM · 4.2 km · ★ 4.7 · reservation only
      </div>
    </CardShell>
  );
}

function WeatherAlertCard() {
  return (
    <CardShell accent="var(--brand-gold)" label="WEATHER ALERT">
      <div style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 400, color: 'var(--brand-ink)' }}>
        Light rain at 4 PM
      </div>
      <div style={{ fontSize: 12, color: 'var(--brand-ink-dim)', marginTop: 4 }}>
        Bring a layer. Most temple gardens stay open in light rain.
      </div>
    </CardShell>
  );
}

function CrowdsCard() {
  // 24-bar histogram, current hour highlighted green
  const hours = Array.from({ length: 24 }, (_, i) => {
    // Plausible "popular times" curve peaking around midday + dinner
    const base = Math.max(0, Math.sin(((i - 6) / 24) * Math.PI * 2) * 0.5 + 0.5);
    return Math.round(base * 100);
  });
  const current = new Date().getHours();
  return (
    <CardShell accent="var(--brand-warn)" label="CROWDS · NISHIKI MARKET">
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 36, marginTop: 4 }}>
        {hours.map((h, i) => (
          <div key={i} style={{
            flex: 1,
            height: `${Math.max(6, h)}%`,
            borderRadius: 1,
            background: i === current ? 'var(--brand-success)' : 'var(--brand-warn)',
            opacity: i === current ? 1 : 0.55,
          }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--brand-ink-dim)', marginTop: 6 }}>
        Currently {hours[current]}% · usual peak around lunch
      </div>
    </CardShell>
  );
}

// ─── Day timeline ───────────────────────────────────────────────────────────

interface TimelineStop { time: string; label: string; status: 'done' | 'now' | 'future' }
function DayTimeline() {
  const stops: TimelineStop[] = [
    { time: '8:30 AM',  label: 'Honke Owariya breakfast', status: 'done' },
    { time: '10:00 AM', label: 'Kiyomizu-dera quest',     status: 'done' },
    { time: '1:00 PM',  label: 'Tea ceremony · Camellia', status: 'now' },
    { time: '4:00 PM',  label: 'Kōdaiji night garden',    status: 'future' },
    { time: '7:00 PM',  label: 'Kyoto Ramen Lab',         status: 'future' },
  ];
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${stops.length}, minmax(0, 1fr))`,
      gap: 8,
    }}>
      {stops.map((s, i) => {
        const color = s.status === 'done'   ? 'var(--brand-success)'
                    : s.status === 'now'    ? 'var(--brand-accent)'
                                            : 'var(--brand-ink-mute)';
        const opacity = s.status === 'future' ? 0.55 : 1;
        return (
          <div key={i} style={{
            borderTop: `2px solid ${color}`,
            paddingTop: 8, opacity,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: color, marginBottom: 8,
            }} />
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', color: 'var(--brand-ink-mute)', marginBottom: 2 }}>
              {s.status.toUpperCase()} · {s.time}
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 13, color: 'var(--brand-ink)', lineHeight: 1.3 }}>
              {s.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
