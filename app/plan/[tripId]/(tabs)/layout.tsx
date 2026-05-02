'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import type { ReactNode } from 'react';

const MONO = 'var(--font-mono-display), ui-monospace, monospace';

export default function TripTabsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const tripId = (params?.tripId as string) ?? '';

  const tabs = [
    // Planning sits first — it's the pin/curate step users land on for
    // brand-new trips before an itinerary exists. Itinerary becomes the
    // default destination once generation has produced one. Vault holds
    // passports / tickets / bookings for the trip, scoped to this tripId.
    { href: `/plan/${tripId}/planning`,  label: 'Planning' },
    { href: `/plan/${tripId}/itinerary`, label: 'Itinerary' },
    { href: `/plan/${tripId}/booking`,   label: 'Booking' },
    { href: `/plan/${tripId}/vault`,     label: 'Vault' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#f1f5f9' }}>
      <nav
        aria-label="Trip sections"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          gap: 32,
          padding: '0 24px',
          height: 56,
          alignItems: 'center',
          background: 'rgba(10, 15, 30, 0.78)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {tabs.map(t => {
          const active = pathname === t.href || (pathname && pathname.startsWith(t.href + '/'));
          return (
            <Link
              key={t.href}
              href={t.href}
              prefetch
              aria-current={active ? 'page' : undefined}
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                height: '100%',
                fontFamily: MONO,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: active ? 'var(--brand-accent, #38bdf8)' : 'rgba(255, 255, 255, 0.5)',
                textDecoration: 'none',
                transition: 'color 180ms ease',
              }}
            >
              {t.label}
              {active && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: -1,
                    height: 2,
                    background: 'var(--brand-accent, #38bdf8)',
                    borderRadius: 2,
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>
      <main>{children}</main>
    </div>
  );
}
