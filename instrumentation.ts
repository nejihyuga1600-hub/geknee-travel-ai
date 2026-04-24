// Next.js instrumentation hook — runs once in each server runtime (Node + edge).
// Server-side Sentry init. Client-side init lives in instrumentation-client.ts.
// No-op when SENTRY_DSN is unset so local dev / CI stay silent.

export async function register() {
  if (!process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      // Tag every event with the git SHA if Vercel surfaces it, so we can map
      // errors back to the commit that introduced them.
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    });
  }
}

// Surfaces server-side fetch / action errors to Sentry — required for Next 15+.
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(err, request, context);
}
