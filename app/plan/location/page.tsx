import dynamic from 'next/dynamic';
import type { Viewport } from 'next';

// Override root layout viewport for the globe page — OrbitControls handles pinch zoom
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

const LocationClient = dynamic(() => import('./LocationClient'), { ssr: false });

export default function LocationPage() {
  return <LocationClient />;
}
