'use client';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

type Props = { name: string; lat: number; lon: number; onClose: () => void };

export default function CityMapView({ name, lat, lon, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !containerRef.current) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [lon, lat],
      zoom: 12,
      pitch: 45,
      bearing: 0,
      antialias: true,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    new mapboxgl.Marker({ color: '#f59e0b' }).setLngLat([lon, lat]).addTo(map);

    map.on('style.load', () => {
      map.setFog({ color: 'rgb(6, 8, 22)', 'horizon-blend': 0.25, 'space-color': 'rgb(6, 8, 22)', 'star-intensity': 0.3 });
      if (map.getLayer('3d-buildings')) return;
      map.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': '#cbd5e1',
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 14.5, ['get', 'height']],
          'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 14, 0, 14.5, ['get', 'min_height']],
          'fill-extrusion-opacity': 0.85,
        },
      });
    });

    return () => { map.remove(); mapRef.current = null; };
  }, [lat, lon]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#060816',
      animation: 'mapFadeIn 0.3s ease-out',
    }}>
      <style>{`@keyframes mapFadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>

      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {!token && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: 'system-ui', textAlign: 'center', padding: 32,
        }}>
          <div style={{ maxWidth: 520, background: 'rgba(6,8,22,0.85)', border: '1px solid rgba(100,210,255,0.3)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>Mapbox token required</h2>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: '#c0ecff' }}>
              Add <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> to your Vercel environment variables (Production + Preview + Development).
              Grab a token from <a href="https://account.mapbox.com/access-tokens/" style={{ color: '#60a5fa' }}>mapbox.com</a> — the free tier covers 50k map loads/month.
            </p>
          </div>
        </div>
      )}

      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 18, left: 18, zIndex: 10,
          background: 'rgba(6,8,22,0.85)', border: '1px solid rgba(100,210,255,0.4)',
          backdropFilter: 'blur(12px)', borderRadius: 10,
          color: '#fff', fontSize: 13, fontWeight: 700,
          padding: '10px 14px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        {String.fromCodePoint(0x2190)} Back to globe
      </button>

      <div style={{
        position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(6,8,22,0.85)', border: '1px solid rgba(100,210,255,0.4)',
        backdropFilter: 'blur(12px)', borderRadius: 10,
        color: '#fff', fontSize: 14, fontWeight: 700,
        padding: '10px 16px',
      }}>
        {name}
      </div>
    </div>
  );
}
