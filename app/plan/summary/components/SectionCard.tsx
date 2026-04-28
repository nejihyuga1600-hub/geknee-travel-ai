'use client';

import { useCallback, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { EditableLine } from './EditableLine';
import { ActivityBlock } from './ActivityBlock';
import { WeatherBar, type DayWeather } from './WeatherBar';
import { DayImages } from './DayImages';
import { PlaceImage } from './PlaceImage';
import { extractDayNumber, stripDayPrefix, groupLines, type Section } from '../lib/itinerary-parse';
import { extractPlace } from '../lib/places';
import type { EditTarget, RouteStop } from '../lib/types';

// DayMap mounts a Google Maps view; dynamic-import keeps the maps SDK out
// of the initial bundle. Mirrors the previous loader in page.tsx.
const DayMap = dynamic(() => import('../DayMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 320, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }} />
  ),
});

export interface SectionCardProps {
  section: Section;
  sectionIdx: number;
  editTarget: EditTarget | null;
  editValue: string;
  onStartEdit: (sectionIdx: number, lineIdx: number, current: string) => void;
  onEditChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onAskGenie: (line: string) => void;
  location: string;
  allStops?: RouteStop[];
  weatherDays?: DayWeather[];
  weatherUnit: 'C' | 'F';
  replanning: boolean;
  onReplan: () => void;
}

export function SectionCard({
  section, sectionIdx, editTarget, editValue,
  onStartEdit, onEditChange, onCommit, onCancel, onAskGenie, location, allStops,
  weatherDays, weatherUnit, replanning, onReplan,
}: SectionCardProps) {
  const dayNum = extractDayNumber(section.heading);
  const isDay  = dayNum !== null;
  const isCity = !isDay && (allStops ?? []).some(
    s => section.heading.trim().toLowerCase().includes(s.city.toLowerCase())
  );
  const isTips = /tip|advice|practical|budget|packing|note|reminder|essential|important|safety|currency|visa|weather|transport|getting|overview|summary|introduction|highlight|must.do|must.see/i.test(section.heading);
  const isDayOrCity = isDay || isCity || (!isTips && section.lines.filter(l => l.trim()).length >= 3);
  const mapLocation = isCity ? section.heading.trim() : location;
  const groups = isDayOrCity ? groupLines(section.lines) : null;
  const [, setResolvedPlaces] = useState<string[]>([]);
  const [hoveredPlace, setHoveredPlace] = useState<string | null>(null);
  const [placeLeaving, setPlaceLeaving] = useState(false);
  const hoverClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hoverPlace = useCallback((place: string | null) => {
    if (hoverClearTimer.current) clearTimeout(hoverClearTimer.current);
    if (place !== null) {
      setPlaceLeaving(false);
      setHoveredPlace(place);
    } else {
      setPlaceLeaving(true);
      hoverClearTimer.current = setTimeout(() => {
        setHoveredPlace(null);
        setPlaceLeaving(false);
      }, 2000);
    }
  }, []);

  const activityGroups = groups?.filter(g => g.type === 'activity') ?? [];
  const activityNumberMap = new Map<number, number>(
    activityGroups.map((g, i) => [g.headlineIdx, i + 1])
  );
  const orderedActivityPlaces = activityGroups
    .map(g => extractPlace(g.headline))
    .filter((p): p is string => p !== null);

  function renderLines(linesToRender: typeof section.lines, baseIdx = 0) {
    if (!groups) {
      return linesToRender.map((line, i) => {
        const place = extractPlace(line);
        return (
          <div
            key={i + baseIdx}
            onMouseEnter={place ? () => hoverPlace(place) : undefined}
            onMouseLeave={place ? () => hoverPlace(null) : undefined}
          >
            <EditableLine
              line={line}
              isEditing={editTarget?.sectionIdx === sectionIdx && editTarget?.lineIdx === i + baseIdx}
              editValue={editValue}
              onStartEdit={() => onStartEdit(sectionIdx, i + baseIdx, line)}
              onEditChange={onEditChange}
              onCommit={onCommit}
              onCancel={onCancel}
              onAskGenie={onAskGenie}
            />
          </div>
        );
      });
    }
    return groups.map(group =>
      group.type === 'activity' ? (
        <ActivityBlock
          key={group.headlineIdx}
          group={group}
          sectionIdx={sectionIdx}
          editTarget={editTarget}
          editValue={editValue}
          onStartEdit={onStartEdit}
          onEditChange={onEditChange}
          onCommit={onCommit}
          onCancel={onCancel}
          onAskGenie={onAskGenie}
          onHoverPlace={hoverPlace}
          activityNumber={activityNumberMap.get(group.headlineIdx)}
        />
      ) : (
        <EditableLine
          key={group.idx}
          line={group.line}
          isEditing={editTarget?.sectionIdx === sectionIdx && editTarget?.lineIdx === group.idx}
          editValue={editValue}
          onStartEdit={() => onStartEdit(sectionIdx, group.idx, group.line)}
          onEditChange={onEditChange}
          onCommit={onCommit}
          onCancel={onCancel}
          onAskGenie={onAskGenie}
        />
      )
    );
  }

  const dayTitle = isDay ? (stripDayPrefix(section.heading) || section.heading) : section.heading;
  const weatherSubLabel = (() => {
    if (!weatherDays || weatherDays.length === 0) return '';
    const w = weatherDays[0];
    const toDisplay = (c: number) => weatherUnit === 'F' ? Math.round(c * 9 / 5 + 32) : Math.round(c);
    const cond = (w.condition ?? '').toUpperCase();
    return ` · ${toDisplay(w.tempMax)}°/${toDisplay(w.tempMin)}°${cond ? ' · ' + cond : ''}`;
  })();

  return (
    <div id={section.id} style={{
      background: isDayOrCity ? 'rgba(125,211,252,0.04)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${isDayOrCity ? 'rgba(125,211,252,0.18)' : 'var(--brand-border)'}`,
      borderRadius: 16, padding: '24px 28px 20px', marginBottom: 18,
      animation: `cardFadeIn 250ms var(--ease-out) both`,
      animationDelay: `${sectionIdx * 60}ms`,
    }}>
      {section.heading && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 12, marginBottom: weatherDays ? 10 : 16, paddingBottom: 10,
          borderBottom: `1px solid ${isDayOrCity ? 'rgba(125,211,252,0.2)' : 'var(--brand-border)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, minWidth: 0, flex: 1 }}>
            {isDay && dayNum !== null && (
              <div style={{
                fontFamily: 'var(--font-display), Georgia, serif',
                fontSize: 'clamp(36px, 6vw, 48px)', fontWeight: 400,
                fontStyle: 'italic', letterSpacing: '-0.025em',
                color: 'var(--brand-accent)', lineHeight: 1, flexShrink: 0,
              }}>
                {dayNum < 10 ? `0${dayNum}` : dayNum}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              {isDay && (
                <div style={{
                  fontFamily: 'var(--font-mono-display), ui-monospace, monospace',
                  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: 'var(--brand-accent-2)', marginBottom: 4, fontWeight: 600,
                }}>
                  DAY {dayNum}{weatherSubLabel}
                </div>
              )}
              <h2 style={{
                margin: 0,
                fontFamily: 'var(--font-display), Georgia, serif',
                fontSize: isDay ? 'clamp(20px, 3vw, 26px)' : 17,
                fontWeight: isDay ? 400 : 700,
                letterSpacing: '-0.01em',
                color: 'var(--brand-ink)',
              }}>
                {dayTitle}
              </h2>
            </div>
          </div>
          <button
            onClick={onReplan}
            disabled={replanning}
            title="Replan this section with AI"
            style={{
              flexShrink: 0, padding: '5px 12px', borderRadius: 999,
              fontSize: 10, fontWeight: 600, letterSpacing: '0.02em',
              border: '1px solid rgba(167,139,250,0.3)',
              background: replanning ? 'rgba(167,139,250,0.06)' : 'transparent',
              color: replanning ? 'rgba(167,139,250,0.4)' : 'var(--brand-accent)',
              cursor: replanning ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >
            {replanning ? (
              <>
                <span style={{
                  display: 'inline-block', width: 9, height: 9,
                  border: '1.5px solid rgba(167,139,250,0.4)', borderTopColor: 'var(--brand-accent)',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                }} />
                Replanning&hellip;
              </>
            ) : (
              <>{String.fromCodePoint(0x2728)} Replan</>
            )}
          </button>
        </div>
      )}
      {weatherDays && <WeatherBar days={weatherDays} unit={weatherUnit} />}

      {isDayOrCity ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
          <div style={{ minWidth: 0 }}>
            {renderLines(section.lines)}
            <DayImages heading={section.heading} location={mapLocation} />
          </div>
          <div style={{
            position: 'sticky', top: 24,
            alignSelf: 'start',
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid var(--brand-border)',
          }}>
            <DayMap
              heading={section.heading}
              lines={section.lines}
              location={mapLocation}
              height={340}
              namedPlaces={orderedActivityPlaces.length > 0 ? orderedActivityPlaces : undefined}
              onPlacesResolved={setResolvedPlaces}
            />
            {hoveredPlace && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 12, overflow: 'hidden',
                opacity: placeLeaving ? 0 : 1,
                transition: placeLeaving ? 'opacity 2s ease' : 'opacity 0.15s ease',
                pointerEvents: 'none',
              }}>
                <PlaceImage place={hoveredPlace} height={340} city={mapLocation} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {renderLines(section.lines)}
          {!isTips && hoveredPlace && (
            <div style={{
              position: 'absolute', top: 0, right: 0,
              width: 220, height: 150, borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              pointerEvents: 'none', zIndex: 10,
              opacity: placeLeaving ? 0 : 1,
              transition: placeLeaving ? 'opacity 2s ease' : 'opacity 0.15s ease',
            }}>
              <PlaceImage place={hoveredPlace} height={150} city={mapLocation} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
