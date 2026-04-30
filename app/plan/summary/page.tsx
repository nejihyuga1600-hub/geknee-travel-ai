'use client';

import Link from 'next/link';
import {
  Suspense, useCallback, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';

// Design-faithful booking surface (Stays / Flights / Activities / Transport
// / Insurance with badge counts). The legacy BookTab.tsx remains in the
// codebase for reference; it'll be retired once BookView absorbs its data
// fetches. The shared BookTabProps shape from BookTab.tsx is what the page
// already passes — BookView accepts the same prop interface.
const BookTabDynamic = dynamic(() => import('./components/BookView'), { ssr: false });
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
import { ChatPanel } from './components/ChatPanel';
import { SectionCard } from './components/SectionCard';
import type { EditTarget, RouteStop, ChatMessage } from './lib/types';

// DayMap dynamic import moved into components/SectionCard.tsx, the only caller.

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

// EditTarget, RouteStop, ChatMessage — moved to lib/types.ts (re-imported above).

// DayWeather — moved to components/WeatherBar.tsx (re-exported via the import above).

type BookmarkCategory = 'food' | 'activities' | 'hotels' | 'shopping' | 'other';
interface Bookmark {
  id: string;
  name: string;
  coords: [number, number]; // [lng, lat]
  category: BookmarkCategory;
  placeId?: string;
}

// Category palette used by the planning sidebar + map pin renderer.
// Colors are hand-tuned to read on the dark planning canvas.
const PLANNING_CATS: { key: BookmarkCategory; label: string; color: string }[] = [
  { key: 'food',       label: 'Food',       color: '#f97316' },
  { key: 'activities', label: 'Activities', color: '#a78bfa' },
  { key: 'hotels',     label: 'Hotels',     color: '#60a5fa' },
  { key: 'shopping',   label: 'Shopping',   color: '#fbbf24' },
  { key: 'other',      label: 'Monument',   color: '#94a3b8' },
];

// ── parseLines ─────────────────────────────────────────────────────────────────
// parseLines — moved to lib/itinerary-parse.ts

// renderInline, MarkdownLine — moved to components/MarkdownLine.tsx


// GenieCharacter — moved to components/GenieCharacter.tsx

// ── Chat panel — moved to components/ChatPanel.tsx ──
// (the inline definition that lived here has been removed; see import above.)
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
  // Default to planning so users land on the map first and choose what to
  // include before generating an itinerary. Itinerary tab populates after the
  // planning tab's "Generate Itinerary" CTA fires.
  const [mainTab, setMainTab]         = useState<'itinerary' | 'planning' | 'book' | 'files'>('planning');
  const [bookmarks, setBookmarks]     = useState<Bookmark[]>([]);
  const [planningFilter, setPlanningFilter] = useState<'all' | BookmarkCategory>('all');
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

      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: mainTab === 'planning' ? '100%' : 1720,
        margin: '0 auto',
        padding: isMobile
          ? '16px 14px 120px'
          : (mainTab === 'planning' ? '20px 24px 60px' : '36px 40px 140px'),
      }}>

        {/* Top nav — design handoff: ← Plan left, trip · N days center label,
            Share / Book on the right. */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
            <Link href="/plan/location" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: mainTab === 'planning' ? '5px 12px' : 0,
              borderRadius: 999,
              border: mainTab === 'planning' ? '1px solid var(--brand-border)' : 'none',
              background: mainTab === 'planning' ? 'rgba(255,255,255,0.04)' : 'transparent',
              color: 'var(--brand-accent)', fontSize: mainTab === 'planning' ? 11 : 13,
              fontWeight: mainTab === 'planning' ? 700 : 400,
              letterSpacing: mainTab === 'planning' ? '0.08em' : 'normal',
              textTransform: mainTab === 'planning' ? 'uppercase' as const : 'none' as const,
              textDecoration: 'none',
              fontFamily: 'var(--font-ui), system-ui, sans-serif',
            }}>
              {String.fromCodePoint(0x2190)} {mainTab === 'planning' ? 'Back to globe' : 'Plan'}
            </Link>
            <span style={{
              fontFamily: 'var(--font-display), Georgia, serif',
              fontSize: 16, color: 'var(--brand-ink)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {location || 'Trip'}
              {mainTab === 'planning'
                ? <em style={{ fontStyle: 'italic', color: 'var(--brand-accent)', marginLeft: 8 }}>· plan your stops</em>
                : (nights ? ` · ${nights} day${nights === '1' ? '' : 's'}` : '')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Map / Share / Book hidden on planning tab — that view's CTA is the
                top-right "Generate itinerary →" button below. */}
            {mainTab !== 'planning' && savedTripId && (
              <Link
                href={`/plan/${encodeURIComponent(savedTripId)}/map`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--brand-border)',
                  color: 'var(--brand-ink)', fontSize: 12, fontWeight: 600,
                  fontFamily: 'inherit', textDecoration: 'none',
                }}
              >
                {String.fromCodePoint(0x2315)} Map
              </Link>
            )}
            {mainTab !== 'planning' && (
              <button
                onClick={async () => {
                  if (typeof navigator !== 'undefined' && navigator.share) {
                    try { await navigator.share({ title: `Trip to ${location}`, url: window.location.href }); } catch { /* dismissed */ }
                  } else {
                    try { await navigator.clipboard.writeText(window.location.href); } catch {}
                  }
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--brand-border)',
                  color: 'var(--brand-ink)', fontSize: 12, fontWeight: 600,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                {String.fromCodePoint(0x2197)} Share
              </button>
            )}
            {mainTab !== 'planning' && (
              <button
                onClick={() => setMainTab(mainTab === 'book' ? 'itinerary' : 'book')}
                style={{
                  padding: '7px 14px', borderRadius: 10,
                  background: mainTab === 'book' ? 'transparent' : 'var(--brand-ink)',
                  color: mainTab === 'book' ? 'var(--brand-ink)' : 'var(--brand-bg)',
                  border: `1px solid ${mainTab === 'book' ? 'var(--brand-border)' : 'var(--brand-ink)'}`,
                  fontSize: 12, fontWeight: 700,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                {mainTab === 'book' ? 'Itinerary' : 'Book'}
              </button>
            )}
            {mainTab === 'planning' && (
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
                  padding: '8px 16px', borderRadius: 10,
                  background: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 100%)',
                  color: '#0a0f1e', border: 'none',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 14px rgba(167,139,250,0.35)',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                Generate itinerary {String.fromCodePoint(0x2192)}
              </button>
            )}
          </div>
        </div>

        {/* Trip header \u2014 hidden on planning tab so the map gets the
            full canvas; the compact top bar above is enough context. */}
        {mainTab !== 'planning' && (
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

          {/* Legacy weather toggle + privacy/invite row hidden during the
              design pass. The top-bar Share button now covers invite, and
              weather defaults to the user's locale unit (US-timezone clients
              get °F via the existing useEffect, others stay on °C). */}
          {false && (
          <>
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
          </>
          )}
        </div>
        )}

        {/* ── Main tab switcher (legacy — hidden during the design pass) ─── */}
        {false && (
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
                {lastOptimized!.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                at {lastOptimized!.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
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
        )}

        {/* ── Planning tab ──────────────────────────────────────────────────── */}
        {mainTab === 'planning' && (() => {
          const filtered = planningFilter === 'all'
            ? bookmarks
            : bookmarks.filter(b => b.category === planningFilter);
          const counts = PLANNING_CATS.map(c => ({
            ...c,
            count: bookmarks.filter(b => b.category === c.key).length,
          })).filter(c => c.count > 0);
          const handleGenerate = () => {
            setItineraryRequested(true);
            setStreaming(true);
            setLines([]);
            setSections([]);
            setError('');
            setMainTab('itinerary');
          };
          return (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 360px',
              gap: 0,
              alignItems: 'stretch',
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
            }}>
              {/* ── Map column ─────────────────────────────────────────────── */}
              <div style={{ minWidth: 0, display: 'flex' }}>
              <PlanningMapDynamic
                bookmarks={bookmarks}
                onAddBookmark={b => setBookmarks(prev => [...prev, b])}
                onRemoveBookmark={id => setBookmarks(prev => prev.filter(bm => bm.id !== id))}
                location={location}
                extraStops={parsedStops.map(s => s.city)}
                mapControlRef={mapControlRef}
              />
              </div>
              {/* ── Sidebar column ─────────────────────────────────────────── */}
              <aside style={{
                background: 'transparent',
                borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
                borderTop: isMobile ? '1px solid rgba(255,255,255,0.08)' : 'none',
                padding: 18,
                display: 'flex', flexDirection: 'column', gap: 16,
                minHeight: isMobile ? 'auto' : 'min(80vh, 720px)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{
                    fontFamily: 'var(--font-mono-display), ui-monospace, monospace',
                    fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                    color: 'var(--brand-accent-2, rgba(167,139,250,0.85))', fontWeight: 600,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {String.fromCodePoint(0x00A7)} Your Stops{location ? ` · ${location}` : ''}
                  </div>
                  <div style={{
                    flexShrink: 0,
                    fontFamily: 'var(--font-mono-display), ui-monospace, monospace',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                    color: 'rgba(255,255,255,0.55)',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 999, padding: '3px 9px',
                  }}>
                    {String.fromCodePoint(0x00A7)} {bookmarks.length} {bookmarks.length === 1 ? 'PIN' : 'PINS'}
                  </div>
                </div>

                <p style={{
                  margin: 0,
                  fontFamily: 'var(--font-display), Georgia, serif',
                  fontSize: 24, lineHeight: 1.15, fontWeight: 400,
                  letterSpacing: '-0.015em', color: 'var(--brand-ink)',
                }}>
                  Drop pins.{' '}
                  <em style={{ fontStyle: 'italic', color: 'var(--brand-accent)' }}>
                    We&apos;ll thread them together.
                  </em>
                </p>

                {bookmarks.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {([{ key: 'all' as const, label: 'All', color: '#e2e8f0' }, ...counts.map(c => ({ key: c.key as 'all' | BookmarkCategory, label: c.label, color: c.color }))]).map(p => {
                      const active = planningFilter === p.key;
                      return (
                        <button
                          key={p.key}
                          onClick={() => setPlanningFilter(p.key)}
                          style={{
                            padding: '5px 12px', borderRadius: 999,
                            fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
                            cursor: 'pointer', fontFamily: 'inherit',
                            background: active ? p.color : 'rgba(255,255,255,0.05)',
                            color: active ? '#0a0f1e' : 'rgba(255,255,255,0.7)',
                            border: `1px solid ${active ? p.color : 'rgba(255,255,255,0.1)'}`,
                            transition: 'background 0.12s, color 0.12s',
                          }}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 6,
                  overflowY: 'auto', minHeight: 0, flex: '1 1 auto',
                }}>
                  {filtered.length === 0 ? (
                    <div style={{
                      padding: '28px 12px', textAlign: 'center',
                      color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.5,
                    }}>
                      {bookmarks.length === 0
                        ? 'No stops yet. Search the map or click a place to add it.'
                        : 'No stops match this filter.'}
                    </div>
                  ) : (
                    filtered.map(bm => {
                      const cat = PLANNING_CATS.find(c => c.key === bm.category) ?? PLANNING_CATS[PLANNING_CATS.length - 1];
                      const num = bookmarks.indexOf(bm) + 1;
                      const openPin = () => {
                        if (bm.placeId) mapControlRef.current?.openPlace(bm.placeId, bm.coords);
                        else mapControlRef.current?.panTo(bm.coords);
                      };
                      return (
                        <div
                          key={bm.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 10px', borderRadius: 10,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            transition: 'background 0.12s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                        >
                          <button
                            onClick={openPin}
                            style={{
                              flexShrink: 0,
                              width: 26, height: 26, borderRadius: '50%',
                              background: cat.color, color: '#0a0f1e',
                              fontSize: 12, fontWeight: 800,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              border: 'none', cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            {num}
                          </button>
                          <button
                            onClick={openPin}
                            style={{
                              flex: 1, minWidth: 0,
                              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
                              padding: 0, background: 'transparent', border: 'none',
                              cursor: 'pointer', textAlign: 'left',
                            }}
                          >
                            <span style={{
                              fontSize: 13, fontWeight: 600, color: '#e2e8f0',
                              maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              fontFamily: 'inherit',
                            }}>
                              {bm.name}
                            </span>
                            <span style={{
                              fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                              color: cat.color, fontFamily: 'var(--font-mono-display), ui-monospace, monospace',
                            }}>
                              {cat.label}
                            </span>
                          </button>
                          <button
                            onClick={() => setBookmarks(prev => prev.filter(b => b.id !== bm.id))}
                            aria-label={`Remove ${bm.name}`}
                            style={{
                              flexShrink: 0, width: 22, height: 22, borderRadius: 6,
                              background: 'transparent',
                              border: '1px solid rgba(239,68,68,0.18)',
                              color: '#f87171', cursor: 'pointer', fontSize: 14, lineHeight: 1,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontFamily: 'inherit',
                            }}
                          >
                            {String.fromCodePoint(0x00D7)}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div style={{
                  padding: 14, borderRadius: 12,
                  background: 'rgba(167,139,250,0.06)',
                  border: '1px solid rgba(167,139,250,0.2)',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div>
                    <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
                      Ready to plan?
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.45 }}>
                      {bookmarks.length > 0
                        ? `We'll order your ${bookmarks.length} stop${bookmarks.length === 1 ? '' : 's'} into a daily route, with timing and walking distance.`
                        : "We'll generate a day-by-day plan based on your travel style."}
                    </p>
                  </div>
                  <button
                    onClick={handleGenerate}
                    style={{
                      padding: '10px 14px', borderRadius: 10,
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      background: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 100%)',
                      border: 'none', color: '#0a0f1e',
                      boxShadow: '0 4px 14px rgba(167,139,250,0.35)',
                      fontFamily: 'inherit',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    + Generate Itinerary
                  </button>
                </div>
              </aside>
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
        {/* Empty state — show whenever there's no itinerary content yet, not
            just on a fresh page. A saved trip without a stored itinerary
            (loadedFromSave + sections.length === 0) used to leave the page
            blank under the masthead; now it lands here. */}
        {sections.length === 0 && !streaming && !error && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 16, padding: '60px 32px',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono-display), ui-monospace, monospace',
              fontSize: 10, letterSpacing: '0.22em',
              color: 'var(--brand-accent-2)', fontWeight: 600,
            }}>
              {String.fromCodePoint(0x00A7)} NO ITINERARY YET
            </div>
            <p style={{
              margin: 0, fontFamily: 'var(--font-display), Georgia, serif',
              fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em',
              color: 'var(--brand-ink)',
            }}>
              Drop pins, then <em style={{ fontStyle: 'italic', color: 'var(--brand-accent)' }}>build it.</em>
            </p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--brand-ink-dim)', maxWidth: 380, lineHeight: 1.6 }}>
              Mark the places you want to visit on the map, then we&apos;ll arrange them into a day-by-day plan.
            </p>
            <Link
              href={savedTripId ? `/plan/${encodeURIComponent(savedTripId)}/map` : '/plan'}
              style={{
                padding: '11px 28px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                background: 'var(--brand-accent)', color: 'var(--brand-bg)',
                border: 'none', cursor: 'pointer', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontFamily: 'inherit',
                boxShadow: '0 4px 14px rgba(167,139,250,0.35)',
              }}
            >
              {String.fromCodePoint(0x2315)} Open the map
            </Link>
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

      {/* In-page genie chat removed during the design pass — the GlobalChat
          mounted in app/layout.tsx provides the floating AI assistant
          globally, so duplicating it here added a second character in the
          bottom-right corner. ChatPanel + GenieCharacter remain available
          as exported components for future use. */}

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
