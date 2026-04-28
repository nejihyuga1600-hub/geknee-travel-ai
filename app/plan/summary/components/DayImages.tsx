'use client';

import { useEffect, useState } from 'react';

// Three small image tiles per day section: Activities / Food / Sights.
// Pulls from the existing /api/images endpoint. Extracted from page.tsx.

export function DayImages({ heading, location }: { heading: string; location: string }) {
  const [imgs, setImgs] = useState<{ url: string; label: string }[]>([]);

  useEffect(() => {
    const cityMatch = heading.match(/:\s*([^—–\-|,\n]+)/);
    const city = cityMatch ? cityMatch[1].trim() : location;

    const queries = [
      `${city} travel sightseeing`,
      `${city} local food cuisine`,
      `${city} landmark monument`,
    ];

    let cancelled = false;
    Promise.all(
      queries.map(async (q, i) => {
        try {
          const res = await fetch(`/api/images?q=${encodeURIComponent(q)}&n=1`);
          const data: { images: string[] } = await res.json();
          const url = data.images[0] ?? '';
          const label = i === 0 ? 'Activities' : i === 1 ? 'Food' : 'Sights';
          return url ? { url, label } : null;
        } catch { return null; }
      })
    ).then(results => {
      if (!cancelled) setImgs(results.filter((r): r is { url: string; label: string } => !!r));
    });

    return () => { cancelled = true; };
  }, [heading, location]);

  if (imgs.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: 4, overflowX: 'auto', paddingBottom: 2 }}>
      {imgs.map((img, i) => (
        <div key={i} style={{ flexShrink: 0, position: 'relative' }}>
          <img
            src={img.url}
            alt={img.label}
            style={{
              width: 140, height: 90, objectFit: 'cover', borderRadius: 10,
              display: 'block', border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
          <span style={{
            position: 'absolute', bottom: 5, left: 6,
            fontSize: 9, fontWeight: 700, color: '#fff',
            textShadow: '0 1px 4px #000',
            background: 'rgba(0,0,0,0.45)', borderRadius: 4, padding: '1px 5px',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            {img.label}
          </span>
        </div>
      ))}
    </div>
  );
}
