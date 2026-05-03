// Slot-in itinerary editor. The user adds one new booking (a hotel
// or an activity) and we ask the model to make the SMALLEST possible
// edit to incorporate it — typically 1-2 lines on one day. Saves the
// revised itinerary to TripDraft.itinerary so subsequent reloads see
// the updated plan, and returns the new text so the client can
// re-render in place without a page reload.

import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const runtime = "nodejs";
export const maxDuration = 90;

interface AdjustRequest {
  tripId: string;
  kind: "hotel" | "activity";
  name: string;
  district?: string;
  meta?: string;       // e.g. "APR 28 · 3:00 PM · ~2 hrs"
  price?: string;      // already-formatted user-currency string
}

const SYSTEM = `You make minimal, surgical edits to existing travel itineraries to incorporate ONE new booking. Output ONLY the revised itinerary as markdown — no commentary, no preamble, no code fences. Preserve the original structure (## Day N: Title headings, activity time-stamps, transit segments, budget breakdown, practical tips) exactly. Change at most 1-2 lines on at most ONE day section. Never regenerate or rewrite other days, the budget, or the tips.`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string })?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: AdjustRequest;
  try { body = await req.json(); }
  catch { return Response.json({ error: "Invalid body" }, { status: 400 }); }

  if (!body.tripId || !body.name || !body.kind) {
    return Response.json({ error: "Missing tripId / kind / name" }, { status: 400 });
  }
  if (body.kind !== "hotel" && body.kind !== "activity") {
    return Response.json({ error: "kind must be hotel|activity" }, { status: 400 });
  }

  // Load the current itinerary out of the trip row. Server-side load
  // means the client doesn't need to ship 5+ KB of itinerary text per
  // request, AND we always edit against the canonical version.
  const trip = await prisma.tripDraft.findUnique({
    where: { id: body.tripId },
    select: { userId: true, itinerary: true, location: true },
  });
  if (!trip || trip.userId !== userId) {
    return Response.json({ error: "Trip not found" }, { status: 404 });
  }
  if (!trip.itinerary || !trip.itinerary.trim()) {
    return Response.json(
      { error: "No itinerary yet — generate one before slotting in bookings" },
      { status: 400 },
    );
  }

  const userPrompt = `Existing itinerary for trip to ${trip.location ?? "the destination"}:

\`\`\`
${trip.itinerary}
\`\`\`

The user just booked this:
KIND: ${body.kind}
NAME: ${body.name}${body.district ? `\nDISTRICT/AREA: ${body.district}` : ""}${body.meta ? `\nWHEN/INFO: ${body.meta}` : ""}${body.price ? `\nPRICE: ${body.price}` : ""}

Make the SMALLEST possible change to slot this booking in:
- HOTEL: integrate as the lodging on appropriate evenings/mornings.
  If the existing itinerary mentions a hotel, replace that mention.
  Otherwise add a single line to the first/last day's evening section.
  Maximum 2 lines changed total.
- ACTIVITY: insert at a sensible time on the most appropriate day
  (matching cuisine type / category / timing). Place it between
  existing activities and adjust at most ONE adjacent activity's
  time so the day still flows. Maximum 2 lines changed.

Do NOT regenerate any other day, the budget breakdown, or the
practical tips section. Output the FULL revised itinerary as
markdown text. No commentary, no fences, just the itinerary content.`;

  try {
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = resp.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("");

    const cleaned = text
      .replace(/^\s*```(?:markdown|md)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    if (!cleaned) {
      console.error("[itinerary/adjust] empty response from model");
      return Response.json({ error: "Empty response from model" }, { status: 502 });
    }

    await prisma.tripDraft.update({
      where: { id: body.tripId },
      data: { itinerary: cleaned, itineraryUpdatedAt: new Date() },
    });

    return Response.json({ itinerary: cleaned });
  } catch (err) {
    console.error("[itinerary/adjust] error:", err);
    return Response.json({ error: "adjustment failed" }, { status: 500 });
  }
}
