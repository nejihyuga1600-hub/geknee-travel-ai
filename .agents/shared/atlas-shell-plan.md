# Atlas Shell Restructure — Handoff

**Created:** 2026-04-24 by previous session (Opus 4.7)
**Status:** Plan only — no code written. Pick this up cold next session.
**Target file:** `app/plan/location/LocationClient.tsx` (2691 lines, the planner page)
**Goal:** Replace the current floating-button + modal-panel chrome with the Atlas shell — a unified top-nav pill cluster and a single growing bottom sheet (peek → open → full) that wraps the globe.

---

## 1. What's there now (don't guess — these are real line refs)

`LocationPage` (default export, line ~2289) renders, top-to-bottom:

| Region | Lines | What it is |
|---|---|---|
| Background gradient | 2387–2391 | Fixed radial-gradient div, zIndex 0 |
| Globe Canvas | 2392–2434 | Full-viewport `<Canvas>`, zIndex 1, has the new `glKey` remount fix |
| Globe loading overlay | 2444–~2459 | Shown until `globeReady` |
| Hero overlay | 2462–2495 | "Where are you **wandering**?" + tagline. Shows only when `globeReady && !location`. zIndex 15. |
| Top-center home button | 2496–2515 | Single button, zIndex 20, resets globe orientation |
| Top-right cluster | 2517–2639 | Logged in: `Collection · Pro · Trips & Friends · Avatar · Hamburger`. Logged out: `Sign in · Hamburger`. zIndex 20. |
| Modals (off-screen by default) | 2640–end | `AuthModal`, `TripSocialPanel` (380px right-side drawer), `MonumentShop`, `CityMapView`, `UpgradeModal`, `SettingsPanel`, `LanguageBanner` |

**State on LocationPage** (around line 2289):
```
location, authOpen, panelOpen, settingsOpen, upgradeOpen, shopOpen,
cityMap, collectedMonuments, notifUnread, globeReady, glKey
```

**Key external panels** to know:
- `TripSocialPanel` — `app/components/TripSocialPanel.tsx`, fixed right-side drawer (380px), opens via `panelOpen`. This is the closest thing to the existing "step UI" — it's where the trip-build flow lives. **Confirm with user whether this gets ported into the bottom sheet or stays as a separate destination.**
- `CityMapView` — opens when a landmark is clicked (`cityMap` state). Currently a fullscreen Mapbox overlay. Likely belongs **inside** the bottom sheet's "full" state, not as a separate modal.

---

## 2. The Atlas shell target

### 2a. Top nav (replaces the entire top-right cluster)

A single horizontally-scrollable pill row, centered or right-aligned. Each pill is icon + short label. Pills:
1. **Collection** (only when signed in)
2. **Pro** (gradient pill, always visible)
3. **Trips** (with notification badge)
4. **Avatar / Sign in**
5. **Menu** (hamburger → SettingsPanel)

The home/reset button currently top-center can either (a) move into the menu, or (b) become a tiny floating reset arrow bottom-left of the globe. Ask user which.

Pill spec:
- Background: `rgba(6,8,22,0.75)` + `backdrop-filter: blur(12px)` (matches current)
- Border: `1px solid rgba(167,139,250,0.35)`
- Radius: `999px` (full pill, not the current `10px`)
- Height: `36px` desktop, `32px` mobile
- Gap: `6px` between pills
- Container: `position: fixed; top: 14px; right: 14px; zIndex: 20; display: flex; gap: 6px;`

### 2b. Bottom sheet (the new persistent surface)

A single bottom-anchored panel with three height states. State machine driven by drag + tap.

| State | Height | Trigger | Content |
|---|---|---|---|
| **peek** | `100px` | Default | Search input + "Where to?" prompt; pill chips for top destinations |
| **open** | `45vh` (max `420px`) | Tap peek, drag up | Trip-building step UI (destination, dates, travelers) |
| **full** | `92svh` | Drag up from open, or "View map/details" tap | Embedded `CityMapView` + monument details + checkout |

Spec:
- Container: `position: fixed; left: 0; right: 0; bottom: 0; zIndex: 25;`
- Background: `rgba(6,8,22,0.97)` + `backdrop-filter: blur(24px)`
- Top edge: `12px` rounded, `1px` top border `rgba(167,139,250,0.2)`
- Drag handle: 4px tall, 36px wide, `rgba(167,139,250,0.4)`, centered, 8px from top
- Transition: `transform` (translateY), `300ms ease-out`. **Do not animate height** — animate `transform` and use a fixed inner content height per state, or you'll fight the keyboard on mobile.
- Drag: pointer events on the handle area (top 40px of sheet); use `touch-action: none` and a snap-to-nearest-state on release.
- Backdrop: when `full`, render a `rgba(0,0,0,0.4)` backdrop behind the sheet covering the globe. **Do not** kill globe rendering — let it keep spinning.

### 2c. What wraps the globe

Nothing changes for the globe. The Canvas stays as-is. The shell sits on top with these zIndex tiers:

```
0    background gradient
1    Canvas (globe)
15   hero overlay (kept, fades out when sheet ≠ peek OR location set)
20   top-nav pills
25   bottom sheet
30   bottom sheet's full-state backdrop
40   modals that survive (AuthModal, UpgradeModal — these stay as modals)
```

---

## 3. Migration order (concrete, in this sequence)

**Don't try to do this in one commit.** Each step below is its own commit so you can `git revert` cleanly if something breaks.

1. **Skeleton (no behavior changes).** Add the new top-nav pill container and the empty bottom sheet (peek state only) behind a `?atlas=1` query-param flag. Existing chrome unchanged. Verify both layouts render and pass `bin/audit-pages.sh`.
2. **Top-nav pills wired.** Migrate the existing button handlers (`setShopOpen`, `setUpgradeOpen`, `setPanelOpen`, `setAuthOpen`, `setSettingsOpen`) into the new pills. Existing top-right cluster still renders behind the flag — easy A/B.
3. **Bottom sheet drag mechanic.** Implement peek ↔ open ↔ full transitions with pointer drag + snap. Empty content per state; just verify the motion feels right. Test on mobile (touch + viewport keyboard interaction).
4. **Port "Where to?" search into peek.** Move the location input + autocomplete logic out of wherever it lives now into the peek state.
5. **Port trip-build flow into open.** This is the bulk of the work. Decide with user: does `TripSocialPanel` move in, or does only the new-trip step UI move in and TripSocialPanel stays as a separate "Trips" destination?
6. **Port CityMapView into full.** Currently rendered as `{cityMap && <CityMapView .../>}` at line ~2649. Move into the full state of the sheet.
7. **Delete the old chrome.** Once parity confirmed, remove the old top-center home button, the old top-right cluster, and the `?atlas=1` flag.

After each step: `npm run typecheck` and `bash bin/audit-pages.sh /plan/location` (the audit script is the safety net — it caught the EffectComposer crash in this session).

---

## 4. Gotchas (these bit me in this session)

- **WebGL context loss.** Just fixed in this session: `glKey` state bumps on `webglcontextlost`, forcing Canvas remount. Don't remove this. If you wrap the Canvas in a new container or change its mount conditions, verify the remount path still fires (block tab, switch back, look for blank globe).
- **EffectComposer / postprocessing.** Removed in commit `1529112`. Code comment at line ~2422 explains why and how to re-enable. **Do not re-add Bloom/EffectComposer as part of this restructure** — separate concern, different failure mode.
- **`touch-action: none`.** The Canvas has it (line 2397), and `<main>` has it (line 2385). The new bottom sheet **needs** `touch-action: none` on the drag handle but `touch-action: pan-y` (or default) on scrollable inner content, or scrolling inside the sheet won't work on iOS.
- **`100svh` not `100vh`.** Use `100svh` everywhere for height (Safari URL bar). Current Canvas uses `100svh` — match it.
- **Hydration mismatch on summary page.** Fixed in commit `a9ea6eb`. If you import `weatherUnit` detection or `Date.toLocaleString` into the new sheet, gate behind `useEffect`, never `useState` initializer.
- **2691 lines in one file.** This restructure is the right time to split. After step 7, extract `app/plan/location/shell/` with `TopNav.tsx`, `BottomSheet.tsx`, and `useSheetState.ts`. Don't try to split before — moving code while refactoring it is how regressions slip in.

---

## 5. Open questions for the user before starting

1. **Home/reset button** — collapse into menu, or float bottom-left? (Currently top-center.)
2. **TripSocialPanel** — port into bottom sheet's `open` state, or keep as a separate right-drawer destination accessed from the "Trips" pill?
3. **Hero "Where are you wandering?"** — keep visible only when sheet is peek, or fade out as soon as sheet is open?
4. **Mobile pill labels** — currently icon-only on mobile. Keep that, or always show short label?

---

## 6. Picking this up

```bash
# Confirm globe still loads:
bash bin/audit-pages.sh /plan/location

# Start the work:
git checkout -b atlas-shell
# Then: read this doc, ask the 4 questions above, start with step 1.
```

The skeleton-flag approach (`?atlas=1`) means you can ship every step to main without breaking the live planner. Use it.
