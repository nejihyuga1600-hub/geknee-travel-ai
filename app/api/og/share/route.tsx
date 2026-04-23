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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mk       = url.searchParams.get('mk')    ?? 'eiffelTower';
  const skin     = url.searchParams.get('skin')  ?? 'gold';
  const username = (url.searchParams.get('u')    ?? 'someone').slice(0, 32);

  const monumentName = MONUMENT_NAMES[mk] ?? mk;
  const skinColor    = SKIN_COLOR[skin]   ?? '#ffd700';
  const skinLabel    = SKIN_LABEL[skin]   ?? skin.toUpperCase();

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

        {/* Bottom — wordmark */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 22, opacity: 0.75, maxWidth: 680, display: 'flex' }}>
            plan trips, collect the world
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: 1,
            }}
          >
            <span style={{ fontSize: 40 }}>{String.fromCodePoint(0x1F30D)}</span>
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
