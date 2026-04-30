'use client';

import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Lazy-load the heavy summary view (~1,700 lines, dynamic-imports a Map,
// chart, BookView, etc). Renders client-side only — matches how the
// legacy /plan/summary page behaves.
const SummaryView = dynamic(
  () => import('@/app/plan/summary/SummaryView'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          padding: '48px 32px',
          color: 'rgba(241,245,249,0.55)',
          fontFamily: 'var(--font-mono-display), ui-monospace, monospace',
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        Loading itinerary…
      </div>
    ),
  }
);

export default function ItineraryTabPage() {
  const params = useParams();
  const tripId = (params?.tripId as string) ?? '';
  return <SummaryView tripIdOverride={tripId} />;
}
