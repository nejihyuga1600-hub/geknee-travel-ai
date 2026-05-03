'use client';

import { useEffect, useState } from 'react';
import {
  loadUserHome,
  hasAskedForHome,
  markAskedForHome,
  captureUserHomeFromGeolocation,
  type UserHome,
} from '@/lib/userHome';

const MONO = 'var(--font-mono-display), ui-monospace, monospace';

// Lightweight permission banner mounted on the globe page. Shows once
// (asked-state stored in localStorage). Asks the user for location so
// we can pre-fill the closest airport on the Flights tab. User can
// allow, skip, or close — all states mark the banner as resolved so
// it never appears again on the same browser.
export default function HomeAirportBanner() {
  const [stage, setStage] = useState<
    'hidden' | 'asking' | 'requesting' | 'success' | 'denied'
  >('hidden');
  const [home, setHome] = useState<UserHome | null>(null);

  useEffect(() => {
    // Only show if we don't already have a home AND haven't asked.
    if (loadUserHome()) return;
    if (hasAskedForHome()) return;
    // Delay 2 s so the banner doesn't fight with the globe's first paint.
    const t = setTimeout(() => setStage('asking'), 2000);
    return () => clearTimeout(t);
  }, []);

  async function onAllow() {
    setStage('requesting');
    const rec = await captureUserHomeFromGeolocation();
    if (rec) {
      setHome(rec);
      setStage('success');
      // Auto-dismiss the success state after a beat
      setTimeout(() => setStage('hidden'), 3500);
    } else {
      setStage('denied');
      setTimeout(() => setStage('hidden'), 3500);
    }
  }

  function onSkip() {
    markAskedForHome();
    setStage('hidden');
  }

  if (stage === 'hidden') return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Use my location to find nearest airport"
      style={{
        position: 'fixed',
        bottom: 'max(20px, env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 80,
        maxWidth: 480,
        width: 'calc(100% - 32px)',
        padding: '14px 18px',
        borderRadius: 14,
        background: 'rgba(10,10,31,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        color: '#f1f5f9',
        display: 'flex', alignItems: 'center', gap: 14,
        flexWrap: 'wrap',
      }}
    >
      {stage === 'asking' && (
        <>
          <span style={{ fontSize: 22 }}>📍</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{
              fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em',
              color: 'var(--brand-accent-2)', fontWeight: 700,
            }}>
              ENABLE LOCATION
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.45, marginTop: 4 }}>
              Find your closest airport so we can pre-fill the Flights tab for every trip you plan.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onSkip}
              style={{
                padding: '8px 14px', borderRadius: 999,
                background: 'transparent', border: '1px solid rgba(255,255,255,0.18)',
                color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 600,
                fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >Skip</button>
            <button
              onClick={onAllow}
              style={{
                padding: '8px 14px', borderRadius: 999,
                background: 'var(--brand-accent)',
                color: 'var(--brand-bg)',
                border: 'none', fontSize: 11, fontWeight: 700,
                fontFamily: MONO, letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 3px 14px rgba(167,139,250,0.32)',
              }}
            >Allow</button>
          </div>
        </>
      )}
      {stage === 'requesting' && (
        <>
          <span style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
            background: 'var(--brand-accent)',
            animation: 'pulse 1.4s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 13 }}>Asking your browser for location…</span>
        </>
      )}
      {stage === 'success' && home && (
        <>
          <span style={{ fontSize: 22 }}>✈️</span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em',
              color: '#86efac', fontWeight: 700,
            }}>
              SAVED · NEAREST AIRPORT
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              <strong>{home.iata}</strong> · {home.city}, {home.country}. We&apos;ll use this when you plan flights.
            </div>
          </div>
        </>
      )}
      {stage === 'denied' && (
        <>
          <span style={{ fontSize: 22 }}>🛑</span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em',
              color: 'rgba(255,255,255,0.5)', fontWeight: 700,
            }}>
              SKIPPED · NO LOCATION
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              No problem — we&apos;ll fall back to your browser&apos;s region. You can always edit the origin on each trip.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
