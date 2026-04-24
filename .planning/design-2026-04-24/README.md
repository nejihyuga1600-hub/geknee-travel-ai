# Design session — 2026-04-24

Exported from a claude.ai/design session. Preserving artifacts alongside
`main` so this terminal (and future agents) can reach them regardless of
whether the design tool's session state persists.

## What's here

| Path | What it is |
|---|---|
| `GeKnee-Polish.html` | **The design canvas.** 275KB self-contained static HTML showing three full-flow variants (Atlas / Orbit / Conversation), mobile + desktop artboards for each, live tweaks panel. Open in a browser to review the visual target. |
| `design-canvas.jsx` | The master React document that generated the canvas. Reference, not production code. |
| `CLAUDE-design-session.md` | The CLAUDE.md from the design session. Describes the session brief and the three variants — NOT a replacement for the repo's `/CLAUDE.md`. |
| `prototype/` | 7 JSX ideation sketches for each variant + shared building blocks. Not app code. Mine for structure and copy, don't drop in. |
| `components-stale/` | Four component files the design session exported (`MonumentShop`, `SettingsPanel`, `TripSocialPanel`, `UpgradeModal`). **DO NOT drop into `app/components/` —** they were generated from code that predates today's quest-photo + PostHog wiring and would regress it. See "Variant component comparison" below. |
| `uploads/` | Files originally uploaded into the design session as context (screenshots, route stubs). Not design output. Ignore unless you need to see what context the design had. |

## Three variants

| ID | Name | Idea | Status |
|---|---|---|---|
| **A** | **Atlas** | Globe full-bleed, one bottom sheet grows through all 4 steps (`location → dates → style → summary`). | **User's favorite. This is the direction.** |
| B | Orbit | Persistent left rail with accordion cards, globe on the right, assistant in corner. | Not chosen |
| C | Conversation | Assistant-driven chat, globe ambient backdrop, forms inline as cards. No mascot. | Not chosen |

## Variant component comparison (design vs live `main` as of 2026-04-24)

| File | Delta vs `main` | Verdict |
|---|---|---|
| `MonumentShop.tsx` | −99 lines, missing today's `_setPendingUnlock` bridge, `track()` PostHog calls, quest-photo wiring | **Stale — do not replace.** Mine for visual tweaks only. |
| `SettingsPanel.tsx` | Identical | No-op |
| `TripSocialPanel.tsx` | 3 lines total difference | Diff manually when polish-mining |
| `UpgradeModal.tsx` | Identical | No-op |

## Implementation approach

The Atlas variant is a flow restructure (4 routes → 1 growing bottom sheet),
not a drop-in component swap. It should land as a new route (`/plan/atlas`)
alongside the existing `/plan/location` flow, not in place of it. That lets
us A/B behind a feature flag and roll back without touching the shipping
surface.

Other polish (design tokens, marketing copy, motion specs) is
variant-agnostic and can ship to `main` immediately.

See the commit log on `main` for the Phase Atlas commits — each prefixed
`atlas:` — for the actual rollout sequence.
