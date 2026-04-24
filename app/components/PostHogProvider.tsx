'use client';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { initAnalytics, identify, resetAnalytics } from '@/lib/analytics';
import { identifyUser, clearUser } from '@/lib/sentry';

/**
 * Initialises PostHog on mount, identifies the current user when session loads,
 * resets when they sign out. Drops into the root layout once, does nothing
 * without NEXT_PUBLIC_POSTHOG_KEY so dev environments stay clean.
 */
export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => { initAnalytics(); }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const u = session.user as { id?: string; email?: string | null; name?: string | null };
      if (u.id) {
        identify(u.id, { email: u.email ?? undefined, name: u.name ?? undefined });
        identifyUser(u.id, u.email ?? null);
      }
    }
    if (status === 'unauthenticated') { resetAnalytics(); clearUser(); }
  }, [status, session]);

  return <>{children}</>;
}
