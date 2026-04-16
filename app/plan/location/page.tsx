'use client';

import dynamic from 'next/dynamic';

const LocationClient = dynamic(() => import('./LocationClient'), { ssr: false });

export default function LocationPage() {
  return <LocationClient />;
}
