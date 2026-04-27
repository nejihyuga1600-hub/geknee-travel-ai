import type { Metadata } from 'next';
import Link from 'next/link';
import HeroGlobeClient from './components/HeroGlobeClient';

export const metadata: Metadata = {
  title: 'geknee — plan trips, collect the world',
  description: 'A collection game on a 3D globe — every monument is a collectable, every trip unlocks a rare skin. Trip planner inside. Free to start.',
  openGraph: {
    title: 'geknee — plan trips, collect the world',
    description: 'A collection game on a 3D globe — every monument is a collectable, every trip unlocks a rare skin. Trip planner inside.',
    type: 'website',
    siteName: 'geknee',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'geknee — plan trips, collect the world',
    description: 'A collection game on a 3D globe — every monument is a collectable, every trip unlocks a rare skin. Trip planner inside.',
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
            <Link href="/leaderboard" style={navLinkStyle}>Leaderboard</Link>
            <Link href="/pricing" style={navLinkStyle}>Pricing</Link>
            <Link href="/plan/location" style={{
              background: 'linear-gradient(135deg,#a78bfa,#7dd3fc)',
              padding: '9px 16px', borderRadius: 10, color: '#fff',
              fontSize: 13, fontWeight: 800, textDecoration: 'none',
              boxShadow: '0 6px 18px rgba(167, 139, 250,0.35)',
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
              fontSize: 10, fontWeight: 600,
              letterSpacing: '0.22em', textTransform: 'uppercase',
              color: 'var(--brand-accent)',
              marginBottom: 24,
            }}>
              {String.fromCodePoint(0x2726)} Collection game · Trip planner inside
            </div>
            <h1 style={{
              fontSize: 'clamp(52px, 8vw, 96px)', lineHeight: 0.98, margin: 0,
              fontFamily: 'var(--font-display), Georgia, serif',
              fontWeight: 400, letterSpacing: '-0.035em',
              color: 'var(--brand-ink)',
            }}>
              Collect<br />
              <em style={{ fontStyle: 'italic', color: 'var(--brand-accent)' }}>the world.</em>
            </h1>
            <p style={{
              fontFamily: 'var(--font-display), Georgia, serif',
              fontSize: 'clamp(17px, 1.5vw, 22px)', lineHeight: 1.45,
              maxWidth: 520, marginTop: 28,
              color: '#a8a8c0', fontWeight: 300,
            }}>
              A 3D globe where every monument is a collectable. Visit in person,
              complete the quest, unlock the rare skin. No shortcuts.
            </p>

            <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
              <Link href="/plan/location" style={{
                background: 'linear-gradient(135deg,#a78bfa,#7dd3fc)',
                padding: '14px 22px', borderRadius: 12, color: '#fff',
                fontSize: 14, fontWeight: 800, textDecoration: 'none',
                boxShadow: '0 10px 30px rgba(167, 139, 250,0.4)',
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
              emoji={String.fromCodePoint(0x1F3DB)}
              title="Collect monuments"
              body="60+ landmarks, seven rarity tiers each. The base tier drops the moment you complete the quest."
            />
            <Feature
              emoji={String.fromCodePoint(0x2728)}
              title="Earn rare skins"
              body="Gold, Aurora, Celestial — only by visiting in person and completing harder quests. No way to buy them."
            />
            <Feature
              emoji={String.fromCodePoint(0x1F30D)}
              title="Share your globe"
              body="Every unlock becomes a shareable card. Friends visit your spectator globe and start their own collection."
            />
            <Feature
              emoji={String.fromCodePoint(0x1F5FA)}
              title="Trip planner inside"
              body="When you do want help routing the trip, geknee drafts itineraries with city-level detail. Optional, not the point."
            />
          </div>
        </section>

        {/* ── Rarity gallery ──────────────────────────────────────────────── */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '64px 28px 48px' }}>
          <h2 style={{
            fontSize: 32, fontWeight: 500, letterSpacing: -0.6, marginBottom: 8,
            fontFamily: 'var(--font-display), Georgia, serif',
            color: 'var(--brand-ink)',
          }}>
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

        {/* ── Share-card preview gallery ──────────────────────────────────── */}
        {/* Live <img>s pointing at /api/og/share — the actual route that
            renders to OG meta when a user shares an unlock. Three monument
            + skin combos picked for visual variety. The route falls back
            to Wikipedia thumbs until per-skin Nano Banana heroes land. */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 28px 64px' }}>
          <h2 style={{
            fontSize: 32, fontWeight: 500, letterSpacing: -0.6, marginBottom: 8,
            fontFamily: 'var(--font-display), Georgia, serif',
            color: 'var(--brand-ink)',
          }}>
            Every unlock is a share.
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: 28, fontSize: 14, maxWidth: 580 }}>
            One tap turns your unlock into a card. Friends visit your spectator globe and
            see exactly what you collected.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 18,
          }}>
            {[
              { mk: 'eiffelTower',   skin: 'gold',      label: 'Gold tier' },
              { mk: 'statueLiberty', skin: 'aurora',    label: 'Aurora tier' },
              { mk: 'pyramidGiza',   skin: 'celestial', label: 'Celestial tier' },
            ].map((c) => (
              <div
                key={c.mk + c.skin}
                style={{
                  background: 'rgba(15,23,42,0.6)',
                  border: '1px solid rgba(148,163,184,0.18)',
                  borderRadius: 14, overflow: 'hidden',
                }}
              >
                <img
                  src={`/api/og/share?mk=${c.mk}&skin=${c.skin}&u=Nghia&h=nghia`}
                  alt={`${c.label} share card preview`}
                  width={1200}
                  height={630}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                  loading="lazy"
                />
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
            background: 'linear-gradient(135deg, rgba(167, 139, 250,0.25), rgba(167, 139, 250,0.25))',
            border: '1px solid rgba(167, 139, 250,0.4)',
            borderRadius: 20, padding: '48px 24px',
          }}>
            <h2 style={{
              fontSize: 38, fontWeight: 500, margin: 0,
              fontFamily: 'var(--font-display), Georgia, serif',
              letterSpacing: -0.8,
              color: 'var(--brand-ink)',
            }}>
              Start your collection.
            </h2>
            <p style={{ color: '#cbd5e1', marginTop: 12, fontSize: 15 }}>
              The globe is one click away. No signup needed to look around.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
              <Link href="/plan/location" style={{
                background: 'linear-gradient(135deg,#a78bfa,#7dd3fc)',
                padding: '14px 26px', borderRadius: 12, color: '#fff',
                fontSize: 14, fontWeight: 800, textDecoration: 'none',
                boxShadow: '0 10px 30px rgba(167, 139, 250,0.4)',
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
        border: '2px solid rgba(167, 139, 250,0.35)',
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
        boxShadow: '0 30px 100px rgba(167, 139, 250,0.35)',
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
