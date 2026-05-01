import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import SummaryView from './SummaryView';

// Legacy /plan/summary route. With a savedTripId/tripId we route into
// the canonical tab shell, picking the right tab based on whether the
// trip already has an itinerary:
//   - has itinerary ⇒ /plan/<id>/itinerary (show day cards)
//   - empty itinerary ⇒ /plan/<id>/planning (curate pins → Generate)
// Without an id we fall through to SummaryView so the pre-trip flow
// (no DB row yet) still works.
export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ savedTripId?: string; tripId?: string }>;
}) {
  const sp = await searchParams;
  const id = sp.savedTripId ?? sp.tripId;
  if (id) {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (userId) {
      const trip = await prisma.tripDraft.findUnique({
        where: { id },
        select: { itinerary: true, userId: true },
      });
      if (trip && trip.userId === userId && trip.itinerary) {
        redirect(`/plan/${id}/itinerary`);
      }
    }
    redirect(`/plan/${id}/planning`);
  }
  return <SummaryView />;
}
