'use client';

import dynamic from 'next/dynamic';

// Atlas is the canonical planner per the design handoff
// (.design/design_handoff_geknee_polish/README.md). /plan/location stays
// mounted with the same shell so existing inbound links don't break.
const AtlasShell = dynamic(() => import('./location/atlas/AtlasShell'), { ssr: false });

export default function PlanPage() {
  return <AtlasShell />;
}
