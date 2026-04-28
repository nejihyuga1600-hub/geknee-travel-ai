# Handoff · GeKnee Polish

## Overview

A polish pass on **geknee.com** — the travel-AI app built on a 3D globe (Next.js 16 + React 19 + Three.js, Prisma, Stripe, Mapbox). The bundle covers the full trip lifecycle: **discover → plan → itinerary → book → on-trip → vault**, plus three full-flow planning variants (Atlas / Orbit / Conversation), plus a landing page and the social/profile/leaderboard surfaces.

Repo this targets: `nejihyuga1600-hub/geknee` (branch `main`).

## About the design files

The files here are **design references** authored in HTML — high-fidelity prototypes of the intended look and behavior. **Do not ship the HTML.** Recreate each surface in the existing Next.js codebase using the patterns already in `app/components/` and `app/plan/`. The CSS/SVG globe in `prototype/globe.jsx` is a **mock only**; keep using the real Three.js globe in `app/plan/location/LocationClient.tsx`. The 2D maps for Plan / Live trip are mock SVG; **wire them up to Mapbox GL JS** as the live product already does elsewhere.

## Fidelity

**High-fidelity.** Pixel measurements, typography, spacing, and motion easing are intentional — match them. Colors are exact. Copy is suggestive but production-shippable.

## Open `GeKnee Polish.html`

The single bundled file contains every artboard inside a pan/zoom design canvas. Sections are organized A → E plus social atoms. To explore: open in a browser, scroll/pan, click any artboard's expand icon to view fullscreen.

```
A · Atlas              · globe-first, expanding bottom sheet (★ favored direction)
A · Atlas panels       · Collection / Trips & Friends / Go Pro / Summary / City / Settings
B · Orbit              · persistent left rail + globe right
C · Conversation       · assistant-driven chat, no mascot
D · Landing            · passport-zine, gen-z editorial
E · Trip detail pages  · Plan, Itinerary, Booking, File vault, Live trip
Public profile, Leaderboard, Unlock toast, OG share card
```

## Design system

In `prototype/shared.jsx` (`BRAND` + `TYPE` exports):

| Token | Value | Use |
|---|---|---|
| `bg`        | `#05050f` | base background |
| `bg2`       | `#0a0a1f` | cards on bg, panel surfaces |
| `accent`    | `#a78bfa` | primary lavender — CTAs, active state, links |
| `accent2`   | `#7dd3fc` | icy blue — info, weather, secondary |
| `gold`      | `#fbbf24` | rare highlights — monument tier, bookmarks |
| `success`   | `#7cff97` | live-trip "you are here", completed stops |
| `warn`      | `#fb923c` | crowd warnings, food markers |
| `border`    | `rgba(167,139,250,0.18)` | low-contrast cool gray with lavender wash |
| `borderHi`  | `rgba(167,139,250,0.4)` | active card edge |

**Type:** `Fraunces` (display, editorial serif; weights 400/600; italic for emphasis) + `Inter Tight` (UI; 400/500/600/700) + `JetBrains Mono` for the small SHOUTY uppercase labels (9–10px, letter-spacing 0.14em–0.22em). Intentional pivot away from Geist to feel less generic.

**Iconography:** geometric glyphs only — `◉ ◷ ✦ ◈ ◬ ⏚ ⌕ ↗ ↙ ◐`. **No emoji** in product chrome (the live site uses them — pull back).

**Motion:** every in-place morph uses `cubic-bezier(0.23, 1, 0.32, 1)`. Sheet expansion ~280ms. Globe fly-to ~1.4s, single cubic. **No page jumps** between planning steps — the whole point of the polish.

## Routes & artboard → file mapping

| Artboard (in canvas) | Suggested route | Target file in repo |
|---|---|---|
| Atlas planner (★) | `/plan` (replaces `/plan/location`, `/plan/dates`, `/plan/style`) | `app/plan/page.tsx` (new, replaces three sub-pages) |
| Atlas → Collection | `/plan?panel=collection` | overlay component, reuse `app/components/MonumentShop.tsx` |
| Atlas → Trips & Friends | `/plan?panel=trips` | overlay, reuse `app/components/TripSocialPanel.tsx` |
| Atlas → Go Pro | `/plan?panel=upgrade` | overlay, reuse `app/components/UpgradeModal.tsx` |
| Atlas → Settings | `/plan?panel=settings` | overlay, reuse `app/components/SettingsPanel.tsx` |
| **E · Plan map** | `/plan/[tripId]/map` | new — Mapbox GL JS, drop-pin UX |
| **E · Itinerary** | `/plan/summary` | replaces existing `app/plan/summary/page.tsx` |
| **E · Booking** | `/plan/summary` (BookTab) | refactor `app/plan/summary/BookTab.tsx` |
| **E · File vault** | `/vault` or modal | new `app/vault/page.tsx` (extends `FileVault.tsx`) |
| **E · Live trip** | `/trip/[tripId]/live` | **new** — Mapbox + agent-card stack |
| Landing | `/` | replaces current marketing home |
| Public profile | `/u/[handle]` | new |
| Leaderboard | `/leaderboard` | new |

## Key surfaces — implementation notes

### Atlas planner (`/plan`)

Globe full-bleed. **One bottom sheet, four steps inside it** (Where → When → Style → Review). Sheet has three heights: peek (88px), half (45vh), full (90vh). Drag the grab-bar to expand. Every step morphs in place — **never** route between them. Trip object lives in `localStorage` so a mid-flow reload restores state.

Top nav matches the live product: `HOME` pill left; `Collection · Go Pro · Trips & Friends · avatar · menu` right. Mobile collapses to HOME + avatar + menu.

Floating ✦ Genie corner chat (quiet affordance, **not** a mascot). Step-aware suggestion chips inside.

### Plan map (Mapbox 2D drop-pin)

The 2D map for the user to mark places they want to visit before generating the route. Wire the mock SVG to Mapbox GL JS:

- **Style:** dark navy (`#0d1525` land, `#1a1f3a` districts, `#1e3a5f` water). The mock is a faithful color reference.
- **Pins:** color-coded by category (food `#fb923c`, activities `#a78bfa`, hotels `#7dd3fc`, shopping `#fbbf24`, monument `#f5f1e8`). Numbered. Selected pin gets lavender drop-shadow.
- **Right rail (desktop) / bottom sheet (mobile):** saved-pin list grouped by category, with the "Generate itinerary →" CTA at the bottom.
- **Top-center search:** `⌕ Search a place to add to your trip` with `⌘K` hint.
- **Tooltip:** floating card on pin click with name, ~time, price, ★ rating, Add-to-day CTA.

### Itinerary (`/plan/summary`)

Replace the current 121KB single-file page. Structure:

- **Masthead:** mono section label · giant Fraunces title with italic city name · weather strip (4 days max visible).
- **Day cards:** giant italic day number (e.g., `02`), mono date+weather sub-line, list of `ActivityRow`s. Each row has a numbered pin matching the day-map, time mono label, Fraunces activity name, body copy, hover ✦ Genie alternates button. Monument quests get a gold filled pin + `⏚ MONUMENT QUEST` tag.
- **Right column (desktop, sticky):** smaller day-map showing today's route with dashed lavender path between numbered pins.
- **Replan:** small lavender pill button per day card → calls AI replan endpoint.

Carry over from the existing implementation: `parseLines`, `extractPlace`, `fetchPlaceImage` (Wikidata → Wikipedia → Commons fallback chain), `WeatherBar`, `ActivityBlock` hover-to-reveal-details. Keep the editable-line click-to-edit affordance.

### Booking sheet (`/plan/summary` BookTab)

Tab bar: `◬ Stays · ✈ Flights · ◉ Activities · ◐ Transport · ◈ Insurance` (badge counts on tabs with bookings).

**Stay cards:** 3-column grid (1-col mobile). Image area top, tier label top-left (`EDITORS' PICK / LOCAL / BUDGET`), `✓ BOOKED` badge top-right when applicable. Body: district + tag mono label, Fraunces name, ★ rating, feature bullets, price + CTA.

**Flight card:** wide horizontal card showing both legs side-by-side with airport codes in Fraunces 24px, time/duration in body. Total + airline confirmation on the right.

### File vault (`/vault`)

Passport-sticker grid. Each tile is a 3:4 portrait card with:
- a giant low-opacity glyph (`⏚ ✈ ◬ ◷ ◈ ◉`) in the category color
- a rotated 8° **stamp overlay** in the top-right (`CURRENT / TICKET / CONFIRMED / APPROVED / ACTIVE / BOOKED`) — bordered, mono, uppercase
- name in Fraunces, meta in mono uppercase
- bottom row: `↓ Download · ⋮`

Plus a `+ Drop a file` empty tile at the end. Filter chips above: `All · 8 / Passports / Tickets · 4 / Hotels · 1 / Visas · 1 / Vouchers · 2`.

Encrypt at rest. Drag-drop upload.

### Live trip (`/trip/[tripId]/live`) — **new surface**

Top: live Mapbox view zoomed to current city. Below: agent-card stack telling the user **what to do right now**.

- **Top app bar:** pulsing `#7cff97` dot · `LIVE · DAY 2 OF 4 · KYOTO` mono · clock · `◐ Offline maps cached` chip.
- **Map:** "you are here" pulsing green dot, route to next stop drawn solid lavender with animated dashed overlay (CSS `<animate stroke-dashoffset>`), completed stops as small green ✓ rings, future stops as dim numbered pins. Lavender label-pill above the next-stop pin: `NEXT · TEA CEREMONY · 14 MIN`.
- **Floating overlays (desktop):** mini weather card (current temp, "Cloudy, light rain in 3h") and mini transit card (mode toggle: walk vs bus).
- **Hero LEAVE-BY card:** lavender-gradient surface, mono `✦ LEAVE IN 6 MIN · TO MAKE 1:00 PM`, Fraunces 44px headline ("Tea ceremony at Camellia."), context body, big lavender "↗ Navigate" CTA.
- **Three context cards (3-col desktop / stacked mobile):** Next stop (icy blue), Weather alert (gold), Crowds (orange) — each with a 3px left border in its accent color and a small data viz (the crowds card has a 24-bar histogram with the current hour highlighted green).
- **Day timeline strip:** horizontal track of 5 stops, each tagged `DONE / NOW / FUTURE` with colored top-borders (green / lavender / muted) and dot markers.

Data needs: current geolocation, next-stop ETA from Mapbox Directions API, hourly weather forecast (already in repo), Google Places popular-times for crowds, sunset time.

## Components → real-world dependencies

| Mock component | Real implementation |
|---|---|
| `globe.jsx` (CSS/SVG) | Three.js globe in `app/plan/location/LocationClient.tsx` (528KB — keep) |
| `CityMapCanvas`, `LiveMapCanvas` (SVG) | Mapbox GL JS — use the existing `mapbox-gl` dep |
| `WeatherBar`, `MiniWeatherCard` | existing weather endpoint |
| `PlaceImage` chain | already implemented in `app/plan/summary/page.tsx` — reuse `fetchPlaceImage` |
| Stamp overlay (vault) | pure CSS — `transform: rotate(8deg); border: 2px solid <color>` |
| Animated route dashes (live trip) | SVG `<animate stroke-dashoffset>` — works in production |

## Files in this bundle

```
GeKnee Polish.html              — single bundled deliverable, opens offline
design-canvas.jsx               — pan/zoom canvas wrapper (presentation only — strip for prod)
prototype/
  shared.jsx                    — BRAND + TYPE tokens, atoms (Chip, QuietInput, StarBg)
  globe.jsx                     — CSS/SVG globe mock (don't ship — use Three.js)
  variant-atlas.jsx             — A · globe + bottom sheet
  variant-orbit.jsx             — B · left rail planner
  variant-conversation.jsx      — C · chat-driven planner
  atlas-panels.jsx              — Collection, Trips, Upgrade, Summary, City, Settings panels
  marketing.jsx                 — landing, profile, leaderboard, unlock toast, OG card
  trip-detail.jsx               — Plan map, Itinerary, Booking, File vault
  live-trip.jsx                 — Live trip companion screen
```

## Tweaks panel (in the HTML)

Toggle "Tweaks" in the toolbar to live-edit `accent`, `accent2`, font swaps, and a few layout knobs. The values written are in the source HTML between `/*EDITMODE-BEGIN*/` and `/*EDITMODE-END*/` markers — useful for picking final brand values before implementing.

## What's still open

- Wire the Atlas top-nav pills to actually toggle the Collection / Trips / Upgrade panels (currently rendered as separate artboards for presentation).
- Map-zoom / city-drill view inside Atlas once a destination is picked.
- A "summary" artboard showing the finished itinerary in Atlas's sheet-full state.
- Settings panel artboard (imported from repo but not yet mocked).

## Implementation order recommendation

1. **Design tokens** — port `BRAND` + `TYPE` to your global stylesheet / Tailwind config.
2. **Atlas planner** — biggest win: collapses three pages to one and is the user's favored direction.
3. **Itinerary refactor** — biggest LOC delta: replace the 121KB single file with a structured component tree.
4. **Live trip** — new surface, highest novelty value, depends on Mapbox Directions + crowd data.
5. **Plan map, Booking, File vault** — straightforward once tokens + atlas patterns are in place.
6. **Landing + social** — independent, can ship in parallel.
