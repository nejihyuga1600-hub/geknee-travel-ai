"use client";

import type { Session } from "next-auth";

type Props = {
  session: Session | null;
  isMobile: boolean;
  notifUnread: number;
  onSignIn: () => void;
  onShop: () => void;
  onUpgrade: () => void;
  onTrips: () => void;
  onSettings: () => void;
};

const PILL_BG = "rgba(6,8,22,0.75)";
const PILL_BORDER = "1px solid rgba(167,139,250,0.35)";
const PILL_BLUR = "blur(12px)";
const PILL_RADIUS = 999;

export default function TopNavPills({
  session,
  isMobile,
  notifUnread,
  onSignIn,
  onShop,
  onUpgrade,
  onTrips,
  onSettings,
}: Props) {
  const height = isMobile ? 32 : 36;
  const padX = isMobile ? 10 : 14;
  const fontSize = isMobile ? 11 : 12;

  const pillBase = {
    height,
    padding: `0 ${padX}px`,
    borderRadius: PILL_RADIUS,
    background: PILL_BG,
    border: PILL_BORDER,
    backdropFilter: PILL_BLUR,
    color: "#c7d2fe",
    fontSize,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
  } as const;

  const proPill = {
    ...pillBase,
    background: "linear-gradient(135deg,#a78bfa,#7dd3fc)",
    border: "none",
    color: "#fff",
    fontWeight: 700,
    boxShadow: "0 2px 12px rgba(167,139,250,0.4)",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 14,
        right: 14,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {session?.user ? (
        <>
          <button onClick={onShop} title="Monument Collection" style={pillBase}>
            <span aria-hidden>{String.fromCodePoint(0x1f3db)}</span>
            {!isMobile && <span>Collection</span>}
          </button>

          <button onClick={onUpgrade} style={proPill}>
            <span aria-hidden>{String.fromCodePoint(0x2728)}</span>
            <span>{isMobile ? "Pro" : "Go Pro"}</span>
          </button>

          <button
            onClick={onTrips}
            title="Trips & Friends"
            style={{ ...pillBase, position: "relative" }}
          >
            <svg
              width={isMobile ? 14 : 13}
              height={isMobile ? 14 : 13}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              <line x1="12" y1="12" x2="12" y2="16" />
              <line x1="10" y1="14" x2="14" y2="14" />
            </svg>
            {!isMobile && <span>Trips</span>}
            {notifUnread > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  background: "#f59e0b",
                  color: "#000",
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "1px 5px",
                  minWidth: 16,
                  textAlign: "center",
                  boxShadow: "0 0 0 2px rgba(6,8,22,0.9)",
                }}
              >
                {notifUnread}
              </span>
            )}
          </button>

          <button
            onClick={onTrips}
            title="Account"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              marginLeft: 2,
              display: "flex",
              alignItems: "center",
            }}
          >
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? "avatar"}
                style={{
                  width: height,
                  height,
                  borderRadius: "50%",
                  border: "2px solid rgba(167,139,250,0.5)",
                }}
              />
            ) : (
              <div
                style={{
                  width: height,
                  height,
                  borderRadius: "50%",
                  background: "rgba(167,139,250,0.25)",
                  border: "2px solid rgba(167,139,250,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#0a0a1f",
                }}
              >
                {(session.user.name ?? session.user.email ?? "?")[0].toUpperCase()}
              </div>
            )}
          </button>
        </>
      ) : (
        <button onClick={onSignIn} style={pillBase}>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>Sign in</span>
        </button>
      )}

      <button
        onClick={onSettings}
        title="Menu"
        style={{
          ...pillBase,
          width: height,
          height,
          padding: 0,
          flexDirection: "column",
          gap: 4,
          color: "rgba(200,210,255,0.8)",
        }}
      >
        <span style={{ display: "block", width: 14, height: 1.5, background: "currentColor", borderRadius: 1 }} />
        <span style={{ display: "block", width: 14, height: 1.5, background: "currentColor", borderRadius: 1 }} />
        <span style={{ display: "block", width: 14, height: 1.5, background: "currentColor", borderRadius: 1 }} />
      </button>
    </div>
  );
}
