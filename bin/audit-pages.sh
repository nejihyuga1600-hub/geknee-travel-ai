#!/usr/bin/env bash
# Per-page health check — visits every shipping route, inspects console +
# network for real errors, prints a pass/fail per page.
#
# Usage:
#   bin/audit-pages.sh                       # localhost, headed Chrome (default)
#   bin/audit-pages.sh --headless            # localhost, sandboxed Chromium
#   bin/audit-pages.sh https://geknee.com    # prod, headed Chrome
#
# Defaults to HEADED (real Chrome with GPU) because:
#   - Headless Chromium can't initialise WebGL on this Mac (Vulkan
#     /SwiftShader fails), so the globe never mounts and runtime errors
#     in r3f / postprocessing / shaders go uncaught.
#   - The earlier "EffectComposer crashes the Canvas" bug shipped past
#     the audit because headless never hit the renderer.getContext() call.
#
# Filters known noise:
#   - Travelpayouts widget (CORS-blocked from localhost; works in prod)
#   - Google Maps deprecation advisories
#   - 401s on /api/chat + /api/recommendations (expected when not signed in)
#
# Exits non-zero on any real failure so it can gate pre-commit / CI later.

set -euo pipefail

MODE="headed"
ARGS=()
for arg in "$@"; do
  case "$arg" in
    --headless) MODE="headless" ;;
    --headed)   MODE="headed" ;;
    *)          ARGS+=("$arg") ;;
  esac
done

BASE="${ARGS[0]:-http://localhost:3000}"
B="${HOME}/.claude/skills/gstack/browse/dist/browse"

if [ ! -x "$B" ]; then
  echo "browse binary missing at $B — run gstack browse setup" >&2
  exit 2
fi

# What's noise vs what's signal. Add to NOISE_PATTERN as new known-safe
# warnings appear; the goal is to keep the audit useful, not to suppress
# everything.
#
# In HEADED mode we keep WebGL errors in scope — real Chrome should
# initialise WebGL successfully, so any remaining error there is a
# real bug. In headless we still suppress the SwiftShader noise.
if [ "$MODE" = "headless" ]; then
  NOISE_PATTERN='tp-em\.com|webglcontextlost|WebGL|VENDOR|deprecated|^---|UNTRUSTED|config is not valid|net::ERR_FAILED|google\.maps\.places|/api/chat|/api/recommendations|401 \(Unauthorized'
else
  NOISE_PATTERN='tp-em\.com|^---|UNTRUSTED|config is not valid|net::ERR_FAILED|google\.maps\.places|/api/chat|/api/recommendations|401 \(Unauthorized'
fi

# Switch to headed Chrome if requested. The browse binary keeps a
# persistent server, so connect/disconnect flips its mode in-place.
if [ "$MODE" = "headed" ]; then
  echo "→ launching headed Chrome (real GPU, real WebGL)…"
  "$B" connect > /dev/null 2>&1 || {
    echo "could not launch headed Chrome — fall back with --headless" >&2
    exit 2
  }
  trap '"$B" disconnect > /dev/null 2>&1 || true' EXIT
fi

# Pages to audit. Add new shipping routes here.
PAGES=(
  "HOME|/"
  "PLANNER|/plan/location"
  "DATES|/plan/dates"
  "STYLE|/plan/style"
  "SUMMARY|/plan/summary"
  "PRICING|/pricing"
  "LEADERBOARD|/leaderboard"
  "PROFILE|/u/nghia"
)

fail=0

for entry in "${PAGES[@]}"; do
  label="${entry%%|*}"
  path="${entry##*|}"
  url="${BASE}${path}"

  "$B" network --clear > /dev/null 2>&1 || true
  "$B" console --clear > /dev/null 2>&1 || true
  "$B" goto "$url" > /dev/null 2>&1
  "$B" wait --networkidle > /dev/null 2>&1 || true
  sleep 2

  console_err=$("$B" console --errors 2>&1 | grep -vE "$NOISE_PATTERN" | grep -E '\[error\]' | head -1 || true)
  network_err=$("$B" network 2>&1 | grep -E '→ (4[0-9][0-9]|5[0-9][0-9])' | grep -vE "$NOISE_PATTERN" | head -1 || true)

  if [ -z "$console_err" ] && [ -z "$network_err" ]; then
    printf '✅ %-12s %s\n' "$label" "$url"
  else
    fail=$((fail + 1))
    printf '❌ %-12s %s\n' "$label" "$url"
    [ -n "$network_err" ] && echo "    network: $network_err"
    [ -n "$console_err" ] && echo "    console: $console_err"
  fi
done

echo
if [ "$fail" -eq 0 ]; then
  echo "all pages clean ✓"
  exit 0
else
  echo "$fail page(s) with real errors"
  exit 1
fi
