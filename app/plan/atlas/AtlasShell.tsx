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
import AtlasGlobeClient from "./AtlasGlobeClient";
import {
  POPULAR_SUGGESTIONS,
  resolveDestination,
  type Suggestion,
} from "./destinations";

type SheetState = "peek" | "open" | "full";
type Trip = {
  destination: string;
  lat: number | null;
  lon: number | null;
  mk: string | null;        // monument key when matched, null for free text
};

const STEPS = ["Destination", "Dates", "Style", "Review"] as const;

const EMPTY_TRIP: Trip = { destination: "", lat: null, lon: null, mk: null };

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
      setTrip({ destination: match.name, lat: match.lat, lon: match.lon, mk: match.mk });
      setDest(match.name);
    } else {
      setTrip({ destination: value, lat: null, lon: null, mk: null });
    }
    setSheet("open");
    setStep(1);
  };

  const pickSuggestion = (s: Suggestion) => {
    setTrip({ destination: s.name, lat: s.lat, lon: s.lon, mk: s.mk });
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
      {/* Background globe */}
      <AtlasGlobeClient />

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
            {step === 1 && <StepPlaceholder title="Dates" line="When's the trip?" />}
            {step === 2 && <StepPlaceholder title="Style" line="Luxury, adventure, slow, or something in between." />}
            {step === 3 && <StepPlaceholder title="Review" line="Last look before we save the plan." />}
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
