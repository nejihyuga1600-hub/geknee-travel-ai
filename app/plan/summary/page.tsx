'use client';

import {
  Suspense, useCallback, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';

const BookTabDynamic = dynamic(() => import('./BookTab'), { ssr: false });
const FileVault      = dynamic(() => import('@/app/components/FileVault'), { ssr: false });
const UpgradeModal   = dynamic(() => import('@/app/components/UpgradeModal'), { ssr: false });
import { track } from '@/lib/analytics';
import {
  parseLines, isTimeLine, groupLines, extractDayNumber, stripDayPrefix,
  type Section, type ActivityGroup,
} from './lib/itinerary-parse';
import { extractPlace, fetchPlaceImage, imgCache } from './lib/places';
import { MarkdownLine, renderInline } from './components/MarkdownLine';
import { WeatherBar, type DayWeather } from './components/WeatherBar';
import { DayImages } from './components/DayImages';
import { PlaceImage } from './components/PlaceImage';
import { GenieCharacter } from './components/GenieCharacter';
import { EditableLine, type EditableLineProps } from './components/EditableLine';
import { ActivityBlock } from './components/ActivityBlock';
import type { EditTarget, RouteStop } from './lib/types';

const DayMap = dynamic(() => import('./DayMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 320, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }} />
  ),
});

const PlanningMapDynamic = dynamic(() => import('./PlanningMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 460, borderRadius: 14, background: 'rgba(255,255,255,0.04)' }} />
  ),
});

// ── Types ──────────────────────────────────────────────────────────────────────
// `Section` and `ActivityGroup` now live in lib/itinerary-parse.ts so the
// Live trip surface can reuse the same parser without pulling the summary
// client bundle.

// EditTarget, RouteStop — moved to lib/types.ts (re-imported above).
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// DayWeather — moved to components/WeatherBar.tsx (re-exported via the import above).

type BookmarkCategory = 'food' | 'activities' | 'hotels' | 'shopping' | 'other';
interface Bookmark {
  id: string;
  name: string;
  coords: [number, number]; // [lng, lat]
  category: BookmarkCategory;
  placeId?: string;
}

// ── parseLines ─────────────────────────────────────────────────────────────────
// parseLines — moved to lib/itinerary-parse.ts

// renderInline, MarkdownLine — moved to components/MarkdownLine.tsx


// GenieCharacter — moved to components/GenieCharacter.tsx

// ── Chat panel ─────────────────────────────────────────────────────────────────
interface ChatPanelProps {
  tab: 'genie' | 'friends';
  onTabChange: (t: 'genie' | 'friends') => void;
  // genie
  genieMessages: ChatMessage[];
  chatStreaming: boolean;
  genieInput: string;
  onGenieInputChange: (v: string) => void;
  onGenieSend: () => void;
  // inspiration image
  inspImagePreview: string;
  inspIsVideo: boolean;
  inspFileRef: React.RefObject<HTMLInputElement | null>;
  onInspFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearInspImage: () => void;
  // friends
  friendMessages: {id:string;author:string;content:string;timestamp:number}[];
  friendInput: string;
  friendAuthor: string;
  onFriendInputChange: (v: string) => void;
  onFriendAuthorChange: (v: string) => void;
  onFriendSend: () => void;
  onClose: () => void;
}

function ChatPanel({
  tab, onTabChange,
  genieMessages, chatStreaming, genieInput, onGenieInputChange, onGenieSend,
  inspImagePreview, inspIsVideo, inspFileRef, onInspFileSelect, onClearInspImage,
  friendMessages, friendInput, friendAuthor, onFriendInputChange, onFriendAuthorChange, onFriendSend,
  onClose,
}: ChatPanelProps) {
  const genieEndRef  = useRef<HTMLDivElement>(null);
  const friendEndRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const STAR = String.fromCodePoint(0x2726);

  useEffect(() => { genieEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [genieMessages]);
  useEffect(() => { friendEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [friendMessages]);
  useEffect(() => { inputRef.current?.focus(); }, [tab]);

  const tabBtn = (t: 'genie'|'friends', label: string) => (
    <button onClick={() => onTabChange(t)} style={{
      flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 700,
      background: tab === t ? 'rgba(109,40,217,0.25)' : 'transparent',
      border: 'none', borderBottom: `2px solid ${tab === t ? '#a78bfa' : 'transparent'}`,
      color: tab === t ? '#a78bfa' : 'rgba(255,255,255,0.35)',
      cursor: 'pointer', transition: 'all 0.15s',
    }}>{label}</button>
  );

  return (
    <div style={{
      position: 'absolute', bottom: 96, right: 0, width: 340, maxHeight: '60vh',
      background: 'rgba(6,8,22,0.96)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(129,140,248,0.3)', borderRadius: 20,
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(167,139,250,0.08)',
      animation: 'chatSlideUp 0.22s ease-out', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px 0', borderBottom: '1px solid rgba(129,140,248,0.15)',
        background: 'rgba(109,40,217,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: '#a78bfa', fontSize: 13, fontWeight: 700 }}>GeKnee {STAR} Trip Chat</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px',
          }}>{String.fromCodePoint(0x00D7)}</button>
        </div>
        <div style={{ display: 'flex' }}>
          {tabBtn('genie',   String.fromCodePoint(0x2726) + ' AI Genie')}
          {tabBtn('friends', String.fromCodePoint(0x1F465) + ' Friends')}
        </div>
      </div>

      {/* ── AI Genie tab ── */}
      {tab === 'genie' && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {genieMessages.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', marginTop: 24, lineHeight: 1.7 }}>
                Ask me anything about your trip!{'\n'}
                Try: &ldquo;Swap Day 2 dinner&rdquo; or &ldquo;What should I pack?&rdquo;
              </p>
            )}
            {genieMessages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%', padding: '9px 13px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(129,140,248,0.2))'
                  : 'rgba(255,255,255,0.07)',
                border: msg.role === 'user'
                  ? '1px solid rgba(56,189,248,0.3)'
                  : '1px solid rgba(255,255,255,0.08)',
                color: '#e2e8f0', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
                {i === genieMessages.length - 1 && msg.role === 'assistant' && chatStreaming && (
                  <span style={{
                    display: 'inline-block', width: 2, height: 12,
                    background: '#a78bfa', marginLeft: 2,
                    animation: 'blink 0.9s step-end infinite', verticalAlign: 'text-bottom',
                  }} />
                )}
              </div>
            ))}
            <div ref={genieEndRef} />
          </div>
          {(() => {
            const limitReached = genieMessages.filter(m => m.role === 'user').length >= 15;
            return limitReached ? (
              <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                  Message limit reached (15/15) {String.fromCodePoint(0x2728)}
                </span>
              </div>
            ) : (
              <>
                {inspImagePreview && (
                  <div style={{ padding: '8px 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img src={inspImagePreview} alt="preview" style={{ height: 52, width: 72, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(129,140,248,0.4)' }} />
                      {inspIsVideo && <div style={{ position: 'absolute', top: 3, left: 3, background: 'rgba(0,0,0,0.65)', borderRadius: 4, fontSize: 9, color: '#fff', padding: '1px 4px', fontWeight: 700 }}>VIDEO</div>}
                    </div>
                    <div style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{String.fromCodePoint(0x2728)} {inspIsVideo ? 'Video frame captured' : 'Image ready'} — caption optional</div>
                    <button onClick={onClearInspImage} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16 }}>{String.fromCodePoint(0x00D7)}</button>
                  </div>
                )}
              <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input ref={inspFileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={onInspFileSelect} />
                <button onClick={() => inspFileRef.current?.click()} title="Add inspiration image/video"
                  style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: inspImagePreview ? 'rgba(129,140,248,0.2)' : 'rgba(255,255,255,0.06)', color: inspImagePreview ? '#a78bfa' : 'rgba(255,255,255,0.5)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {String.fromCodePoint(0x1F4F7)}
                </button>
                <input
                  ref={inputRef}
                  value={genieInput}
                  onChange={e => onGenieInputChange(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onGenieSend(); } }}
                  placeholder={inspImagePreview ? 'Add a caption (optional)...' : 'Ask your genie...'}
                  disabled={chatStreaming}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10, color: '#fff', fontSize: 13,
                    padding: '9px 12px', outline: 'none',
                  }}
                />
                <button
                  onClick={onGenieSend}
                  disabled={chatStreaming || (!genieInput.trim() && !inspImagePreview)}
                  style={{
                    width: 36, height: 36, borderRadius: 10, border: 'none',
                    background: (genieInput.trim() || inspImagePreview) && !chatStreaming
                      ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                      : 'rgba(255,255,255,0.08)',
                    color: '#fff', fontSize: 15,
                    cursor: genieInput.trim() && !chatStreaming ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  {String.fromCodePoint(0x27A4)}
                </button>
              </div>
              </>
            );
          })()}
        </>
      )}

      {/* ── Friends tab ── */}
      {tab === 'friends' && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {friendMessages.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', marginTop: 24, lineHeight: 1.7 }}>
                No messages yet.{'\n'}Share the invite link so friends can join!
              </p>
            )}
            {friendMessages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', paddingLeft: 4 }}>{msg.author}</span>
                <div style={{
                  alignSelf: msg.author === (friendAuthor || 'You') ? 'flex-end' : 'flex-start',
                  maxWidth: '88%', padding: '9px 13px',
                  borderRadius: msg.author === (friendAuthor || 'You') ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.author === (friendAuthor || 'You')
                    ? 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(129,140,248,0.2))'
                    : 'rgba(255,255,255,0.07)',
                  border: msg.author === (friendAuthor || 'You')
                    ? '1px solid rgba(56,189,248,0.3)'
                    : '1px solid rgba(255,255,255,0.08)',
                  color: '#e2e8f0', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={friendEndRef} />
          </div>
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              value={friendAuthor}
              onChange={e => onFriendAuthorChange(e.target.value)}
              placeholder="Your name..."
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, color: '#fff', fontSize: 12, padding: '6px 10px', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                ref={inputRef}
                value={friendInput}
                onChange={e => onFriendInputChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onFriendSend(); } }}
                placeholder="Message your group..."
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, color: '#fff', fontSize: 13,
                  padding: '9px 12px', outline: 'none',
                }}
              />
              <button
                onClick={onFriendSend}
                disabled={!friendInput.trim()}
                style={{
                  width: 36, height: 36, borderRadius: 10, border: 'none',
                  background: friendInput.trim() ? 'linear-gradient(135deg, #0ea5e9, #6366f1)' : 'rgba(255,255,255,0.08)',
                  color: '#fff', fontSize: 15,
                  cursor: friendInput.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                {String.fromCodePoint(0x27A4)}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Editable line ──────────────────────────────────────────────────────────────
// EditableLine — moved to components/EditableLine.tsx
// EditableLineProps re-exported there for ActivityBlock's prop signature.

// ── Day image strip ────────────────────────────────────────────────────────────
// DayImages — moved to components/DayImages.tsx

// ── Weather bar ────────────────────────────────────────────────────────────────
// WeatherBar, DayWeather — moved to components/WeatherBar.tsx

// isTimeLine, groupLines, ActivityGroup — moved to lib/itinerary-parse.ts

// ── Place extraction (module-level, shared by ActivityBlock + SectionCard) ─────
// extractPlace, imgCache, fetchPlaceImage — moved to lib/places.ts
// PlaceImage — moved to components/PlaceImage.tsx

// ActivityBlock — moved to components/ActivityBlock.tsx

// ── Section card ───────────────────────────────────────────────────────────────
interface SectionCardProps {
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

// extractDayNumber, stripDayPrefix — moved to lib/itinerary-parse.ts

function SectionCard({
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
  // Show map for day/city sections AND any substantive non-tips section with content
  const isDayOrCity = isDay || isCity || (!isTips && section.lines.filter(l => l.trim()).length >= 3);
  const mapLocation = isCity ? section.heading.trim() : location;
  const groups = isDayOrCity ? groupLines(section.lines) : null;
  const [resolvedPlaces, setResolvedPlaces] = useState<string[]>([]);
  const [hoveredPlace, setHoveredPlace] = useState<string | null>(null);
  const [placeLeaving, setPlaceLeaving] = useState(false);
  const hoverClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hoverPlace = useCallback((place: string | null) => {
    if (hoverClearTimer.current) clearTimeout(hoverClearTimer.current);
    if (place !== null) {
      setPlaceLeaving(false);
      setHoveredPlace(place);
    } else {
      // Start fade-out immediately, remove from DOM after 2s
      setPlaceLeaving(true);
      hoverClearTimer.current = setTimeout(() => {
        setHoveredPlace(null);
        setPlaceLeaving(false);
      }, 2000);
    }
  }, []);

  // Build activity number map and ordered place list for DayMap
  const activityGroups = groups?.filter(g => g.type === 'activity') ?? [];
  const activityNumberMap = new Map<number, number>(
    activityGroups.map((g, i) => [g.headlineIdx, i + 1])
  );
  // One place per activity block (in order) — used to number DayMap pins
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

  // Pretty-printed day title beside the giant numeral. Falls back to the
  // raw heading for city / tips sections that don't follow the Day-N pattern.
  const dayTitle = isDay ? (stripDayPrefix(section.heading) || section.heading) : section.heading;
  // Mono sub-line built from the section's first weather day, when available.
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
          {/* Left: activity list */}
          <div style={{ minWidth: 0 }}>
            {renderLines(section.lines)}
            <DayImages heading={section.heading} location={mapLocation} />
          </div>
          {/* Right: sticky day map — stays visible while reading the activities.
              Per design handoff: smaller per-day map in a sticky right column. */}
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

// ── Main content ───────────────────────────────────────────────────────────────
function SummaryContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768);
  }, []);
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string })?.id ?? '';

  // Fallback: when URL params are missing (e.g. an email link or a saved
  // bookmark that only carries ?savedTripId=…), we fill in from the loaded
  // trip below so the masthead and downstream logic still render properly.
  const [loadedTrip, setLoadedTrip] = useState<{
    location?: string;
    startDate?: string | null;
    endDate?: string | null;
    nights?: number | null;
    style?: string | null;
  } | null>(null);
  const stylePrefs = useMemo(() => {
    if (!loadedTrip?.style) return null;
    try {
      const parsed = JSON.parse(loadedTrip.style);
      if (parsed && typeof parsed === 'object') return parsed as Record<string, string>;
    } catch { /* not json */ }
    return { style: loadedTrip.style } as Record<string, string>;
  }, [loadedTrip]);

  const location    = params.get('location')    || loadedTrip?.location || '';
  const purpose     = params.get('purpose')     || stylePrefs?.purpose || '';
  const travelStyle = params.get('style')       || stylePrefs?.style || '';
  const budget      = params.get('budget')      || stylePrefs?.budget || '';
  const interests   = params.get('interests')   || stylePrefs?.interests || '';
  const constraints = params.get('constraints') || stylePrefs?.constraints || '';
  const startDate   = params.get('startDate')   || loadedTrip?.startDate || '';
  const endDate     = params.get('endDate')     || loadedTrip?.endDate || '';
  const nights        = params.get('nights')      || (loadedTrip?.nights ? String(loadedTrip.nights) : '');
  const stopsRaw      = params.get('stops')       ?? '';
  const travelingFrom = params.get('travelingFrom') ?? '';
  const travelingTo   = params.get('travelingTo')   ?? '';

  // ── Route / multi-stop ───────────────────────────────────────────────────────
  const parsedStops: RouteStop[] = useMemo(() => {
    try { return stopsRaw ? JSON.parse(stopsRaw) : []; } catch { return []; }
  }, [stopsRaw]);
  const allStops: RouteStop[] = useMemo(() => [
    { city: location, startDate, endDate },
    ...parsedStops,
  ], [location, startDate, endDate, parsedStops]);
  const isMultiStop = parsedStops.length > 0;

  // ── Saved trip DB state ───────────────────────────────────────────────────────
  const savedTripDbId  = params.get('savedTripId') ?? null;  // set when loaded from DB
  const [savedTripId,  setSavedTripId]  = useState<string | null>(savedTripDbId);
  const [saveState,    setSaveState]    = useState<'idle'|'saving'|'saved'|'error'>('idle');
  const saveTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveItineraryRef = useRef<(() => void) | null>(null);
  const loadedFromSave = useRef(!!savedTripDbId);

  // ── Weather state ─────────────────────────────────────────────────────────────
  const [weatherByCity,  setWeatherByCity]  = useState<Map<string, DayWeather[]>>(new Map());
  // Always start at 'C' on both server AND client so hydration matches.
  // Effect below upgrades to 'F' on US-timezone clients post-mount. The brief
  // flash of 'C' before 'F' is acceptable; previously this lazy initializer
  // ran on every render and caused a confirmed hydration mismatch warning
  // (caught via headless audit 2026-04-24).
  const [weatherUnit, setWeatherUnit] = useState<'C'|'F'>('C');
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (/^(America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Adak|Detroit|Boise|Juneau|Nome|Sitka|Yakutat|Metlakatla|Unalaska|Indiana|Kentucky|North_Dakota)|Pacific\/Honolulu)/.test(tz)) {
        setWeatherUnit('F');
      }
    } catch { /* ignore */ }
  }, []);
  const weatherFetchedRef = useRef(false);

  // ── Replan state ──────────────────────────────────────────────────────────────
  const [replanningSection, setReplanningSection] = useState<number | null>(null);

  // ── Streaming state ──────────────────────────────────────────────────────────
  const [lines, setLines]         = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false); // only true once user triggers generation
  const [itineraryRequested, setItineraryRequested] = useState(loadedFromSave.current);
  const [error, setError]         = useState('');
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; feature?: string; reason?: string }>({ open: false });
  const bufferRef = useRef('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);

  // ── Interactive state ────────────────────────────────────────────────────────
  const [sections, setSections] = useState<Section[]>([]);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editValue, setEditValue]   = useState('');

  // ── Genie state ──────────────────────────────────────────────────────────────
  const [chatOpen, setChatOpen]           = useState(false);
  const [chatTab, setChatTab]             = useState<'genie' | 'friends'>('genie');
  const [chatMessages, setChatMessages]   = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]         = useState('');
  const [chatStreaming, setChatStreaming]  = useState(false);
  const [genieSpeak, setGenieSpeak]       = useState(false);
  const [geniePrefill, setGeniePrefill]   = useState('');
  const genieRef = useRef<HTMLDivElement>(null);

  // ── Inspiration image state ──────────────────────────────────────────────────
  const [inspImageFile,    setInspImageFile]    = useState<File | null>(null);
  const [inspImagePreview, setInspImagePreview] = useState('');
  const [inspIsVideo,      setInspIsVideo]      = useState(false);
  const inspFileRef = useRef<HTMLInputElement>(null);

  const handleInspFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const isVid = file.type.startsWith('video/');
    setInspIsVideo(isVid);
    if (isVid) {
      const videoEl = document.createElement('video');
      const objUrl  = URL.createObjectURL(file);
      videoEl.src = objUrl; videoEl.currentTime = 1; videoEl.muted = true; videoEl.playsInline = true;
      videoEl.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth || 640; canvas.height = videoEl.videoHeight || 360;
        canvas.getContext('2d')?.drawImage(videoEl, 0, 0);
        URL.revokeObjectURL(objUrl);
        canvas.toBlob(blob => {
          if (!blob) return;
          setInspImageFile(new File([blob], 'frame.jpg', { type: 'image/jpeg' }));
          setInspImagePreview(canvas.toDataURL('image/jpeg', 0.8));
        }, 'image/jpeg', 0.8);
      };
      videoEl.onerror = () => URL.revokeObjectURL(objUrl);
    } else {
      setInspImageFile(file);
      setInspImagePreview(URL.createObjectURL(file));
    }
  }, []);

  const clearInspImage = useCallback(() => {
    if (inspImagePreview && !inspImagePreview.startsWith('data:')) URL.revokeObjectURL(inspImagePreview);
    setInspImageFile(null); setInspImagePreview(''); setInspIsVideo(false);
  }, [inspImagePreview]);

  // ── Friends chat state ───────────────────────────────────────────────────────
  const [friendMessages, setFriendMessages] = useState<{id:string;author:string;content:string;timestamp:number}[]>([]);
  const [friendInput, setFriendInput]       = useState('');
  const [friendAuthor, setFriendAuthor]     = useState('');
  const friendPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Share / privacy state ────────────────────────────────────────────────────
  const [privacy, setPrivacy]       = useState<'public'|'friends'|'private'>('friends');
  const [shareOpen, setShareOpen]   = useState(false);
  const [copyDone, setCopyDone]     = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  // Stable trip ID (hash of key params) — same trip always gets same ID
  const tripId = useMemo(() => {
    const raw = `${location}|${startDate}|${endDate}|${nights}|${travelStyle}`;
    let h = 0;
    for (let i = 0; i < raw.length; i++) { h = Math.imul(31, h) + raw.charCodeAt(i) | 0; }
    return Math.abs(h).toString(36);
  }, [location, startDate, endDate, nights, travelStyle]);

  // ── Planning tab ──────────────────────────────────────────────────────────────
  const [mainTab, setMainTab]         = useState<'itinerary' | 'planning' | 'book' | 'files'>(loadedFromSave.current ? 'itinerary' : 'planning');
  const [bookmarks, setBookmarks]     = useState<Bookmark[]>([]);
  const [optimizingItinerary, setOptimizingItinerary] = useState(false);
  const [lastOptimized, setLastOptimized] = useState<Date | null>(null);
  const mapControlRef = useRef<{ panTo: (coords: [number, number]) => void; openPlace: (placeId: string, coords: [number, number]) => void } | null>(null);

  // ── Load itinerary from saved trip (if ?savedTripId= param present) ──────────
  useEffect(() => {
    if (!savedTripDbId) return;
    let cancelled = false;
    fetch(`/api/trips/${savedTripDbId}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled || !d.trip) return;
        // Seed the fallback so the masthead can render even when URL params
        // are absent (email links, bookmarks, deep-links).
        setLoadedTrip({
          location:  d.trip.location  ?? '',
          startDate: d.trip.startDate ?? null,
          endDate:   d.trip.endDate   ?? null,
          nights:    d.trip.nights    ?? null,
          style:     d.trip.style     ?? null,
        });
        if (d.trip.itinerary) {
          const parsed = parseLines(d.trip.itinerary.split('\n'));
          setSections(parsed);
          setStreaming(false);
        }
      })
      .catch(() => { if (!cancelled) setError('Could not load saved itinerary.'); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedTripDbId]);

  // ── Fetch itinerary ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!itineraryRequested) return; // wait until user clicks "Generate"
    if (loadedFromSave.current) return; // skip — loading from DB instead
    let cancelled = false;
    async function fetch_() {
      try {
        const mustVisit = bookmarks.map(b => ({ name: b.name, category: b.category }));
        // Read language preference from localStorage
        let userLang = 'en';
        try { userLang = JSON.parse(localStorage.getItem('geknee_settings') ?? '{}').language ?? 'en'; } catch { /* ignore */ }
        const res = await fetch('/api/itinerary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location, purpose, style: travelStyle, budget,
            interests, constraints, startDate, endDate, nights,
            stops: stopsRaw ? JSON.parse(stopsRaw) : undefined,
            mustVisit: mustVisit.length > 0 ? mustVisit : undefined,
            language: userLang !== 'en' ? userLang : undefined,
          }),
        });
        if (!res.ok || !res.body) {
          if (res.status === 403) {
            const data = await res.json().catch(() => ({}));
            if (data.code === 'GENERATION_LIMIT') {
              track('upgrade_click', { surface: 'ai_limit', feature: 'generations' }); setUpgradeModal({ open: true, feature: 'Unlimited AI generations', reason: data.error });
              setStreaming(false);
              return;
            }
          }
          setError('Failed to generate itinerary. Check your API key and try again.');
          setStreaming(false);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          bufferRef.current += decoder.decode(value, { stream: true });
          const all = bufferRef.current.split('\n');
          bufferRef.current = all.pop() ?? '';
          setLines(prev => [...prev, ...all]);
        }
        if (bufferRef.current) {
          setLines(prev => [...prev, bufferRef.current]);
          bufferRef.current = '';
        }
      } catch {
        if (!cancelled) setError('Network error. Please try again.');
      } finally {
        if (!cancelled) setStreaming(false);
      }
    }
    fetch_();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itineraryRequested]);


  // ── Section-boundary detection — count ## headings to know when to commit ────
  //    Only re-parse & update sections when a new ## heading appears OR streaming
  //    ends. This avoids re-rendering every SectionCard on every streamed line.
  const headingCount = useMemo(
    () => lines.filter(l =>
      l.startsWith('## ') ||
      l.startsWith('### ') ||
      /^\*\*(Day\s+\d+[^*]*)\*\*\s*:?\s*$/i.test(l.trim())
    ).length,
    [lines],
  );

  useEffect(() => {
    if (lines.length === 0) return;
    const parsed = parseLines(lines);
    if (!streaming) {
      setSections(parsed);
    } else {
      setSections(parsed.length > 1 ? parsed.slice(0, -1) : []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headingCount, streaming]);

  // ── Live streaming text — derived cheaply without re-parsing entire tree ─────
  //    These update on every line but only drive the lightweight raw text box.
  const streamingHeading = useMemo((): string | null => {
    if (!streaming) return null;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].startsWith('## ')) return lines[i].slice(3).trim();
    }
    return null;
  }, [lines, streaming]);

  const streamingLines = useMemo((): string[] => {
    if (!streaming) return [];
    let lastIdx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].startsWith('## ')) { lastIdx = i; break; }
    }
    return lastIdx >= 0 ? lines.slice(lastIdx + 1) : lines;
  }, [lines, streaming]);

  // ── Track user scroll intent ──────────────────────────────────────────────────
  useEffect(() => {
    function onScroll() {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 120;
      userScrolledRef.current = !nearBottom;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Auto-scroll during streaming (only if user hasn't scrolled up) ────────────
  useEffect(() => {
    if (streaming && !userScrolledRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lines, streaming]);

  // ── Close chat on outside click ──────────────────────────────────────────────
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (genieRef.current && !genieRef.current.contains(e.target as Node)) {
        setChatOpen(false);
      }
    }
    if (chatOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [chatOpen]);

  // ── Consume geniePrefill ─────────────────────────────────────────────────────
  useEffect(() => {
    if (geniePrefill) {
      setChatOpen(true);
      setChatTab('genie');
      setChatInput(geniePrefill);
      setGeniePrefill('');
    }
  }, [geniePrefill]);

  // ── Share dropdown outside click ─────────────────────────────────────────────
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false);
    }
    if (shareOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [shareOpen]);

  // ── Load privacy from localStorage ───────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(`geknee_privacy_${tripId}`);
    if (saved === 'public' || saved === 'friends' || saved === 'private') setPrivacy(saved);
  }, [tripId]);

  // ── Friends chat — poll for new messages ─────────────────────────────────────
  useEffect(() => {
    async function poll() {
      try {
        const r = await fetch(`/api/trip-messages?tripId=${tripId}`);
        const d = await r.json() as { messages: typeof friendMessages };
        setFriendMessages(d.messages);
      } catch {}
    }
    poll();
    if (chatOpen && chatTab === 'friends') {
      friendPollRef.current = setInterval(poll, 3000);
    }
    return () => { if (friendPollRef.current) clearInterval(friendPollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen, chatTab, tripId]);

  // ── Friends chat — send ───────────────────────────────────────────────────────
  const sendFriendMessage = useCallback(async () => {
    const content = friendInput.trim();
    const author  = friendAuthor.trim() || 'You';
    if (!content) return;
    setFriendInput('');
    try {
      const r = await fetch(`/api/trip-messages?tripId=${tripId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, content }),
      });
      const d = await r.json() as { ok: boolean; message: typeof friendMessages[0] };
      if (d.ok) setFriendMessages(prev => [...prev, d.message]);
    } catch {}
  }, [friendInput, friendAuthor, tripId]);

  // ── Fetch weather for each stop once streaming ends ───────────────────────────
  useEffect(() => {
    if (streaming || weatherFetchedRef.current || allStops.length === 0) return;
    weatherFetchedRef.current = true;
    for (const stop of allStops) {
      // Guard against stops with no city — was hitting /api/weather?city= and
      // burning a 400 per missing-city stop. Found via headless audit.
      if (!stop.city || !stop.city.trim()) continue;
      fetch(`/api/weather?city=${encodeURIComponent(stop.city)}`)
        .then(r => r.json())
        .then(d => {
          if (d.days) setWeatherByCity(prev => new Map(prev).set(stop.city, d.days));
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming]);

  // ── Full itinerary string for chat context ────────────────────────────────────
  const fullItinerary = useMemo(() => {
    if (sections.length > 0) {
      return sections.map(s => {
        const h = s.heading ? `## ${s.heading}\n` : '';
        return h + s.lines.join('\n');
      }).join('\n\n');
    }
    return lines.join('\n');
  }, [sections, lines]);

  // ── Edit handlers ────────────────────────────────────────────────────────────
  const handleStartEdit = useCallback((sectionIdx: number, lineIdx: number, current: string) => {
    setEditTarget({ sectionIdx, lineIdx });
    setEditValue(current);
  }, []);

  const handleCommit = useCallback(() => {
    if (!editTarget) return;
    setSections(prev => prev.map((s, si) =>
      si !== editTarget.sectionIdx ? s : {
        ...s,
        lines: s.lines.map((l, li) => li !== editTarget.lineIdx ? l : editValue),
      }
    ));
    setEditTarget(null);
    setEditValue('');
    // Debounced auto-save (only if trip was already saved to DB)
    if (savedTripId) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveItineraryRef.current?.(), 2000);
    }
  }, [editTarget, editValue, savedTripId]);

  const handleCancel = useCallback(() => {
    setEditTarget(null);
    setEditValue('');
  }, []);

  function formatDate(d: string) {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  // ── Save itinerary to DB ──────────────────────────────────────────────────────
  const saveItinerary = useCallback(async () => {
    if (!fullItinerary) return;
    setSaveState('saving');
    try {
      if (!savedTripId) {
        const r = await fetch('/api/trips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${location}${startDate ? ' \u2013 ' + formatDate(startDate) : ''}`,
            location, startDate, endDate,
            nights: nights ? parseInt(nights) : null,
            style: JSON.stringify({ purpose, style: travelStyle, budget, interests, constraints }),
            itinerary: fullItinerary,
          }),
        });
        const d = await r.json();
        if (d.trip?.id) setSavedTripId(d.trip.id);
      } else {
        await fetch(`/api/trips/${savedTripId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itinerary: fullItinerary }),
        });
      }
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  }, [fullItinerary, savedTripId, location, startDate, endDate, nights, purpose, travelStyle, budget, interests, constraints]);

  // Keep ref current so handleCommit debounce can call latest version
  useEffect(() => { saveItineraryRef.current = saveItinerary; }, [saveItinerary]);

  // ── Replan a section with AI ──────────────────────────────────────────────────
  const handleReplan = useCallback(async (sectionIdx: number) => {
    const section = sections[sectionIdx];
    if (!section || replanningSection !== null) return;
    setReplanningSection(sectionIdx);
    const sectionText = `## ${section.heading}\n${section.lines.join('\n')}`;
    try {
      const res = await fetch('/api/itinerary/replan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: sectionText,
          itinerary: fullItinerary,
          tripInfo: { location, nights, purpose, style: travelStyle, budget },
        }),
      });
      if (!res.body) throw new Error('No body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const parsed = parseLines(acc.split('\n'));
        if (parsed.length > 0) {
          setSections(prev => prev.map((s, i) =>
            i !== sectionIdx ? s : { ...s, lines: parsed[0].lines }
          ));
        }
      }
    } catch {}
    finally { setReplanningSection(null); }
  }, [sections, replanningSection, fullItinerary, location, nights, purpose, travelStyle, budget]);

  const handleAskGenie = useCallback((rawLine: string) => {
    const clean = rawLine.replace(/\*\*/g, '').replace(/^[-*]\s/, '').replace(/^#+\s/, '').trim();
    setGeniePrefill(`Suggest 3 alternatives for: "${clean}"`);
  }, []);

  const handleOptimizeItinerary = useCallback(async () => {
    if (bookmarks.length === 0 || optimizingItinerary) return;
    setOptimizingItinerary(true);
    setMainTab('itinerary');
    try {
      const res = await fetch('/api/itinerary/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itinerary: fullItinerary,
          bookmarks: bookmarks.map(b => ({ name: b.name, coords: b.coords })),
          tripInfo: { location, nights, startDate, endDate, purpose, style: travelStyle, budget },
        }),
      });
      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const parsed = parseLines(acc.split('\n'));
        if (parsed.length > 0) setSections(parsed);
      }
      setBookmarks([]);
      setLastOptimized(new Date());
    } catch { /* silent — itinerary stays as-is */ }
    finally { setOptimizingItinerary(false); }
  }, [bookmarks, optimizingItinerary, fullItinerary, location, nights, startDate, endDate, purpose, travelStyle, budget]);

  // ── Chat send ────────────────────────────────────────────────────────────────
  const GENIE_MSG_LIMIT = 15;
  const sendChat = useCallback(async () => {
    if ((!chatInput.trim() && !inspImageFile) || chatStreaming) return;

    // ── Image inspiration flow ──
    if (inspImageFile) {
      const caption = chatInput.trim() || 'How does this relate to my trip? What should I add or change?';
      setChatMessages(prev => [...prev,
        { role: 'user', content: `${String.fromCodePoint(0x1F4F8)} ${caption}` },
        { role: 'assistant', content: '' },
      ]);
      setChatInput(''); clearInspImage(); setChatStreaming(true); setGenieSpeak(true);
      try {
        const form = new FormData();
        form.append('image', inspImageFile);
        form.append('prompt', caption);
        const res = await fetch('/api/inspiration', { method: 'POST', body: form });
        if (!res.body) throw new Error('no body');
        const reader = res.body.getReader(); const dec = new TextDecoder(); let acc = '';
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          acc += dec.decode(value, { stream: true });
          setChatMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: acc }]);
        }
      } catch {
        setChatMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: 'Could not analyze the image. Please try again.' }]);
      } finally { setChatStreaming(false); setGenieSpeak(false); }
      return;
    }

    if (!chatInput.trim() || chatStreaming) return;
    const userCount = chatMessages.filter(m => m.role === 'user').length;
    if (userCount >= GENIE_MSG_LIMIT) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `You\u2019ve reached the ${GENIE_MSG_LIMIT}-message limit for this trip session. Start a new trip to keep chatting! \u2728`,
      }]);
      setChatInput('');
      return;
    }
    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    const next = [...chatMessages, userMsg];
    setChatMessages([...next, { role: 'assistant', content: '' }]);
    setChatInput('');
    setChatStreaming(true);
    setGenieSpeak(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next,
          itinerary: fullItinerary,
          tripInfo: { location, nights, purpose, style: travelStyle, budget },
        }),
      });
      if (!res.body) throw new Error('No body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setChatMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: acc },
        ]);
      }
    } catch {
      setChatMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'My magic fizzled! Please try again.' },
      ]);
    } finally {
      setChatStreaming(false);
      setGenieSpeak(false);
    }
  }, [chatInput, chatStreaming, chatMessages, fullItinerary, location, nights, purpose, travelStyle, budget]);

  const showGenie = !streaming || lines.length > 8;
  const STAR = String.fromCodePoint(0x2726);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <main style={{ minHeight: '100vh', background: '#060816' }}>
      <UpgradeModal
        open={upgradeModal.open}
        feature={upgradeModal.feature}
        reason={upgradeModal.reason}
        onClose={() => setUpgradeModal({ open: false })}
      />

      {/* Background gradient */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse at 40% 20%, rgba(30,70,200,0.35) 0%, rgba(6,8,22,0.96) 60%, #030510 100%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1720, margin: '0 auto', padding: isMobile ? '16px 14px 120px' : '36px 40px 140px' }}>

        {/* Top nav */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <button
            onClick={() => router.push('/')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, padding: '8px 16px', cursor: 'pointer',
              color: '#fff', textDecoration: 'none',
            }}
          >
            {/* Temporary GeKnee wordmark — replace src with real logo later */}
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg,#6366f1,#38bdf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 900, color: '#fff', letterSpacing: -1,
            }}>
              G
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>GeKnee</span>
          </button>
        </div>

        {/* Trip header \u2014 design-handoff masthead: mono section label, giant
            Fraunces title with italic city accent, single tracked sub-line. */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--brand-border)',
          borderRadius: 20,
          padding: isMobile ? '20px 18px' : '32px 32px 28px',
          marginBottom: 28,
        }}>
          <div style={{
            fontFamily: 'var(--font-mono-display), ui-monospace, monospace',
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--brand-accent-2)',
            marginBottom: 12,
          }}>
            {String.fromCodePoint(0x00A7)} ITINERARY{startDate ? ` \u00b7 ${formatDate(startDate).toUpperCase()}` : ''}{endDate ? ` \u2192 ${formatDate(endDate).toUpperCase()}` : ''}
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display), Georgia, serif',
            fontSize: isMobile ? 'clamp(32px, 8vw, 44px)' : 'clamp(40px, 5vw, 56px)',
            fontWeight: 400,
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
            margin: 0,
            color: 'var(--brand-ink)',
          }}>
            <em style={{ fontStyle: 'italic', color: 'var(--brand-accent)' }}>{location}</em>
          </h1>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            marginTop: 14,
            color: 'var(--brand-ink-dim)',
            fontSize: 12,
          }}>
            {[
              startDate && nights && `${nights} night${nights === '1' ? '' : 's'}`,
              purpose && purpose.charAt(0).toUpperCase() + purpose.slice(1),
              travelStyle && travelStyle.charAt(0).toUpperCase() + travelStyle.slice(1),
              budget,
            ].filter(Boolean).map((tag, i, arr) => (
              <span key={i}>{tag}{i < arr.length - 1 ? ' \u00b7' : ''}</span>
            ))}
          </div>

          {/* ── Weather unit toggle ───────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {(['C', 'F'] as const).map(u => (
              <button key={u} onClick={() => setWeatherUnit(u)} style={{
                padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                border: `1px solid ${weatherUnit === u ? 'rgba(56,189,248,0.5)' : 'rgba(255,255,255,0.1)'}`,
                background: weatherUnit === u ? 'rgba(56,189,248,0.12)' : 'transparent',
                color: weatherUnit === u ? '#38bdf8' : 'rgba(255,255,255,0.35)',
                cursor: 'pointer',
              }}>&deg;{u}</button>
            ))}
          </div>

          {/* ── Share / Invite / Privacy row ─────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>

            {/* Privacy selector */}
            {(['public','friends','private'] as const).map(p => (
              <button key={p} onClick={() => {
                setPrivacy(p);
                localStorage.setItem(`geknee_privacy_${tripId}`, p);
              }} style={{
                padding: '5px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                border: `1px solid ${privacy === p ? 'rgba(167,139,250,0.6)' : 'rgba(255,255,255,0.12)'}`,
                background: privacy === p ? 'rgba(167,139,250,0.15)' : 'transparent',
                color: privacy === p ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', textTransform: 'capitalize',
              }}>
                {p === 'public' ? String.fromCodePoint(0x1F310) : p === 'friends' ? String.fromCodePoint(0x1F465) : String.fromCodePoint(0x1F512)} {p}
              </button>
            ))}

            <div style={{ flex: 1 }} />

            {/* Invite / share dropdown */}
            <div ref={shareRef} style={{ position: 'relative' }}>
              <button onClick={() => setShareOpen(o => !o)} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)',
                color: '#38bdf8', cursor: 'pointer',
              }}>
                {String.fromCodePoint(0x1F517)} Invite friends
              </button>
              {shareOpen && (
                <div style={{
                  position: 'absolute', top: '110%', right: 0, zIndex: 40,
                  width: 300, background: 'rgba(6,8,22,0.97)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(56,189,248,0.25)', borderRadius: 14,
                  padding: '16px', boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                  animation: 'chatSlideUp 0.18s ease-out',
                }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 10, letterSpacing: 0.3 }}>
                    SHARE THIS ITINERARY
                  </p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      readOnly
                      value={typeof window !== 'undefined' ? window.location.href : ''}
                      style={{
                        flex: 1, background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8, color: 'rgba(255,255,255,0.6)',
                        fontSize: 11, padding: '7px 10px', outline: 'none',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    />
                    <button onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setCopyDone(true);
                      setTimeout(() => setCopyDone(false), 2000);
                    }} style={{
                      padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: copyDone ? 'rgba(34,197,94,0.2)' : 'rgba(56,189,248,0.15)',
                      border: `1px solid ${copyDone ? 'rgba(34,197,94,0.4)' : 'rgba(56,189,248,0.3)'}`,
                      color: copyDone ? '#86efac' : '#38bdf8', cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>
                      {copyDone ? String.fromCodePoint(0x2713) + ' Copied' : 'Copy'}
                    </button>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 10, lineHeight: 1.6 }}>
                    Friends with this link can view {privacy === 'private' ? '— set to Private, change above to share' : 'and chat on this itinerary'}.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Main tab switcher ─────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          marginBottom: 20,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: -1, flexWrap: 'wrap', width: isMobile ? '100%' : undefined }}>
            {(['planning', 'itinerary', 'book', 'files'] as const).map(tab => (
              <button key={tab} onClick={() => setMainTab(tab)} style={{
                padding: isMobile ? '9px 14px' : '10px 24px',
                fontSize: isMobile ? 12 : 13, fontWeight: 600, cursor: 'pointer',
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${mainTab === tab ? '#38bdf8' : 'transparent'}`,
                color: mainTab === tab ? '#38bdf8' : 'rgba(255,255,255,0.38)',
                transition: 'color 0.15s, border-color 0.15s',
                flex: isMobile ? '1 0 auto' : undefined,
              }}>
                {tab === 'itinerary'
                  ? String.fromCodePoint(0x1F5FA) + '\u00A0 Itinerary'
                  : tab === 'planning'
                  ? String.fromCodePoint(0x1F4CD) + '\u00A0 Planning'
                  : tab === 'files'
                  ? String.fromCodePoint(0x1F4C2) + '\u00A0 Files'
                  : String.fromCodePoint(0x1F4CB) + '\u00A0 Book'}
                {tab === 'planning' && bookmarks.length > 0 && (
                  <span style={{
                    marginLeft: 6, background: '#f59e0b', color: '#000',
                    borderRadius: 999, padding: '1px 6px', fontSize: 10, fontWeight: 800,
                  }}>
                    {bookmarks.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Right side — optimize button + last optimized timestamp (itinerary tab only) */}
          {mainTab === 'itinerary' && <div style={{ marginLeft: isMobile ? 0 : 'auto', marginTop: isMobile ? 6 : 0, display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 4 }}>
            {lastOptimized && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                color: 'rgba(245,158,11,0.7)', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
              }}>
                {String.fromCodePoint(0x23F1)} Last optimized{' '}
                {lastOptimized.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                at {lastOptimized.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {bookmarks.length > 0 && (
              <button
                onClick={handleOptimizeItinerary}
                disabled={optimizingItinerary}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                  background: optimizingItinerary
                    ? 'rgba(245,158,11,0.06)'
                    : 'linear-gradient(135deg, rgba(245,158,11,0.22) 0%, rgba(234,88,12,0.16) 100%)',
                  border: '1.5px solid rgba(245,158,11,0.5)',
                  color: '#fcd34d', cursor: optimizingItinerary ? 'not-allowed' : 'pointer',
                  opacity: optimizingItinerary ? 0.65 : 1,
                  whiteSpace: 'nowrap',
                  boxShadow: optimizingItinerary ? 'none' : '0 0 16px rgba(245,158,11,0.15)',
                  transition: 'all 0.2s ease',
                }}
              >
                {optimizingItinerary ? (
                  <>
                    <div style={{
                      width: 12, height: 12,
                      border: '2px solid rgba(245,158,11,0.3)', borderTopColor: '#f59e0b',
                      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                    }} />
                    Optimizing\u2026
                  </>
                ) : (
                  <>{String.fromCodePoint(0x2728)} Optimize with {bookmarks.length} destination{bookmarks.length !== 1 ? 's' : ''}</>
                )}
              </button>
            )}
          </div>}
        </div>

        {/* ── Planning tab ──────────────────────────────────────────────────── */}
        {mainTab === 'planning' && (() => {
          const CATS: { key: BookmarkCategory; label: string; icon: number; color: string }[] = [
            { key: 'food',       label: 'Food & Drink',    icon: 0x1F374, color: '#f87171' },
            { key: 'activities', label: 'Activities',      icon: 0x1F3AF, color: '#34d399' },
            { key: 'hotels',     label: 'Hotels & Stays',  icon: 0x1F3E8, color: '#60a5fa' },
            { key: 'shopping',   label: 'Shopping',        icon: 0x1F6CD, color: '#c084fc' },
            { key: 'other',      label: 'Other',           icon: 0x1F4CD, color: '#94a3b8' },
          ];
          const grouped = CATS.map(c => ({ ...c, items: bookmarks.filter(b => b.category === c.key) })).filter(g => g.items.length > 0);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <PlanningMapDynamic
                bookmarks={bookmarks}
                onAddBookmark={b => setBookmarks(prev => [...prev, b])}
                onRemoveBookmark={id => setBookmarks(prev => prev.filter(bm => bm.id !== id))}
                location={location}
                extraStops={parsedStops.map(s => s.city)}
                mapControlRef={mapControlRef}
              />
              {grouped.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Saved Destinations
                  </p>
                  {grouped.map(group => (
                    <div key={group.key}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 14 }}>{String.fromCodePoint(group.icon)}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: group.color, letterSpacing: '0.04em' }}>{group.label}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {group.items.map(bm => (
                          <div key={bm.id} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: 'rgba(255,255,255,0.04)', borderRadius: 8,
                            padding: '8px 12px', border: '1px solid rgba(255,255,255,0.07)',
                          }}>
                            <span style={{ flex: 1, fontSize: 13, color: '#e2e8f0', fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bm.name}</span>
                            <button
                              onClick={() => {
                                if (bm.placeId) {
                                  mapControlRef.current?.openPlace(bm.placeId, bm.coords);
                                } else {
                                  mapControlRef.current?.panTo(bm.coords);
                                }
                              }}
                              style={{
                                padding: '3px 9px', borderRadius: 6, fontSize: 11, flexShrink: 0,
                                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                                color: 'rgba(255,255,255,0.55)', cursor: 'pointer',
                              }}
                            >
                              View
                            </button>
                            <button
                              onClick={() => setBookmarks(prev => prev.filter(b => b.id !== bm.id))}
                              style={{
                                padding: '3px 9px', borderRadius: 6, fontSize: 11, flexShrink: 0,
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                color: '#f87171', cursor: 'pointer',
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Generate Itinerary CTA ─────────────────────────────────── */}
              <div style={{
                marginTop: 8, padding: '20px 24px',
                background: 'linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(167,139,250,0.08) 100%)',
                border: '1.5px solid rgba(56,189,248,0.2)',
                borderRadius: 14, display: 'flex', alignItems: 'center',
                gap: 16, flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>
                    {bookmarks.length > 0
                      ? `${bookmarks.length} place${bookmarks.length !== 1 ? 's' : ''} saved \u2014 ready to build your itinerary?`
                      : 'Pin places above, then generate your itinerary'}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                    {bookmarks.length > 0
                      ? 'Your pinned places will be woven into the itinerary based on your travel personality.'
                      : 'Search and save restaurants, attractions, hotels, and activities you want to visit. Or skip straight to generation.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setItineraryRequested(true);
                    setStreaming(true);
                    setLines([]);
                    setSections([]);
                    setError('');
                    setMainTab('itinerary');
                  }}
                  style={{
                    flexShrink: 0, padding: '12px 28px', borderRadius: 12,
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
                    border: 'none', color: '#0a0f1e',
                    boxShadow: '0 4px 20px rgba(56,189,248,0.3)',
                    transition: 'opacity 0.15s',
                  }}
                >
                  {String.fromCodePoint(0x2728)} Generate Itinerary
                </button>
              </div>
            </div>
          );
        })()}

        {/* ── Itinerary tab ─────────────────────────────────────────────────── */}
        {mainTab === 'itinerary' && (<>

        {/* Section nav — appears once we have committed sections */}
        {sections.length > 0 && sections.some(s => s.heading) && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20,
          }}>
            {sections.filter(s => s.heading).map(s => (
              <button
                key={s.id}
                onClick={() => {
                  const el = document.getElementById(s.id);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                style={{
                  padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                  background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)',
                  color: '#7dd3fc', cursor: 'pointer', letterSpacing: 0.2,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(56,189,248,0.22)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(56,189,248,0.1)')}
              >
                {s.heading}
              </button>
            ))}
          </div>
        )}

        {/* Not yet requested — prompt user to visit planning tab */}
        {!itineraryRequested && !error && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 16, padding: '60px 32px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 48 }}>{String.fromCodePoint(0x1F5FA)}</div>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>
              Start in the Planning tab
            </p>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.45)', maxWidth: 340, lineHeight: 1.6 }}>
              Pin the places you want to visit, then hit <strong style={{ color: '#38bdf8' }}>Generate Itinerary</strong> to build a day-by-day plan around your selections and travel personality.
            </p>
            <button
              onClick={() => setMainTab('planning')}
              style={{
                padding: '11px 28px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                background: 'rgba(56,189,248,0.12)', border: '1.5px solid rgba(56,189,248,0.35)',
                color: '#38bdf8', cursor: 'pointer',
              }}
            >
              {String.fromCodePoint(0x1F4CD)} Go to Planning
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            color: '#f87171', padding: '18px 22px',
            background: 'rgba(239,68,68,0.1)', borderRadius: 12,
            border: '1px solid rgba(239,68,68,0.3)',
          }}>
            {error}
          </div>
        )}

        {/* Committed sections — shown as interactive SectionCards as soon as each day is complete */}
        {!error && sections.length > 0 && (
          <>
            {!streaming && (
              <div style={{
                color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 14,
                textAlign: 'right', letterSpacing: 0.3,
              }}>
                Click any line to edit &nbsp;&middot;&nbsp; Hover for {STAR} genie suggestions
              </div>
            )}
            {sections.map((section, sectionIdx) => {
              // Match section to a weather city. Day sections → use first stop; city sections → match by name.
              const isDay  = /day\s*\d/i.test(section.heading);
              const isCity = !isDay && allStops.some(s => section.heading.toLowerCase().includes(s.city.toLowerCase()));
              let weatherDays: DayWeather[] | undefined;
              if (isDay) {
                weatherDays = weatherByCity.get(allStops[0]?.city ?? location);
              } else if (isCity) {
                const matchedStop = allStops.find(s => section.heading.toLowerCase().includes(s.city.toLowerCase()));
                if (matchedStop) weatherDays = weatherByCity.get(matchedStop.city);
              }
              return (
                <SectionCard
                  key={section.id}
                  section={section}
                  sectionIdx={sectionIdx}
                  editTarget={editTarget}
                  editValue={editValue}
                  onStartEdit={handleStartEdit}
                  onEditChange={setEditValue}
                  onCommit={handleCommit}
                  onCancel={handleCancel}
                  onAskGenie={handleAskGenie}
                  location={location}
                  allStops={allStops}
                  weatherDays={weatherDays}
                  weatherUnit={weatherUnit}
                  replanning={replanningSection === sectionIdx}
                  onReplan={() => handleReplan(sectionIdx)}
                />
              );
            })}
          </>
        )}

        {/* In-progress section — raw streaming text for the day currently being written */}
        {!error && streaming && (
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, padding: '28px 32px', minHeight: streamingHeading ? 0 : 200,
          }}>
            {lines.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[60, 90, 80, 70, 50].map((w, i) => (
                  <div key={i} style={{ width: `${w}%`, height: i === 0 ? 22 : 14, borderRadius: i === 0 ? 8 : 6, background: 'linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 75%)', backgroundSize: '800px 100%', animation: `shimmer 1.5s infinite linear ${i * 0.1}s` }} />
                ))}
                <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Crafting your personalized itinerary&hellip;</div>
              </div>
            ) : (
              <>
                {streamingHeading && (
                  <h2 style={{ color: '#38bdf8', fontSize: 20, fontWeight: 700, marginBottom: 14 }}>
                    {streamingHeading}
                  </h2>
                )}
                {streamingLines.map((line, i) => <MarkdownLine key={i} line={line} />)}
                <span style={{
                  display: 'inline-block', width: 2, height: 16,
                  background: '#38bdf8', marginLeft: 2,
                  animation: 'blink 0.9s step-end infinite', verticalAlign: 'text-bottom',
                }} />
                <div ref={bottomRef} />
              </>
            )}
          </div>
        )}

        {/* Action buttons — shown after streaming completes */}
        {!error && !streaming && sections.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
              <button
                onClick={() => router.push('/')}
                style={{
                  padding: '13px 24px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.7)', fontSize: 14, cursor: 'pointer',
                }}
              >
                Plan another trip
              </button>
              <button
                onClick={saveItinerary}
                disabled={saveState === 'saving'}
                style={{
                  padding: '13px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                  border: `1px solid ${saveState === 'saved' ? 'rgba(34,197,94,0.4)' : saveState === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(167,139,250,0.4)'}`,
                  background: saveState === 'saved' ? 'rgba(34,197,94,0.12)' : saveState === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(167,139,250,0.12)',
                  color: saveState === 'saved' ? '#86efac' : saveState === 'error' ? '#f87171' : '#c4b5fd',
                  cursor: saveState === 'saving' ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 7,
                }}
              >
                {saveState === 'saving' && (
                  <span style={{ width: 12, height: 12, border: '2px solid rgba(167,139,250,0.3)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                )}
                {saveState === 'saved'  ? String.fromCodePoint(0x2713) + ' Saved!' :
                 saveState === 'error'  ? 'Error — retry' :
                 saveState === 'saving' ? 'Saving\u2026' :
                 savedTripId            ? String.fromCodePoint(0x1F4BE) + ' Save changes' :
                                          String.fromCodePoint(0x1F4BE) + ' Save itinerary'}
              </button>
              <button
                onClick={() => window.print()}
                style={{
                  padding: '13px 24px', borderRadius: 12,
                  background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                  border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Print / Save as PDF
              </button>
              <button
                onClick={() => setMainTab('book')}
                style={{
                  padding: '13px 28px', borderRadius: 12,
                  background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                  border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(249,115,22,0.4)',
                }}
              >
                {String.fromCodePoint(0x1F4CB)} View Book tab
              </button>
            </div>

            {/* ── Inline booking CTA banner ─────────────────────────────── */}
            <div style={{
              marginTop: 28, padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(14,22,65,0.95) 0%, rgba(8,12,45,0.95) 100%)',
              border: '1px solid rgba(140,180,255,0.2)',
              borderRadius: 16,
              boxShadow: '0 8px 32px rgba(0,20,120,0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 20 }}>{String.fromCodePoint(0x2708, 0xFE0F)}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Ready to book?</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>Quick links for {location}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <a
                  href={`https://www.google.com/travel/flights?q=${encodeURIComponent(`flights to ${location} ${startDate}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 18px', borderRadius: 10, textDecoration: 'none',
                    background: 'rgba(26,115,232,0.15)', border: '1px solid rgba(26,115,232,0.4)',
                    color: '#93c5fd', fontSize: 13, fontWeight: 600, transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(26,115,232,0.28)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(26,115,232,0.15)')}
                >
                  ✈️ Google Flights
                </a>
                <a
                  href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(location)}&checkin=${startDate}&checkout=${endDate}&group_adults=2&no_rooms=1`}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 18px', borderRadius: 10, textDecoration: 'none',
                    background: 'rgba(0,53,128,0.2)', border: '1px solid rgba(0,53,128,0.5)',
                    color: '#93c5fd', fontSize: 13, fontWeight: 600, transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,53,128,0.35)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,53,128,0.2)')}
                >
                  🏨 Booking.com
                </a>
                <a
                  href={`https://www.airbnb.com/s/${encodeURIComponent(location)}/homes?checkin=${startDate}&checkout=${endDate}&adults=2`}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 18px', borderRadius: 10, textDecoration: 'none',
                    background: 'rgba(255,56,92,0.12)', border: '1px solid rgba(255,56,92,0.35)',
                    color: '#fca5a5', fontSize: 13, fontWeight: 600, transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,56,92,0.24)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,56,92,0.12)')}
                >
                  🏠 Airbnb
                </a>
                <a
                  href={`https://www.skyscanner.com/transport/flights/${encodeURIComponent(travelingFrom || '')}/${encodeURIComponent(location)}/${startDate?.replace(/-/g,'') ?? ''}/${endDate?.replace(/-/g,'') ?? ''}/?adultsv2=1&rtn=1`}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 18px', borderRadius: 10, textDecoration: 'none',
                    background: 'rgba(7,112,227,0.12)', border: '1px solid rgba(7,112,227,0.35)',
                    color: '#7dd3fc', fontSize: 13, fontWeight: 600, transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(7,112,227,0.24)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(7,112,227,0.12)')}
                >
                  🔍 Skyscanner
                </a>
              </div>
            </div>
          </>
        )}

        </>)}

        {/* ── Book tab — always mounted to preserve state across tab switches ── */}
        <div style={{ display: mainTab === 'book' ? 'block' : 'none' }}>
          <BookTabDynamic
            location={location}
            purpose={purpose}
            style={travelStyle}
            budget={budget}
            interests={interests}
            startDate={startDate}
            endDate={endDate}
            nights={nights}
            stops={stopsRaw}
            travelingFrom={travelingFrom}
            fullItinerary={fullItinerary}
          />
        </div>

        {mainTab === 'files' && (
          <div style={{ padding: '24px 28px', maxWidth: 680, margin: '0 auto' }}>
            {!savedTripId ? (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 14, marginTop: 40 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{String.fromCodePoint(0x1F4C2)}</div>
                Save your trip first to use the File Vault.
              </div>
            ) : (
              <FileVault
                tripId={savedTripId}
                currentUserId={currentUserId}
              />
            )}
          </div>
        )}
      </div>

      {/* Genie + Friends chat */}
      {showGenie && (
        <div ref={genieRef} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
          {chatOpen && (
            <ChatPanel
              tab={chatTab}
              onTabChange={setChatTab}
              genieMessages={chatMessages}
              chatStreaming={chatStreaming}
              genieInput={chatInput}
              onGenieInputChange={setChatInput}
              onGenieSend={sendChat}
              inspImagePreview={inspImagePreview}
              inspIsVideo={inspIsVideo}
              inspFileRef={inspFileRef}
              onInspFileSelect={handleInspFileSelect}
              onClearInspImage={clearInspImage}
              friendMessages={friendMessages}
              friendInput={friendInput}
              friendAuthor={friendAuthor}
              onFriendInputChange={setFriendInput}
              onFriendAuthorChange={setFriendAuthor}
              onFriendSend={sendFriendMessage}
              onClose={() => setChatOpen(false)}
            />
          )}
          <button
            onClick={() => setChatOpen(p => !p)}
            title="Chat with your travel genie or friends"
            style={{
              width: 80, height: 80, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: chatOpen
                ? 'linear-gradient(135deg, rgba(109,40,217,0.95), rgba(30,58,138,0.95))'
                : 'linear-gradient(135deg, rgba(76,29,149,0.9), rgba(23,37,84,0.9))',
              boxShadow: chatOpen
                ? '0 0 0 2px rgba(167,139,250,0.6), 0 8px 32px rgba(109,40,217,0.5)'
                : '0 0 0 1px rgba(129,140,248,0.3), 0 8px 24px rgba(0,0,0,0.5)',
              animation: 'genieFloat 3s ease-in-out infinite',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'visible', position: 'relative',
              transition: 'background 0.3s, box-shadow 0.3s',
              padding: 0,
            }}
          >
            <GenieCharacter speaking={genieSpeak} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin        { to { transform: rotate(360deg); } }
        @keyframes blink       { 0%,100% { opacity:1; } 50% { opacity:0; } }
        @keyframes genieFloat  { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
        @keyframes genieSpark  { 0%,100% { opacity:0; transform:scale(0.5); } 50% { opacity:1; transform:scale(1.2); } }
        @keyframes chatSlideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @media print { [style*="position: fixed"] { display:none !important; } }
      `}</style>
    </main>
  );
}

export default function SummaryPage() {
  return (
    <Suspense>
      <SummaryContent />
    </Suspense>
  );
}
