'use client';

import { useEffect, useState } from 'react';
import { fetchPlaceImage, imgCache } from '../lib/places';

// Fixed-height image tile for a single place. Reads from / writes to the
// module-scoped imgCache so a hovered place doesn't refetch on every render.

export function PlaceImage({ place, height, city }: { place: string; height: number; city?: string }) {
  const cacheKey = city ? `${place}||${city}` : place;
  const cached = imgCache.has(cacheKey) ? (imgCache.get(cacheKey) || null) : undefined;
  const [src, setSrc] = useState<string | null | undefined>(cached);

  useEffect(() => {
    if (imgCache.has(cacheKey)) { setSrc(imgCache.get(cacheKey) || null); return; }
    fetchPlaceImage(place, city).then(url => {
      imgCache.set(cacheKey, url ?? '');
      setSrc(url);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return (
    <div style={{
      width: '100%', height, borderRadius: 12, overflow: 'hidden',
      background: 'rgba(255,255,255,0.05)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      {src && (
        <>
          <img src={src} alt={place} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            background: 'linear-gradient(rgba(0,0,0,0.75), transparent)',
            padding: '10px 12px 24px',
          }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, letterSpacing: 0.2 }}>{place}</span>
          </div>
        </>
      )}
    </div>
  );
}
