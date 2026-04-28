// ─── Trip detail pages: Plan (Mapbox), Itinerary, Booking, Files ─────────────
// Voice: cosmic + editorial. Fraunces display, Inter Tight UI, mono labels, no
// bubbly Genie character. Lavender accent (#a78bfa), icy blue (#7dd3fc), gold.
// Imports: BRAND, TYPE from shared.jsx (already global on window).

// ─── E1 · Plan (Mapbox-style 2D city map with bookmarks) ─────────────────────
function PlanMap({ compact }) {
  const w = compact ? 390 : 1440;
  const h = compact ? 820 : 900;
  return (
    <div style={{
      width: w, height: h, background: '#0a0a1f', position: 'relative',
      fontFamily: TYPE.ui, color: '#fff', overflow: 'hidden',
    }}>
      {/* Top app bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: compact ? 56 : 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: compact ? '0 14px' : '0 24px', zIndex: 20,
        background: 'rgba(10,10,31,0.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(167,139,250,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 16 }}>
          <div style={{
            padding: '6px 12px', border: '1px solid rgba(167,139,250,0.35)',
            borderRadius: 999, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
            background: 'rgba(167,139,250,0.08)', color: '#a78bfa',
          }}>← BACK TO GLOBE</div>
          {!compact && (
            <div style={{ fontFamily: TYPE.display, fontSize: 17, fontWeight: 400, letterSpacing: '-0.01em' }}>
              Kyoto · <span style={{ color: '#a78bfa', fontStyle: 'italic' }}>plan your stops</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            padding: '6px 14px', borderRadius: 999, background: '#a78bfa',
            color: '#0a0a1f', fontSize: 12, fontWeight: 700,
          }}>Generate itinerary →</span>
        </div>
      </div>

      {/* Map area */}
      <CityMapCanvas compact={compact} />

      {/* Legend / category filters · top right (desktop) or below appbar (mobile) */}
      <CategoryLegend compact={compact} />

      {/* Sidebar list (desktop) / sheet (mobile) */}
      {!compact ? <PlanSidebar /> : <PlanMobileSheet />}

      {/* Selected pin tooltip */}
      {!compact && <PinTooltip />}
    </div>
  );
}

function CityMapCanvas({ compact }) {
  // Mapbox-style flat city map. SVG with grid streets, district blocks, river,
  // a few labeled neighborhoods. 9 user pins of mixed categories.
  const W = compact ? 390 : 1440;
  const H = compact ? 820 : 900;
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0d1525' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {/* Land plate */}
        <rect width={W} height={H} fill="#0d1525" />

        {/* District blocks (subtle warm zones for old town / downtown) */}
        <rect x={W * 0.08} y={H * 0.18} width={W * 0.32} height={H * 0.38} fill="#1a1f3a" opacity="0.55" />
        <rect x={W * 0.45} y={H * 0.22} width={W * 0.28} height={H * 0.30} fill="#191e35" opacity="0.45" />
        <rect x={W * 0.18} y={H * 0.62} width={W * 0.40} height={H * 0.24} fill="#1d2240" opacity="0.50" />
        <rect x={W * 0.62} y={H * 0.58} width={W * 0.30} height={H * 0.30} fill="#1a1f3a" opacity="0.45" />

        {/* River — Kamogawa-ish, runs vertical-ish, curves */}
        <path
          d={`M ${W * 0.55} 0 Q ${W * 0.50} ${H * 0.25}, ${W * 0.58} ${H * 0.45} T ${W * 0.50} ${H} `}
          fill="none" stroke="#1e3a5f" strokeWidth={compact ? 14 : 22} opacity="0.85"
        />
        <path
          d={`M ${W * 0.55} 0 Q ${W * 0.50} ${H * 0.25}, ${W * 0.58} ${H * 0.45} T ${W * 0.50} ${H} `}
          fill="none" stroke="#2a4f7a" strokeWidth={compact ? 6 : 10} opacity="0.6"
        />

        {/* Major roads — orthogonal grid w/ a few diagonals */}
        <g stroke="#2a3050" strokeWidth={compact ? 1 : 1.6} opacity="0.9" fill="none">
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={H * (0.08 + i * 0.08)} x2={W} y2={H * (0.08 + i * 0.08)} />
          ))}
          {Array.from({ length: 18 }).map((_, i) => (
            <line key={`v${i}`} x1={W * (0.05 + i * 0.06)} y1="0" x2={W * (0.05 + i * 0.06)} y2={H} />
          ))}
        </g>

        {/* Highlighted main streets */}
        <g stroke="#3d4570" strokeWidth={compact ? 2.4 : 3.6} opacity="0.95" fill="none">
          <line x1="0" y1={H * 0.4} x2={W} y2={H * 0.4} />
          <line x1={W * 0.35} y1="0" x2={W * 0.35} y2={H} />
          <line x1={W * 0.78} y1="0" x2={W * 0.78} y2={H} />
        </g>

        {/* Park splash — green */}
        <ellipse cx={W * 0.82} cy={H * 0.32} rx={compact ? 36 : 70} ry={compact ? 28 : 50} fill="#1f3d2c" opacity="0.85" />
        <text x={W * 0.82} y={H * 0.34} textAnchor="middle" fontSize={compact ? 8 : 10} fill="#5fa676" fontFamily="ui-monospace,monospace" letterSpacing="1">MARUYAMA PK</text>

        {/* District labels */}
        <g fontFamily="ui-monospace,monospace" fontSize={compact ? 8 : 10} fill="#6d7aa8" letterSpacing="2">
          <text x={W * 0.22} y={H * 0.36} textAnchor="middle">GION</text>
          <text x={W * 0.58} y={H * 0.30} textAnchor="middle">DOWNTOWN</text>
          <text x={W * 0.36} y={H * 0.74} textAnchor="middle">NISHIKI</text>
          <text x={W * 0.78} y={H * 0.72} textAnchor="middle">HIGASHIYAMA</text>
          <text x={W * 0.07} y={H * 0.92} textAnchor="start" fill="#3d4570">© Mapbox · GeKnee</text>
        </g>
      </svg>

      {/* User-dropped pins (numbered + color-coded by category) */}
      {PIN_DATA.map((p, i) => (
        <UserPin key={i} {...p} compact={compact} index={i + 1} />
      ))}

      {/* Map controls (zoom + recenter) */}
      <div style={{
        position: 'absolute', right: compact ? 12 : 24,
        bottom: compact ? 240 : 40,
        display: 'flex', flexDirection: 'column', gap: 8, zIndex: 12,
      }}>
        {['+', '−', '◎'].map(g => (
          <div key={g} style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(10,10,31,0.85)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(167,139,250,0.25)',
            color: '#fff', fontSize: 18, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>{g}</div>
        ))}
      </div>

      {/* Search bar — top center */}
      <div style={{
        position: 'absolute',
        top: compact ? 76 : 92,
        left: '50%', transform: 'translateX(-50%)',
        width: compact ? 'calc(100% - 28px)' : 480,
        zIndex: 12,
      }}>
        <div style={{
          background: 'rgba(10,10,31,0.92)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(167,139,250,0.3)', borderRadius: 12,
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
        }}>
          <span style={{ color: '#a78bfa', fontSize: 14 }}>⌕</span>
          <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            Search a place to add to your trip
          </span>
          <span style={{
            fontSize: 9, padding: '2px 6px', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 4, color: 'rgba(255,255,255,0.4)', fontFamily: TYPE.mono, letterSpacing: '0.1em',
          }}>⌘ K</span>
        </div>
      </div>
    </div>
  );
}

const CAT = {
  food:       { color: '#fb923c', glyph: '◉', label: 'Food' },
  activities: { color: '#a78bfa', glyph: '✦', label: 'Activities' },
  hotels:     { color: '#7dd3fc', glyph: '◬', label: 'Hotels' },
  shopping:   { color: '#fbbf24', glyph: '◈', label: 'Shopping' },
  monument:   { color: '#f5f1e8', glyph: '⏚', label: 'Monument' },
};

const PIN_DATA = [
  { x: 0.20, y: 0.36, cat: 'monument',   name: 'Yasaka Shrine',     unlocked: true,  selected: false },
  { x: 0.30, y: 0.42, cat: 'food',       name: 'Issen Yōshoku',     unlocked: false, selected: false },
  { x: 0.46, y: 0.30, cat: 'activities', name: 'Pontochō walk',     unlocked: false, selected: true  },
  { x: 0.62, y: 0.34, cat: 'hotels',     name: 'Park Hyatt',        unlocked: false, selected: false },
  { x: 0.78, y: 0.62, cat: 'monument',   name: 'Kiyomizu-dera',     unlocked: true,  selected: false },
  { x: 0.36, y: 0.72, cat: 'shopping',   name: 'Nishiki Market',    unlocked: false, selected: false },
  { x: 0.50, y: 0.80, cat: 'food',       name: 'Kyoto Ramen Lab',   unlocked: false, selected: false },
  { x: 0.70, y: 0.50, cat: 'activities', name: 'Tea ceremony',      unlocked: false, selected: false },
  { x: 0.16, y: 0.62, cat: 'food',       name: 'Honke Owariya',     unlocked: false, selected: false },
];

function UserPin({ x, y, cat, name, unlocked, selected, compact, index }) {
  const c = CAT[cat];
  const size = compact ? (selected ? 32 : 24) : (selected ? 44 : 34);
  return (
    <div style={{
      position: 'absolute',
      left: `${x * 100}%`, top: `${y * 100}%`,
      transform: 'translate(-50%, -100%)',
      pointerEvents: 'none', zIndex: 10,
      filter: selected ? 'drop-shadow(0 4px 16px rgba(167,139,250,0.6))' : 'drop-shadow(0 3px 8px rgba(0,0,0,0.5))',
    }}>
      <svg width={size} height={size * 1.3} viewBox="0 0 30 39" fill="none">
        <path d="M15 0 C23 0 30 7 30 15 C30 25 15 39 15 39 C15 39 0 25 0 15 C0 7 7 0 15 0 Z"
          fill={c.color} stroke="#0a0a1f" strokeWidth="1.5" />
        <circle cx="15" cy="15" r="8" fill="#0a0a1f" />
        <text x="15" y="19" textAnchor="middle" fontSize="11" fill={c.color} fontWeight="700"
          fontFamily="ui-sans-serif,system-ui">{index}</text>
      </svg>
      {unlocked && (
        <div style={{
          position: 'absolute', top: -4, right: -4,
          width: 14, height: 14, borderRadius: '50%',
          background: '#fbbf24', border: '1.5px solid #0a0a1f',
          fontSize: 8, color: '#0a0a1f', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✦</div>
      )}
    </div>
  );
}

function PinTooltip() {
  // Floating card for the selected pin (#3 Pontochō walk)
  return (
    <div style={{
      position: 'absolute', left: 'calc(46% + 24px)', top: '24%',
      width: 280, zIndex: 14,
      background: 'rgba(10,10,31,0.95)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(167,139,250,0.4)', borderRadius: 14,
      padding: 16, color: '#fff',
      boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: '#a78bfa', color: '#0a0a1f',
          fontSize: 11, fontWeight: 700, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>3</div>
        <div style={{ fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.18em', color: '#a78bfa' }}>
          ✦ ACTIVITIES · NIGHT
        </div>
      </div>
      <div style={{ fontFamily: TYPE.display, fontSize: 22, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 4 }}>
        Pontochō walk
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 14 }}>
        Lantern-lit alley along the Kamogawa, packed with kaiseki and cocktail bars. Best after dusk.
      </div>
      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 14, flexWrap: 'wrap' }}>
        <span>◷ ~90 min</span>
        <span>◐ Free</span>
        <span>★ 4.7</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{
          flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: '#a78bfa', color: '#0a0a1f', textAlign: 'center',
        }}>Add to day 2</div>
        <div style={{
          padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)',
        }}>✕</div>
      </div>
    </div>
  );
}

function CategoryLegend({ compact }) {
  return (
    <div style={{
      position: 'absolute',
      top: compact ? 138 : 92,
      right: compact ? 12 : 24,
      zIndex: 13,
      background: 'rgba(10,10,31,0.92)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(167,139,250,0.22)', borderRadius: 12,
      padding: compact ? '10px 12px' : '14px 16px',
      display: 'flex', flexDirection: compact ? 'row' : 'column',
      gap: compact ? 10 : 8,
      maxWidth: compact ? 'calc(100% - 24px)' : 'auto',
      flexWrap: 'wrap',
    }}>
      {!compact && (
        <div style={{ fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.18em', color: '#6d7aa8', marginBottom: 4 }}>
          § FILTER · 9 PINS
        </div>
      )}
      {Object.entries(CAT).map(([k, c]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
          <div style={{
            width: 14, height: 14, borderRadius: 4,
            background: c.color, border: '1px solid rgba(0,0,0,0.4)',
          }} />
          <span style={{ fontFamily: TYPE.ui }}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

function PlanSidebar() {
  // 360px right rail of saved pins, grouped by category
  return (
    <div style={{
      position: 'absolute', right: 0, top: 64, bottom: 0, width: 360,
      background: 'rgba(8,8,24,0.96)', backdropFilter: 'blur(20px)',
      borderLeft: '1px solid rgba(167,139,250,0.18)',
      padding: '24px 22px', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 18,
    }}>
      <div>
        <div style={{ fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.2em', color: '#a78bfa', marginBottom: 8 }}>
          § YOUR STOPS · KYOTO · 9
        </div>
        <div style={{ fontFamily: TYPE.display, fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          Drop pins. We'll string them together.
        </div>
      </div>

      {/* Tab filter */}
      <div style={{ display: 'flex', gap: 4, padding: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
        {['All', 'Food', 'Activities', 'Hotels'].map((t, i) => (
          <div key={t} style={{
            flex: 1, padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 600,
            borderRadius: 7, background: i === 0 ? 'rgba(167,139,250,0.18)' : 'transparent',
            color: i === 0 ? '#a78bfa' : 'rgba(255,255,255,0.5)',
          }}>{t}</div>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginRight: -12, paddingRight: 12 }}>
        {PIN_DATA.map((p, i) => {
          const c = CAT[p.cat];
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 12,
              background: p.selected ? 'rgba(167,139,250,0.10)' : 'rgba(255,255,255,0.025)',
              border: `1px solid ${p.selected ? 'rgba(167,139,250,0.35)' : 'rgba(255,255,255,0.06)'}`,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: c.color, color: '#0a0a1f',
                fontSize: 12, fontWeight: 700, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{p.name}</div>
                <div style={{
                  fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.14em',
                  color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
                }}>
                  {c.label}{p.unlocked ? ' · ⏚ UNLOCKED' : ''}
                </div>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>⋮</div>
            </div>
          );
        })}
      </div>

      <div style={{
        padding: 14, borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(167,139,250,0.18), rgba(125,211,252,0.10))',
        border: '1px solid rgba(167,139,250,0.30)',
      }}>
        <div style={{ fontFamily: TYPE.display, fontSize: 17, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 6 }}>
          Ready to plan?
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 12, lineHeight: 1.5 }}>
          We'll order your 9 stops into a daily route, with timing and walking distance.
        </div>
        <div style={{
          padding: '10px 14px', borderRadius: 8, background: '#a78bfa', color: '#0a0a1f',
          fontSize: 13, fontWeight: 700, textAlign: 'center',
        }}>
          ✦ Generate itinerary
        </div>
      </div>
    </div>
  );
}

function PlanMobileSheet() {
  // Bottom-sheet pin list — collapsed peek
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      background: 'rgba(8,8,24,0.97)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(167,139,250,0.22)',
      borderRadius: '20px 20px 0 0',
      padding: '14px 20px 20px', zIndex: 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.18em', color: '#a78bfa', marginBottom: 4 }}>
            § YOUR STOPS · KYOTO
          </div>
          <div style={{ fontFamily: TYPE.display, fontSize: 22, fontWeight: 400, letterSpacing: '-0.01em' }}>
            9 pins, 4 days
          </div>
        </div>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: '#a78bfa', color: '#0a0a1f',
          fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✦</div>
      </div>

      {/* Horizontal pin chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
        {PIN_DATA.slice(0, 5).map((p, i) => {
          const c = CAT[p.cat];
          return (
            <div key={i} style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 10px 6px 6px', borderRadius: 999,
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${p.selected ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.08)'}`,
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: c.color, color: '#0a0a1f', fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{i + 1}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>{p.name}</div>
            </div>
          );
        })}
      </div>

      <div style={{
        padding: '12px 18px', borderRadius: 10, background: '#a78bfa', color: '#0a0a1f',
        fontSize: 13, fontWeight: 700, textAlign: 'center',
      }}>
        ✦ Generate itinerary
      </div>
    </div>
  );
}

// ─── E2 · Itinerary (day-by-day, editable, with map + weather) ───────────────
function Itinerary({ compact }) {
  const w = compact ? 390 : 1440;
  const h = compact ? 1700 : 1100;
  return (
    <div style={{
      width: w, height: h, background: '#0a0a1f', position: 'relative', overflow: 'hidden',
      fontFamily: TYPE.ui, color: '#fff',
    }}>
      {/* App bar */}
      <div style={{
        height: compact ? 56 : 64, padding: compact ? '0 16px' : '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(167,139,250,0.18)',
        background: 'rgba(10,10,31,0.85)', position: 'relative', zIndex: 5,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 16 }}>
          <span style={{ color: '#a78bfa', fontSize: 13 }}>← Plan</span>
          <div style={{ fontFamily: TYPE.display, fontSize: compact ? 16 : 19, fontWeight: 400 }}>
            Kyoto · 4 days
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{
            padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
            border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa',
          }}>↗ Share</span>
          <span style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: '#a78bfa', color: '#0a0a1f',
          }}>Book</span>
        </div>
      </div>

      {/* Header: trip masthead */}
      <div style={{
        padding: compact ? '24px 20px' : '40px 32px 28px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontFamily: TYPE.mono, fontSize: 10, letterSpacing: '0.22em', color: '#7dd3fc', marginBottom: 12 }}>
          § ITINERARY · APR 14 → 17, 2026
        </div>
        <div style={{
          fontFamily: TYPE.display, fontSize: compact ? 38 : 56, fontWeight: 400,
          letterSpacing: '-0.025em', lineHeight: 1, marginBottom: 16,
        }}>
          Cherry-blossom <em style={{ color: '#a78bfa' }}>Kyoto</em>
        </div>
        <div style={{ display: 'flex', gap: compact ? 10 : 18, flexWrap: 'wrap', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
          <span>9 stops · 3 unlock-able monuments</span>
          <span>· Walking-first</span>
          <span>· Solo · ¥120,000 budget</span>
        </div>

        {/* Weather strip */}
        <div style={{ display: 'flex', gap: compact ? 6 : 8, marginTop: 24, overflowX: 'auto' }}>
          {[
            { d: 'MON 14', i: '☀', t: '18° / 9°', cond: 'Clear' },
            { d: 'TUE 15', i: '☼', t: '20° / 11°', cond: 'Sunny' },
            { d: 'WED 16', i: '☂', t: '15° / 10°', cond: 'Light rain', pop: 65 },
            { d: 'THU 17', i: '☁', t: '17° / 9°', cond: 'Cloudy' },
          ].map(d => (
            <div key={d.d} style={{
              flexShrink: 0, padding: '10px 14px', borderRadius: 10, minWidth: compact ? 86 : 110,
              background: 'rgba(125,211,252,0.05)', border: '1px solid rgba(125,211,252,0.18)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <div style={{ fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.45)' }}>{d.d}</div>
              <div style={{ fontSize: 22, color: '#7dd3fc' }}>{d.i}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#7dd3fc' }}>{d.t}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>{d.cond}{d.pop ? ` · ◌${d.pop}%` : ''}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body: days */}
      <div style={{
        padding: compact ? 0 : '32px 32px 60px',
        display: 'grid',
        gridTemplateColumns: compact ? '1fr' : '1fr 380px',
        gap: compact ? 0 : 28,
        alignItems: 'start',
      }}>
        {/* Days column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 0 : 18 }}>
          <DayCard compact={compact} day={1} title="Arrival · Gion" weather={['☀ 18°/9°', 'Clear']} actions={[
            { time: '4:00 PM', name: 'Check in · Park Hyatt', detail: 'Higashiyama. Ask for the courtyard side.' },
            { time: '6:30 PM', name: 'Pontochō walk', detail: 'Lantern-lit alley. Stop at Issen Yōshoku for okonomiyaki.', selected: true },
            { time: '9:00 PM', name: 'Yasaka Shrine ⏚', detail: 'Quest: night photo from the lantern wall. Stone tier drops on arrival.', monument: true },
          ]} />
          <DayCard compact={compact} day={2} title="Higashiyama · slow morning" weather={['☼ 20°/11°', 'Sunny']} actions={[
            { time: '8:30 AM', name: 'Honke Owariya breakfast', detail: 'Matcha soba. The 600-year old place near Imadegawa.' },
            { time: '10:00 AM', name: 'Kiyomizu-dera ⏚', detail: 'Quest: catch the morning light on the wooden stage. Bronze tier.', monument: true },
            { time: '1:00 PM', name: 'Tea ceremony · Camellia', detail: 'Pre-booked. Bring socks. ~90 min.' },
          ]} />
          <DayCard compact={compact} day={3} title="Downtown · Nishiki + Ramen" weather={['☂ 15°/10°', 'Rain']} actions={[
            { time: '11:00 AM', name: 'Nishiki Market', detail: 'Try yatsuhashi at Shogoin. Skip the souvenirs near the entrance.' },
            { time: '7:00 PM', name: 'Kyoto Ramen Lab', detail: 'Reservation only. Chef Otsuka. The black-garlic miso.' },
          ]} />
        </div>

        {/* Side column · day map (desktop only) */}
        {!compact && <DayMap />}
      </div>
    </div>
  );
}

function DayCard({ day, title, weather, actions, compact }) {
  return (
    <div style={{
      padding: compact ? '20px 18px' : '24px 28px',
      background: 'rgba(56,189,248,0.04)',
      border: compact ? 'none' : '1px solid rgba(125,211,252,0.18)',
      borderTop: compact ? '1px solid rgba(125,211,252,0.18)' : '1px solid rgba(125,211,252,0.18)',
      borderRadius: compact ? 0 : 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <div style={{
            fontFamily: TYPE.display, fontSize: compact ? 36 : 48, fontWeight: 400,
            letterSpacing: '-0.025em', color: '#a78bfa', lineHeight: 1, fontStyle: 'italic',
          }}>0{day}</div>
          <div>
            <div style={{ fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.18em', color: '#7dd3fc' }}>
              DAY {day} · {weather[0]} · {weather[1].toUpperCase()}
            </div>
            <div style={{ fontFamily: TYPE.display, fontSize: compact ? 20 : 26, fontWeight: 400, letterSpacing: '-0.01em' }}>
              {title}
            </div>
          </div>
        </div>
        <div style={{
          padding: '5px 10px', borderRadius: 999, fontSize: 10, fontWeight: 600,
          border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', whiteSpace: 'nowrap',
        }}>✦ Replan</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {actions.map((a, i) => (
          <ActivityRow key={i} {...a} index={i + 1} compact={compact} last={i === actions.length - 1} />
        ))}
      </div>
    </div>
  );
}

function ActivityRow({ time, name, detail, monument, selected, index, compact, last }) {
  return (
    <div style={{
      display: 'flex', gap: compact ? 12 : 16,
      padding: compact ? '14px 0' : '16px 0',
      borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)',
      position: 'relative',
      background: selected ? 'rgba(167,139,250,0.05)' : 'transparent',
      borderRadius: selected ? 8 : 0,
      paddingLeft: selected ? 12 : 0,
      paddingRight: selected ? 12 : 0,
      marginLeft: selected ? -12 : 0,
      marginRight: selected ? -12 : 0,
    }}>
      <div style={{
        flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
        background: monument ? '#fbbf24' : 'rgba(125,211,252,0.15)',
        border: `1.5px solid ${monument ? '#0a0a1f' : 'rgba(125,211,252,0.45)'}`,
        color: monument ? '#0a0a1f' : '#7dd3fc',
        fontSize: 11, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{index}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: TYPE.mono, fontSize: 10, letterSpacing: '0.14em',
          color: 'rgba(255,255,255,0.5)', marginBottom: 4,
        }}>{time}</div>
        <div style={{
          fontSize: compact ? 16 : 17, fontWeight: 600, color: '#fff',
          marginBottom: 4, fontFamily: TYPE.display, letterSpacing: '-0.005em',
        }}>{name}{monument && <span style={{ color: '#fbbf24', marginLeft: 8, fontSize: 12 }}>⏚ MONUMENT QUEST</span>}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55 }}>{detail}</div>
      </div>
      <div style={{
        flexShrink: 0, alignSelf: 'flex-start', marginTop: 4,
        opacity: selected ? 1 : 0.4,
        width: 24, height: 24, borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(251,191,36,0.8), rgba(167,139,250,0.8))',
        color: '#fff', fontSize: 12, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>✦</div>
    </div>
  );
}

function DayMap() {
  // Sticky right column with a smaller map zoomed to "today"
  return (
    <div style={{
      position: 'sticky', top: 32,
      background: 'rgba(13,21,37,0.95)', borderRadius: 16,
      border: '1px solid rgba(125,211,252,0.2)', overflow: 'hidden',
      height: 480,
    }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(125,211,252,0.15)' }}>
        <div style={{ fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.18em', color: '#7dd3fc', marginBottom: 4 }}>
          § DAY 1 · 3 STOPS · 2.4 KM
        </div>
        <div style={{ fontFamily: TYPE.display, fontSize: 19, fontWeight: 400 }}>Gion route</div>
      </div>
      <div style={{ position: 'relative', height: 'calc(100% - 64px)' }}>
        <svg width="100%" height="100%" viewBox="0 0 380 416" style={{ display: 'block' }}>
          <rect width="380" height="416" fill="#0d1525" />
          <g stroke="#2a3050" strokeWidth="1" opacity="0.7">
            {Array.from({ length: 9 }).map((_, i) => (
              <line key={i} x1="0" y1={50 + i * 42} x2="380" y2={50 + i * 42} />
            ))}
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={i} x1={30 + i * 32} y1="0" x2={30 + i * 32} y2="416" />
            ))}
          </g>
          <path d="M 240 0 Q 220 100, 250 200 T 220 416" fill="none" stroke="#1e3a5f" strokeWidth="14" />
          {/* Route line connecting 3 stops */}
          <path d="M 90 320 L 160 220 L 280 80" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeDasharray="6 4" />
          {[
            { x: 90, y: 320, n: 1 },
            { x: 160, y: 220, n: 2 },
            { x: 280, y: 80, n: 3 },
          ].map(p => (
            <g key={p.n}>
              <circle cx={p.x} cy={p.y} r="14" fill="#a78bfa" stroke="#0a0a1f" strokeWidth="2" />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0a0a1f">{p.n}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ─── E3 · Booking sheet ──────────────────────────────────────────────────────
function BookingSheet({ compact }) {
  const w = compact ? 390 : 1440;
  const h = compact ? 1500 : 1000;
  return (
    <div style={{
      width: w, height: h, background: '#0a0a1f', position: 'relative', overflow: 'hidden',
      fontFamily: TYPE.ui, color: '#fff',
    }}>
      {/* App bar */}
      <div style={{
        height: compact ? 56 : 64, padding: compact ? '0 16px' : '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(167,139,250,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: '#a78bfa', fontSize: 13 }}>← Itinerary</span>
          <div style={{ fontFamily: TYPE.display, fontSize: compact ? 16 : 19 }}>Booking · Kyoto</div>
        </div>
        <div style={{ fontFamily: TYPE.mono, fontSize: 10, letterSpacing: '0.16em', color: '#7dd3fc' }}>
          ¥87,400 · 3 OF 5 BOOKED
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        padding: compact ? '12px 16px' : '20px 32px',
        display: 'flex', gap: compact ? 8 : 14,
        borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto',
      }}>
        {[
          ['◬', 'Stays', 1],
          ['✈', 'Flights', 1],
          ['◉', 'Activities', 1],
          ['◐', 'Transport', 0],
          ['◈', 'Insurance', 0],
        ].map(([g, t, n], i) => (
          <div key={t} style={{
            padding: compact ? '8px 14px' : '10px 18px',
            borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: i === 0 ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${i === 0 ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.06)'}`,
            color: i === 0 ? '#a78bfa' : 'rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
          }}>
            <span>{g}</span>
            <span>{t}</span>
            {n > 0 && (
              <span style={{
                fontSize: 9, padding: '1px 6px', borderRadius: 999,
                background: '#fbbf24', color: '#0a0a1f', fontWeight: 700,
              }}>{n}</span>
            )}
          </div>
        ))}
      </div>

      {/* Content: Stays cards */}
      <div style={{ padding: compact ? '20px 16px' : '32px 32px' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: 20, gap: 16, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontFamily: TYPE.mono, fontSize: 10, letterSpacing: '0.18em', color: '#a78bfa', marginBottom: 8 }}>
              § HIGASHIYAMA · 3 NIGHTS · APR 14–17
            </div>
            <div style={{ fontFamily: TYPE.display, fontSize: compact ? 28 : 40, fontWeight: 400, letterSpacing: '-0.02em' }}>
              Where will you sleep?
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>↕ Price</span>
            <span style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>★ Rating</span>
          </div>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(3, 1fr)',
          gap: compact ? 14 : 20,
        }}>
          <StayCard
            tier="EDITORS' PICK"
            name="Park Hyatt Kyoto"
            district="Higashiyama"
            price="¥58,000"
            tag="hotel"
            stars={5}
            booked
            features={['Courtyard view', 'Onsen access', 'Walk to Yasaka 4 min']}
          />
          <StayCard
            tier="LOCAL"
            name="Tawaraya Ryokan"
            district="Nakagyō"
            price="¥42,000"
            tag="ryokan"
            stars={5}
            features={['300-year machiya', 'Kaiseki dinner', 'Tatami rooms']}
          />
          <StayCard
            tier="BUDGET"
            name="Mosaic Hostel"
            district="Downtown"
            price="¥7,500"
            tag="hostel"
            stars={4}
            features={['Capsule pods', 'Bar downstairs', 'Walk to Nishiki']}
          />
        </div>

        {/* Flight card */}
        <div style={{ marginTop: compact ? 28 : 44 }}>
          <div style={{ fontFamily: TYPE.mono, fontSize: 10, letterSpacing: '0.18em', color: '#a78bfa', marginBottom: 12 }}>
            § FLIGHTS · ROUND TRIP · 1 BOOKED
          </div>
          <div style={{
            padding: compact ? '18px 16px' : '22px 26px',
            background: 'rgba(167,139,250,0.06)',
            border: '1px solid rgba(167,139,250,0.25)',
            borderRadius: 14,
            display: 'grid',
            gridTemplateColumns: compact ? '1fr' : '1fr 1fr auto',
            gap: compact ? 14 : 24, alignItems: 'center',
          }}>
            <FlightLeg from="SFO" fromTime="11:30 PM" to="ITM" toTime="5:50 AM" stop="Tokyo · 1h 20m" date="APR 13" />
            <FlightLeg from="ITM" fromTime="6:40 PM" to="SFO" toTime="12:25 PM" stop="Direct · 9h 45m" date="APR 17" />
            <div style={{ textAlign: compact ? 'left' : 'right' }}>
              <div style={{ fontFamily: TYPE.display, fontSize: 22, fontWeight: 400 }}>¥124,000</div>
              <div style={{ fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.14em', color: '#7dd3fc', marginTop: 4 }}>JAL · CONFIRMED</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StayCard({ tier, name, district, price, tag, stars, features, booked }) {
  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      border: `1px solid ${booked ? 'rgba(125,211,252,0.4)' : 'rgba(255,255,255,0.08)'}`,
      background: booked ? 'rgba(125,211,252,0.04)' : 'rgba(255,255,255,0.025)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Image placeholder */}
      <div style={{
        height: 160, position: 'relative',
        background: 'linear-gradient(135deg, #1f2547, #2a3050)',
      }}>
        <div style={{
          position: 'absolute', top: 12, left: 12,
          padding: '4px 10px', fontSize: 9, letterSpacing: '0.14em', fontWeight: 700,
          background: 'rgba(10,10,31,0.85)', color: '#a78bfa', borderRadius: 4,
        }}>{tier}</div>
        {booked && (
          <div style={{
            position: 'absolute', top: 12, right: 12,
            padding: '4px 10px', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
            background: '#7dd3fc', color: '#0a0a1f', borderRadius: 4,
          }}>✓ BOOKED</div>
        )}
        <div style={{
          position: 'absolute', bottom: 12, left: 12, fontSize: 28,
          color: 'rgba(167,139,250,0.6)',
        }}>◬</div>
      </div>
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{
            fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.16em',
            color: 'rgba(255,255,255,0.45)', marginBottom: 4,
          }}>{district.toUpperCase()} · {tag.toUpperCase()}</div>
          <div style={{ fontFamily: TYPE.display, fontSize: 21, fontWeight: 400, letterSpacing: '-0.01em' }}>{name}</div>
          <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 4, letterSpacing: '0.1em' }}>
            {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
          {features.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: '#7dd3fc' }}>·</span><span>{f}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <div>
            <div style={{ fontFamily: TYPE.display, fontSize: 22, fontWeight: 400 }}>{price}</div>
            <div style={{ fontFamily: TYPE.mono, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>PER NIGHT</div>
          </div>
          <div style={{
            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: booked ? 'rgba(255,255,255,0.05)' : '#a78bfa',
            color: booked ? 'rgba(255,255,255,0.5)' : '#0a0a1f',
            border: booked ? '1px solid rgba(255,255,255,0.1)' : 'none',
          }}>{booked ? 'Manage' : 'Book →'}</div>
        </div>
      </div>
    </div>
  );
}

function FlightLeg({ from, fromTime, to, toTime, stop, date }) {
  return (
    <div>
      <div style={{ fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>
        {date} · OUTBOUND
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div>
          <div style={{ fontFamily: TYPE.display, fontSize: 24, fontWeight: 400 }}>{from}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{fromTime}</div>
        </div>
        <div style={{ flex: 1, position: 'relative', minWidth: 60 }}>
          <div style={{ height: 1, background: 'rgba(167,139,250,0.4)' }} />
          <div style={{
            position: 'absolute', left: '50%', top: -8, transform: 'translateX(-50%)',
            fontSize: 9, color: '#a78bfa', fontFamily: TYPE.mono, letterSpacing: '0.1em',
            background: 'rgba(10,10,31,1)', padding: '0 6px', whiteSpace: 'nowrap',
          }}>✈ {stop}</div>
        </div>
        <div>
          <div style={{ fontFamily: TYPE.display, fontSize: 24, fontWeight: 400 }}>{to}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{toTime}</div>
        </div>
      </div>
    </div>
  );
}

// ─── E4 · File vault ─────────────────────────────────────────────────────────
function FileVault({ compact }) {
  const w = compact ? 390 : 1280;
  const h = compact ? 1400 : 900;
  const files = [
    { kind: 'passport',  label: 'Passport',          meta: 'Vietnam · exp. 2031', glyph: '⏚', color: '#fbbf24', stamp: 'CURRENT' },
    { kind: 'flight',    label: 'JAL · SFO → ITM',   meta: 'APR 13 · seat 22A',   glyph: '✈', color: '#7dd3fc', stamp: 'TICKET' },
    { kind: 'flight',    label: 'JAL · ITM → SFO',   meta: 'APR 17 · seat 18C',   glyph: '✈', color: '#7dd3fc', stamp: 'TICKET' },
    { kind: 'hotel',     label: 'Park Hyatt Kyoto',  meta: '3 nights · 4106',     glyph: '◬', color: '#a78bfa', stamp: 'CONFIRMED' },
    { kind: 'visa',      label: 'Japan eVisa',       meta: 'Multi-entry · 30d',   glyph: '◷', color: '#7cff97', stamp: 'APPROVED' },
    { kind: 'insurance', label: 'World Nomads',      meta: 'APR 13–17',           glyph: '◈', color: '#fb923c', stamp: 'ACTIVE' },
    { kind: 'voucher',   label: 'Tea Camellia',      meta: 'Apr 15 · 1pm',        glyph: '◉', color: '#fbbf24', stamp: 'BOOKED' },
    { kind: 'voucher',   label: 'Kyoto Ramen Lab',   meta: 'Apr 16 · 7pm',        glyph: '◉', color: '#fbbf24', stamp: 'BOOKED' },
  ];
  return (
    <div style={{
      width: w, height: h, background: '#0a0a1f', position: 'relative', overflow: 'hidden',
      fontFamily: TYPE.ui, color: '#fff',
    }}>
      {/* App bar */}
      <div style={{
        height: compact ? 56 : 64, padding: compact ? '0 16px' : '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(167,139,250,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: '#a78bfa', fontSize: 13 }}>← Itinerary</span>
          <div style={{ fontFamily: TYPE.display, fontSize: compact ? 16 : 19 }}>File vault</div>
        </div>
        <div style={{
          padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
          background: '#a78bfa', color: '#0a0a1f',
        }}>+ Upload</div>
      </div>

      {/* Header */}
      <div style={{ padding: compact ? '24px 20px 12px' : '40px 32px 24px' }}>
        <div style={{ fontFamily: TYPE.mono, fontSize: 10, letterSpacing: '0.22em', color: '#7dd3fc', marginBottom: 12 }}>
          § PASSPORTS · TICKETS · VOUCHERS · 8 OF 25 GB
        </div>
        <div style={{
          fontFamily: TYPE.display, fontSize: compact ? 36 : 56, fontWeight: 400,
          letterSpacing: '-0.025em', lineHeight: 1, marginBottom: 14,
        }}>
          Everything in <em style={{ color: '#a78bfa' }}>one passport.</em>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', maxWidth: 540, lineHeight: 1.5 }}>
          Documents you might need offline. Encrypted at rest. Drag-drop a file or photo to upload.
        </div>
      </div>

      {/* Filter chips */}
      <div style={{
        padding: compact ? '0 20px 16px' : '0 32px 24px',
        display: 'flex', gap: 8, overflowX: 'auto',
      }}>
        {['All · 8', 'Passports', 'Tickets · 4', 'Hotels · 1', 'Visas · 1', 'Vouchers · 2'].map((t, i) => (
          <span key={t} style={{
            padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600,
            background: i === 0 ? 'rgba(167,139,250,0.18)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${i === 0 ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.07)'}`,
            color: i === 0 ? '#a78bfa' : 'rgba(255,255,255,0.6)',
            whiteSpace: 'nowrap',
          }}>{t}</span>
        ))}
      </div>

      {/* File grid — passport-sticker tiles */}
      <div style={{
        padding: compact ? '0 20px 24px' : '0 32px 40px',
        display: 'grid',
        gridTemplateColumns: compact ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: compact ? 14 : 20,
      }}>
        {files.map((f, i) => <VaultTile key={i} {...f} />)}

        {/* Add tile */}
        <div style={{
          aspectRatio: '3/4', borderRadius: 14,
          border: '1.5px dashed rgba(167,139,250,0.35)',
          background: 'rgba(167,139,250,0.04)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 10,
          color: 'rgba(167,139,250,0.7)', fontSize: 12, fontWeight: 600,
        }}>
          <div style={{ fontSize: 28 }}>+</div>
          <div>Drop a file</div>
        </div>
      </div>
    </div>
  );
}

function VaultTile({ label, meta, glyph, color, stamp }) {
  return (
    <div style={{
      aspectRatio: '3/4', borderRadius: 14,
      background: '#0d1525',
      border: '1px solid rgba(255,255,255,0.08)',
      padding: 16, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    }}>
      {/* Stamp overlay */}
      <div style={{
        position: 'absolute', top: 16, right: -10, transform: 'rotate(8deg)',
        padding: '4px 14px', fontSize: 9, fontWeight: 800, letterSpacing: '0.18em',
        border: `2px solid ${color}`, color: color,
        background: 'rgba(10,10,31,0.7)', borderRadius: 3,
      }}>{stamp}</div>

      {/* Big glyph */}
      <div style={{
        fontSize: 56, color: color, opacity: 0.4,
        marginTop: 8,
      }}>{glyph}</div>

      {/* Label */}
      <div>
        <div style={{ fontFamily: TYPE.display, fontSize: 18, fontWeight: 400, letterSpacing: '-0.005em', lineHeight: 1.15, marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.45)' }}>
          {meta.toUpperCase()}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>↓ Download</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>⋮</span>
      </div>
    </div>
  );
}

Object.assign(window, { PlanMap, Itinerary, BookingSheet, FileVault });
