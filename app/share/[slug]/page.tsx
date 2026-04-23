import type { Metadata } from 'next';
import Link from 'next/link';

// Slug format: base64url-encoded JSON `{u,mk,skin}`. Stateless — no DB row
// needed — so anyone can generate a shareable URL from the client without a
// server round-trip. Trade-off: URLs can be tampered with, but it's just a
// vanity image so the attack surface is "someone brags about a Neuschwanstein
// they didn't collect". Acceptable.
function decodeSlug(slug: string): { u: string; mk: string; skin: string } | null {
  try {
    const pad = '='.repeat((4 - (slug.length % 4)) % 4);
    const b64 = slug.replace(/-/g, '+').replace(/_/g, '/') + pad;
    // atob works in Node edge too, but use Buffer for Node runtime safety
    const json = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf-8');
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed.u === 'string' && typeof parsed.mk === 'string' && typeof parsed.skin === 'string') {
      return parsed;
    }
  } catch { /* fall through */ }
  return null;
}

const MONUMENT_NAMES: Record<string, string> = {
  eiffelTower: 'Eiffel Tower',
  colosseum: 'Colosseum',
  tajMahal: 'Taj Mahal',
  greatWall: 'Great Wall of China',
  statueLiberty: 'Statue of Liberty',
  sagradaFamilia: 'Sagrada Família',
  machuPicchu: 'Machu Picchu',
  christRedeem: 'Christ the Redeemer',
  angkorWat: 'Angkor Wat',
  pyramidGiza: 'Pyramids of Giza',
  goldenGate: 'Golden Gate Bridge',
  bigBen: 'Big Ben',
  acropolis: 'Acropolis',
  sydneyOpera: 'Sydney Opera House',
  neuschwanstein: 'Neuschwanstein',
  stonehenge: 'Stonehenge',
  iguazuFalls: 'Iguazu Falls',
  tokyoSkytree: 'Tokyo Skytree',
  victoriaFalls: 'Victoria Falls',
};

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = decodeSlug(slug);
  const mk     = data?.mk   ?? 'eiffelTower';
  const skin   = data?.skin ?? 'gold';
  const u      = data?.u    ?? 'someone';
  const name   = MONUMENT_NAMES[mk] ?? mk;
  const title  = `${u} unlocked the ${skin.toUpperCase()} ${name} on geknee`;
  const desc   = 'Plan trips. Collect the world.';
  const ogUrl  = `/api/og/share?u=${encodeURIComponent(u)}&mk=${encodeURIComponent(mk)}&skin=${encodeURIComponent(skin)}`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url: `/share/${slug}`,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: title }],
      type: 'website',
      siteName: 'geknee',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [ogUrl],
    },
  };
}

export default async function SharePage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = decodeSlug(slug);
  const mk     = data?.mk   ?? 'eiffelTower';
  const skin   = data?.skin ?? 'gold';
  const u      = data?.u    ?? 'someone';
  const name   = MONUMENT_NAMES[mk] ?? mk;
  const ogUrl  = `/api/og/share?u=${encodeURIComponent(u)}&mk=${encodeURIComponent(mk)}&skin=${encodeURIComponent(skin)}`;

  return (
    <main style={{
      minHeight: '100svh',
      background: 'radial-gradient(ellipse at 40% 45%, rgba(30,70,200,0.4) 0%, rgba(6,8,22,0.96) 58%, #030510 100%)',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 28,
    }}>
      <div style={{ opacity: 0.7, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' }}>
        {u} unlocked
      </div>
      <h1 style={{ fontSize: 40, fontWeight: 900, margin: 0, textAlign: 'center' }}>
        the {skin} {name}
      </h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ogUrl}
        alt={`${name} share card`}
        style={{
          width: 'min(920px, 100%)',
          borderRadius: 16,
          border: '1px solid rgba(100,210,255,0.3)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      />
      <Link
        href="/"
        style={{
          marginTop: 8,
          padding: '12px 28px',
          borderRadius: 10,
          background: 'linear-gradient(135deg,#06b6d4,#6366f1)',
          color: '#fff',
          textDecoration: 'none',
          fontWeight: 700,
          letterSpacing: 0.5,
        }}
      >
        Start your own collection {String.fromCodePoint(0x27A4)}
      </Link>
    </main>
  );
}
