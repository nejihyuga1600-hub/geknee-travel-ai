import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// Default landing for /plan/<tripId>. We pick the right tab based on
// whether the trip has an itinerary yet:
//   - itinerary exists ⇒ /plan/<id>/itinerary (show the day cards)
//   - itinerary empty  ⇒ /plan/<id>/planning  (curate pins, then Generate)
// Falls back to /planning when we can't read the trip (unauth, missing
// row) — that's the safer default for brand-new trips.
export default async function TripRoot({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (userId) {
    const trip = await prisma.tripDraft.findUnique({
      where: { id: tripId },
      select: { itinerary: true, userId: true },
    });
    if (trip && trip.userId === userId && trip.itinerary) {
      redirect(`/plan/${tripId}/itinerary`);
    }
  }
  redirect(`/plan/${tripId}/planning`);
}
