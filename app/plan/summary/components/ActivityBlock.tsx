'use client';

import { useState } from 'react';
import { EditableLine } from './EditableLine';
import type { ActivityGroup } from '../lib/itinerary-parse';
import type { EditTarget } from '../lib/types';
import { extractPlace } from '../lib/places';

// Single activity row inside a day-card section. Numbered pin (lavender or
// gold for monument quests), headline as an EditableLine, and a hover-to-
// reveal details block. Calls onHoverPlace so the parent can swap the
// place-image overlay on the day map.

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
  onHoverPlace: (place: string | null) => void;
  activityNumber?: number;
}

export function ActivityBlock({
  group, sectionIdx, editTarget, editValue,
  onStartEdit, onEditChange, onCommit, onCancel, onAskGenie, onHoverPlace, activityNumber,
}: ActivityBlockProps) {
  const [hovered, setHovered] = useState(false);
  const hasDetails = group.details.some(d => d.line.trim());

  return (
    <div
      style={{ marginBottom: 6 }}
      onMouseEnter={() => { setHovered(true); const p = extractPlace(group.headline); if (p) onHoverPlace(p); }}
      onMouseLeave={() => { setHovered(false); onHoverPlace(null); }}
    >
      {/* Headline row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
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
        </div>
      </div>

      {/* Details — grid-row collapse: 0fr when closed (zero height, no layout shift) */}
      {hasDetails && (
        <div style={{
          display: 'grid',
          gridTemplateRows: hovered ? '1fr' : '0fr',
          opacity: hovered ? 1 : 0,
          transition: hovered
            ? 'grid-template-rows 0.12s ease, opacity 0.12s ease'
            : 'grid-template-rows 4s ease, opacity 4s ease',
          pointerEvents: hovered ? 'auto' : 'none',
        }}>
          <div style={{ overflow: 'hidden' }}>
            <div style={{
              marginLeft: 24, marginTop: 2, marginBottom: 4,
              paddingLeft: 12,
              borderLeft: '2px solid rgba(56,189,248,0.2)',
            }}>
              {group.details.map(({ line, idx }) => {
                const detailPlace = extractPlace(line);
                return (
                  <div
                    key={idx}
                    onMouseEnter={detailPlace ? () => onHoverPlace(detailPlace) : undefined}
                  >
                    <EditableLine
                      line={line}
                      isEditing={editTarget?.sectionIdx === sectionIdx && editTarget?.lineIdx === idx}
                      editValue={editValue}
                      onStartEdit={() => onStartEdit(sectionIdx, idx, line)}
                      onEditChange={onEditChange}
                      onCommit={onCommit}
                      onCancel={onCancel}
                      onAskGenie={onAskGenie}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
