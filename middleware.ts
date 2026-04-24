// A/B routing for the planner switchover. Assigns each visitor a stable
// variant — 'atlas' or 'location' — and persists it as a cookie so the
// home page CTA, deep links from share cards, and any future planner
// link routes them consistently for the duration of the experiment.
//
// Why middleware instead of a server-component cookie write: the home
// page is a server component, but cookies() can't WRITE in a server
// component (only read). Middleware can write before any page renders,
// so the first request gets the same variant the home CTA will use.
//
// Flip the experiment off by setting GEKNEE_PLANNER_VARIANT=atlas (or
// location) in env to force everyone into one bucket without code
// changes.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "geknee_planner_variant";
const TTL_DAYS = 30;

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const forced = process.env.GEKNEE_PLANNER_VARIANT;
  const existing = req.cookies.get(COOKIE)?.value;

  // Force-pin via env beats stored cookie — lets us flip the experiment
  // off in prod without re-deploying every browser.
  if (forced === "atlas" || forced === "location") {
    if (existing !== forced) {
      res.cookies.set(COOKIE, forced, {
        path: "/",
        maxAge: TTL_DAYS * 24 * 60 * 60,
        sameSite: "lax",
      });
    }
    return res;
  }

  if (existing === "atlas" || existing === "location") return res;

  // 50/50 split. crypto.getRandomValues is available in the Edge runtime.
  const buf = new Uint8Array(1);
  crypto.getRandomValues(buf);
  const variant = buf[0] < 128 ? "atlas" : "location";

  res.cookies.set(COOKIE, variant, {
    path: "/",
    maxAge: TTL_DAYS * 24 * 60 * 60,
    sameSite: "lax",
  });
  return res;
}

// Run only on routes where the variant matters. API routes, static files,
// and the auth flow don't need bucketing.
export const config = {
  matcher: [
    "/",
    "/plan/:path*",
    "/u/:path*",
    "/leaderboard",
    "/pricing",
  ],
};
