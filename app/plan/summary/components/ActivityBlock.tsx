'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EditableLine } from './EditableLine';
import type { ActivityGroup } from '../lib/itinerary-parse';
import type { EditTarget } from '../lib/types';
import { extractPlace, fetchPlaceImage, imgCache } from '../lib/places';

// Single activity row inside a day-card section. Numbered pin (lavender or
// gold for monument quests), headline as an EditableLine, always-visible
// details, and a tap-to-zoom thumbnail of the place on the right that
// opens a fullscreen lightbox via React portal (so sticky/transform
// ancestors don't clip it).

export interface ActivityBlockProps {
  group: Extract<ActivityGroup, { type: 'activity' }>;
  sectionIdx: number;
  editTarget: EditTarget | null;
  editValue: string;
  onStartEdit: (sectionIdx: number, lineIdx: number, current: string) => void;
  onEditChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onAskGenie: (line: string) => void;
  city?: string;
  activityNumber?: number;
  // Number of the activity this transit segment leads to. When present,
  // the transit chip suffixes "→ step N" so users can see exactly which
  // step they're heading to next.
  nextActivityNumber?: number;
}

function PlaceThumb({ place, city }: { place: string; city?: string }) {
  const cacheKey = city ? `${place}||${city}` : place;
  const cached = imgCache.has(cacheKey) ? (imgCache.get(cacheKey) || null) : undefined;
  const [src, setSrc] = useState<string | null | undefined>(cached);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (imgCache.has(cacheKey)) { setSrc(imgCache.get(cacheKey) || null); return; }
    fetchPlaceImage(place, city).then(url => {
      imgCache.set(cacheKey, url ?? '');
      setSrc(url);
    });
  }, [cacheKey, place, city]);

  // Lightbox-open side effects: close on Esc, lock body scroll so the
  // page behind doesn't jiggle while the overlay is up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const prevOverflow = document.body.style.overflow;
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => { if (src) setOpen(true); }}
        disabled={!src}
        aria-label={src ? `View larger photo of ${place}` : place}
        style={{
          width: 96, height: 96, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          cursor: src ? 'zoom-in' : 'default',
          padding: 0, position: 'relative',
        }}
      >
        {src && (
          <img
            src={src} alt={place} loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
      </button>
      {open && src && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setOpen(false)}
          role="dialog"
          aria-label={`Photo of ${place}`}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.94)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '5vh 5vw', cursor: 'zoom-out',
          }}
        >
          <img
            src={src} alt={place}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
              borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              cursor: 'default',
            }}
          />
          <div style={{
            position: 'absolute', bottom: 'max(24px, env(safe-area-inset-bottom))',
            left: 0, right: 0, textAlign: 'center',
            color: '#fff', fontSize: 14, fontWeight: 600, letterSpacing: 0.2,
            pointerEvents: 'none', textShadow: '0 1px 8px rgba(0,0,0,0.6)',
          }}>{place}</div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close photo"
            style={{
              position: 'absolute', top: 'max(20px, env(safe-area-inset-top))', right: 20,
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)', border: 'none',
              color: '#fff', fontSize: 20, lineHeight: 1, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>,
        document.body
      )}
    </>
  );
}

// Pull scannable metadata out of the existing markdown the model already
// emits, so we can render it as chips alongside the prose. Pure regex —
// no prompt change required. Each helper returns `null` when the data
// isn't there so chips degrade gracefully.

const TRANSIT_LINE_RE = /^\s*(🚶|🚇|🚌|🚕|🚂|🚆|🚴|⛵|✈️|🛩|🛬|🚁|🚖|🛺|🚊|🚋)\s*~?\s*(\d+)\s*(?:min(?:ute)?s?|hrs?|hours?)/iu;

function parseDuration(headline: string): string | null {
  const m = headline.match(/\(\s*~?\s*(\d+(?:\.\d+)?)\s*(hrs?|hours?|mins?|minutes?)\s*\)/i);
  if (!m) return null;
  const unit = /^h/i.test(m[2]) ? 'hr' : 'min';
  return `~${m[1]} ${unit}${m[1] === '1' ? '' : 's'}`;
}

function parseCost(details: { line: string }[], headline: string): string | null {
  const text = headline + ' ' + details.map(d => d.line).join(' ');
  // Symbol-led match including ₹ (rupee), ₩ (won), ฿ (baht), zł, kr.
  const sym = text.match(/[$¥€£₹₩฿][\s]?[\d,]+(?:[-–][\d,]+)?/);
  if (sym) return sym[0].replace(/\s/g, '');
  // Trailing-currency phrasing: "30 USD", "1,500 yen", "650 INR"
  const trailing = text.match(/(\d{1,4}(?:,\d{3})*(?:[-–]\d{1,4}(?:,\d{3})*)?)\s*(USD|EUR|GBP|JPY|YEN|INR|KRW|THB|RMB|CNY|RUB|MXN|CAD|AUD)\b/i);
  if (trailing) return `${trailing[1]} ${trailing[2].toUpperCase()}`;
  return null;
}

function parseTransit(
  details: { line: string }[],
  nextActivityNumber?: number,
): { icon: string; label: string } | null {
  for (const { line } of details) {
    const m = line.match(TRANSIT_LINE_RE);
    if (!m) continue;
    const mode = line
      .replace(TRANSIT_LINE_RE, '')
      .match(/(walk(?:ing)?|subway|metro|bus|taxi|cab|train|bike|cycle|ferry|tram|drive|driving|flight)/i)?.[0]
      ?.toLowerCase();
    const base = `${m[2]} min${mode ? ' ' + mode : ''}`;
    const target = nextActivityNumber !== undefined ? ` → step ${nextActivityNumber}` : '';
    return { icon: m[1], label: base + target };
  }
  return null;
}

// Strip the parenthetical duration token from a headline so the rendered
// text doesn't repeat what the chip already shows. e.g.
//   "Activity at **Place** *(~2 hrs)*."  →  "Activity at **Place**."
function stripDurationFromLine(line: string): string {
  return line
    .replace(/\s*\*?\(\s*~?\s*\d+(?:\.\d+)?\s*(?:hrs?|hours?|mins?|minutes?)\s*\)\*?/gi, '')
    .replace(/\s+([.,;:!?])/g, '$1') // tidy up dangling space-before-punct
    .trim();
}

// Strip cost mentions from descriptive text once we've chipped the price.
// Handles:
//   "Entry: ₹650 (~$7.80 USD)."
//   "Cost: $30 per person."
//   "₹650 per person."
//   bare "(~$7.80 USD)" parentheticals after a primary symbol-led price.
function stripCostFromLine(line: string): string {
  return line
    .replace(/\s*(?:Entry|Cost|Price|Admission|Ticket|Fee)s?:\s*[$¥€£₹₩฿][\s]?[\d,]+(?:[-–][\d,]+)?(?:\s*\(\s*~?\s*\$?[\d,.]+\s*[A-Z]{0,3}\s*\))?\.?/gi, '')
    .replace(/\s*[$¥€£₹₩฿][\s]?[\d,]+\s*(?:per\s+person|pp|each|p\.p\.)\.?/gi, '')
    .replace(/\s*\(\s*~?\s*\$?[\d,.]+\s*[A-Z]{2,4}\s*\)/g, '')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

function Chip({ icon, label, accent }: { icon?: string; label: string; accent?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 10.5, lineHeight: 1.4,
      color: accent ?? 'rgba(255,255,255,0.6)',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 6, padding: '3px 8px',
      fontFamily: 'var(--font-mono-display), ui-monospace, monospace',
      letterSpacing: '0.03em',
      whiteSpace: 'nowrap',
    }}>
      {icon && <span style={{ fontSize: 11 }}>{icon}</span>}
      <span>{label}</span>
    </span>
  );
}

export function ActivityBlock({
  group, sectionIdx, editTarget, editValue,
  onStartEdit, onEditChange, onCommit, onCancel, onAskGenie,
  city, activityNumber, nextActivityNumber,
}: ActivityBlockProps) {
  const place = extractPlace(group.headline);
  const duration = parseDuration(group.headline);
  const cost = parseCost(group.details, group.headline);
  const transit = parseTransit(group.details, nextActivityNumber);
  const hasAnyChip = !!(duration || cost || transit);

  // Display-side strips: hide the data we already chipped so the user
  // doesn't read the same number twice. The underlying group.headline /
  // group.details still hold the original text, so editing (via
  // onStartEdit's `current` arg, which is the raw line) keeps full
  // fidelity if the user clicks to edit.
  const displayHeadline = duration ? stripDurationFromLine(group.headline) : group.headline;
  const visibleDetails = group.details
    .filter(d => !TRANSIT_LINE_RE.test(d.line))
    .map(d => ({ ...d, displayLine: cost ? stripCostFromLine(d.line) : d.line }));
  const hasDetails = visibleDetails.some(d => d.displayLine.trim());

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Headline row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {activityNumber !== undefined ? (() => {
          const isMonument = /monument|quest|⏚|temple|shrine|cathedral|landmark|tower|palace|castle/i.test(group.headline);
          return (
            <div style={{
              flexShrink: 0, marginTop: 3,
              width: 22, height: 22, borderRadius: '50%',
              background: isMonument ? 'var(--brand-gold)' : 'rgba(167,139,250,0.15)',
              border: `1.5px solid ${isMonument ? 'var(--brand-bg)' : 'rgba(167,139,250,0.45)'}`,
              color: isMonument ? 'var(--brand-bg)' : 'var(--brand-accent)',
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono-display), ui-monospace, monospace',
            }}>{activityNumber}</div>
          );
        })() : (
          <div style={{ width: 22, flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <EditableLine
            line={displayHeadline}
            isEditing={editTarget?.sectionIdx === sectionIdx && editTarget?.lineIdx === group.headlineIdx}
            editValue={editValue}
            onStartEdit={() => onStartEdit(sectionIdx, group.headlineIdx, group.headline)}
            onEditChange={onEditChange}
            onCommit={onCommit}
            onCancel={onCancel}
            onAskGenie={onAskGenie}
          />
          {hasAnyChip && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {duration && <Chip icon="⏱" label={duration} />}
              {/* Price sits next to time so the user reads "how long /
                  how much" as one scan. */}
              {cost && <Chip label={cost} accent="#fbbf24" />}
              {transit && <Chip icon={transit.icon} label={transit.label} />}
            </div>
          )}
          {hasDetails && (
            <div style={{
              marginTop: 6,
              paddingLeft: 12,
              borderLeft: '2px solid rgba(56,189,248,0.2)',
            }}>
              {visibleDetails.map(({ line, idx, displayLine }) => (
                <EditableLine
                  key={idx}
                  line={displayLine}
                  isEditing={editTarget?.sectionIdx === sectionIdx && editTarget?.lineIdx === idx}
                  editValue={editValue}
                  onStartEdit={() => onStartEdit(sectionIdx, idx, line)}
                  onEditChange={onEditChange}
                  onCommit={onCommit}
                  onCancel={onCancel}
                  onAskGenie={onAskGenie}
                />
              ))}
            </div>
          )}
        </div>
        {place && <PlaceThumb place={place} city={city} />}
      </div>
    </div>
  );
}
