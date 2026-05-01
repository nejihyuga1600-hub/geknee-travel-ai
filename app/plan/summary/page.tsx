import { redirect } from 'next/navigation';
import SummaryView from './SummaryView';

// Legacy /plan/summary route. When the URL carries a savedTripId/tripId,
// rewrite to the canonical tab route at /plan/<id>/itinerary so users land
// inside the new tabbed shell. Without an id (very early in the planning
// flow, before /api/trips persistence), fall through to the same SummaryView
// that powers the new tab — keeps the AI-generation entrypoint working
// for users who haven't created a trip yet.
export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ savedTripId?: string; tripId?: string }>;
}) {
  const sp = await searchParams;
  const id = sp.savedTripId ?? sp.tripId;
  if (id) {
    redirect(`/plan/${id}/itinerary`);
  }
  return <SummaryView />;
}
