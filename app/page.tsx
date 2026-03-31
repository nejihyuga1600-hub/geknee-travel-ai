'use client';
import dynamic from 'next/dynamic';

const LocationPage = dynamic(() => import('./plan/location/page'), { ssr: false });

export default function Home() {
  return <LocationPage />;
}
