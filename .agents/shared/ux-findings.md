# UX Audit — geknee.com travel AI app
> Maintained by the UX Scout agent. Each review appended below with date/time.
> Dev Scout's technical findings inform these observations.

---

## UX Review — 2026-04-15 10:42

### Critical (blocks user)

- **ISSUE: Outline removed from all form inputs with no visible focus indicator** | Pages: `/plan/location` (GlobalChat), `/` (AuthModal), `/plan/style`, `/plan/dates` | Impact: Keyboard-only users cannot see which form field has focus, breaking accessibility and navigation. All inputs have `outline: 'none'` but no replacement focus styling (no box-shadow, border color change, or ring). | Steps to reproduce: Press Tab in AuthModal input fields or GlobalChat destination input—no visible focus ring appears.

- **ISSUE: Buttons lack visible focus states for keyboard navigation** | Pages: All pages with clickable UI | Impact: Keyboard users (accessibility/power users) have no indication of which button is focused when tabbing through the interface. Critical for WCAG 2.1 AA compliance. | Examples: "Reset Globe" button (LocationClient.tsx ~6420), "Go Pro" button, "Trips & Friends" button.

### Friction (degrades experience)

- **ISSUE: No confirmation or success feedback after form submission in auth flow** | Page: `AuthModal` when signing up/signing in | Impact: Users may not know if their registration was successful before auto-close. Unclear if they should wait or retry. | Suggestion: Show a brief "Account created! Signing in..." message before closing, or add a visible checkmark/toast notification.

- **ISSUE: Missing error context when Nominatim geocoding fails in destination lookup** | Page: `/plan/location` (GlobalChat), line ~133 | Impact: Generic error "City not found — try a different name" doesn't help users understand if they misspelled it or if it's a service issue. | Suggestion: Include suggestions (e.g., "Did you mean: Paris, France?") or explain "City name not recognized; try with country name."

- **ISSUE: Chat input for images has no character limit or validation hint** | Page: GlobalChat, line ~483 | Impact: Users don't know if long captions will be handled correctly. Unclear if there's a max length. | Suggestion: Show remaining character count or note "(optional)" more clearly near input.

- **ISSUE: Empty chat messages on globe page show generic placeholder; no progressive disclosure of capabilities** | Page: `/plan/location` (GlobalChat), lines 414–421 | Impact: First-time users don't immediately understand what questions to ask ("Ask me where to go!"). Placeholder hints are helpful but could be more prominent or progressively revealed. | Suggestion: Add a small "Examples" expandable section or hover to show 2–3 starting queries.

- **ISSUE: Settings panel toggles have very small hit targets (22px height)** | Page: SettingsPanel.tsx, line ~161 | Impact: On mobile, toggle switches (width: 40, height: 22) fall below the 44px minimum recommended touch target. Users may struggle to tap them accurately. | Steps: Open settings on mobile, try toggling notification preferences.

- **ISSUE: Dropdown select styling is hard to read; background blend** | Page: SettingsPanel, language/timezone selects (lines 174–191) | Impact: Select fields have very low contrast (rgba(255,255,255,0.08) bg + maxWidth 150px). On mobile, text may be cut off. | Suggestion: Increase select width to 100% on mobile, darken background to improve contrast.

- **ISSUE: Modal backdrop click closes panel unexpectedly; no "Press Escape" hint** | Pages: AuthModal, UpgradeModal, SettingsPanel, etc. | Impact: Users may accidentally close a modal by clicking outside it, losing input. No visual hint that this is possible. | Suggestion: Add a small "(Press ESC to close)" label, or require explicit close button click only.

### Polish (nice to fix)

- **ISSUE: "Reset Globe" button label is not user-friendly** | Page: `/plan/location`, LocationClient.tsx ~6430 | Impact: "Reset Globe" is technical jargon; better wording for casual users. | Suggestion: Change to "Back to Start" or "Home" with a house icon, or just use a home/globe icon.

- **ISSUE: Inconsistent button text truncation on mobile** | Pages: Various, e.g., "Trips & Friends" → "Trips" on mobile (line 6484) | Impact: Fine, but makes label inconsistent. "Go Pro" button also changes. | Suggestion: Consider a consistent strategy—maybe just hide text and show emoji/icon on mobile instead of abbreviating.

- **ISSUE: Chat interface input area could have better visual separation** | Page: GlobalChat, lines 465–497 | Impact: Image preview section blends into the input section. No clear visual boundary between message history and input field. | Suggestion: Add a more prominent divider line (currently 1px) or increase spacing.

- **ISSUE: Loading spinner in destination search uses inline <style> tag** | Page: GlobalChat, line ~402 | Impact: Animation (spin 0.7s linear infinite) is defined inline. Works but creates CSS-in-JS anti-pattern. Same animation exists elsewhere (LocationClient spin). | Suggestion: Move all animations to globals.css or a Tailwind @apply directive.

- **ISSUE: Geist font variable may not be loaded before render** | Layout.tsx applies GeistSans.variable | Context: Dev findings mention fonts were wired up recently. | Status: Appears solid; fonts are loaded early via geist/font/sans. No visible layout shift.

- **ISSUE: CityLabels and landmarks don't show alt/aria-label equivalents** | Page: LocationClient, 3D canvas elements | Impact: Screen readers can't describe what's on the globe. Labels are visual Three.js text, not semantic HTML. | Suggestion: If landmarks are clickable, consider adding ARIA descriptions (e.g., for announcement when user hovers or selects them).

- **ISSUE: Confirmation button styling could be more prominent** | Page: GlobalChat confirmation step (lines 350–369) | Impact: "Yes, let's go!" button is gradient but "Change" button is not, which is fine, but the visual hierarchy is subtle. Users might miss the action prompt. | Suggestion: Consider adding a very subtle entrance animation or glow to the confirmation prompt to draw attention.

### Working well

- **GOOD: Auth flow with OAuth (Google/Apple) + email/password is complete and well-implemented** | AuthModal provides clear step switching, error messages are contextual, and loading states prevent double-submission. Session auto-closes modal when successful.

- **GOOD: Viewport meta tags fixed via Next.js Viewport API** | Unlike the broken next/head approach noted in dev findings, the location page now uses proper export const viewport in page.tsx (line 5). Root layout also has viewport API. Pinch-zoom controls are working correctly.

- **GOOD: Touch targets on top-right buttons are mostly adequate** | Monument Shop, Go Pro, Trips buttons have padding: "7px 10px" on mobile, resulting in ~30–36px height. Could be taller but acceptable. Avatar button (width/height: 34) is borderline but tappable.

- **GOOD: Color contrast in dark mode is generally solid** | Text on dark backgrounds meets WCAG AA. Input fields have clear borders. Buttons have good contrast. Error messages use #f87171 (red) which stands out.

- **GOOD: Error handling and user feedback is present in key flows** | AuthModal shows inline errors ("Incorrect email or password"), Upgrade modal shows quota limits (generationsUsed / 3), SettingsPanel saves preferences without reload.

- **GOOD: Responsive design handles 390px–desktop widths** | Buttons adapt text/padding for mobile (isMobile checks). Chat panel width is 340px fixed but positioned absolutely so no horizontal scroll. Canvas fills 100vw/100svh correctly.

- **GOOD: Loading states are implemented** | Globe has loading overlay with spinner + "Loading Globe…" text (lines 6393–6411). Chat has inline spinner during async operations. Buttons show loading states during checkout/sign-in.

- **GOOD: Modals use Escape key handler** | AuthModal (lines 52–56) and GlobalChat (line 53) listen for Escape to close. Good UX for power users.

- **GOOD: TripSocialPanel notification badge shows unread count with amber highlight** | Lines 6485–6495. Visual indicator is clear (amber badge, "-6" count). Updates via polling (line 6329). Good feedback.

- **GOOD: Inline markdown rendering in itinerary (summary page)** | Bold (**text**), italic (*text*), lists are rendered with semantic colors and spacing. Readable and accessible.

- **GOOD: Back navigation is not broken** | Pages use useRouter and don't trap users. No dead-end flows detected. Auth flow → style page → dates → summary → book all navigate forward/back correctly.

---

### Response to Dev Scout findings

1. **Next.js DoS CVE & unauthenticated API routes** → No UX impact; pure backend security. Already fixed (per PLAN.md). Good catch on rate-limiting; these fixes prevent cost runaway which would affect billing UX later.

2. **Soft auth on /api/itinerary** → Unauthenticated users could hit generation limits unaware. If hitting hard limit, users get 401 error with no fallback. Should show friendly upgrade prompt instead of HTTP error.

3. **next/head inside App Router component** → Was breaking viewport meta tag. Already fixed (per dev findings + PLAN.md, commit acc1095). Viewport now uses proper API. No UX issue remains.

4. **Monument Shop hidden on mobile** → False alarm—Monument Shop button IS shown on mobile (line 6439–6451, no !isMobile guard). Button adapts text size and shows as "Shop" on mobile. Working correctly.

5. **Console logs in flight-prices API** → Already removed (per PLAN.md). No UX impact.

6. **Model version inconsistency (sonnet-4-5 vs 4-6)** → Already upgraded (per PLAN.md). Users see slightly better AI responses—UX improvement.

7. **globeReady state variable** → Recently added (per PLAN.md P3-C). Globe now has a loading screen until WebGL context is ready. Prevents blank white canvas flash. Excellent UX fix.

---

## Summary: UX Maturity Level

**Overall: Solid (7/10)**
- Navigation & flows: Complete, no dead ends
- Visual design: Cohesive dark theme, good spacing
- Accessibility: Good color contrast, but critical gap in focus states
- Mobile responsiveness: Good; adapts well to 390px+
- Feedback & loading: Implemented; could be more prominent

**Top 3 priorities:**
1. Add visible focus indicators to all inputs and buttons (keyboard nav + a11y)
2. Increase toggle switch height to 44px+ on mobile (hit target compliance)
3. Add success feedback or confirmation messages in auth flow (reassurance)

**No blockers for public beta**, but address focus states before launch if WCAG AA is a requirement.
