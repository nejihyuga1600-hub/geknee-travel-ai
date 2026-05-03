// AI-generated booking suggestions for the Booking tab.
// Replaces the hardcoded Kyoto MOCK_* data in BookView with realistic
// hotels, a flight option, and activities specific to the trip's
// destination, dates, budget, and travel style.
//
// Single non-streaming Anthropic call returns structured JSON. Server-
// side cached per (location, startDate, endDate, budget, style) via
// Vercel's fetch cache so repeat visits in the same session don't
// re-bill the model.

import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const runtime = "nodejs";
export const maxDuration = 60;

interface SuggestionsRequest {
  location: string;
  startDate?: string;
  endDate?: string;
  nights?: string;
  budget?: string;
  style?: string;
  travelingFrom?: string;
  currency?: string; // ISO code, used as a hint for the secondary price
}

const SYSTEM = `You are a travel-booking assistant generating realistic, well-known booking options for a destination. Respond with ONLY a single JSON object — no markdown fences, no commentary, no leading/trailing prose. Use real venues that a knowledgeable concierge would name. Use the destination's local currency for all prices. Match the budget level: a luxury traveler should not see hostels; a budget traveler should not see Park Hyatt.`;

function buildPrompt(p: SuggestionsRequest): string {
  return `Generate booking suggestions for a ${p.nights || "?"}-night trip to ${p.location} (${p.startDate ?? "TBD"} to ${p.endDate ?? "TBD"}).
Travel style: ${p.style || "balanced"}.
Budget level: ${p.budget || "mid-range"}.
${p.travelingFrom ? `Departing from: ${p.travelingFrom}.` : ""}

Return ONLY a JSON object with this exact shape:

{
  "hotels": [
    {
      "tier": "EDITORS' PICK" | "LOCAL" | "BUDGET",
      "district": "neighborhood or area name",
      "tag": "HOTEL" | "RYOKAN" | "HOSTEL" | "INN" | "BNB",
      "name": "real, well-known property in the area",
      "rating": 4 or 5,
      "features": ["short feature 1", "short feature 2", "short feature 3"],
      "price": number (per night, in destination's local currency),
      "currency": single char from "¥ $ € £ ₹"
    }
    // EXACTLY 4 hotels: 1 EDITORS' PICK luxury, 2 LOCAL mid-range, 1 BUDGET
  ],
  "flight": {
    "date": "e.g. APR 13–17",
    "carrier": "real major airline serving this route",
    "segments": [
      {
        "from": "3-letter IATA code",
        "to": "3-letter IATA code",
        "departTime": "e.g. 11:30 PM",
        "arriveTime": "e.g. 5:50 AM",
        "duration": "e.g. 11h 20m"
      }
      // EXACTLY 2 segments: outbound + return
    ],
    "total": number (round-trip total),
    "currency": single char,
    "status": "PENDING"
  },
  "activities": [
    {
      "tag": "TEA" | "CULTURE" | "FOOD" | "NATURE" | "NIGHTLIFE",
      "name": "real bookable experience or venue",
      "meta": "date · time · duration",
      "price": number,
      "currency": single char
    }
    // EXACTLY 4 activities, varied tags, fitting the budget level
  ]
}

For ${p.location} specifically: use real hotels in real neighborhoods, real airline routes, real activities. Do NOT return generic placeholders.`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SuggestionsRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.location || !body.location.trim()) {
    return Response.json({ error: "location required" }, { status: 400 });
  }

  try {
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM,
      messages: [{ role: "user", content: buildPrompt(body) }],
    });

    // Extract text content. Anthropic returns content blocks; join the
    // text ones (typically just one for a JSON-only response).
    const text = resp.content
      .filter(b => b.type === "text")
      .map(b => (b as { type: "text"; text: string }).text)
      .join("");

    // Strip any stray markdown fence the model might still wrap output
    // in despite the instruction. Defensive — usually a no-op.
    const cleaned = text
      .replace(/^\s*```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[booking-suggestions] JSON parse failed:", cleaned.slice(0, 400));
      return Response.json({ error: "model returned invalid JSON" }, { status: 502 });
    }

    return Response.json(parsed);
  } catch (err) {
    console.error("[booking-suggestions] error:", err);
    return Response.json({ error: "generation failed" }, { status: 500 });
  }
}
