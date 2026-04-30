'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const MONO = 'var(--font-mono-display), ui-monospace, monospace';
const DISPLAY = 'var(--font-display), Georgia, serif';

interface LoadedTrip {
  id: string;
  title?: string | null;
  location: string | null;
  startDate?: string | null;
  endDate?: string | null;
  nights?: number | null;
}

export default function ItineraryTabPage() {
  const params = useParams();
  const tripId = (params?.tripId as string) ?? '';
  const [trip, setTrip] = useState<LoadedTrip | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    fetch(`/api/trips/${encodeURIComponent(tripId)}`)
      .then(r => {
        if (r.status === 401) throw new Error('Sign in required to load this trip.');
        if (r.status === 404) throw new Error("Couldn't find that trip.");
        if (!r.ok) throw new Error(`Failed to load trip (${r.status}).`);
        return r.json();
      })
      .then(d => { if (!cancelled) setTrip(d.trip ?? null); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, [tripId]);

  // Until the summary page is extracted into a reusable view (step 3),
  // this tab shows trip basics and hands off to /plan/summary for the
  // full editable itinerary. Keeps the new tab UI usable for navigation
  // without forking the 1,700-line summary implementation prematurely.
  const legacyHref = `/plan/summary?savedTripId=${encodeURIComponent(tripId)}`;

  return (
    <div style={{ padding: '48px 32px', maxWidth: 880, margin: '0 auto', fontFamily: DISPLAY }}>
      <p style={{
        fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
        color: 'var(--brand-accent-2, rgba(167, 139, 250, 0.85))', fontWeight: 600, margin: 0,
      }}>
        § Itinerary · trip {tripId.slice(0, 8) || '—'}
      </p>

      {error ? (
        <>
          <h1 style={{ fontSize: 28, lineHeight: 1.15, margin: '12px 0 12px', fontWeight: 400 }}>
            {error}
          </h1>
          <p style={{ color: 'rgba(241,245,249,0.55)', fontSize: 14, margin: 0 }}>
            Trip id: <span style={{ fontFamily: MONO, fontSize: 12 }}>{tripId || '(missing)'}</span>
          </p>
        </>
      ) : !trip ? (
        <p style={{
          color: 'rgba(241,245,249,0.55)', fontFamily: MONO, fontSize: 11,
          letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 24,
        }}>
          Loading trip…
        </p>
      ) : (
        <>
          <h1 style={{ fontSize: 36, lineHeight: 1.1, margin: '12px 0 8px', fontWeight: 400, letterSpacing: '-0.015em' }}>
            {trip.title || trip.location || 'Untitled trip'}
          </h1>
          <p style={{ color: 'rgba(241,245,249,0.6)', fontSize: 14, fontFamily: MONO, margin: '0 0 28px' }}>
            {[
              trip.location,
              trip.startDate && trip.endDate ? `${trip.startDate} → ${trip.endDate}` : null,
              trip.nights ? `${trip.nights} nights` : null,
            ].filter(Boolean).join(' · ')}
          </p>

          <Link
            href={legacyHref}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 20px', borderRadius: 10,
              background: 'rgba(56,189,248,0.14)',
              border: '1px solid rgba(56,189,248,0.3)',
              color: 'var(--brand-accent, #38bdf8)', textDecoration: 'none',
              fontFamily: MONO, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              transition: 'background 180ms ease',
            }}
          >
            Open full itinerary
            <span aria-hidden style={{ fontSize: 14 }}>{String.fromCodePoint(0x2192)}</span>
          </Link>

          <p style={{
            marginTop: 32, fontSize: 13, color: 'rgba(241,245,249,0.4)',
            lineHeight: 1.6, fontFamily: DISPLAY,
          }}>
            Inline editing, weather, day cards, and chat live at the legacy
            <span style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(241,245,249,0.55)' }}> /plan/summary </span>
            for now. They land natively here in step 3 once the summary page is extracted into a reusable
            <span style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(241,245,249,0.55)' }}> ItineraryView </span>
            component.
          </p>
        </>
      )}
    </div>
  );
}
