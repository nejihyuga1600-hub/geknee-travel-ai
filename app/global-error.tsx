'use client';
// Next.js convention: this component catches render errors in the root layout.
// Required entry-point for Sentry to capture React render failures as
// unhandled exceptions (not just promise rejections).

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import NextError from 'next/error';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        {/* NextError is the default Next.js error UI — keeps styling consistent */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
