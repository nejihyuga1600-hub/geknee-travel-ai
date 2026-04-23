'use client';
import posthog from 'posthog-js';

// Five events we care about right now — if you need more, add here, not inline.
// The union is narrow on purpose: analytics debt starts when "event names" are free-form.
export type AnalyticsEvent =
  | 'signup'
  | 'first_unlock'
  | 'plan_saved'
  | 'upgrade_click'
  | 'share_click';

let initialized = false;

/**
 * Idempotent client-side init. Called from PostHogProvider on mount.
 * No-op in SSR and when the key isn't set (local dev without NEXT_PUBLIC_POSTHOG_KEY).
 */
export function initAnalytics() {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
  posthog.init(key, {
    api_host: host,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false, // opt into explicit events only — cheaper + easier to read
    loaded: () => { initialized = true; },
  });
  initialized = true;
}

/**
 * Track one of the five canonical events. Silently no-ops if posthog isn't
 * configured — keeps local dev and CI untroubled.
 */
export function track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.capture(event, properties);
}

/**
 * Tie events to a user once they're authenticated. Call after sign-in succeeds.
 */
export function identify(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.identify(userId, traits);
}

/** Forget the user on sign-out. */
export function resetAnalytics() {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.reset();
}
