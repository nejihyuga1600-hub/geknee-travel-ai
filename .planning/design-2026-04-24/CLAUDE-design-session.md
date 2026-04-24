# geknee — design project notes

Polish pass on **geknee.com**, a travel-AI app built on a 3D globe (Next.js 16 + React 19 + Three.js, Prisma, Stripe, Mapbox). The GitHub repo is connected: `nejihyuga1600-hub/geknee` (branch `main`). APIs and 3D GLB models live outside the repo.

## What we're solving

The live product feels fragmented: too many pages for a single trip (location → dates → style → summary → book), easy to drop off mid-flow, and the Genie mascot + cosmic gradients read a bit bubbly for a grown-up audience. Goal of this project: **unify the flow onto one surface, polish the motion, and mature the visual voice without losing the cosmic DNA.**

## Main deliverable

**`GeKnee Polish.html`** — a single self-contained design canvas showing three full-flow variants plus panel states. Mobile + desktop artboards for each. Tweaks panel for live color/font swaps. The file bundles every source (see below) inline so it works offline.

### Variants

| ID | Name | Idea |
|---|---|---|
| **A** | Atlas | Globe full-bleed, one bottom sheet grows through all 4 steps. **User's favorite.** |
| **B** | Orbit | Persistent left rail with accordion cards, globe on the right, assistant in corner. |
| **C** | Conversation | Assistant-driven chat, globe ambient backdrop, forms inline as cards. No mascot. |

### Atlas extras (user request)

- Top nav matches the live product: `HOME` pill left; `Collection · Go Pro · Trips & Friends · avatar · menu` right. Mobile collapses to HOME + avatar + menu.
- Floating ✦ Genie corner chat (quiet affordance, not a mascot) with step-aware suggestion chips.
- Three panel-state artboards layered over a dimmed globe, modeled on the real components:
  - **Collection** — `MonumentShop` style: XP bar, rarity rings, locked/unlocked grid
  - **Trips & Friends** — `TripSocialPanel` style: tabs, online/offline roster, saved trip cards
  - **Go Pro** — `UpgradeModal` style: monthly/yearly toggle, benefit comparison, Stripe footer

## File layout

```
GeKnee Polish.html          ← main deliverable (everything inlined)
prototype/
  shared.jsx                ← BRAND tokens + TYPE + Chip/QuietInput/StarBg atoms
  globe.jsx                 ← CSS/SVG globe w/ drag + fly-to + idle spin (NOT Three.js)
  variant-atlas.jsx         ← Variant A (+ top nav + GenieCorner chat)
  variant-orbit.jsx         ← Variant B
  variant-conversation.jsx  ← Variant C
  atlas-panels.jsx          ← Collection / Trips / Upgrade panel states
design-canvas.jsx           ← pan/zoom canvas wrapper (starter component)
app/components/             ← cherry-picked real components imported from the repo
  UpgradeModal.tsx
  TripSocialPanel.tsx
  MonumentShop.tsx
  SettingsPanel.tsx
```

**Build step:** if you edit anything in `prototype/`, re-inline into `GeKnee Polish.html` via `run_script` — the html expects `window.AtlasPlanner`, `window.OrbitPlanner`, `window.ConversationPlanner`, `window.AtlasWithPanel` on the global. The bundler lives in the conversation history (concat between the `/* ==== design-canvas.jsx ==== */` marker and the `// Tweak defaults` marker).

## Design system (used consistently)

- **BRAND** (in `shared.jsx`): `bg #05050f`, `bg2 #0a0a1f`, `accent #a78bfa` (lavender), `accent2 #7dd3fc` (icy blue), `gold #fbbf24` (reserved for rare highlights). Borders are low-contrast cool grays with a lavender `borderHi` for emphasis.
- **TYPE**: Fraunces (display, editorial serif) + Inter Tight (UI). Intentional pivot away from the default Geist to feel less generic/bubbly.
- **Icons**: geometric glyphs (◉ ◷ ✦ ◈ ◬) — **no emoji** in product chrome. The live site uses emoji liberally; we pulled that back.
- **Motion**: `cubic-bezier(0.23, 1, 0.32, 1)` for every in-place morph. No page jumps. All flow transitions happen on one surface.

## Shared improvements across all three variants

- **Unified trip object** in localStorage — quit mid-flow, come back, answers still there.
- **Softer globe** — damped drag, single-cubic fly-to (~1.4s), idle spin yields instantly on user intent, subtle hover pills on landmarks.
- **No routing between steps** — everything morphs in place (sheet grows / rail expands / chat appends).
- **Matured visual voice** — cosmic but editorial: serif display type, restrained accents, geometric glyphs instead of emoji, stars kept subtle.

## Known quirks / things to watch

- **DO NOT accept .env or secret files from the user.** If they upload them, delete immediately and advise rotation. Happened once in this project — handled.
- The repo's `LocationClient.tsx` is 528 KB (Three.js-heavy) — don't try to import it. We built a CSS/SVG globe from scratch that's good enough for mocks.
- Preview sandbox **401s on any non-HTML sibling file**, so the variants must stay inlined — can't `<script src>` separate .jsx/.js files.
- React reuses SVG nodes across artboards; the globe SVG needs `key={`g-${size}`}` + explicit `width`/`height` in style (not just attrs) or it collapses to 2×360 in some artboards. Fix is in `globe.jsx` — keep it.
- Variant files must not destructure hooks into aliases like `useStateC` — just use the global `useState` imported once in `globe.jsx`.

## Open directions

- Wire the Atlas nav pills to actually toggle the Collection / Trips / Upgrade panels (currently they're separate artboards for presentation).
- Map-zoom or city-drill view for Atlas once a destination is picked (live product has this via Mapbox).
- A "summary" artboard showing the finished itinerary in Atlas's sheet-full state.
- Settings panel artboard (imported but not mocked yet).
