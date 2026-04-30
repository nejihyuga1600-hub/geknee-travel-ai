import { redirect } from 'next/navigation';

// Default landing for /plan/<tripId> — send to the itinerary tab.
// Booking lives at /plan/<tripId>/booking, map at /plan/<tripId>/map.
export default async function TripRoot({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  redirect(`/plan/${tripId}/itinerary`);
}
