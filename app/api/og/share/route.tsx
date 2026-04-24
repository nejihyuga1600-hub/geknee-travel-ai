import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Human-readable monument names. Mirror of INFO[mk].name in LocationClient — kept
// inline because this route runs on edge and importing the 7k-line client file
// would drag its entire world into the edge bundle.
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

const SKIN_COLOR: Record<string, string> = {
  stone: '#a8a8a8',
  bronze: '#cd7f32',
  silver: '#e8e8e8',
  gold: '#ffd700',
  diamond: '#b9f2ff',
  aurora: '#7cff97',
  celestial: '#c4a7ff',
  obsidian: '#1a1a2e',
};

const SKIN_LABEL: Record<string, string> = {
  stone: 'STONE',
  bronze: 'BRONZE',
  silver: 'SILVER',
  gold: 'GOLD',
  diamond: 'DIAMOND',
  aurora: 'AURORA',
  celestial: 'CELESTIAL',
  obsidian: 'OBSIDIAN',
};

// Hero-image lookup. Priority:
//   1. explicit ?hero= param (escape hatch for special promos)
//   2. Per-skin Blob: share/{prefix}_{skin}_hero.png   ← shows the actual unlocked variant
//   3. Per-monument Blob: share/{prefix}_hero.png       ← legacy / pre-skin-aware uploads
//   4. Wikipedia thumbnail                              ← generic, but always works
//   5. null (typographic fallback in render)
//
// The {prefix} mirrors MONUMENT_FILE_PREFIX in globe/skins.ts. We re-implement
// it inline here so the edge bundle doesn't drag in three.js via that module.
const BLOB_BASE = 'https://mrfgpxw07gmgmriv.public.blob.vercel-storage.com';

const MONUMENT_FILE_PREFIX: Record<string, string> = {
  eiffelTower: 'eiffel_tower', colosseum: 'Colosseum', tajMahal: 'taj_mahal',
  greatWall: 'great_wall', statueLiberty: 'statue_liberty', sagradaFamilia: 'sagrada_familia',
  machuPicchu: 'machu_picchu', christRedeem: 'christ_redeemer', angkorWat: 'angkor_wat',
  pyramidGiza: 'pyramid_giza', goldenGate: 'golden_gate', bigBen: 'big_ben',
  acropolis: 'acropolis', sydneyOpera: 'sydney_opera', neuschwanstein: 'neuschwanstein',
  stonehenge: 'stonehenge', iguazuFalls: 'iguazu_falls', tokyoSkytree: 'tokyo_skytree',
  victoriaFalls: 'victoria_falls',
};

async function tryBlob(url: string): Promise<string | null> {
  try {
    const head = await fetch(url, { method: 'HEAD' });
    return head.ok ? url : null;
  } catch { return null; }
}

async function resolveHero(mk: string, skin: string, explicit: string | null): Promise<string | null> {
  if (explicit) return explicit;
  const prefix = MONUMENT_FILE_PREFIX[mk] ?? mk;
  const perSkin = await tryBlob(`${BLOB_BASE}/share/${prefix}_${skin}_hero.png`);
  if (perSkin) return perSkin;
  const perMonument = await tryBlob(`${BLOB_BASE}/share/${prefix}_hero.png`);
  if (perMonument) return perMonument;
  // Wikipedia thumbnail — generic but always available. Wikipedia API
  // requires a descriptive User-Agent per their etiquette; default Edge
  // runtime UAs sometimes get rate-limited or 403'd.
  const title = MONUMENT_NAMES[mk] ?? mk;
  const t = encodeURIComponent(title.replace(/ /g, '_'));
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${t}&redirects&prop=pageimages&pithumbsize=1200&format=json&origin=*`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'geknee-og-share/1.0 (https://www.geknee.com)' },
    });
    if (!r.ok) return null;
    const d = await r.json();
    const page: { thumbnail?: { source?: string } } = Object.values(d.query.pages)[0] as { thumbnail?: { source?: string } };
    return page?.thumbnail?.source ?? null;
  } catch { return null; }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mk       = url.searchParams.get('mk')    ?? 'eiffelTower';
  const skin     = url.searchParams.get('skin')  ?? 'gold';
  const username = (url.searchParams.get('u')    ?? 'someone').slice(0, 32);
  const handle   = (url.searchParams.get('h')    ?? '').slice(0, 32);
  const heroParam = url.searchParams.get('hero');
  // Quest proof photo (Blob URL written by /api/monuments mission completion).
  // Optional — when present, rendered as a polaroid inset on the card.
  const questPhoto = url.searchParams.get('q');

  const monumentName = MONUMENT_NAMES[mk] ?? mk;
  const skinColor    = SKIN_COLOR[skin]   ?? '#ffd700';
  const skinLabel    = SKIN_LABEL[skin]   ?? skin.toUpperCase();
  const heroUrl      = await resolveHero(mk, skin, heroParam);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background:
            'radial-gradient(ellipse at 40% 45%, rgba(30,70,200,0.55) 0%, rgba(6,8,22,0.96) 58%, #030510 100%)',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '72px 80px',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        {/* Hero image — Nano Banana PNG / Wikipedia thumb. Sits behind text
            with a dark gradient overlay so the typography stays legible.
            Wrapped in a div (not a fragment) because Satori requires every
            child of a flex parent to be its own measurable element. */}
        {heroUrl && (
          <div style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            display: 'flex',
          }}>
            <img
              src={heroUrl}
              alt=""
              width={1200}
              height={630}
              style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: '100%',
                objectFit: 'cover', opacity: 0.55,
              }}
            />
            <div style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%',
              background: 'linear-gradient(180deg, rgba(6,8,22,0.55) 0%, rgba(6,8,22,0.85) 60%, rgba(3,5,16,0.97) 100%)',
              display: 'flex',
            }} />
          </div>
        )}
        {/* Decorative ring — same visual as the globe ring */}
        <div
          style={{
            position: 'absolute',
            right: -120,
            top: -80,
            width: 520,
            height: 520,
            borderRadius: '50%',
            border: `6px solid ${skinColor}`,
            opacity: 0.35,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: -40,
            top: -10,
            width: 380,
            height: 380,
            borderRadius: '50%',
            border: `3px solid ${skinColor}`,
            opacity: 0.6,
            display: 'flex',
          }}
        />

        {/* Top — username + collected tag */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 28, opacity: 0.6, letterSpacing: 2, textTransform: 'uppercase', display: 'flex' }}>
            {username} · unlocked
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 18,
              fontWeight: 800,
              color: skinColor,
              letterSpacing: 3,
            }}
          >
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: skinColor, display: 'flex' }} />
            {skinLabel} TIER
          </div>
        </div>

        {/* Middle — monument name */}
        <div
          style={{
            display: 'flex',
            fontSize: monumentName.length > 16 ? 90 : 112,
            fontWeight: 900,
            lineHeight: 1.05,
            color: skinColor,
            textShadow: `0 0 60px ${skinColor}`,
            maxWidth: '90%',
          }}
        >
          {monumentName}
        </div>

        {/* Quest proof photo — small polaroid inset, top-right above the
            CTA. Only renders when ?q= was passed by the share toast. */}
        {questPhoto && (
          <div style={{
            position: 'absolute',
            right: 80,
            top: 90,
            width: 220,
            height: 260,
            background: '#fff',
            padding: '14px 14px 38px 14px',
            borderRadius: 6,
            transform: 'rotate(4deg)',
            boxShadow: '0 18px 40px rgba(0,0,0,0.55), 0 4px 8px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <img
              src={questPhoto}
              alt=""
              width={192}
              height={192}
              style={{ width: '100%', height: '192px', objectFit: 'cover' }}
            />
            <div style={{
              fontSize: 12,
              color: '#1a1a2e',
              textAlign: 'center',
              marginTop: 8,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 600,
              letterSpacing: 0.4,
              display: 'flex',
              justifyContent: 'center',
            }}>
              proof of presence
            </div>
          </div>
        )}

        {/* Bottom — visit-globe CTA when we have a handle, else wordmark. */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {handle ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 22px',
              background: 'rgba(255,255,255,0.08)',
              border: `2px solid ${skinColor}`,
              borderRadius: 14,
              fontSize: 26, fontWeight: 700,
            }}>
              {String.fromCodePoint(0x1F30D)} visit @{handle}&apos;s globe
              <span style={{ fontSize: 30, color: skinColor }}>{String.fromCodePoint(0x2192)}</span>
            </div>
          ) : (
            <div style={{ fontSize: 22, opacity: 0.75, maxWidth: 680, display: 'flex' }}>
              plan trips, collect the world
            </div>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: 1,
              opacity: 0.85,
            }}
          >
            geknee.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
  );
}
