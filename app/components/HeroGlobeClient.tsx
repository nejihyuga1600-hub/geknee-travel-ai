"use client";
// Client-only wrapper so app/page.tsx (a server component) can embed the
// hero globe without bundling three.js into its SSR pass. Same pattern as
// PublicGlobeClient on /u/[handle].

import dynamic from "next/dynamic";

const HeroGlobe = dynamic(() => import("./HeroGlobe"), {
  ssr: false,
  // While the globe chunk loads, render nothing — the parent's existing
  // CSS gradient + ring decorations stay visible behind the empty box.
  loading: () => null,
});

export default function HeroGlobeClient() {
  return <HeroGlobe />;
}
