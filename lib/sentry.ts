// Thin wrapper around @sentry/nextjs so app code depends on us, not the SDK.
// If we ever swap providers (e.g. to Highlight or BetterStack), the one place
// to change is here.

import * as Sentry from '@sentry/nextjs';

/**
 * Manually capture an error with optional context. Prefer this over
 * `Sentry.captureException` in app code so we keep a central shim.
 *
 *   captureError(err, { userId, action: 'monument.unlock' });
 */
export function captureError(err: unknown, context?: Record<string, unknown>) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN && !process.env.SENTRY_DSN) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}

/**
 * Attach a user to subsequent events on the client. Call on sign-in.
 * Mirrors posthog.identify — analytics and error tracking share the user id.
 */
export function identifyUser(id: string, email?: string | null) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  Sentry.setUser({ id, email: email ?? undefined });
}

/** Forget the user on sign-out. */
export function clearUser() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  Sentry.setUser(null);
}
