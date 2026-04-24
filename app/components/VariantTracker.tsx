"use client";
// Surfaces the A/B planner variant to PostHog so every subsequent event
// can be filtered by which planner the user was bucketed into. Fires once
// on mount; PostHog's posthog.register() makes the property sticky for
// the rest of the session, so we don't need a tracker on every page.

import { useEffect } from "react";
import posthog from "posthog-js";

export default function VariantTracker({ variant }: { variant: "atlas" | "location" }) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    // register = sticky super-property attached to every event from now on
    posthog.register({ planner_variant: variant });
    posthog.capture("planner_variant_view", { variant });
  }, [variant]);
  return null;
}
