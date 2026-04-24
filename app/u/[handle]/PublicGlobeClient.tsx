"use client";
// Client-only wrapper around PublicGlobe so the server profile page can
// embed it without bundling three.js into its SSR pass. Next 16 forbids
// `ssr: false` on `next/dynamic` from server components, so the gate
// lives here in the client tree.

import dynamic from "next/dynamic";

const PublicGlobe = dynamic(() => import("./PublicGlobe"), { ssr: false });

export default function PublicGlobeClient(props: { collected: { mk: string; displaySkin: string }[] }) {
  return <PublicGlobe {...props} />;
}
