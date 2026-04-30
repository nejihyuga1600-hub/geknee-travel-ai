'use client';

import { useParams } from 'next/navigation';

export default function ItineraryTabPage() {
  const params = useParams();
  const tripId = (params?.tripId as string) ?? '';

  return (
    <div
      style={{
        padding: '48px 32px',
        fontFamily: 'var(--font-display), Georgia, serif',
        maxWidth: 880,
        margin: '0 auto',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-mono-display), ui-monospace, monospace',
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--brand-accent-2, rgba(167, 139, 250, 0.85))',
          fontWeight: 600,
          margin: 0,
        }}
      >
        § Itinerary · trip {tripId.slice(0, 8) || '—'}
      </p>
      <h1 style={{ fontSize: 36, lineHeight: 1.1, margin: '12px 0 16px', fontWeight: 400, letterSpacing: '-0.015em' }}>
        Tab shell scaffolded
      </h1>
      <p style={{ color: 'rgba(241, 245, 249, 0.6)', fontSize: 16, lineHeight: 1.6, margin: 0 }}>
        Step 1 of the itinerary/booking unification: tab navigation is wired up. Step 2 lifts the existing
        <span style={{ fontFamily: 'var(--font-mono-display), ui-monospace, monospace', fontSize: 13 }}> /plan/summary </span>
        content into this route. Until then, the legacy page stays canonical.
      </p>
    </div>
  );
}
