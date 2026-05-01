'use client';

import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Same SummaryView the itinerary tab uses, but mounted with
// initialMainTab='planning' so the user lands on the pin/bookmark
// curation surface with a "Generate Itinerary" CTA — the canonical
// pre-generation step. New trips redirected from /plan/summary land
// here when their DB itinerary is empty.
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
        Loading planning surface…
      </div>
    ),
  }
);

export default function PlanningTabPage() {
  const params = useParams();
  const tripId = (params?.tripId as string) ?? '';
  return (
    <SummaryView
      tripIdOverride={tripId}
      initialMainTab="planning"
      autoGenerate={false}
    />
  );
}
