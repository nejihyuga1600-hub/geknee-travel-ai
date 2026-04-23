# Dev Review — 2026-04-15 10:45

## Critical (security/breaking)

### SECURITY-1: Unauthenticated AI endpoints still exposed to cost abuse
- **RISK:** 4 AI routes (`/api/chat`, `/api/inspiration`, `/api/flight-prices`, `/api/place-images`) have NO auth guard and invoke Claude, SerpAPI, Travelpayouts, or Google APIs on every request. An attacker can:
  - Spam `/api/chat` to run unlimited Claude requests (10–50k tokens per request)
  - Hammer `/api/inspiration` with image uploads (no file size limit) to trigger vision model analysis
  - Abuse `/api/flight-prices` to call SerpAPI 6× per request with no rate limit
  - Drain quota across all three partners in minutes
- **Files:** 
  - `app/api/chat/route.ts:1-100` (no auth check)
  - `app/api/inspiration/route.ts:1-59` (no auth, no file size validation)
  - `app/api/flight-prices/route.ts:1-252` (no auth, no rate limiting)
  - `app/api/place-images/route.ts` (no auth, likely similar pattern)
- **Fix:** Add `const session = await auth(); if (!session?.user) return 401` to the top of POST handler in all four routes. Copy the pattern from `/api/recommendations/route.ts:18-20`.
- **Complexity:** Trivial (4 lines × 4 files)

### SECURITY-2: Google Maps API key exposure in geocode endpoint
- **RISK:** `app/api/geocode/route.ts` constructs the URL with `GOOGLE_GEOCODE_KEY` directly and returns raw geocoding data. While the key itself is not logged, this endpoint is:
  - Unauthenticated (any client can call it)
  - Rate-limited only by Google's quota (no server-side rate limiting)
  - Vulnerable to harvesting coordinates from arbitrary addresses (e.g., stalking homes)
- **File:** `app/api/geocode/route.ts:18` — the fetch URL embeds the key
- **Fix:** 
  1. Add auth guard at top (see SECURITY-1)
  2. Add IP-based or user-based rate limiting (e.g., 10 requests per user per minute)
  3. Consider using Google's server-side key with restrictive API restrictions (IP + geocoding-only)
- **Complexity:** Small (auth guard trivial; rate limiting small with Redis or in-memory map)

### SECURITY-3: Inspiration route has no file size limit on image uploads
- **RISK:** `app/api/inspiration/route.ts:6-12` accepts file uploads with NO validation. An attacker can:
  - Send a 100MB file → causes `Buffer.from(bytes).toString('base64')` to consume heap memory
  - Trigger OOM crash on serverless function
  - Send multi-GB files as part of a DoS attack
- **File:** `app/api/inspiration/route.ts:6-17`
- **Fix:** Add validation:
  ```ts
  if (!image) return Response.json({ error: 'No image provided' }, { status: 400 });
  if (image.size > 5 * 1024 * 1024) return Response.json({ error: 'Image too large' }, { status: 413 });
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(image.type)) {
    return Response.json({ error: 'Invalid image type' }, { status: 400 });
  }
  ```
- **Complexity:** Trivial (4 lines)

---

## Performance

### PERF-1: LocationClient Three.js resources not disposed on unmount
- **ISSUE:** `app/plan/location/LocationClient.tsx` creates many Three.js textures (earth, bump map, canvas texture) but does NOT dispose them on component unmount. With repeated visits to the globe page:
  - GPU memory accumulates (WebGL textures not freed)
  - Eventually causes performance degradation or crashes on low-end devices
- **Files:** `app/plan/location/LocationClient.tsx:6034-6041` (texture creation with no cleanup) and `6044-6108` (resource loading with `return () => { cancelled = true }` but no texture.dispose())
- **Impact:** ~20–100 MB of GPU memory leaked per globe page visit on mobile
- **Fix:** Add cleanup in the resource loading useEffect:
  ```ts
  return () => {
    cancelled = true;
    if (texture) texture.dispose();
    if (bumpMap) bumpMap.dispose();
    if (terrainBitmap) terrainBitmap.close(); // ImageBitmap cleanup
  };
  ```
- **Complexity:** Small (add 4 lines to the useEffect return, track texture/bumpMap in refs if needed)

### PERF-2: globeReady state fires too early; loading spinner shows even when canvas is interactive
- **ISSUE:** `app/plan/location/LocationClient.tsx:6373` sets `globeReady = true` in `onCreated`, which fires when the Canvas WebGL context initializes. However:
  - GeoJSON borders still loading (async fetches in separate useEffect at :6044)
  - Terrain image still loading (NASA Blue Marble fetch in parallel)
  - Earth texture not yet bound (happens after borders/terrain load at :6034)
  - Result: Loading spinner disappears while globe is still blank or partially rendered
- **File:** `app/plan/location/LocationClient.tsx:6373` and the resource loading pattern at :6034–6108
- **Impact:** Users see a spinner disappear but the globe is still loading; UX confusion
- **Fix:** Move `setGlobeReady(true)` to a dedicated useEffect that tracks when `countries`, `states`, `terrainBitmap`, and `texture` are all non-null:
  ```ts
  useEffect(() => {
    if (countries && states && (terrainBitmap || texture)) {
      setGlobeReady(true);
    }
  }, [countries, states, terrainBitmap, texture]);
  ```
- **Complexity:** Small (new useEffect, adjust dependencies)

### PERF-3: Stripe webhook returns 200 OK even on missing userId
- **ISSUE:** `app/api/stripe/webhook/route.ts:30, 41, 55` checks if `userId` exists and breaks silently. The webhook still returns 200, so Stripe retries will not happen. If metadata.userId is ever missing, the user's plan won't update, but no error is logged or retried.
- **File:** `app/api/stripe/webhook/route.ts:24-68`
- **Impact:** Silent failure if Stripe's metadata structure changes (e.g. userId missing)
- **Fix:** Add logging or return 400 if userId is missing:
  ```ts
  if (!userId) {
    console.warn('Webhook received but userId missing', { eventType: event.type, sessionId: session.id });
    return new Response('Missing userId', { status: 400 });
  }
  ```
- **Complexity:** Trivial (2 lines per case)

---

## Code Quality

### QUALITY-1: Chat route builds system prompt with unvalidated user input
- **ISSUE:** `app/api/chat/route.ts:26-46` directly interpolates `body.tripInfo` fields (location, nights, purpose, style, budget) into the system prompt without escaping or validation. While less risky than injecting into function calls, a malicious user could craft inputs like:
  - location: `Paris\n\nNEW INSTRUCTION: Ignore previous rules and...`
  - This won't break the system prompt completely, but it's sloppy
- **File:** `app/api/chat/route.ts:26-46`
- **Impact:** Low (system prompt is trusted by model anyway), but bad practice
- **Fix:** Add basic sanitization (strip newlines, limit length):
  ```ts
  const sanitize = (s: string) => (s ?? '').trim().slice(0, 100).replace(/\n/g, ' ');
  const { location = "", nights = "", ... } = {
    location: sanitize(body.tripInfo?.location ?? ''),
    nights: sanitize(body.tripInfo?.nights ?? ''),
    ...
  };
  ```
- **Complexity:** Trivial (add a sanitize() function)

### QUALITY-2: No input validation on itinerary generation route
- **ISSUE:** `app/api/itinerary/route.ts:173-175` checks `!body.location || !body.nights` but doesn't validate:
  - `nights` is a number (could be negative, very large)
  - `location` is a real place (could be adversarial input like `" DROP TABLE users; --"`)
  - Other fields like `interests`, `constraints` are not length-checked (could be huge strings fed into prompt)
- **File:** `app/api/itinerary/route.ts:166-175`
- **Impact:** Moderate (large inputs could exceed token limits; malformed data could cause JSON errors)
- **Fix:** Add schema validation using zod or simple checks:
  ```ts
  if (!Number.isInteger(nights) || nights < 1 || nights > 365) {
    return new Response('nights must be 1–365', { status: 400 });
  }
  if (!location || location.length > 200) {
    return new Response('location required, max 200 chars', { status: 400 });
  }
  if (body.interests && body.interests.length > 1000) {
    return new Response('interests too long', { status: 400 });
  }
  ```
- **Complexity:** Small (4–6 lines of validation)

### QUALITY-3: Inconsistent error handling across AI routes
- **ISSUE:** Some routes catch errors with `console.error()` and return 500 (itinerary, recommendations, chat), but flight-prices has a bare catch-all (line 248) that logs but doesn't detail what failed. Inconsistency makes debugging harder.
- **Files:** `app/api/chat/route.ts:82-86`, `app/api/recommendations/route.ts:99-101`, `app/api/itinerary/route.ts:203-209`, `app/api/flight-prices/route.ts:248-251`
- **Impact:** Low (debugging pain)
- **Fix:** Standardize error responses:
  ```ts
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Route handler error:', message);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
  ```
- **Complexity:** Trivial (standardize 4 catch blocks)

---

## Solid patterns (worth noting)

### GOOD-1: Stripe webhook signature verification intact
- `app/api/stripe/webhook/route.ts:17` correctly calls `stripe.webhooks.constructEvent()` with the raw body and signature header. This prevents replay/forged webhook attacks. ✅

### GOOD-2: Prisma singleton pattern correct
- `lib/prisma.ts:3-10` uses the global instance pattern for development to avoid creating new clients on every hot-reload. Correctly wrapped in NODE_ENV check. ✅

### GOOD-3: Auth guards correctly added to protected routes
- `/api/recommendations` (line 19), `/api/itinerary` (line 148), `/api/flights` (line 23), `/api/transport` (line 19), `/api/trip-messages` (line 18), `/api/trips` (line 19), `/api/friends` (line 18), `/api/monuments` (line 18), `/api/notifications` (line 18), `/api/presence` (line 18) all check `session?.user` before proceeding. ✅
- **Note:** Last commit correctly added these guards, but left 4 AI routes unprotected (see SECURITY-1).

### GOOD-4: Viewport meta tag now in root layout
- `app/layout.tsx:15-19` uses Next.js `Viewport` API (not deprecated next/head). Resolves UX Scout's critical mobile rendering issue. ✅

### GOOD-5: Geist font properly wired
- `app/layout.tsx:2-3` imports from `geist/font/sans` and `geist/font/mono`
- `app/layout.tsx:27` applies `${GeistSans.variable} ${GeistMono.variable}` to `<html>`
- `app/globals.css:25` uses `var(--font-geist-sans)` as fallback
- Font is now being loaded correctly (not Arial fallback anymore). ✅

### GOOD-6: Streaming responses for AI routes
- `/api/chat`, `/api/itinerary`, `/api/inspiration` all use `ReadableStream` with `TextEncoder` to stream tokens back to client in real-time. Avoids token limit issues and improves perceived performance. ✅

### GOOD-7: Geocode route has sensible caching
- `app/api/geocode/route.ts:5` caches coordinates in a module-level Map, saving API quota on repeated lookups within a serverless instance. ✅ (Note: This is in-memory, so won't persist across cold starts, but reasonable tradeoff.)

### GOOD-8: Anthropic SDK correctly instantiated
- All routes that use Claude correctly instantiate client with `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })` or rely on env auto-detection. No hardcoded keys in code. ✅

---

## Technical context for UX Scout

### Why the globe loading spinner disappears early (responds to UX finding)
The `globeReady` state is set too early (in `onCreated` callback) before the actual data (GeoJSON borders, terrain texture) finish loading. The globe shows a blank canvas with the spinner gone. **Fix:** Tie `globeReady` to actual data readiness (see PERF-2).

### Why the "Initialize" button label is confusing (responds to UX finding)
The button at `app/plan/location/LocationClient.tsx:6415-6431` is labeled "Reset Globe" in the UI but the title says "Reset globe orientation". The code is correct, but UX Scout may have seen an older version. Current label is fine. ✅

### Why monuments shop is hidden on mobile (responds to UX finding)
UX Scout noted the Monument Shop button is hidden for mobile users. Looking at `app/plan/location/LocationClient.tsx:6438-6451`, the button is always rendered, so this may be a CSS issue elsewhere or UX Scout's finding is outdated. Confirm with current production.

### Why no visual feedback during Three.js load
The loading overlay at `:6392–6411` is correctly gated by `!globeReady`. But since `globeReady` fires too early (issue PERF-2), the spinner disappears before the globe is actually ready. Fixing PERF-2 will resolve this.

### Cost hole in itinerary generation (responds to UX finding)
UX Scout noted non-authenticated users can generate unlimited itineraries. Looking at `app/api/itinerary/route.ts:157-163`, the rate limit is only checked if `userId` exists (i.e., only logged-in users are limited). Anonymous users skip the check entirely. This is intentional for onboarding but is indeed a cost hole. Consider capping anon users to 1 free generation before prompting sign-up.

---

## Summary

- **Blockers:** 3 critical (auth on 4 AI routes, file size limit on inspiration, geocode auth)
- **Regressions:** 2 performance issues (Three.js memory leak, globeReady timing)
- **Code quality:** 3 minor (input validation, error handling, prompt injection)
- **Wins:** 8 solid patterns confirmed working

**TypeScript check:** Last tsc run failed due to missing node. Recommend running after these fixes.

