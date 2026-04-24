import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = (url.searchParams.get('u') ?? 'traveler').slice(0, 32);
  const count = Math.max(0, parseInt(url.searchParams.get('count') ?? '0', 10) || 0);

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
        {/* Decorative glowing ring (gold) */}
        <div
          style={{
            position: 'absolute', right: -120, top: -80,
            width: 520, height: 520, borderRadius: '50%',
            border: '6px solid #ffd700', opacity: 0.28, display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute', right: -40, top: -10,
            width: 380, height: 380, borderRadius: '50%',
            border: '3px solid #ffd700', opacity: 0.5, display: 'flex',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 28, opacity: 0.6, letterSpacing: 2, textTransform: 'uppercase', display: 'flex' }}>
            {username}&apos;s collection
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{
            display: 'flex',
            fontSize: 160, fontWeight: 900, lineHeight: 1, letterSpacing: -2,
            color: '#ffd700', textShadow: '0 0 60px #ffd70055',
          }}>
            {count}
          </div>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, color: '#e2e8f0' }}>
            monument{count === 1 ? '' : 's'} collected
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 22, opacity: 0.75, maxWidth: 680, display: 'flex' }}>
            plan trips, collect the world
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 34, fontWeight: 900, letterSpacing: 1,
          }}>
            <span style={{ fontSize: 40 }}>{String.fromCodePoint(0x1F30D)}</span>
            geknee.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { 'Cache-Control': 'public, max-age=3600' },
    },
  );
}
