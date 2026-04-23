# Site Improvement Plan

> **Status:** DRAFT — Review date: 2026-04-15
>
> Both agents contribute to this file. When ready, review the priorities below
> and tell the main Claude session: **"implement the approved plan"** to execute.
> You can also edit this file directly to approve/reject individual items.

---

## How to approve
- Add `[APPROVED]` next to any item to greenlight it
- Add `[SKIP]` to items you don't want implemented
- Or just say "implement the approved plan" in the main Claude terminal

---

_Agents are running their review — findings will appear below._

---

## History

### Implemented 2026-04-15 (commit acc1095)
- P1-A: npm audit fix — 0 vulnerabilities
- P1-B: Auth guards added to all 8 unauthenticated AI API routes
- P1-C: Viewport meta tag fixed via Next.js Viewport API in root layout; next/head removed from location page
- P2-A: console.log removed from flight-prices API
- P2-B: inspiration route upgraded to claude-sonnet-4-6
- P3-C: globeReady state variable added for loading indicator
- P3-D: Geist font wired up in root layout + globals.css

---

## UX Priorities (from UX Scout review — 2026-04-15)

### P1: Critical Accessibility Issues
- **U1-A: Add focus indicators to all form inputs and buttons** | Complexity: small | Confidence: high | Impact: Unblocks keyboard navigation for accessibility-dependent users, required for WCAG AA. Add `:focus-visible` with box-shadow ring or border color change to inputs (AuthModal, GlobalChat destination input, settings panel). Add outline-2 or box-shadow to buttons. Files: AuthModal.tsx, GlobalChat.tsx, SettingsPanel.tsx. Estimated: 1–2 hours.

- **U1-B: Increase toggle switch height from 22px to 44px** | Complexity: trivial | Confidence: high | Impact: Meets mobile touch target minimum (44px × 44px). File: SettingsPanel.tsx line ~161. Change `height: 22` to `height: 44`, adjust internal span positioning proportionally. Estimated: 15 mins.

### P2: UX Friction Fixes (high impact, moderate effort)
- **U2-A: Add success feedback to auth flow** | Complexity: small | Confidence: high | Impact: Users know when registration succeeds before modal closes. Show "Account created! Signing in…" or add a brief checkmark state to AuthModal before onClose(). File: AuthModal.tsx. Estimated: 45 mins.

- **U2-B: Improve geocoding error messages** | Complexity: small | Confidence: high | Impact: Users understand why city lookup failed. Enhance error at GlobalChat.tsx ~133. If Nominatim returns no results, check if adding country name helps, or suggest "Try with country (e.g., 'Paris, France')". Estimated: 1 hour.

- **U2-C: Add visual hint for modal backdrop click** | Complexity: trivial | Confidence: medium | Impact: Reduces accidental closes. Add small "(Press ESC to close)" or similar label to AuthModal, UpgradeModal headers. OR require explicit button-only close. Estimated: 30 mins (label), 1 hour if rebuilding close-only behavior.

### P3: Polish & Consistency (lower priority but nice-to-have)
- **U3-A: Rebrand "Reset Globe" button** | Complexity: trivial | Confidence: medium | Impact: More user-friendly label. File: LocationClient.tsx ~6430. Change text to "Home" or "Back to Start", or use icon-only (house icon). Estimated: 15 mins.

- **U3-B: Move animation keyframes to globals.css** | Complexity: small | Confidence: high | Impact: Removes inline `<style>` anti-pattern, centralizes animations. Files: GlobalChat.tsx (spin animation), LocationClient.tsx (spin animation). Consolidate to globals.css. Estimated: 30 mins.

- **U3-C: Improve select field contrast and responsive sizing** | Complexity: small | Confidence: high | Impact: Better readability on mobile. File: SettingsPanel.tsx, language/timezone selects (lines 174–191). Darken background from rgba(255,255,255,0.08) to rgba(255,255,255,0.14), set width: 100% on mobile. Estimated: 30 mins.

- **U3-D: Add "Examples" hint to empty chat state** | Complexity: small | Confidence: medium | Impact: First-time users discover capabilities faster. File: GlobalChat.tsx lines 414–421. Replace static placeholder with expandable "Try asking:" section showing 2–3 examples. Estimated: 1 hour.

### Implementation order (relative to Dev Scout items):

**Phase 1 (Now):** P1-A, P1-B, P2-A (critical path to WCAG AA + reassurance)
**Phase 2 (Next):** P2-B, P2-C, P3-A (friction reduction + rebranding)
**Phase 3 (Nice):** P3-B, P3-C, P3-D (polish & consistency)

**Dependency notes:**
- P1-A depends on Tailwind v4 utilities or custom CSS; confirm `@apply` or `:focus-visible` pseudo-class works in current setup.
- U2-C and modals: Consider if closing on backdrop is desired behavior first.
- U3-B requires checking if animations are used elsewhere (LocationClient.tsx also has spin animation).

**Combined effort estimate:** 6–8 hours total (all UX items).
**High-confidence quick wins:** P1-A, P1-B, P2-A = ~3 hours.

---

## Dev Scout Technical Audit — 2026-04-15

### Critical Security Fixes (P1)

**P1-E: Add auth guards to 4 unauthenticated AI routes**
- Files: `app/api/chat/route.ts:18`, `app/api/inspiration/route.ts:5`, `app/api/flight-prices/route.ts:217`, `app/api/place-images/route.ts:?`
- Fix: Add `const session = await auth(); if (!session?.user) return new Response("Unauthorized", { status: 401 });` at the start of POST handler
- Complexity: Trivial
- Why: Prevents cost abuse (unlimited Claude, vision, SerpAPI, image lookups)
- Approx time: 10 min

**P1-F: Add file size validation to `/api/inspiration`**
- File: `app/api/inspiration/route.ts:6-17`
- Fix: Validate `image.size <= 5MB` and `image.type in [jpeg, png, gif, webp]` before `Buffer.from(bytes)`
- Complexity: Trivial
- Why: Prevents OOM DoS attacks
- Approx time: 5 min

**P1-G: Add auth guard to `/api/geocode`**
- File: `app/api/geocode/route.ts:7`
- Fix: Add auth check + consider server-side rate limiting (10 req/min per user)
- Complexity: Small (auth trivial, rate limiting small)
- Why: Prevents quota drain and address harvesting
- Approx time: 20 min

### Performance Fixes (P2)

**P2-D: Fix Three.js resource disposal in LocationClient**
- File: `app/plan/location/LocationClient.tsx:6034-6108`
- Fix: Track `texture` and `bumpMap` in refs, dispose on cleanup in useEffect return
- Complexity: Small
- Why: Prevents GPU memory leak on repeated globe visits (~20–100 MB per visit on mobile)
- Approx time: 15 min

**P2-E: Move `setGlobeReady(true)` to data-ready useEffect**
- File: `app/plan/location/LocationClient.tsx:6373` and new useEffect after :6108
- Fix: Create new useEffect that sets ready only when `countries && states && (terrainBitmap || texture)` are all non-null
- Complexity: Small
- Why: Loading spinner disappears before globe actually renders; causes UX confusion
- Approx time: 10 min

**P2-F: Add logging to Stripe webhook for missing userId**
- File: `app/api/stripe/webhook/route.ts:30, 41, 55`
- Fix: Log warning if userId missing; return 400 instead of 200
- Complexity: Trivial
- Why: Silent failures could cause plan updates to be missed
- Approx time: 5 min

### Code Quality (P3)

**P3-E: Add input sanitization to `/api/chat`**
- File: `app/api/chat/route.ts:26-46`
- Fix: Sanitize `tripInfo` fields (strip newlines, limit to 100 chars each)
- Complexity: Trivial
- Why: Bad practice to inject user input into prompts without escaping
- Approx time: 5 min

**P3-F: Add input validation to `/api/itinerary`**
- File: `app/api/itinerary/route.ts:166-175`
- Fix: Check `nights in [1, 365]`, `location.length <= 200`, `interests.length <= 1000`
- Complexity: Small
- Why: Prevents token limit overflows, JSON errors
- Approx time: 10 min

**P3-G: Standardize error handling across AI routes**
- Files: `app/api/chat/route.ts:82-86`, `app/api/recommendations/route.ts:99-101`, `app/api/itinerary/route.ts:203-209`, `app/api/flight-prices/route.ts:248-251`
- Fix: Extract error message and return consistent JSON response
- Complexity: Trivial
- Why: Improves debugging consistency
- Approx time: 10 min

### Previously Unimplemented Items (carry forward)

**P4-A: GOOGLE_MAPS_API_KEY exposure (from old plan)**
- Partial progress: Now identified that `/api/geocode` is the leak point (was flagged as P4-A in old plan)
- Status: Now upgraded to P1-G above
- Still needed: Implement server-side key restrictions in Google Cloud Console (IP-whitelist + geocoding-only)

**P2-C: pgbouncer connection pooling (from old plan)**
- Status: NOT IMPLEMENTED — Prisma still using direct DATABASE_URL without pgbouncer
- Action: Add pgbouncer intermediate if scaling issues arise; not critical for current load
- Note: Monitor Vercel PostgreSQL connection limits during growth

---

## Implementation Order

1. **P1-E, P1-F, P1-G** (security blockers) — ~35 min total
2. **P2-D, P2-E** (perf + UX) — ~25 min total
3. **P2-F** (logging) — ~5 min
4. **P3-E, P3-F, P3-G** (quality) — ~25 min total

**Total critical + perf: ~55 min**
**Total with code quality: ~80 min**

### Dependencies

- P1-E, P1-F, P1-G have no dependencies (independent)
- P2-D and P2-E both depend on edits to `LocationClient.tsx` but don't interact
- P2-F is independent
- P3-E, P3-F, P3-G are independent

### Notes

- After implementing all fixes, re-run `npx tsc --noEmit` to confirm TypeScript is clean
- Run `npm audit` after changes to ensure no new vulnerabilities
- Consider adding request size limits as a general middleware (Next.js `bodyParser` config) to prevent future uploads/payloads from causing OOM

