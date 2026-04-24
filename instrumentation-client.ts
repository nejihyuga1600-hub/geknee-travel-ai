// Browser-side Sentry init. Picked up automatically by @sentry/nextjs when
// present at the project root. No-op when NEXT_PUBLIC_SENTRY_DSN is unset.

import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    // Session Replay is on by default in the SDK — turn off here because
    // PostHog already records sessions. One session recorder per site is plenty.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    // Ignore noisy known-third-party errors that aren't actionable
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Safari's WebGL context-loss is recoverable; we already handle it
      'THREE.WebGLRenderer: Context Lost',
    ],
  });
}

// Required by Next.js App Router to attach router transitions to traces
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
