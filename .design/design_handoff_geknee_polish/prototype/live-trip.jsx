// ─── E5 · Live Trip · in-the-field companion ─────────────────────────────────
// Goal: user is mid-trip. Big map up top, an "agent card" stack below telling
// them what to do RIGHT NOW — leave-by, weather, transit, next stop. Glanceable.

function LiveTrip({ compact }) {
  const w = compact ? 390 : 1440;
  const h = compact ? 1700 : 1000;
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
        background: 'rgba(10,10,31,0.85)', position: 'relative', zIndex: 30,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 16 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: '#7cff97',
            boxShadow: '0 0 12px rgba(124,255,151,0.7)', animation: 'pulse 2s ease-in-out infinite',
          }} />
          <div style={{ fontFamily: TYPE.mono, fontSize: 10, letterSpacing: '0.2em', color: '#7cff97' }}>
            LIVE · DAY 2 OF 4 · KYOTO
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>2:14 PM JST</span>
          <span style={{
            padding: '5px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
            background: 'rgba(125,211,252,0.12)', color: '#7dd3fc',
          }}>◐ Offline maps cached</span>
        </div>
      </div>

      {/* Map (top half desktop / top third mobile) */}
      <div style={{
        position: 'relative',
        height: compact ? 380 : 560,
      }}>
        <LiveMapCanvas compact={compact} />

        {/* Floating "you are here" capsule */}
        <div style={{
          position: 'absolute',
          top: compact ? 16 : 24,
          left: compact ? 16 : 24,
          padding: '10px 14px', borderRadius: 12,
          background: 'rgba(10,10,31,0.92)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(124,255,151,0.4)',
          display: 'flex', alignItems: 'center', gap: 10,
          maxWidth: compact ? 'calc(100% - 32px)' : 360,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#7cff97', color: '#0a0a1f',
            fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>◉</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.16em', color: '#7cff97', marginBottom: 2 }}>
              YOU · KIYOMIZU-DERA
            </div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>2 of 4 stops complete today</div>
          </div>
        </div>

        {/* Right-side mini ETA stack (desktop) */}
        {!compact && (
          <div style={{
            position: 'absolute', top: 24, right: 24,
            display: 'flex', flexDirection: 'column', gap: 10,
            width: 280,
          }}>
            <MiniWeatherCard />
            <MiniTransitCard />
          </div>
        )}

        {/* Map controls */}
        <div style={{
          position: 'absolute',
          right: compact ? 14 : 24,
          bottom: compact ? 14 : 24,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {['+', '−', '⌖'].map(g => (
            <div key={g} style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(10,10,31,0.85)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(167,139,250,0.25)',
              color: '#fff', fontSize: 16, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>{g}</div>
          ))}
        </div>
      </div>

      {/* Bottom: agent cards (the "tells the user what to do" stack) */}
      <div style={{
        padding: compact ? '20px 16px 24px' : '32px 32px 40px',
        display: 'flex', flexDirection: 'column', gap: compact ? 12 : 18,
      }}>
        {/* HERO LEAVE-BY CARD */}
        <LeaveByCard compact={compact} />

        {/* Two columns of context cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr' : 'repeat(3, 1fr)',
          gap: compact ? 12 : 16,
        }}>
          <NextStopCard compact={compact} />
          <WeatherAlertCard compact={compact} />
          <CrowdsCard compact={compact} />
        </div>

        {/* Day timeline strip */}
        <DayTimeline compact={compact} />
      </div>
    </div>
  );
}

function LiveMapCanvas({ compact }) {
  const W = compact ? 390 : 1440;
  const H = compact ? 380 : 560;
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0d1525' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <rect width={W} height={H} fill="#0d1525" />
        {/* District zones */}
        <rect x={W * 0.05} y={H * 0.10} width={W * 0.30} height={H * 0.55} fill="#1a1f3a" opacity="0.55" />
        <rect x={W * 0.40} y={H * 0.20} width={W * 0.32} height={H * 0.55} fill="#191e35" opacity="0.45" />
        <rect x={W * 0.62} y={H * 0.40} width={W * 0.30} height={H * 0.45} fill="#1d2240" opacity="0.50" />
        {/* River */}
        <path d={`M ${W * 0.55} 0 Q ${W * 0.50} ${H * 0.45}, ${W * 0.58} ${H * 0.80} T ${W * 0.50} ${H}`}
          fill="none" stroke="#1e3a5f" strokeWidth={compact ? 12 : 20} opacity="0.85" />
        <path d={`M ${W * 0.55} 0 Q ${W * 0.50} ${H * 0.45}, ${W * 0.58} ${H * 0.80} T ${W * 0.50} ${H}`}
          fill="none" stroke="#2a4f7a" strokeWidth={compact ? 5 : 9} opacity="0.55" />
        {/* Streets grid */}
        <g stroke="#2a3050" strokeWidth={compact ? 1 : 1.4} opacity="0.85">
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={H * (0.10 + i * 0.12)} x2={W} y2={H * (0.10 + i * 0.12)} />
          ))}
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={`v${i}`} x1={W * (0.06 + i * 0.07)} y1="0" x2={W * (0.06 + i * 0.07)} y2={H} />
          ))}
        </g>
        {/* Highlighted main streets */}
        <g stroke="#3d4570" strokeWidth={compact ? 2.4 : 3.4} opacity="0.95">
          <line x1="0" y1={H * 0.55} x2={W} y2={H * 0.55} />
          <line x1={W * 0.40} y1="0" x2={W * 0.40} y2={H} />
        </g>

        {/* Active route — solid lavender from current → next stop */}
        <path
          d={`M ${W * 0.32} ${H * 0.38} Q ${W * 0.42} ${H * 0.52}, ${W * 0.55} ${H * 0.62}`}
          fill="none" stroke="#a78bfa" strokeWidth={compact ? 3 : 4}
          strokeLinecap="round"
        />
        {/* Animated dashed overlay along same path */}
        <path
          d={`M ${W * 0.32} ${H * 0.38} Q ${W * 0.42} ${H * 0.52}, ${W * 0.55} ${H * 0.62}`}
          fill="none" stroke="#fff" strokeWidth={compact ? 2 : 2.5}
          strokeDasharray="4 8" opacity="0.6"
          strokeLinecap="round"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-48" dur="1.2s" repeatCount="indefinite" />
        </path>
        {/* Future route — dashed, dim */}
        <path
          d={`M ${W * 0.55} ${H * 0.62} L ${W * 0.74} ${H * 0.74}`}
          fill="none" stroke="rgba(167,139,250,0.4)" strokeWidth="2" strokeDasharray="6 6"
        />

        {/* District labels */}
        <g fontFamily="ui-monospace,monospace" fontSize={compact ? 8 : 10} fill="#5d6a98" letterSpacing="2">
          <text x={W * 0.18} y={H * 0.20} textAnchor="middle">GION</text>
          <text x={W * 0.55} y={H * 0.30} textAnchor="middle">DOWNTOWN</text>
          <text x={W * 0.78} y={H * 0.55} textAnchor="middle">HIGASHIYAMA</text>
        </g>
      </svg>

      {/* Pin: current location (you are here) — pulsing dot */}
      <div style={{
        position: 'absolute', left: '32%', top: '38%',
        transform: 'translate(-50%, -50%)', pointerEvents: 'none',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,255,151,0.4), transparent 70%)',
          animation: 'pulse 2s ease-in-out infinite', position: 'absolute',
          left: -28, top: -28,
        }} />
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          background: '#7cff97', border: '3px solid #0a0a1f',
          boxShadow: '0 0 0 1.5px #7cff97, 0 4px 12px rgba(0,0,0,0.4)',
          position: 'relative',
        }} />
      </div>

      {/* Pin: NEXT stop — labeled */}
      <div style={{
        position: 'absolute', left: '55%', top: '62%',
        transform: 'translate(-50%, -100%)', pointerEvents: 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      }}>
        <div style={{
          padding: '6px 12px', borderRadius: 999,
          background: '#a78bfa', color: '#0a0a1f',
          fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
          fontFamily: TYPE.mono, letterSpacing: '0.1em',
          boxShadow: '0 4px 14px rgba(167,139,250,0.5)',
        }}>NEXT · TEA CEREMONY · 14 MIN</div>
        <svg width="28" height="36" viewBox="0 0 30 39" fill="none">
          <path d="M15 0 C23 0 30 7 30 15 C30 25 15 39 15 39 C15 39 0 25 0 15 C0 7 7 0 15 0 Z"
            fill="#a78bfa" stroke="#0a0a1f" strokeWidth="1.5" />
          <text x="15" y="20" textAnchor="middle" fontSize="13" fill="#0a0a1f" fontWeight="700">3</text>
        </svg>
      </div>

      {/* Pin: completed earlier stops — small + checkmark */}
      {[
        { x: '14%', y: '20%', n: 1 },
        { x: '24%', y: '32%', n: 2 },
      ].map(p => (
        <div key={p.n} style={{
          position: 'absolute', left: p.x, top: p.y,
          transform: 'translate(-50%, -50%)', pointerEvents: 'none',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: 'rgba(124,255,151,0.2)',
            border: '2px solid #7cff97',
            color: '#7cff97', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✓</div>
        </div>
      ))}

      {/* Pin: future stop — dim */}
      <div style={{
        position: 'absolute', left: '74%', top: '74%',
        transform: 'translate(-50%, -50%)', pointerEvents: 'none', opacity: 0.5,
      }}>
        <svg width="22" height="28" viewBox="0 0 30 39" fill="none">
          <path d="M15 0 C23 0 30 7 30 15 C30 25 15 39 15 39 C15 39 0 25 0 15 C0 7 7 0 15 0 Z"
            fill="rgba(167,139,250,0.5)" stroke="#0a0a1f" strokeWidth="1.5" />
          <text x="15" y="20" textAnchor="middle" fontSize="12" fill="#0a0a1f" fontWeight="700">4</text>
        </svg>
      </div>
    </div>
  );
}

// ─── HERO leave-by card ──
function LeaveByCard({ compact }) {
  return (
    <div style={{
      padding: compact ? '20px 18px' : '24px 28px',
      borderRadius: 16,
      background: 'linear-gradient(135deg, rgba(167,139,250,0.18), rgba(125,211,252,0.10))',
      border: '1.5px solid rgba(167,139,250,0.4)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', right: -40, top: -40,
        width: 200, height: 200, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(167,139,250,0.2), transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        display: 'flex', alignItems: compact ? 'flex-start' : 'center',
        justifyContent: 'space-between', gap: compact ? 14 : 24,
        flexDirection: compact ? 'column' : 'row', position: 'relative',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: TYPE.mono, fontSize: 10, letterSpacing: '0.22em', color: '#a78bfa', marginBottom: 8 }}>
            ✦ LEAVE IN 6 MIN · TO MAKE 1:00 PM
          </div>
          <div style={{
            fontFamily: TYPE.display, fontSize: compact ? 30 : 44, fontWeight: 400,
            letterSpacing: '-0.025em', lineHeight: 1.05, marginBottom: 10,
          }}>
            Tea ceremony at <em style={{ color: '#a78bfa' }}>Camellia.</em>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, maxWidth: 540 }}>
            14-min walk south through Sannenzaka. Bring socks (tatami). Last 100m is uphill — give yourself 18 min if it's been raining.
          </div>
        </div>
        <div style={{
          padding: compact ? '14px 20px' : '18px 28px',
          borderRadius: 14, background: '#a78bfa', color: '#0a0a1f',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          flexShrink: 0, minWidth: compact ? '100%' : 160,
          boxShadow: '0 8px 28px rgba(167,139,250,0.35)',
        }}>
          <div style={{ fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.18em', fontWeight: 700, opacity: 0.7 }}>
            START WALKING
          </div>
          <div style={{ fontFamily: TYPE.display, fontSize: 22, fontWeight: 600 }}>
            ↗ Navigate
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Smaller cards ──
function NextStopCard({ compact }) {
  return (
    <CardShell color="#7dd3fc" label="◷ AFTER THAT · 4:30 PM">
      <div style={{ fontFamily: TYPE.display, fontSize: 22, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 6 }}>
        Honke Owariya
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 12 }}>
        Reservation for 2. 22-min walk from tea house, or 9-min via Bus 207.
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Pill>◷ Reservation locked</Pill>
        <Pill>¥3,200 / person</Pill>
      </div>
    </CardShell>
  );
}

function WeatherAlertCard({ compact }) {
  return (
    <CardShell color="#fbbf24" label="⚠ WEATHER · LIGHT RAIN BY 5 PM">
      <div style={{ fontFamily: TYPE.display, fontSize: 22, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 6 }}>
        Pack the umbrella
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 12 }}>
        65% chance after 5 PM, clearing by 8. Sunset 6:14 PM. Tomorrow looks dry.
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Pill>17° → 12°</Pill>
        <Pill>◌ 65%</Pill>
        <Pill>↙ 12 km/h</Pill>
      </div>
    </CardShell>
  );
}

function CrowdsCard({ compact }) {
  return (
    <CardShell color="#fb923c" label="◬ CROWDS · TEA HOUSE">
      <div style={{ fontFamily: TYPE.display, fontSize: 22, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 6 }}>
        Quieter than usual
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 12 }}>
        ~40% capacity. The 1pm slot is the calmest of the day. Go straight in.
      </div>
      {/* Crowd bar — 24 hour bars */}
      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 32, marginTop: 6 }}>
        {[12, 18, 28, 42, 36, 28, 22, 38, 60, 78, 84, 70, 40, 32, 56, 72, 80, 90, 78, 56, 38, 24, 18, 14].map((v, i) => (
          <div key={i} style={{
            flex: 1,
            height: `${v}%`,
            background: i === 13 ? '#7cff97' : (v > 70 ? 'rgba(251,146,60,0.5)' : 'rgba(167,139,250,0.4)'),
            borderRadius: 1,
          }} />
        ))}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.12em',
        color: 'rgba(255,255,255,0.4)', marginTop: 4,
      }}>
        <span>9 AM</span><span style={{ color: '#7cff97' }}>NOW</span><span>10 PM</span>
      </div>
    </CardShell>
  );
}

function CardShell({ color, label, children }) {
  return (
    <div style={{
      padding: '18px 20px', borderRadius: 14,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{
        fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.18em',
        color, marginBottom: 10,
      }}>{label}</div>
      {children}
    </div>
  );
}

function Pill({ children }) {
  return (
    <span style={{
      padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 600,
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
      color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

// ─── Day timeline strip ──
function DayTimeline({ compact }) {
  const stops = [
    { time: '9:00 AM',  name: 'Honke Owariya breakfast',     status: 'done' },
    { time: '10:00 AM', name: 'Kiyomizu-dera',               status: 'done', monument: true },
    { time: '1:00 PM',  name: 'Tea ceremony · Camellia',     status: 'next' },
    { time: '4:30 PM',  name: 'Honke Owariya · early dinner',status: 'future' },
    { time: '7:30 PM',  name: 'Pontochō walk',               status: 'future' },
  ];
  return (
    <div style={{
      padding: '18px 20px', borderRadius: 14,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.18em', color: '#a78bfa' }}>
          § DAY 2 · TUE 15 APR · 5 STOPS
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
          ↗ Open full itinerary
        </div>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: compact ? '1fr' : `repeat(${stops.length}, 1fr)`,
        gap: compact ? 10 : 14,
        position: 'relative',
      }}>
        {stops.map((s, i) => {
          const c = s.status === 'done' ? '#7cff97'
                  : s.status === 'next' ? '#a78bfa'
                  : 'rgba(255,255,255,0.3)';
          return (
            <div key={i} style={{
              padding: '10px 0',
              borderTop: `2px solid ${c}`,
              position: 'relative', opacity: s.status === 'future' ? 0.55 : 1,
            }}>
              <div style={{
                position: 'absolute', top: -7, left: 0,
                width: 12, height: 12, borderRadius: '50%',
                background: c, border: '2.5px solid #0a0a1f',
              }} />
              <div style={{ fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.14em', color: c, marginBottom: 4 }}>
                {s.time} · {s.status === 'next' ? 'NOW' : s.status.toUpperCase()}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.35 }}>
                {s.name}{s.monument && <span style={{ color: '#fbbf24', marginLeft: 6 }}>⏚</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Mini cards (desktop overlay on map) ──
function MiniWeatherCard() {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 12,
      background: 'rgba(10,10,31,0.92)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(125,211,252,0.3)',
    }}>
      <div style={{ fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.18em', color: '#7dd3fc', marginBottom: 6 }}>
        ☼ NOW · KYOTO
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontFamily: TYPE.display, fontSize: 32, fontWeight: 400, color: '#fff', lineHeight: 1 }}>17°</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.3 }}>
          Cloudy, light rain in 3h
        </div>
      </div>
    </div>
  );
}

function MiniTransitCard() {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 12,
      background: 'rgba(10,10,31,0.92)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(167,139,250,0.3)',
    }}>
      <div style={{ fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.18em', color: '#a78bfa', marginBottom: 6 }}>
        ◐ TO TEA HOUSE
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <div style={{ fontFamily: TYPE.display, fontSize: 26, fontWeight: 400, color: '#fff', lineHeight: 1 }}>14 min</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>walk · 1.1 km</div>
      </div>
      <div style={{ display: 'flex', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>
        <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>↗ Walk</span>
        <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }}>🚌 Bus 207 · 9m</span>
      </div>
    </div>
  );
}

Object.assign(window, { LiveTrip });
