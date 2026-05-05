// GET /api/bookings?tripId=<id>
//
// Returns Booking rows for a trip, scoped to the signed-in user.
// Used by BookView to render a "confirmed bookings" indicator after
// the Travelpayouts cron has attributed a conversion to this trip.
//
// Scoping: we query by both tripId AND userId so a user can only
// see their own bookings even if they somehow guess another trip's
// id. Anonymous bookings (where the cron couldn't resolve a userId
// from sub_id) are not surfaced — they exist only for revenue
// accounting in the admin view.

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tripId = new URL(req.url).searchParams.get("tripId");
  if (!tripId) {
    return Response.json({ bookings: [] });
  }

  const rows = await prisma.booking.findMany({
    where: { tripId, userId },
    orderBy: { conversionAt: "desc" },
    select: {
      id: true,
      partner: true,
      partnerProgram: true,
      itemKind: true,
      itemName: true,
      amount: true,
      payout: true,
      currency: true,
      status: true,
      conversionAt: true,
    },
  });

  // Decimal → number so the client doesn't have to know about the
  // Prisma serialization. Currency values up to ~9 trillion are safe
  // here; we're well under that.
  const bookings = rows.map(b => ({
    ...b,
    amount: b.amount ? Number(b.amount) : null,
    payout: b.payout ? Number(b.payout) : null,
  }));

  return Response.json({ bookings });
}
