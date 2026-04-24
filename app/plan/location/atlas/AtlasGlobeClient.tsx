"use client";
// SSR-disabled wrapper around AtlasGlobe. Same pattern as HeroGlobeClient
// on the landing and PublicGlobeClient on /u/[handle]. Next 16 forbids
// ssr:false from server components, so the gate lives in a client file.

import dynamic from "next/dynamic";

const AtlasGlobe = dynamic(() => import("./AtlasGlobe"), {
  ssr: false,
  loading: () => null,
});

export default function AtlasGlobeClient() {
  return <AtlasGlobe />;
}
