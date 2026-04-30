'use client';

// Travelpayouts injects a DOM-mutating affiliate-link rewriter (~200 KB of
// runtime + sub-chunks). On the globe pages (/plan, /plan/location) this
// stacks on top of an already heavy R3F/Three.js scene and pushes iOS Safari
// past its memory ceiling, producing the "A problem repeatedly occurred"
// crash. The script only adds value where outbound travel links exist
// (style / book / summary / trip view), so we skip it on the globe.

import { usePathname } from 'next/navigation';

const SKIP_PATHS = ['/plan', '/plan/location', '/plan/location/atlas'];

export default function TravelpayoutsScript() {
  const pathname = usePathname() ?? '';
  if (SKIP_PATHS.includes(pathname)) return null;
  if (process.env.NODE_ENV !== 'production') return null;
  // eslint-disable-next-line @next/next/no-sync-scripts
  return <script src="https://tp-em.com/NTE1NTYz.js?t=515563" async />;
}
