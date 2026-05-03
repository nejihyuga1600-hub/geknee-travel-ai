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
    // brand-new trips before an itinerary exists. Booking comes second so
    // users can lock down hotels/flights/activities before (or alongside)
    // the day-by-day. Itinerary then renders the day plan around those
    // commitments. Vault holds passports / tickets / bookings for the
    // trip, scoped to this tripId.
    { href: `/plan/${tripId}/planning`,  label: 'Planning' },
    { href: `/plan/${tripId}/booking`,   label: 'Booking' },
    { href: `/plan/${tripId}/itinerary`, label: 'Itinerary' },
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
          gap: 18,
          padding: '0 18px 0 16px',
          height: 56,
          alignItems: 'center',
          background: 'rgba(10, 15, 30, 0.78)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Persistent "← Back to globe" pill on the LEFT — present on
            every tab so users can always return to the globe home. */}
        <Link
          href="/plan/location"
          prefetch
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 999,
            background: 'rgba(167,139,250,0.12)',
            border: '1px solid rgba(167,139,250,0.32)',
            color: 'var(--brand-accent, #a78bfa)',
            fontFamily: MONO, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          ← Back to globe
        </Link>
        {/* Tabs centered between the back pill and the globe home icon. */}
        <div style={{ display: 'flex', gap: 28, flex: 1, alignItems: 'center', height: '100%' }}>
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
        </div>
        {/* Globe home button on the right — same destination as the
            back pill, visualized as an icon for a cleaner top-right
            anchor. Acts as the universal "home" affordance. */}
        <Link
          href="/plan/location"
          prefetch
          aria-label="Back to globe"
          title="Back to globe"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.78)',
            textDecoration: 'none', flexShrink: 0,
            transition: 'background 150ms, border-color 150ms, color 150ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(167,139,250,0.14)';
            e.currentTarget.style.borderColor = 'rgba(167,139,250,0.4)';
            e.currentTarget.style.color = 'var(--brand-accent, #a78bfa)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.78)';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <ellipse cx="12" cy="12" rx="10" ry="4" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="12" y1="2" x2="12" y2="22" />
          </svg>
        </Link>
      </nav>
      <main>{children}</main>
    </div>
  );
}
