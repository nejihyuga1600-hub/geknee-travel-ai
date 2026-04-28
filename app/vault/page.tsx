'use client';

import { useState } from 'react';
import Link from 'next/link';

// ─── E4 · File vault ───────────────────────────────────────────────────────
// Passport-sticker grid. v0: ships the visual surface; backend wiring to
// the existing `/api/trips/[id]/files` endpoint lands as a follow-up so the
// design pass can be reviewed in isolation.

const MONO = 'var(--font-mono-display), ui-monospace, monospace';
const DISPLAY = 'var(--font-display), Georgia, serif';

interface VaultFile {
  kind: 'passport' | 'flight' | 'hotel' | 'visa' | 'insurance' | 'voucher';
  label: string;
  meta: string;
  glyph: string;
  color: string;
  stamp: string;
}

// Until the backend wires up: representative content from the design mock.
const MOCK_FILES: VaultFile[] = [
  { kind: 'passport',  label: 'Passport',         meta: 'Vietnam · exp. 2031', glyph: String.fromCodePoint(0x23DA), color: '#fbbf24', stamp: 'CURRENT' },
  { kind: 'flight',    label: 'JAL · SFO → ITM',  meta: 'APR 13 · seat 22A',   glyph: String.fromCodePoint(0x2708), color: '#7dd3fc', stamp: 'TICKET' },
  { kind: 'flight',    label: 'JAL · ITM → SFO',  meta: 'APR 17 · seat 18C',   glyph: String.fromCodePoint(0x2708), color: '#7dd3fc', stamp: 'TICKET' },
  { kind: 'hotel',     label: 'Park Hyatt Kyoto', meta: '3 nights · 4106',     glyph: String.fromCodePoint(0x25EC), color: '#a78bfa', stamp: 'CONFIRMED' },
  { kind: 'visa',      label: 'Japan eVisa',      meta: 'Multi-entry · 30d',   glyph: String.fromCodePoint(0x25F7), color: '#7cff97', stamp: 'APPROVED' },
  { kind: 'insurance', label: 'World Nomads',     meta: 'APR 13–17',           glyph: String.fromCodePoint(0x25C8), color: '#fb923c', stamp: 'ACTIVE' },
  { kind: 'voucher',   label: 'Tea Camellia',     meta: 'Apr 15 · 1pm',        glyph: String.fromCodePoint(0x25C9), color: '#fbbf24', stamp: 'BOOKED' },
  { kind: 'voucher',   label: 'Kyoto Ramen Lab',  meta: 'Apr 16 · 7pm',        glyph: String.fromCodePoint(0x25C9), color: '#fbbf24', stamp: 'BOOKED' },
];

const FILTERS = ['All', 'Passports', 'Tickets', 'Hotels', 'Visas', 'Vouchers'] as const;

export default function VaultPage() {
  const [filter, setFilter] = useState<typeof FILTERS[number]>('All');
  const filtered = MOCK_FILES.filter(f => {
    switch (filter) {
      case 'All':       return true;
      case 'Passports': return f.kind === 'passport';
      case 'Tickets':   return f.kind === 'flight';
      case 'Hotels':    return f.kind === 'hotel';
      case 'Visas':     return f.kind === 'visa';
      case 'Vouchers':  return f.kind === 'voucher';
    }
  });

  const counts = {
    All: MOCK_FILES.length,
    Passports: MOCK_FILES.filter(f => f.kind === 'passport').length,
    Tickets: MOCK_FILES.filter(f => f.kind === 'flight').length,
    Hotels: MOCK_FILES.filter(f => f.kind === 'hotel').length,
    Visas: MOCK_FILES.filter(f => f.kind === 'visa').length,
    Vouchers: MOCK_FILES.filter(f => f.kind === 'voucher').length,
  };

  return (
    <div style={{
      minHeight: '100svh',
      background: 'var(--brand-bg)',
      color: 'var(--brand-ink)',
      fontFamily: 'var(--font-ui), system-ui, sans-serif',
    }}>
      {/* App bar */}
      <div style={{
        height: 64, padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--brand-border)',
        background: 'rgba(5,5,15,0.85)', backdropFilter: 'blur(16px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/plan" style={{ color: 'var(--brand-accent)', fontSize: 13, textDecoration: 'none' }}>
            {String.fromCodePoint(0x2190)} Itinerary
          </Link>
          <div style={{ fontFamily: DISPLAY, fontSize: 19, color: 'var(--brand-ink)' }}>
            File vault
          </div>
        </div>
        <button style={{
          padding: '8px 14px', borderRadius: 10,
          background: 'var(--brand-accent)', color: 'var(--brand-bg)',
          border: 'none', fontSize: 12, fontWeight: 700,
          fontFamily: 'inherit', cursor: 'pointer',
        }}>
          + Upload
        </button>
      </div>

      {/* Header */}
      <div style={{ padding: '40px 24px 24px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{
          fontFamily: MONO, fontSize: 10, letterSpacing: '0.22em',
          color: 'var(--brand-accent-2)', marginBottom: 12, fontWeight: 600,
        }}>
          {String.fromCodePoint(0x00A7)} PASSPORTS · TICKETS · VOUCHERS · {MOCK_FILES.length} OF 25 GB
        </div>
        <h1 style={{
          margin: 0,
          fontFamily: DISPLAY, fontSize: 'clamp(36px, 6vw, 56px)',
          fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 1, marginBottom: 14,
          color: 'var(--brand-ink)',
        }}>
          Everything in <em style={{ fontStyle: 'italic', color: 'var(--brand-accent)' }}>one passport.</em>
        </h1>
        <p style={{
          fontSize: 13, color: 'var(--brand-ink-dim)', maxWidth: 540, lineHeight: 1.55, margin: 0,
        }}>
          Documents you might need offline. Encrypted at rest. Drag-drop a file or photo to upload.
        </p>
      </div>

      {/* Filter chips */}
      <div style={{
        padding: '0 24px 24px', maxWidth: 1280, margin: '0 auto',
        display: 'flex', gap: 8, overflowX: 'auto',
      }}>
        {FILTERS.map(f => {
          const active = filter === f;
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 12px', borderRadius: 999,
              fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
              background: active ? 'rgba(167,139,250,0.18)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${active ? 'var(--brand-border-hi)' : 'var(--brand-border)'}`,
              color: active ? 'var(--brand-accent)' : 'var(--brand-ink-dim)',
              whiteSpace: 'nowrap', cursor: 'pointer',
            }}>
              {f} · {counts[f]}
            </button>
          );
        })}
      </div>

      {/* File grid */}
      <div style={{
        padding: '0 24px 60px', maxWidth: 1280, margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 20,
      }}>
        {filtered.map((f, i) => <VaultTile key={i} {...f} />)}
        <DropTile />
      </div>
    </div>
  );
}

function VaultTile({ label, meta, glyph, color, stamp }: VaultFile) {
  return (
    <div style={{
      aspectRatio: '3/4', borderRadius: 14,
      background: 'var(--brand-surface-solid)',
      border: '1px solid var(--brand-border)',
      padding: 18, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      transition: 'transform 200ms var(--ease-out), border-color 200ms',
    }}>
      {/* Stamp overlay */}
      <div style={{
        position: 'absolute', top: 18, right: -12, transform: 'rotate(8deg)',
        padding: '4px 16px',
        fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: '0.18em',
        border: `2px solid ${color}`, color,
        background: 'rgba(10,10,31,0.7)', borderRadius: 3,
      }}>{stamp}</div>

      {/* Big glyph */}
      <div style={{
        fontSize: 64, color, opacity: 0.42, marginTop: 6,
        fontFamily: DISPLAY, lineHeight: 1,
      }}>{glyph}</div>

      {/* Label */}
      <div>
        <div style={{
          fontFamily: DISPLAY, fontSize: 18, fontWeight: 400,
          letterSpacing: '-0.005em', lineHeight: 1.2, marginBottom: 6,
          color: 'var(--brand-ink)',
        }}>{label}</div>
        <div style={{
          fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em',
          color: 'var(--brand-ink-mute)',
        }}>{meta.toUpperCase()}</div>
      </div>

      {/* Bottom row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 10, borderTop: '1px solid var(--brand-border)',
      }}>
        <span style={{ fontSize: 11, color: 'var(--brand-ink-mute)', cursor: 'pointer' }}>
          {String.fromCodePoint(0x2193)} Download
        </span>
        <span style={{ fontSize: 14, color: 'var(--brand-ink-mute)', cursor: 'pointer' }}>
          {String.fromCodePoint(0x22EE)}
        </span>
      </div>
    </div>
  );
}

function DropTile() {
  return (
    <div style={{
      aspectRatio: '3/4', borderRadius: 14,
      border: '1.5px dashed rgba(167,139,250,0.35)',
      background: 'rgba(167,139,250,0.04)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 10,
      color: 'rgba(167,139,250,0.7)', fontSize: 13, fontWeight: 500,
      cursor: 'pointer',
    }}>
      <div style={{ fontSize: 30, fontFamily: DISPLAY, lineHeight: 1 }}>+</div>
      <div>Drop a file</div>
    </div>
  );
}
