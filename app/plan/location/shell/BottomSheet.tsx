"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export type SheetState = "peek" | "open" | "full";

type Props = {
  state: SheetState;
  onStateChange: (s: SheetState) => void;
  peek?: ReactNode;
  open?: ReactNode;
  full?: ReactNode;
};

const PEEK_HEIGHT = 100;
const OPEN_HEIGHT_VH = 45;
const OPEN_HEIGHT_MAX = 420;
const FULL_HEIGHT_SVH = 92;

function snap(state: SheetState, deltaY: number): SheetState {
  // deltaY > 0 means dragged DOWN, < 0 means dragged UP.
  const order: SheetState[] = ["peek", "open", "full"];
  const idx = order.indexOf(state);
  if (deltaY < -50 && idx < 2) return order[idx + 1];
  if (deltaY > 50 && idx > 0) return order[idx - 1];
  return state;
}

function heightFor(state: SheetState): string {
  if (state === "peek") return `${PEEK_HEIGHT}px`;
  if (state === "open") return `min(${OPEN_HEIGHT_VH}vh, ${OPEN_HEIGHT_MAX}px)`;
  return `${FULL_HEIGHT_SVH}svh`;
}

export default function BottomSheet({ state, onStateChange, peek, open, full }: Props) {
  const dragRef = useRef<{ startY: number; startState: SheetState } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      dragRef.current = { startY: e.clientY, startState: state };
      setDragOffset(0);
    },
    [state],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setDragOffset(e.clientY - dragRef.current.startY);
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const deltaY = e.clientY - dragRef.current.startY;
      const next = snap(dragRef.current.startState, deltaY);
      dragRef.current = null;
      setDragOffset(0);
      if (next !== state) onStateChange(next);
    },
    [state, onStateChange],
  );

  // Close to peek on Escape from full state
  useEffect(() => {
    if (state !== "full") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onStateChange("peek");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, onStateChange]);

  const isFull = state === "full";

  return (
    <>
      {isFull && (
        <div
          onClick={() => onStateChange("peek")}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 24,
            backdropFilter: "blur(2px)",
          }}
        />
      )}
      <section
        aria-label="Trip planner"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: heightFor(state),
          transform: `translateY(${dragOffset}px)`,
          transition: dragRef.current ? "none" : "height 280ms ease-out, transform 200ms ease-out",
          background: "rgba(6,8,22,0.97)",
          backdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(167,139,250,0.2)",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
          zIndex: 25,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={() => {
            if (state === "peek") onStateChange("open");
          }}
          style={{
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: state === "peek" ? "pointer" : "grab",
            touchAction: "none",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              display: "block",
              width: 36,
              height: 4,
              borderRadius: 2,
              background: "rgba(167,139,250,0.4)",
            }}
          />
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: state === "peek" ? "hidden" : "auto",
            padding: "0 16px 16px",
          }}
        >
          {state === "peek" && peek}
          {state === "open" && (open ?? peek)}
          {state === "full" && (full ?? open ?? peek)}
        </div>
      </section>
    </>
  );
}
