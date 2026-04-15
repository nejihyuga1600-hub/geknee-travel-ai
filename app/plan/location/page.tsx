'use client';
import dynamic from 'next/dynamic';
import Head from 'next/head';

const LocationClient = dynamic(() => import('./LocationClient'), { ssr: false });

export default function LocationPage() {
  return (
    <>
      <Head>
        {/* Prevent Safari from zooming the viewport — let OrbitControls handle pinch zoom */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </Head>
      <LocationClient />
    </>
  );
}
