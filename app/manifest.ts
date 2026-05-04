import type { MetadataRoute } from 'next';

// Web App Manifest. Next 16 serves this at /manifest.webmanifest automatically.
// Icons live in /public/icons/ — generated from public/brand/geknee-logo.jpg.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'geknee — go there. prove it.',
    short_name: 'geknee',
    description:
      '60 monuments. 7 rarity tiers. Your phone checks you are actually there.',
    start_url: '/plan/location',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f5f1e8',
    theme_color: '#0a0a1f',
    categories: ['travel', 'lifestyle', 'games'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
