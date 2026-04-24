"use client";
// Atlas shell — variant A from the 2026-04-24 design session. The full
// flow (destination → dates → style → review) is staged across a single
// bottom sheet with three states: peek / open / full. This file is the
// scaffolding: globe background, top nav, sheet choreography, step
// stepper, and empty step bodies. Wiring each step to the live trip
// APIs is the next phase — see .planning/design-2026-04-24/prototype/
// variant-atlas.jsx and atlas-panels.jsx for the target shape.

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  POPULAR_SUGGESTIONS,
  resolveDestination,
  type Suggestion,
} from "./destinations";

// LocationClient is the live planner — when mounted with chromeless, it
// renders only the real R3F globe (country borders, monuments, click-to-fly,
// procedural Earth texture). ssr:false because it touches window at module
// scope. Dynamic import keeps Atlas's first paint cheap.
const PlannerGlobe = dynamic(() => import("../LocationClient"), { ssr: false, loading: () => null });

type SheetState = "peek" | "open" | "full";
type TripStyle = "luxury" | "adventure" | "slow" | "mix";
type Trip = {
  destination: string;
  lat: number | null;
  lon: number | null;
  mk: string | null;        // monument key when matched, null for free text
  startDate: string;        // YYYY-MM-DD
  nights: number;           // 1-30
  style: TripStyle | null;
};

const STEPS = ["Destination", "Dates", "Style", "Review"] as const;

const EMPTY_TRIP: Trip = {
  destination: "",
  lat: null, lon: null, mk: null,
  startDate: "", nights: 7, style: null,
};

const STYLE_OPTIONS: { id: TripStyle; label: string; tag: string }[] = [
  { id: "luxury",    label: "Luxury",    tag: "Hotels, fine meals, paced." },
  { id: "adventure", label: "Adventure", tag: "Hike, climb, sleep rough." },
  { id: "slow",      label: "Slow",      tag: "One city, deep time." },
  { id: "mix",       label: "Mix",       tag: "A bit of everything." },
];

function addDays(yyyymmdd: string, n: number): string {
  if (!yyyymmdd) return "";
  const d = new Date(yyyymmdd + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function AtlasShell() {
  const [sheet, setSheet] = useState<SheetState>("peek");
  const [step, setStep] = useState(0);
  const [dest, setDest] = useState("");
  const [trip, setTrip] = useState<Trip>(EMPTY_TRIP);

  const sheetHeight = sheet === "peek" ? 108 : sheet === "open" ? 420 : "85%";

  const cycleSheet = () =>
    setSheet((s) => (s === "peek" ? "open" : s === "open" ? "full" : "peek"));

  // Resolve typed destination → trip state. Matched monument gives us a
  // mk + lat/lon for the globe pin (next phase). Unmatched still proceeds
  // — the trip just doesn't have a pin yet.
  const submitDest = (raw?: string) => {
    const value = (raw ?? dest).trim();
    if (!value) return;
    const match = resolveDestination(value);
    if (match) {
      setTrip({ ...trip, destination: match.name, lat: match.lat, lon: match.lon, mk: match.mk });
      setDest(match.name);
    } else {
      setTrip({ ...trip, destination: value, lat: null, lon: null, mk: null });
    }
    setSheet("open");
    setStep(1);
  };

  const pickSuggestion = (s: Suggestion) => {
    setTrip({ ...trip, destination: s.name, lat: s.lat, lon: s.lon, mk: s.mk });
    setDest(s.name);
    setSheet("open");
    setStep(1);
  };

  return (
    <main
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100svh",
        background:
          "radial-gradient(ellipse at 50% 40%, var(--brand-bg2) 0%, var(--brand-bg) 70%)",
        color: "var(--brand-ink)",
        fontFamily: "var(--font-ui), system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Background globe — real LocationClient planet, no chrome. */}
      <PlannerGlobe chromeless />

      {/* Top bar */}
      <nav
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 24px",
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 14px",
            borderRadius: 999,
            background: "var(--brand-surface)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--brand-border)",
            color: "var(--brand-ink)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textDecoration: "none",
            textTransform: "uppercase",
          }}
        >
          {String.fromCodePoint(0x1f30d)} Home
        </Link>
        <span
          style={{
            fontSize: 10,
            color: "var(--brand-ink-mute)",
            letterSpacing: "0.12em",
            marginLeft: 12,
            flex: 1,
          }}
        >
          · AUTO-SAVED
        </span>

        <div style={{ display: "flex", gap: 8 }}>
          <NavPill href="/u/nghia">Collection</NavPill>
          <NavPill href="/pricing" accent>
            Go Pro
          </NavPill>
          <NavPill href="/leaderboard">Leaderboard</NavPill>
        </div>
      </nav>

      {/* Peek-state hero line — Fraunces serif, lavender emphasis */}
      {sheet === "peek" && (
        <div
          style={{
            position: "absolute",
            top: 92,
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display), Georgia, serif",
              fontSize: "clamp(36px, 6vw, 56px)",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              lineHeight: 1.08,
              marginBottom: 10,
            }}
          >
            Where are you{" "}
            <em
              style={{
                fontStyle: "italic",
                color: "var(--brand-accent)",
              }}
            >
              wandering
            </em>
            ?
          </div>
          <div
            style={{
              color: "var(--brand-ink-dim)",
              fontSize: 13,
              letterSpacing: "0.04em",
            }}
          >
            Spin the globe · tap a landmark · or type below
          </div>
        </div>
      )}

      {/* Bottom sheet */}
      <section
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 20,
          height: sheetHeight,
          background: "linear-gradient(180deg, rgba(10,10,31,0.85), rgba(10,10,31,0.98))",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid var(--brand-border)",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
          transition: "height 500ms cubic-bezier(0.23, 1, 0.32, 1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Grab bar */}
        <div
          onClick={cycleSheet}
          role="button"
          tabIndex={0}
          aria-label="Toggle sheet"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px 12px",
            borderBottom:
              sheet !== "peek" ? "1px solid var(--brand-border)" : "none",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 40,
              height: 3,
              borderRadius: 2,
              background: "var(--brand-ink-mute)",
              opacity: 0.55,
              position: "absolute",
              top: 7,
              left: "50%",
              transform: "translateX(-50%)",
            }}
          />

          {sheet === "peek" ? (
            <input
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitDest()}
              onClick={(e) => e.stopPropagation()}
              placeholder="Try 'Kyoto', 'Iceland', 'somewhere warm'…"
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid var(--brand-border)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--brand-ink)",
                fontSize: 15,
                fontFamily: "var(--font-ui), system-ui, sans-serif",
                outline: "none",
              }}
            />
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  overflowX: "auto",
                  paddingTop: 4,
                }}
              >
                {STEPS.map((label, i) => (
                  <StepMarker
                    key={label}
                    idx={i}
                    label={label}
                    active={step === i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStep(i);
                    }}
                  />
                ))}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSheet("peek");
                }}
                aria-label="Collapse"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--brand-ink-mute)",
                  fontSize: 20,
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                {String.fromCodePoint(0x2193)}
              </button>
            </>
          )}
        </div>

        {/* Step content — placeholders until the next phase wires real
            trip state. The structure matches the design prototype so
            real implementation drops into the right slots. */}
        {sheet !== "peek" && (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px 28px 32px",
            }}
          >
            {step === 0 && (
              <StepDestination
                dest={dest}
                setDest={setDest}
                submitDest={submitDest}
                pickSuggestion={pickSuggestion}
                trip={trip}
                onNext={() => setStep(1)}
              />
            )}
            {step === 1 && (
              <StepDates
                trip={trip}
                setTrip={setTrip}
                onBack={() => setStep(0)}
                onNext={() => setStep(2)}
              />
            )}
            {step === 2 && (
              <StepStyle
                trip={trip}
                setTrip={setTrip}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            )}
            {step === 3 && (
              <StepReview
                trip={trip}
                onBack={() => setStep(2)}
              />
            )}
          </div>
        )}
      </section>

      {/* Visible note — this is shell v0, wiring lands next */}
      <div
        style={{
          position: "absolute",
          top: 70,
          right: 24,
          zIndex: 30,
          background: "var(--brand-surface)",
          backdropFilter: "blur(12px)",
          border: "1px solid var(--brand-border-hi)",
          borderRadius: 12,
          padding: "10px 14px",
          fontSize: 11,
          color: "var(--brand-ink-dim)",
          fontFamily: "var(--font-ui), system-ui, sans-serif",
          maxWidth: 280,
        }}
      >
        <div style={{ color: "var(--brand-accent)", fontWeight: 700, fontSize: 10, letterSpacing: "0.08em" }}>
          ATLAS · SHELL V0
        </div>
        <div style={{ marginTop: 4 }}>
          Variant A from the design session. Flow wiring lands next phase.
          Meanwhile{" "}
          <Link
            href="/plan/location"
            style={{ color: "var(--brand-accent-2)", textDecoration: "underline" }}
          >
            use the live planner
          </Link>
          .
        </div>
      </div>
    </main>
  );
}

function NavPill({
  children,
  href,
  accent,
}: {
  children: React.ReactNode;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 999,
        background: accent
          ? "rgba(167, 139, 250, 0.16)"
          : "var(--brand-surface)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${accent ? "var(--brand-border-hi)" : "var(--brand-border)"}`,
        color: "var(--brand-ink)",
        fontSize: 12,
        fontWeight: accent ? 700 : 500,
        letterSpacing: "0.02em",
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}

function StepMarker({
  idx,
  label,
  active,
  onClick,
}: {
  idx: number;
  label: string;
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        padding: "4px 2px",
        color: active ? "var(--brand-ink)" : "var(--brand-ink-mute)",
        fontFamily: "var(--font-ui), system-ui, sans-serif",
        fontSize: 12,
        letterSpacing: "0.03em",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          fontSize: 11,
          fontWeight: 700,
          background: active ? "var(--brand-accent)" : "transparent",
          color: active ? "#0a0a1f" : "var(--brand-ink-mute)",
          border: active
            ? "1px solid var(--brand-accent)"
            : "1px solid var(--brand-border)",
        }}
      >
        {idx + 1}
      </span>
      {label}
    </button>
  );
}

function StepPlaceholder({ title, line }: { title: string; line: string }) {
  return (
    <div>
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-display), Georgia, serif",
          fontSize: 28,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          color: "var(--brand-ink)",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          marginTop: 10,
          color: "var(--brand-ink-dim)",
          fontSize: 14,
          lineHeight: 1.5,
          maxWidth: 560,
        }}
      >
        {line}
      </p>
      <div
        style={{
          marginTop: 24,
          padding: 18,
          borderRadius: 12,
          border: "1px dashed var(--brand-border)",
          color: "var(--brand-ink-mute)",
          fontSize: 12,
          fontFamily: "var(--font-ui), system-ui, sans-serif",
        }}
      >
        {String.fromCodePoint(0x2728)} Step content lands in the next phase. The
        live planner at{" "}
        <Link
          href="/plan/location"
          style={{ color: "var(--brand-accent-2)" }}
        >
          /plan/location
        </Link>{" "}
        remains the production flow for now.
      </div>
    </div>
  );
}

function StepDestination({
  dest,
  setDest,
  submitDest,
  pickSuggestion,
  trip,
  onNext,
}: {
  dest: string;
  setDest: (v: string) => void;
  submitDest: (v?: string) => void;
  pickSuggestion: (s: Suggestion) => void;
  trip: Trip;
  onNext: () => void;
}) {
  return (
    <div>
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-display), Georgia, serif",
          fontSize: 28,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          color: "var(--brand-ink)",
        }}
      >
        Where to
        <em style={{ fontStyle: "italic", color: "var(--brand-accent)" }}>?</em>
      </h2>
      <p
        style={{
          marginTop: 8,
          color: "var(--brand-ink-dim)",
          fontSize: 13,
          lineHeight: 1.5,
          maxWidth: 560,
        }}
      >
        Type a city, country, or landmark — or pick one of the popular spots below.
      </p>

      <input
        value={dest}
        onChange={(e) => setDest(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submitDest()}
        placeholder="Try 'Kyoto', 'Iceland', 'Eiffel Tower'…"
        style={{
          width: "100%",
          marginTop: 16,
          padding: "12px 16px",
          borderRadius: 12,
          border: "1px solid var(--brand-border)",
          background: "rgba(255,255,255,0.04)",
          color: "var(--brand-ink)",
          fontSize: 15,
          fontFamily: "var(--font-ui), system-ui, sans-serif",
          outline: "none",
        }}
      />

      <div
        style={{
          marginTop: 20,
          fontSize: 11,
          color: "var(--brand-ink-mute)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Popular
      </div>
      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 10,
        }}
      >
        {POPULAR_SUGGESTIONS.map((s) => {
          const active = trip.mk === s.mk;
          return (
            <button
              key={s.mk}
              onClick={() => pickSuggestion(s)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                background: active
                  ? "rgba(167, 139, 250, 0.12)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${active ? "var(--brand-border-hi)" : "var(--brand-border)"}`,
                color: "var(--brand-ink)",
                fontFamily: "var(--font-ui), system-ui, sans-serif",
                fontSize: 13,
                fontWeight: 500,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 18 }}>{s.emoji}</span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    display: "block",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.name}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "var(--brand-ink-mute)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.location}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer state — confirms what's recorded so far + Next */}
      <div
        style={{
          marginTop: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div
          style={{
            color: "var(--brand-ink-mute)",
            fontSize: 12,
            fontFamily: "var(--font-ui), system-ui, sans-serif",
          }}
        >
          {trip.destination ? (
            <>
              <span style={{ color: "var(--brand-accent-2)" }}>{String.fromCodePoint(0x2713)}</span>{" "}
              {trip.destination}
              {trip.mk && (
                <span style={{ marginLeft: 8, color: "var(--brand-ink-mute)" }}>
                  · pinned
                </span>
              )}
            </>
          ) : (
            "no destination yet"
          )}
        </div>
        <button
          onClick={onNext}
          disabled={!trip.destination}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: trip.destination
              ? "linear-gradient(135deg, var(--brand-accent), var(--brand-accent-2))"
              : "rgba(255,255,255,0.04)",
            color: trip.destination ? "#0a0a1f" : "var(--brand-ink-mute)",
            fontFamily: "var(--font-ui), system-ui, sans-serif",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.02em",
            cursor: trip.destination ? "pointer" : "not-allowed",
          }}
        >
          Next {String.fromCodePoint(0x2192)}
        </button>
      </div>
    </div>
  );
}

// ─── Steps 1-3 (minimum viable Atlas v0) ────────────────────────────────────
// Lean implementations so the whole flow works end-to-end. Heavier date
// pickers / style sliders / itinerary preview can land in v1 if Atlas
// wins the A/B against the existing /plan/* routes.

function StepHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <>
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-display), Georgia, serif",
          fontSize: 28,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          color: "var(--brand-ink)",
        }}
      >
        {title}
      </h2>
      {hint && (
        <p style={{ marginTop: 8, color: "var(--brand-ink-dim)", fontSize: 13, lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
    </>
  );
}

function StepNav({
  onBack,
  onNext,
  nextLabel = "Next",
  nextDisabled,
  busy,
  rightSlot,
}: {
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  busy?: boolean;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div
      style={{
        marginTop: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <button
        onClick={onBack}
        style={{
          padding: "8px 14px",
          borderRadius: 10,
          border: "1px solid var(--brand-border)",
          background: "transparent",
          color: "var(--brand-ink-dim)",
          fontFamily: "var(--font-ui), system-ui, sans-serif",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        {String.fromCodePoint(0x2190)} Back
      </button>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {rightSlot}
        {onNext && (
          <button
            onClick={onNext}
            disabled={nextDisabled || busy}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: nextDisabled
                ? "rgba(255,255,255,0.04)"
                : "linear-gradient(135deg, var(--brand-accent), var(--brand-accent-2))",
              color: nextDisabled ? "var(--brand-ink-mute)" : "#0a0a1f",
              fontFamily: "var(--font-ui), system-ui, sans-serif",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.02em",
              cursor: nextDisabled || busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Saving…" : `${nextLabel} ${String.fromCodePoint(0x2192)}`}
          </button>
        )}
      </div>
    </div>
  );
}

function StepDates({
  trip, setTrip, onBack, onNext,
}: {
  trip: Trip;
  setTrip: (t: Trip) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const endDate = trip.startDate ? addDays(trip.startDate, trip.nights) : "";
  const valid = !!trip.startDate && trip.nights >= 1 && trip.nights <= 90;

  return (
    <div>
      <StepHeader title="When's the trip?" hint="Start date and nights — that's all we need to scaffold the plan." />

      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 140px", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--brand-ink-mute)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Start date
          </span>
          <input
            type="date"
            min={today}
            value={trip.startDate}
            onChange={(e) => setTrip({ ...trip, startDate: e.target.value })}
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid var(--brand-border)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--brand-ink)",
              fontSize: 14,
              fontFamily: "var(--font-ui), system-ui, sans-serif",
              outline: "none",
              colorScheme: "dark",
            }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--brand-ink-mute)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Nights
          </span>
          <input
            type="number"
            min={1} max={90}
            value={trip.nights}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (Number.isFinite(n)) setTrip({ ...trip, nights: Math.min(90, Math.max(1, n)) });
            }}
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid var(--brand-border)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--brand-ink)",
              fontSize: 14,
              fontFamily: "var(--font-ui), system-ui, sans-serif",
              outline: "none",
            }}
          />
        </label>
      </div>

      {endDate && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 14px",
            background: "rgba(167, 139, 250, 0.08)",
            border: "1px solid var(--brand-border-hi)",
            borderRadius: 10,
            color: "var(--brand-ink-dim)",
            fontSize: 12,
            fontFamily: "var(--font-ui), system-ui, sans-serif",
          }}
        >
          Returns <strong style={{ color: "var(--brand-ink)" }}>{endDate}</strong>
          {" · "}
          {trip.nights} night{trip.nights === 1 ? "" : "s"}
          {trip.destination && (
            <>
              {" "}in <strong style={{ color: "var(--brand-ink)" }}>{trip.destination}</strong>
            </>
          )}
        </div>
      )}

      <StepNav onBack={onBack} onNext={onNext} nextDisabled={!valid} />
    </div>
  );
}

function StepStyle({
  trip, setTrip, onBack, onNext,
}: {
  trip: Trip;
  setTrip: (t: Trip) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <StepHeader title="What's the vibe?" hint="Pick one — it shapes the kind of itinerary we'll draft." />

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 10,
        }}
      >
        {STYLE_OPTIONS.map((s) => {
          const active = trip.style === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setTrip({ ...trip, style: s.id })}
              style={{
                padding: "16px 16px",
                borderRadius: 12,
                border: `1px solid ${active ? "var(--brand-border-hi)" : "var(--brand-border)"}`,
                background: active ? "rgba(167, 139, 250, 0.12)" : "rgba(255,255,255,0.03)",
                color: "var(--brand-ink)",
                fontFamily: "var(--font-ui), system-ui, sans-serif",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display), Georgia, serif",
                  fontSize: 22,
                  fontWeight: 500,
                  color: active ? "var(--brand-accent)" : "var(--brand-ink)",
                  letterSpacing: "-0.01em",
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: 12, color: "var(--brand-ink-dim)", marginTop: 4 }}>
                {s.tag}
              </div>
            </button>
          );
        })}
      </div>

      <StepNav onBack={onBack} onNext={onNext} nextDisabled={!trip.style} />
    </div>
  );
}

function StepReview({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedTripId, setSavedTripId] = useState<string | null>(null);
  const endDate = trip.startDate ? addDays(trip.startDate, trip.nights) : "";

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Trip to ${trip.destination}`,
          location: trip.destination,
          startDate: trip.startDate || null,
          endDate: endDate || null,
          nights: trip.nights,
          style: trip.style ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Couldn't save the trip — try again.");
      } else {
        setSavedTripId(data?.trip?.id ?? data?.id ?? "");
      }
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <StepHeader title="Review" hint="Last look before we save the plan." />

      <dl
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "120px 1fr",
          rowGap: 10,
          columnGap: 14,
          fontFamily: "var(--font-ui), system-ui, sans-serif",
          fontSize: 14,
        }}
      >
        <DT>Destination</DT><DD>{trip.destination || "—"}</DD>
        <DT>Dates</DT>
        <DD>
          {trip.startDate
            ? `${trip.startDate} → ${endDate} (${trip.nights} night${trip.nights === 1 ? "" : "s"})`
            : "—"}
        </DD>
        <DT>Style</DT><DD>{trip.style ? capitalize(trip.style) : "—"}</DD>
        {trip.mk && <><DT>Pin</DT><DD>{trip.mk}</DD></>}
      </dl>

      {error && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 14px",
            background: "rgba(248, 113, 113, 0.08)",
            border: "1px solid rgba(248, 113, 113, 0.35)",
            borderRadius: 10,
            color: "var(--brand-danger)",
            fontSize: 12,
            fontFamily: "var(--font-ui), system-ui, sans-serif",
          }}
        >
          {error}
          {error.toLowerCase().includes("unauth") && (
            <>
              {" "}
              <Link href="/api/auth/signin" style={{ color: "var(--brand-accent-2)", textDecoration: "underline" }}>
                Sign in
              </Link>{" "}
              to save trips.
            </>
          )}
        </div>
      )}

      {savedTripId && (
        <div
          style={{
            marginTop: 14,
            padding: "12px 14px",
            background: "rgba(167, 139, 250, 0.10)",
            border: "1px solid var(--brand-border-hi)",
            borderRadius: 10,
            color: "var(--brand-ink)",
            fontSize: 13,
            fontFamily: "var(--font-ui), system-ui, sans-serif",
          }}
        >
          {String.fromCodePoint(0x2728)} Saved.{" "}
          <Link
            href={`/plan/summary?tripId=${encodeURIComponent(savedTripId)}`}
            style={{ color: "var(--brand-accent-2)", textDecoration: "underline" }}
          >
            Open in summary →
          </Link>
        </div>
      )}

      {savedTripId ? (
        <StepNav onBack={onBack} />
      ) : (
        <StepNav
          onBack={onBack}
          onNext={save}
          nextLabel="Save plan"
          busy={busy}
          nextDisabled={!trip.destination || !trip.startDate || !trip.style}
        />
      )}
    </div>
  );
}

function DT({ children }: { children: React.ReactNode }) {
  return (
    <dt
      style={{
        color: "var(--brand-ink-mute)",
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        alignSelf: "center",
      }}
    >
      {children}
    </dt>
  );
}
function DD({ children }: { children: React.ReactNode }) {
  return (
    <dd style={{ margin: 0, color: "var(--brand-ink)", fontSize: 14 }}>{children}</dd>
  );
}
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
