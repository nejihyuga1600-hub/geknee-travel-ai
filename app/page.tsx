import type { Metadata } from 'next';
import Link from 'next/link';
import HeroGlobeClient from './components/HeroGlobeClient';

export const metadata: Metadata = {
  title: 'geknee — plan trips, collect the world',
  description: 'Plan trips with AI, explore a stylized 3D globe, collect rare monument skins as you travel. Free to start.',
  openGraph: {
    title: 'geknee — plan trips, collect the world',
    description: 'Plan trips with AI, explore a stylized 3D globe, collect rare monument skins as you travel.',
    type: 'website',
    siteName: 'geknee',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'geknee — plan trips, collect the world',
    description: 'Plan trips with AI, explore a stylized 3D globe, collect rare monument skins as you travel.',
  },
};

// Skins the globe ships with — used to render the monument-collection gallery
// strip. Matches SKIN_RING_COLOR in LocationClient; kept inline to avoid the
// landing page importing the ~7k-line client bundle.
const SKINS: { id: string; label: string; color: string }[] = [
  { id: 'stone',     label: 'Stone',     color: '#a8a8a8' },
  { id: 'bronze',    label: 'Bronze',    color: '#cd7f32' },
  { id: 'silver',    label: 'Silver',    color: '#e8e8e8' },
  { id: 'gold',      label: 'Gold',      color: '#ffd700' },
  { id: 'diamond',   label: 'Diamond',   color: '#b9f2ff' },
  { id: 'aurora',    label: 'Aurora',    color: '#7cff97' },
  { id: 'celestial', label: 'Celestial', color: '#c4a7ff' },
];

export default function Home() {
  return (
    <>
      <style>{`
        @keyframes spinGlobe { to { transform: rotate(360deg) } }
        @keyframes float     { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        @keyframes pulseRing { 0%,100% { opacity: .4; transform: scale(1) } 50% { opacity: .75; transform: scale(1.04) } }
      `}</style>

      <main style={{
        minHeight: '100svh',
        background: 'radial-gradient(ellipse at 35% 30%, rgba(30,70,200,0.45) 0%, rgba(6,8,22,0.97) 55%, #030510 100%)',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>

        {/* ── Top nav ─────────────────────────────────────────────────────── */}
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 28px', maxWidth: 1280, margin: '0 auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 20, fontWeight: 900 }}>
            <span style={{ fontSize: 24 }}>{String.fromCodePoint(0x1F30D)}</span>
            geknee
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Link href="/pricing" style={navLinkStyle}>Pricing</Link>
            <Link href="/plan/location" style={{
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              padding: '9px 16px', borderRadius: 10, color: '#fff',
              fontSize: 13, fontWeight: 800, textDecoration: 'none',
              boxShadow: '0 6px 18px rgba(99,102,241,0.35)',
            }}>
              Open the globe {String.fromCodePoint(0x27A4)}
            </Link>
          </div>
        </nav>

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 40, alignItems: 'center',
          maxWidth: 1180, margin: '0 auto', padding: '64px 28px 48px',
        }}>
          <div>
            <div style={{
              display: 'inline-block',
              background: 'rgba(139,92,246,0.15)',
              border: '1px solid rgba(139,92,246,0.35)',
              color: '#c4b5fd',
              fontSize: 12, fontWeight: 800, letterSpacing: 1.5,
              padding: '5px 12px', borderRadius: 999,
              marginBottom: 22, textTransform: 'uppercase',
            }}>
              Travel planner · Collection game
            </div>
            <h1 style={{
              fontSize: 'clamp(40px, 6vw, 72px)', lineHeight: 1.02, margin: 0,
              fontWeight: 900, letterSpacing: -1,
            }}>
              Plan trips.<br/>Collect the world.
            </h1>
            <p style={{ fontSize: 18, color: '#cbd5e1', marginTop: 20, maxWidth: 520, lineHeight: 1.55 }}>
              A 3D globe where every trip you plan unlocks a rare skin for the monument
              you visit. Explore Earth, collect the Seven Wonders, share your world.
            </p>

            <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
              <Link href="/plan/location" style={{
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                padding: '14px 22px', borderRadius: 12, color: '#fff',
                fontSize: 14, fontWeight: 800, textDecoration: 'none',
                boxShadow: '0 10px 30px rgba(99,102,241,0.4)',
              }}>
                Open the globe {String.fromCodePoint(0x27A4)}
              </Link>
              <Link href="/pricing" style={{
                padding: '14px 22px', borderRadius: 12,
                border: '1px solid rgba(148,163,184,0.35)',
                color: '#e2e8f0', fontSize: 14, fontWeight: 700, textDecoration: 'none',
              }}>
                See pricing
              </Link>
            </div>

            <div style={{ display: 'flex', gap: 22, marginTop: 36, fontSize: 12, color: '#94a3b8' }}>
              <span>{String.fromCodePoint(0x2713)} Free forever</span>
              <span>{String.fromCodePoint(0x2713)} No credit card to start</span>
            </div>
          </div>

          <HeroVisual />
        </section>

        {/* ── Feature tiles ───────────────────────────────────────────────── */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 28px 48px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 18,
          }}>
            <Feature
              emoji={String.fromCodePoint(0x1F5FA)}
              title="Plan with AI"
              body="Describe your vibe, geknee drafts the itinerary. Route, stops, estimated days, city-level detail."
            />
            <Feature
              emoji={String.fromCodePoint(0x1F3DB)}
              title="Collect rare skins"
              body="Every monument has seven rarity tiers. Visit in person to unlock Gold, Aurora, Celestial."
            />
            <Feature
              emoji={String.fromCodePoint(0x2728)}
              title="Share your world"
              body="Each unlock turns into a shareable card with your collection. Your Earth, posted in one click."
            />
          </div>
        </section>

        {/* ── Rarity gallery ──────────────────────────────────────────────── */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '64px 28px 48px' }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.3, marginBottom: 6 }}>
            Seven rarity tiers per monument.
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: 28, fontSize: 14 }}>
            Unlock the common by visiting. Chase the rare by returning. Collect them all.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 14,
          }}>
            {SKINS.map((s, i) => (
              <div
                key={s.id}
                style={{
                  background: `radial-gradient(circle at 50% 35%, ${s.color}22, transparent 70%), rgba(15,23,42,0.6)`,
                  border: `1px solid ${s.color}55`,
                  borderRadius: 14, padding: '22px 16px',
                  textAlign: 'center',
                  animation: `float 3.5s ease-in-out ${i * 0.25}s infinite`,
                }}
              >
                <div style={{
                  width: 56, height: 56, margin: '0 auto 12px',
                  borderRadius: '50%',
                  border: `3px solid ${s.color}`,
                  boxShadow: `0 0 24px ${s.color}66`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `radial-gradient(circle, ${s.color}33, transparent)`,
                }}>
                  <span style={{ fontSize: 22 }}>{String.fromCodePoint(0x1F3DB)}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: s.color, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA band ────────────────────────────────────────────────────── */}
        <section style={{
          maxWidth: 1180, margin: '0 auto', padding: '64px 28px 96px',
          textAlign: 'center',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25))',
            border: '1px solid rgba(139,92,246,0.4)',
            borderRadius: 20, padding: '48px 24px',
          }}>
            <h2 style={{ fontSize: 32, fontWeight: 900, margin: 0 }}>
              Start your collection.
            </h2>
            <p style={{ color: '#cbd5e1', marginTop: 12, fontSize: 15 }}>
              The globe is one click away. No signup needed to look around.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
              <Link href="/plan/location" style={{
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                padding: '14px 26px', borderRadius: 12, color: '#fff',
                fontSize: 14, fontWeight: 800, textDecoration: 'none',
                boxShadow: '0 10px 30px rgba(99,102,241,0.4)',
              }}>
                Open the globe {String.fromCodePoint(0x27A4)}
              </Link>
              <Link href="/pricing" style={{
                padding: '14px 26px', borderRadius: 12,
                border: '1px solid rgba(148,163,184,0.35)',
                color: '#e2e8f0', fontSize: 14, fontWeight: 700, textDecoration: 'none',
              }}>
                See pricing
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer style={{
          borderTop: '1px solid rgba(148,163,184,0.1)',
          padding: '24px 28px',
          textAlign: 'center',
          color: '#64748b', fontSize: 12,
        }}>
          {String.fromCodePoint(0x00A9)} {new Date().getFullYear()} geknee · built with Three.js, Next.js, and a lot of sleepless nights
        </footer>
      </main>
    </>
  );
}

// Pure-CSS hero visual — stylised "globe" made of concentric gradient rings.
// Replace with <img src="/globe-hero.png" /> once you have a real screenshot
// of the 3D globe to drop into public/.
function HeroVisual() {
  return (
    <div style={{
      position: 'relative',
      aspectRatio: '1 / 1',
      maxWidth: 520,
      margin: '0 auto',
      display: 'grid', placeItems: 'center',
    }}>
      {/* outer ring */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%',
        border: '2px solid rgba(99,102,241,0.35)',
        animation: 'pulseRing 5s ease-in-out infinite',
      }} />
      {/* inner ring */}
      <div style={{
        position: 'absolute', inset: '12%',
        borderRadius: '50%',
        border: '2px solid rgba(245,158,11,0.4)',
        animation: 'pulseRing 6s ease-in-out infinite 1s',
      }} />
      {/* Live cartoon globe — replaces the CSS gradient fake. The Canvas
          is pointer-events:none so it doesn't intercept the hero CTAs. */}
      <div style={{
        width: '88%', height: '88%',
        position: 'relative',
        borderRadius: '50%',
        overflow: 'hidden',
        boxShadow: '0 30px 100px rgba(99,102,241,0.35)',
      }}>
        <HeroGlobeClient />
      </div>

      {/* a few rarity-coloured pins floating over the globe */}
      {[{c:'#ffd700', top:'22%', left:'58%'},
        {c:'#b9f2ff', top:'60%', left:'30%'},
        {c:'#c4a7ff', top:'42%', left:'72%'}].map((p, i) => (
        <div key={i} style={{
          position: 'absolute', top: p.top, left: p.left,
          width: 14, height: 14, borderRadius: '50%',
          background: p.c,
          boxShadow: `0 0 20px ${p.c}, 0 0 40px ${p.c}88`,
          animation: `float 3s ease-in-out ${i * 0.6}s infinite`,
        }} />
      ))}
    </div>
  );
}

function Feature({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div style={{
      background: 'rgba(15,23,42,0.6)',
      border: '1px solid rgba(148,163,184,0.15)',
      borderRadius: 14,
      padding: '22px 20px',
    }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{emoji}</div>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}

const navLinkStyle: React.CSSProperties = {
  color: '#cbd5e1', fontSize: 13, fontWeight: 700, textDecoration: 'none',
};
