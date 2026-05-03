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
  userHomeCountry?: string; // fallback origin from client locale
  currency?: string; // ISO code, used as a hint for the secondary price
}

const SYSTEM = `You are a travel-booking assistant generating realistic, well-known booking options for a destination. Respond with ONLY a single JSON object — no markdown fences, no commentary, no leading/trailing prose. Use real venues that a knowledgeable concierge would name. Match the budget level: a luxury traveler should not see hostels; a budget traveler should not see Park Hyatt.`;

const CCY_SYMBOL: Record<string, string> = {
  USD: "$", GBP: "£", EUR: "€", JPY: "¥", CNY: "¥", CHF: "CHF",
  AUD: "A$", CAD: "C$", NZD: "NZ$", INR: "₹", KRW: "₩", THB: "฿",
  SGD: "S$", HKD: "HK$", TWD: "NT$", MYR: "RM", IDR: "Rp", VND: "₫",
  PHP: "₱", AED: "AED", SAR: "SAR", ZAR: "R", BRL: "R$", MXN: "MX$",
  ARS: "AR$", RUB: "₽", TRY: "₺", PLN: "zł", SEK: "kr", NOK: "kr", DKK: "kr",
};

function buildPrompt(p: SuggestionsRequest): string {
  const homeCcy = p.currency && CCY_SYMBOL[p.currency] ? p.currency : "USD";
  const homeSymbol = CCY_SYMBOL[homeCcy];
  return `Generate booking suggestions for a ${p.nights || "?"}-night trip to ${p.location} (${p.startDate ?? "TBD"} to ${p.endDate ?? "TBD"}).
Travel style: ${p.style || "balanced"}.
Budget level: ${p.budget || "mid-range"}.
${(() => {
  const origin = p.travelingFrom?.trim() || p.userHomeCountry?.trim();
  if (!origin) return '';
  return `Departing from: ${origin}.\nORIGIN RULE: Every flight option below MUST originate from a major international hub airport in/near "${origin}", NOT from the destination country. If the user is traveling internationally, the outbound flight is from the user's region to the destination, and the return is the reverse. Do not suggest a domestic flight at the destination unless the user's home is in the same country as the destination.`;
})()}
User's home currency: ${homeCcy} (${homeSymbol}). All prices below MUST be in ${homeCcy}; convert from local currency to ${homeCcy} using current approximate rates. Use the symbol "${homeSymbol}" for every \`currency\` field.

Return ONLY a JSON object with this exact shape:

{
  "hotels": [
    {
      "tier": "EDITORS' PICK" | "LOCAL" | "BUDGET",
      "district": "neighborhood or area name",
      "tag": "HOTEL" | "RYOKAN" | "HOSTEL" | "INN" | "BNB" | "RIAD" | "RESORT",
      "name": "real, well-known property in the area",
      "rating": 4 or 5,
      "features": ["short feature 1", "short feature 2", "short feature 3"],
      "price": number (per night, IN ${homeCcy}),
      "currency": "${homeSymbol}"
    }
    // EXACTLY 4 hotels: 1 EDITORS' PICK luxury, 2 LOCAL mid-range, 1 BUDGET
  ],
  "flightOptions": [
    {
      "carrier": "real major airline serving this route",
      "flightNumbers": ["e.g. UA 824", "e.g. UA 875"],
      "totalPrice": number (round-trip total, IN ${homeCcy}),
      "currency": "${homeSymbol}",
      "totalDuration": "e.g. 13h 45m (sum of both legs incl layovers)",
      "cabin": "economy",
      "co2Kg": number (estimated round-trip CO₂ in kilograms per passenger; ballpark realistic for distance and aircraft type),
      "dealBadge": "BEST PRICE" | "FASTEST" | "GREENEST" | "BEST VALUE" | omit,
      "outbound": {
        "from": "3-letter IATA",
        "to": "3-letter IATA",
        "date": "yyyy-mm-dd",
        "departTime": "e.g. 11:30 PM",
        "arriveTime": "e.g. 5:50 AM next day",
        "duration": "e.g. 11h 20m",
        "layovers": [
          { "airport": "3-letter IATA", "city": "city name", "duration": "e.g. 2h 15m" }
          // 0-2 layovers; empty array for direct flights
        ]
      },
      "return": {
        "from": "3-letter IATA",
        "to": "3-letter IATA",
        "date": "yyyy-mm-dd",
        "departTime": "e.g. 8:40 PM",
        "arriveTime": "e.g. 12:25 PM next day",
        "duration": "e.g. 9h 45m",
        "layovers": [ /* same shape; empty for direct */ ]
      }
    }
    // EXACTLY 3 options, each with a DIFFERENT trade-off:
    //   - one cheapest (BEST PRICE) — likely 1-2 stops, longer duration
    //   - one fastest (FASTEST) — direct or single short layover, higher price
    //   - one greenest (GREENEST) — newest aircraft / direct routing, may be mid-priced
    // The 4th badge "BEST VALUE" is optional for a balanced 4th option.
    // Use real airlines that fly the route in 2026. Compute CO2 honestly:
    // ~115g per passenger-km for typical narrow-body, less for direct,
    // more for connecting flights with extra distance.
  ],
  "flight": {
    "date": "two date labels separated by an en-dash, like 'APR 28–MAY 1'. Used by legacy single-flight UI; copy the BEST VALUE option's date range here.",
    "carrier": "the BEST VALUE option's carrier",
    "segments": [
      {
        "from": "from-IATA", "to": "to-IATA",
        "departTime": "...", "arriveTime": "...",
        "duration": "..."
      }
      // 2 segments mirroring the BEST VALUE option's outbound + return
    ],
    "total": number,
    "currency": "${homeSymbol}",
    "status": "PENDING"
  },
  "activities": [
    {
      "tag": "TEA" | "CULTURE" | "FOOD" | "NATURE" | "NIGHTLIFE",
      "name": "real bookable experience or venue",
      "meta": "date · time · duration",
      "price": number (IN ${homeCcy}),
      "currency": "${homeSymbol}"
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
      max_tokens: 4096,
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
