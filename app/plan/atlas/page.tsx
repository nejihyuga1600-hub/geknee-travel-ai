import type { Metadata } from "next";
import AtlasShell from "./AtlasShell";

export const metadata: Metadata = {
  title: "Atlas · plan a trip — geknee",
  description:
    "Globe-first trip planner. Spin the world, pick a landmark, plan in one growing sheet.",
  // Atlas is a parallel-track preview of the next planner UI. Robots can index
  // the existing /plan/location for now; we'll flip when the flow is wired.
  robots: { index: false, follow: false },
};

export default function AtlasPage() {
  return <AtlasShell />;
}
