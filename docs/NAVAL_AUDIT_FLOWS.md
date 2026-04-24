# Naval Audit — Flow Plans

The working notebook for every strategic + operational decision made during the
April 2026 Naval-style audit, plus how each one gets executed.
Living doc: update as flows evolve. Prune as things stop being true.

---

## 1. The Product Thesis

> **geknee is a travel planner where the planning is a collection game.**
> Pokemon Go × Airbnb × Duolingo — narrow, owned, defensible.

Don't water it down by competing with Kayak on flights or Booking on hotels.
The moat is the stylized globe + collection mechanic + creator/skin economy.

**Three jobs the product does (one surface each):**

| Job | Surface | Why |
|-----|---------|-----|
| Hero / wow / brand | Three.js globe | Identity + gameplay live here |
| Monument collection, skins, unlock animations | Three.js globe | Arbitrary 3D objects with arbitrary behavior |
| Country / continent overview | Three.js globe | Stylized reads better at low zoom |
| Street / neighbourhood detail | Mapbox | Tile streaming wins this fight |
| Booking / planning context | Mapbox | Matches user mental model |

**The risk to watch:** handoff friction between surfaces. Invest in transition
animation before investing in more features on either side.

---

## 2. Week 1 — The Foundation (✅ COMPLETE)

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Shareable unlock card (OG image + /share/[slug]) | ✅ | `025a76b` |
| 2 | PostHog + 5 events + funnel | ✅ | `17521fd` |
| 3 | Sentry + alerts (new error + error spike in prod) | ✅ | `91e4097` |
| 4 | Landing page at `/` | ✅ | `c71f487` |
| 5 | Pricing page + live Stripe prices | ✅ | `3791d68` |

**The 5 canonical events** — keep them narrow, resist adding more:

```
signup          — AuthModal credentials signup
first_unlock    — user's first monument (collected.length === 0)
plan_saved      — POST /api/trips returns a trip
upgrade_click   — Go Pro button, AI-limit modal, pricing page CTA
share_click     — Twitter / Copy / Preview buttons in MonumentShop
```

**The two Sentry alerts** — keep these two only, add more only if traffic justifies:

- `New error in prod` — "A new issue is created"
- `Error spike in prod` — "Number of events in an issue is > 20 in 1 minute"

---

## 3. Network Effect Foundation (✅ MOSTLY COMPLETE)

| # | Task | Status | Commit |
|---|------|--------|--------|
| 8 | Public collection profile `/u/[handle]` | ✅ | `682bd93` |
| 9 | Auto-generated usernames on signup + backfill | ✅ | `52e939f` |

**`/u/[handle]` lookup order:** `username` first, `id` second. Pretty URL if the
user has a handle, direct CUID works always.

**Username generation:** slugify `name` → `email prefix`, dedupe by trying
`nghia` → `nghia2`…`nghia9` → `nghia<1234>`. Backfill happens once in the JWT
callback on next sign-in (not in the session callback — would run every
resolve).

---

## 4. The Meshy Preview-Before-Live Pipeline (PART 1 ✅, PART 2 PENDING)

**Problem:** You're the content bottleneck. Manually generating + uploading
GLBs for 19 monuments × 8 rarity tiers = 152 assets. Shipping the first
wrong skin to prod costs nothing to fix but kills trust if anyone sees it.

**Solution:** Two-stage pipeline. Nothing promotes without your eyeball check.

### Part 1 — Generation (✅ commit `60b795e`)

```bash
node bin/meshy-new-skin.mjs --mk <monument> --style <skin> [--prompt "..."]
```

- Runs Meshy API (preview → refine), downloads GLB
- Uploads to blob under `models/preview/<prefix>_<style>.glb`
- Writes state to `/tmp/meshy-preview/<prefix>_<style>.json`
- Prints the dev-gated preview URL on prod (and localhost)
- **Never touches `AVAILABLE_SKINS`. Never visible to regular users.**

Preview route at `/dev/preview/skin?url=...&mk=X&style=Y`:
- `isDevAccount` gate (404 for anyone else)
- r3f orbit-controlled turntable
- Toggleable auto-rotate + checker backdrop
- Side panel shows blob URL + promote command

### Part 2 — Promotion (PENDING)

```bash
node bin/meshy-promote.mjs --mk <monument> --style <skin>
```

Will:
1. Copy `models/preview/<prefix>_<style>.glb` → `models/<prefix>_<style>.glb`
2. Codemod `AVAILABLE_SKINS` in `LocationClient.tsx` to include the new style
3. Generate the launch OG card (reuses `/api/og/share` pattern)
4. Generate the **influencer brief** at `/tmp/launch/<mk>-<style>/brief.md`:
   - Monument name + city + coords
   - Mission description (what user has to do to unlock)
   - Skin name + rarity tier
   - Share URL + share card
   - Pre-drafted caption copy via Gemini for X / IG / TikTok / LinkedIn
5. Delete the `preview/` blob
6. `git commit` the `AVAILABLE_SKINS` change

### Generation mode — first skin vs. later skins

- **First skin of a monument:** `--mode image` with `--image <ref-url>` → Meshy
  image-to-3D. Higher fidelity, anchors the shape to a real reference.
- **Every subsequent skin of the same monument:** `--mode retexture` with
  `--base-url <existing-glb-url>` → Meshy retexture. Geometry stays identical
  across rarity tiers; only the material/color changes. Consistent silhouette
  means "same tower, better version" instead of "random new sculpture."
- **Fallback:** `--mode text` (current default) if no image and no base GLB.

Heuristic: if `models/<prefix>_stone.glb` already exists on blob, default to
retexture. Else require `--image`.

---

## 5. Skin Cadence

**When to ask for new skins — the rules, not the calendar.**

### Phase 1 — pre-launch (you are here, April 2026)

Don't add more skins yet. Ship the 4-per-monument baseline across top 8–10
monuments (Eiffel, Colosseum, Statue of Liberty, Taj Mahal, Big Ben, Golden
Gate, Sydney Opera, Machu Picchu). The constraint is distribution, not content.

**Trigger to ask:** click into a monument shop, if the grid is empty, it
needs at least 4 tiers (default + stone + bronze + silver).

### Phase 2 — post-launch, < 500 users

One new skin per 2 weeks. Treat each drop as a marketing event — the
influencer brief is content for growth, not just asset handoff.

**Trigger to ask:**
- PostHog shows users stuck at Gold with no rarer tier
- Calendar or news moment aligns (Bastille Day → Eiffel, Olympics → host city)

### Phase 3 — 500–5 000 users

Seasonal drops every 4–6 weeks. Each season has a theme ("Diamond Winter",
"Aurora Spring"). One new rare tier per trafficked monument per season.
Limited-edition skins expire → FOMO drives return visits.

### Phase 4 — 5 000+ users

Stop generating. Creator collabs: a travel influencer does Paris → drops
their themed Eiffel skin → their audience becomes yours. Network effect engaged.

---

## 6. Launch Post Strategy

> **The launch video is the travel influencer's real quest. Not AI-generated.**

### What the content is

- Travel creator actually does the trip, documents the mission (geolocation
  challenge + photo challenge that unlocks the skin in-app)
- Short vertical video (TikTok / Reel / Short) — real Paris, real user,
  real unlock, real skin on the globe at the end
- Static share card (existing `/api/og/share`) carries metadata on X / LinkedIn

### What we DO NOT do

- ❌ Higgsfield AI video of the GLB — reinterprets, won't match real skin
- ❌ Turntable render of the GLB — too synthetic, no narrative
- ❌ Gemini/Nano Banana image-only launch — misses video-first platforms

### What the promote script outputs

- `brief.md` — plaintext brief for the creator (mission + city + skin + share URL)
- `share-card.png` — the static OG card for X / LinkedIn / Discord previews
- `caption-{x,ig,tiktok,linkedin}.txt` — draft copy via Gemini, customisable

### What the creator delivers back

- `.mp4` portrait video of the quest
- Completion photo (their unlock proof)

→ we upload their video to the blob, link it from the `/u/<creator>` profile,
and embed it as the featured launch asset on the skin's "Meet this skin" page
(future, not in initial scope).

---

## 7. Week 2 — Planned

| # | Task | Est. | Why |
|---|------|------|-----|
| 6b | Meshy promote script + influencer brief | 3h | Complete the pipeline |
| 7 | Split `LocationClient.tsx` (7k lines) | 3h | Unblocks every future change |
| 10 | Skin packs as one-time Stripe products | 3h | Revenue beyond subscription |
| 11 | Session Replay review (1 week of Posthog data) | 1h | See where new users drop |
| 12 | Tutorial overlay (after #11 informs it) | 4h | Onboard at the real friction points |

---

## 8. Observability Setup — Reference

| Tool | Purpose | Env var | Key user |
|------|---------|---------|----------|
| PostHog | User events + session replay | `NEXT_PUBLIC_POSTHOG_KEY` | Product analytics |
| Sentry | Runtime exceptions + alerts | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Ops |
| Vercel Analytics | Core Web Vitals + traffic | (auto) | Perf |
| Vercel Blob | GLB storage | `BLOB_READ_WRITE_TOKEN` | Assets |
| Stripe | Billing | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PRICE_*` | Revenue |
| Mapbox | Satellite city view | `NEXT_PUBLIC_MAPBOX_TOKEN` | Detail view |
| Meshy | GLB generation (AI) | `MESHY_API_KEY` | Skin creation |
| Gemini | Launch caption copy (text only — images come from real creators) | `GEMINI_API_KEY` | Content |

PostHog `distinct_id` is mirrored to Sentry `user.id` so one user's events
across analytics + error tracking share the same identity.

---

## 9. What NOT to Do — From the Audit

- "AI travel planner" positioning. Every YC batch has 20 of these. You're a
  game with a trip planner inside. The weird framing wins.
- Competing with Booking.com on feature count. Not the moat.
- Front-loading all rarity tiers. Users who collect Gold need something to
  chase — ship Celestial only when Gold starts feeling stale in the data.
- Over-optimising the globe. It's already beautiful. Ship distribution first.
- AI-generated launch video. The quest video is the content. Real > synthetic.

---

*Updated: 2026-04-23. Reassess at 100 signups, 500 signups, launch, and first
paying customer.*
