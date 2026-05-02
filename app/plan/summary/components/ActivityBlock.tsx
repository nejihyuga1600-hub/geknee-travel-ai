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
          width: 80, height: 80, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
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

export function ActivityBlock({
  group, sectionIdx, editTarget, editValue,
  onStartEdit, onEditChange, onCommit, onCancel, onAskGenie, city, activityNumber,
}: ActivityBlockProps) {
  const hasDetails = group.details.some(d => d.line.trim());
  const place = extractPlace(group.headline);

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
            line={group.headline}
            isEditing={editTarget?.sectionIdx === sectionIdx && editTarget?.lineIdx === group.headlineIdx}
            editValue={editValue}
            onStartEdit={() => onStartEdit(sectionIdx, group.headlineIdx, group.headline)}
            onEditChange={onEditChange}
            onCommit={onCommit}
            onCancel={onCancel}
            onAskGenie={onAskGenie}
          />
          {hasDetails && (
            <div style={{
              marginTop: 2,
              paddingLeft: 12,
              borderLeft: '2px solid rgba(56,189,248,0.2)',
            }}>
              {group.details.map(({ line, idx }) => (
                <EditableLine
                  key={idx}
                  line={line}
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
