// Shared brand tokens + small UI atoms used by all variants
const BRAND = {
  // cosmic but pulled back — less candy, more editorial
  bg:       '#05050f',
  bg2:      '#0a0a1f',
  surface:  'rgba(18,18,40,0.72)',
  surfaceSolid: '#0d0d24',
  border:   'rgba(148, 163, 208, 0.12)',
  borderHi: 'rgba(167, 139, 250, 0.35)',
  ink:      '#f2f2f8',
  inkDim:   '#a8a8c0',
  inkMute:  '#6b6b85',
  accent:   '#a78bfa',   // lavender — anchor brand note
  accent2:  '#7dd3fc',   // icy blue — secondary
  gold:     '#fbbf24',   // reserved for single 'magic moment' highlights
  danger:   '#f87171',
};

const TYPE = {
  // Editorial serif for titles + geometric sans for UI — pulled away from the generic Geist default
  display: "'Fraunces', 'Cormorant Garamond', Georgia, serif",
  ui:      "'Inter Tight', 'Inter', system-ui, -apple-system, sans-serif",
  mono:    "'JetBrains Mono', ui-monospace, monospace",
};

function Chip({ children, active, onClick, icon, small }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: small ? '5px 10px' : '7px 14px',
        borderRadius: 999,
        fontSize: small ? 11 : 12,
        fontWeight: 500,
        letterSpacing: '0.01em',
        fontFamily: TYPE.ui,
        background: active ? 'rgba(167,139,250,0.16)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? BRAND.borderHi : BRAND.border}`,
        color: active ? BRAND.accent : BRAND.inkDim,
        cursor: 'pointer',
        transition: 'all 120ms ease',
        whiteSpace: 'nowrap',
      }}
    >
      {icon && <span style={{ opacity: 0.85 }}>{icon}</span>}
      {children}
    </button>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label style={{ display: 'block' }}>
      {label && (
        <div style={{ fontSize: 10, fontFamily: TYPE.ui, letterSpacing: '0.12em', color: BRAND.inkMute,
          textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
          {label}
        </div>
      )}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${BRAND.border}`, borderRadius: 10,
          padding: '10px 12px',
          color: BRAND.ink, fontFamily: TYPE.ui, fontSize: 14,
          outline: 'none',
        }}
      />
    </label>
  );
}

// Single quiet line of text with an inline action — used for destination input
function QuietInput({ value, onChange, placeholder, onSubmit, width = '100%' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${BRAND.border}`,
      borderRadius: 14,
      padding: '2px 4px 2px 16px',
      width,
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="11" cy="11" r="7" stroke={BRAND.inkMute} strokeWidth="1.6" />
        <path d="M20 20l-3.5-3.5" stroke={BRAND.inkMute} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={e => { if (e.key === 'Enter') onSubmit && onSubmit(); }}
        style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          color: BRAND.ink, fontFamily: TYPE.ui, fontSize: 14,
          padding: '10px 0',
        }}
      />
      {value && (
        <button
          onClick={onSubmit}
          style={{
            background: BRAND.accent, color: '#0a0a1f',
            border: 'none', padding: '8px 14px', borderRadius: 10,
            fontFamily: TYPE.ui, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >Go →</button>
      )}
    </div>
  );
}

// Step indicator — used in each variant for the 4-step continuity
function StepMarker({ idx, total, active, done, label, compact }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: TYPE.ui }}>
      <div style={{
        width: compact ? 20 : 24, height: compact ? 20 : 24, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 600,
        background: done ? BRAND.accent : active ? 'rgba(167,139,250,0.2)' : 'transparent',
        color: done ? '#0a0a1f' : active ? BRAND.accent : BRAND.inkMute,
        border: `1px solid ${done || active ? BRAND.accent : BRAND.border}`,
        transition: 'all 200ms ease',
      }}>
        {done ? '✓' : idx + 1}
      </div>
      {label && (
        <span style={{
          fontSize: 12, color: active ? BRAND.ink : done ? BRAND.inkDim : BRAND.inkMute,
          fontWeight: active ? 600 : 400,
        }}>{label}</span>
      )}
    </div>
  );
}

// Trip state hook — shared across all variants. Persists to localStorage.
function useTripState(initial) {
  const [trip, setTrip] = React.useState(() => {
    try {
      const saved = localStorage.getItem('geknee_trip_v2');
      if (saved) return { ...initial, ...JSON.parse(saved) };
    } catch {}
    return initial;
  });
  React.useEffect(() => {
    localStorage.setItem('geknee_trip_v2', JSON.stringify(trip));
  }, [trip]);
  const update = (patch) => setTrip(t => ({ ...t, ...patch }));
  return [trip, update];
}

const DEFAULT_TRIP = {
  destination: '',
  lat: null, lon: null,
  startDate: '', endDate: '',
  nights: 7,
  style: '',
  budget: '',
  purpose: '',
  travelers: 1,
  origin: 'SFO',
};

// Small starfield used as background
function StarBg({ density = 60, drift = true }) {
  const stars = React.useMemo(() => {
    const out = [];
    for (let i = 0; i < density; i++) {
      out.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        r: Math.random() * 1.4 + 0.2,
        o: Math.random() * 0.6 + 0.15,
        d: Math.random() * 6 + 3,
      });
    }
    return out;
  }, [density]);
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {stars.map((s, i) => (
        <span key={i} style={{
          position: 'absolute',
          left: `${s.x}%`, top: `${s.y}%`,
          width: s.r * 2, height: s.r * 2,
          borderRadius: '50%', background: '#fff',
          opacity: s.o,
          animation: drift ? `starTwinkle ${s.d}s ease-in-out ${-s.d * Math.random()}s infinite` : 'none',
        }} />
      ))}
    </div>
  );
}

Object.assign(window, { BRAND, TYPE, Chip, Field, QuietInput, StepMarker, useTripState, DEFAULT_TRIP, StarBg });
