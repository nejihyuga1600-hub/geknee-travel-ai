'use client';

import dynamic from 'next/dynamic';

// Atlas shell is now the planner. The chromeless LocationClient mounts
// inside AtlasShell as the globe layer, so the live R3F planet (country
// borders, monuments, click-to-fly) still renders behind the new chrome.
// Destination submit routes to /plan/style — same as the old planner —
// until Atlas's step bodies are wired.
const AtlasShell = dynamic(() => import('./atlas/AtlasShell'), { ssr: false });

export default function LocationPage() {
  return <AtlasShell />;
}
