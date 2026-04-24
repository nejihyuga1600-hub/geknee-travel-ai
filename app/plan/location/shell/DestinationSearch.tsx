"use client";

import { useState, type FormEvent } from "react";

type Props = {
  onSubmit: (value: string) => void;
  compact?: boolean;
};

export default function DestinationSearch({ onSubmit, compact }: Props) {
  const [value, setValue] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    onSubmit(v);
  };

  return (
    <form
      onSubmit={submit}
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        background: "rgba(167,139,250,0.08)",
        border: "1px solid rgba(167,139,250,0.3)",
        borderRadius: 12,
        padding: compact ? "8px 12px" : "10px 14px",
      }}
    >
      <svg
        width={compact ? 14 : 16}
        height={compact ? 14 : 16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(199,210,254,0.7)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.5" y2="16.5" />
      </svg>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={compact ? "Where to?" : "Search a city or country"}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          color: "#fff",
          fontSize: compact ? 13 : 14,
          minWidth: 0,
        }}
        aria-label="Destination"
      />
      {value.trim() && (
        <button
          type="submit"
          style={{
            background: "linear-gradient(135deg,#a78bfa,#7dd3fc)",
            border: "none",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            padding: compact ? "5px 10px" : "6px 12px",
            borderRadius: 8,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Plan
        </button>
      )}
    </form>
  );
}
