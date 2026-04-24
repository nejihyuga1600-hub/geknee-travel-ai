# Session report — 2026-04-23

**Branch:** `main` (all work pushed to `origin/main`)
**Tree state:** clean, 0 ahead / 0 behind origin
**Today's commits:** 18 (since the first split this evening)

## What shipped

### Globe refactor (Naval audit Task 7 — was 1/6 → now 6/6)

`LocationClient.tsx`: **7266 → 2657 lines** (−63%). The 7k-line monolith was the
audit's #1 technical liability.

| # | Commit  | Module                           | Lines |
|---|---------|----------------------------------|------:|
| 1 | 1d77d62 | `globe/skins.ts`                 |    81 |
| 2 | 70de129 | `globe/geo.ts`                   |    54 |
| 3 | 41f5b9b | `globe/info.ts`                  |   440 |
| 4 | b780cdb | `globe/locations.ts`             |   509 |
| 5 | 03c2b6f | `globe/landmark.tsx`             |   590 |
| 6 | 378244a | `globe/AllLandmarks.tsx`         |  2298 |

Splits go data-first, math second, components last. The bridge pattern
(`_setCollectedMonuments`, `_setActiveSkins`, `_setPendingUnlock`,
`_hasPendingUnlockFor`) keeps the JSX in `LocationClient.tsx` decoupled from
the module-level state in `globe/landmark.tsx`.

### Auto-shareable unlock card (advisor's "highest-leverage thing this month")

End-to-end viral loop, three phases:

- **Phase A** (`1b52d80`): `<PublicGlobe />` spectator view at `/u/[handle]`. Clash-of-Clans-style "visit my base" — non-owners can pan/zoom to inspect collected monuments, no edit.
- **Phase B** (`1290255`, `ac166eb`): `/api/og/share` enhanced to render monument hero + "visit @handle's globe →" CTA. Hero priority: `?hero=` param → `share/{prefix}_{skin}_hero.png` (Nano Banana per-skin) → `share/{prefix}_hero.png` → Wikipedia thumbnail → typographic fallback. `bin/meshy-promote.mjs` upgraded to persist the Nano Banana source PNG to Blob on each promote, so per-skin heroes flow in automatically as new skins ship.
- **Phase C** (`7553020`): in-app share toast triggered by `_setPendingUnlock` bridge. Web Share API → clipboard fallback. PostHog `share_click {source: 'unlock_toast'}`. Visitor lands via `?from=share&mk=X` → `<CameraFocus />` auto-pans the spectator globe to the shared monument.

### Quest photo on share card (`69346c7`)

Closes the personalisation loop:

- **API** (`/api/monuments/route.ts`): `persistQuestPhoto()` uploads the base64 mission photo to Blob at `quests/{userId}/{missionId}_{ts}.{ext}`. DB row stores the URL; old base64 rows still readable.
- **Bridge**: `PendingUnlock.photoUrl` carries the proof URL. `MonumentShop` fires the bridge with the photo on API success; `Lm` skips if `_hasPendingUnlockFor(mk)` so the richer event wins the race.
- **Toast**: appends `&q=<url>` to share URL.
- **OG card**: renders polaroid inset (top-right, 4° tilt, "proof of presence" caption) when `?q=` is passed.
- **Page meta**: `/u/[handle]` validates `q` as `http(s)://` and forwards into the OG card so shared links unfurl with the polaroid.

Side bug fixed in the same commit: hero image was silently failing because Satori needs every flex-parent child to be a measurable element — React fragments don't count. Wrapped the hero block in a `div` with `display: flex`. **The 3-skin gallery on the marketing landing was probably broken for hero rendering until this fix landed.**

### Marketing landing upgrades

- **Hero globe** (`92c7e2d`): replaced CSS-gradient `<HeroVisual>` with a real `<HeroGlobe>` (Three.js). Decorative-only — pointer-events:none, no controls, gentle 0.5x auto-rotate. Lighter than `<PublicGlobe>` because it doesn't bundle the 2,298-line `AllLandmarks` into the home page first-paint.
- **Positioning kill + share-card gallery** (`57cb5aa`): killed "AI travel planner" leading framing per advisor. Eyebrow now reads "Collection game · Trip planner inside". H1 trimmed to "Collect the world." Feature tile order rebuilt: Collect → Earn → Share → Trip planner inside (was first, now last and reframed). New "Every unlock is a share" section embeds three live `<img>` tags pointing at `/api/og/share` with Eiffel/Gold, Liberty/Aurora, Pyramids/Celestial — production share endpoint, updates as Nano Banana heroes backfill.

### Minimum viable leaderboard (`f7f04a7`)

`/leaderboard` route. Top 50 collectors sorted by distinct rare-tier monuments
(skin in [gold, diamond, aurora, celestial]). Each row links to `/u/{handle}`
so the leaderboard feeds the spectator-globe loop. Server component, 60s
revalidate. In-memory aggregation; flagged as the optimisation target if the
table grows past ~10k rows. Empty state nudges first user to a Gold-tier quest.
Linked from home nav.

### Kill list (cheap dead-code purges)

- **AllAnimals + 11 animal components deleted** (`33734b7`): −878 lines. Defined but never rendered — `AllAnimals` had no callsites, per-animal components only fed into it.
- **`/api/stripe/portal` route deleted** (`bd9b8bc`): −28 lines. Audit found `/api/stripe/checkout` and `/api/stripe/webhook` are actively wired (UpgradeModal, /pricing CheckoutButton, three webhook event handlers) but `/portal` had zero callers and no manage-subscription UI to back it. YAGNI — recreate when the UI lands.

### Observability + scheduled follow-ups (`e04c569` + remote triggers)

- `posthog.init()` now explicitly enables `session_recording` with `maskAllInputs: true` and `maskTextSelector: '[data-private]'`. Recording was previously dependent on dashboard defaults.
- `CLAUDE.md` gets a new **Observability MCPs** section so future sessions reach for Sentry + PostHog before guessing at production bugs. Sentry = source of truth for exceptions; PostHog = behavior/replay context.
- Local Claude Code MCP config: Sentry + PostHog HTTP MCPs registered at `mcp.sentry.dev/mcp` and `mcp.posthog.com/mcp`. OAuth completes on first tool call.
- **April 30 remote agent** (`trig_01SAKVts69yKWufWP9ctSebC`): pulls 7 days of PostHog replays + Sentry issues, writes `.planning/task-11-replay-findings.md` with friction points + Task 12 tutorial overlay proposal, opens PR. Agent has both MCPs attached.
- **July 1 remote agent** (`trig_014Hm6pCTCtAu3tratKa3Rwd`): scores Creator mode / Affiliate integrations / Leaderboards-v2 against rough launch thresholds (WAU ≥ 500, plan_saved ≥ 200/mo, median monuments ≥ 3). GO/WAIT/KILL output to `.planning/july-deferred-revisit.md`. Needs PostHog connector attached on the routine page before firing.

## Net file delta

```
21 files changed, 4903 insertions(+), 4769 deletions(-)
```

Created (8 files):
- `app/plan/location/globe/{skins,geo,info,locations,landmark,AllLandmarks}.{ts,tsx}`
- `app/plan/location/UnlockShareToast.tsx`
- `app/u/[handle]/{PublicGlobe,PublicGlobeClient}.tsx`
- `app/components/{HeroGlobe,HeroGlobeClient}.tsx`
- `app/leaderboard/page.tsx`

Modified (significant):
- `app/plan/location/LocationClient.tsx` (7266 → 2657)
- `app/page.tsx` (positioning rewrite + globe + skin gallery + leaderboard nav)
- `app/u/[handle]/page.tsx` (globe-first, unlock-card meta, focusMk plumb)
- `app/api/og/share/route.tsx` (per-skin hero, polaroid, fragment fix)
- `app/api/monuments/route.ts` (Blob upload for quest photos)
- `app/components/MonumentShop.tsx` (fire pending-unlock bridge with photo)
- `bin/meshy-promote.mjs` (per-skin hero PNG persistence)
- `lib/analytics.ts` (session recording config)
- `CLAUDE.md` (observability MCPs section)

Deleted (1 file, ~906 lines):
- `app/api/stripe/portal/route.ts`
- All animal components from `LocationClient.tsx`

## Naval audit status

| Task | State |
|---|---|
| 6a Meshy preview pipeline | ✅ pre-session |
| 6b Meshy promote + influencer brief | ✅ pre-session |
| **7 Split LocationClient** | ✅ 6/6 today |
| 10 Stripe skin packs | ⏸ scope agreed (cosmetic-only, gated on `isCollected`); pricing decision outstanding |
| **11 Session Replay review** | ✅ scheduled for April 30 |
| 12 Tutorial overlay | ⏸ blocked on Task 11 findings |
| Auto-shareable unlock card | ✅ Phase A + B + C + per-skin pipeline + quest photo |
| Replace `/plan/location` with marketing landing | ✅ pre-session (`/` already serves marketing); hero globe + positioning shipped today |
| Public collection profiles | ✅ pre-session; made globe-first today |
| **Leaderboards** | ✅ minimum viable shipped today |
| Affiliate integrations | ⏳ defer until July check-in shows audience exists |
| Creator mode | ⏳ defer until July check-in |
| Kill: AllAnimals | ✅ today |
| Kill: unused Stripe | ✅ today (portal only; rest is wired) |
| Kill: AI-planner positioning | ✅ today |

## Decisions logged this session

1. **Skin-pack monetisation = cosmetic-only**, gated on `isCollected`. No way to buy base monument collection. Stripe checkout will refuse if user doesn't already own the monument.
2. **Marketing page lives at `geknee.com/`** (same Next.js app, same domain) — not a separate marketing site. Reasons: SEO compounds on one domain, share cards already deep-link `geknee.com/u/handle`, code-splitting is per-route.
3. **Repo visibility**: recommended go private. Idea isn't the moat, but giving competitors a free 6-month head start on the engineering substrate is unforced error. claude.ai/design + Vercel both work fine with private repos via OAuth.
4. **Quest photos move from inline base64 → Blob URLs** at write time (forward-only; old rows untouched). Smaller DB rows, share URLs stay under Twitter's 4KB cap.
5. **YAGNI on leaderboard seasonal/decay** — ship the simple board, see if it changes return-visit frequency in PostHog before building the rest.

## Open questions before next session

1. **Stripe skin pack pricing** — per-skin ($3–5 each) vs bundle ($X for all 6 paid Eiffel skins)?
2. **Repo visibility flip** — private or public? Two clicks in Settings → Danger Zone.
3. **Quest photo retention** — Blob now accumulates `quests/{userId}/...` files. Long-term need a moderation queue + retention policy. Calendar this for whenever active users > 100.

## Where the next session should look first

- `.planning/task-11-replay-findings.md` after April 30 fires — top friction points + Task 12 tutorial overlay proposal.
- `.planning/july-deferred-revisit.md` after July 1 fires — GO/WAIT/KILL on creator mode, affiliates, leaderboards-v2 with actual PostHog metrics.
- PostHog `share_click` event funnel — does the unlock card actually drive shares? If yes, prioritise the next viral loop iteration. If no, the funnel between unlock and share needs UX work (or the share copy needs help).
