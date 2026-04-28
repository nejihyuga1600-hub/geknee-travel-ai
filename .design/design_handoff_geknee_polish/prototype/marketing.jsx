// Marketing / social surface artboards
// Landing page (3 options), public profile, leaderboard, unlock toast, share card.
// Uses BRAND + TYPE tokens from shared.jsx and the existing globe component.

const { useState: useStateM, useEffect: useEffectM } = React;

// ─── Shared small atoms ─────────────────────────────────────────────────────

function MkNav({ compact, dark = true }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: compact ? '14px 18px' : '22px 40px',
      fontFamily: TYPE.ui,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: TYPE.display, fontSize: compact ? 18 : 22, fontWeight: 500,
        letterSpacing: '-0.01em',
        color: dark ? BRAND.ink : '#0a0a1f',
        fontStyle: 'italic',
      }}>
        <span style={{
          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
          background: BRAND.accent,
          boxShadow: `0 0 10px ${BRAND.accent}`,
        }} />
        geknee
      </div>
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          <span style={navItem}>Collection</span>
          <span style={navItem}>Leaderboard</span>
          <span style={navItem}>Pricing</span>
          <span style={{
            padding: '8px 16px', borderRadius: 999,
            background: dark ? 'rgba(167,139,250,0.15)' : '#0a0a1f',
            border: `1px solid ${dark ? BRAND.borderHi : '#0a0a1f'}`,
            color: dark ? BRAND.accent : '#fff',
            fontWeight: 500, marginLeft: 12,
          }}>
            Open the globe →
          </span>
        </div>
      )}
      {compact && (
        <div style={{
          padding: '6px 12px', borderRadius: 999,
          background: 'rgba(167,139,250,0.15)',
          border: `1px solid ${BRAND.borderHi}`,
          color: BRAND.accent,
          fontSize: 11, fontWeight: 500, fontFamily: TYPE.ui,
        }}>Open →</div>
      )}
    </div>
  );
}

const navItem = {
  padding: '8px 12px', color: BRAND.inkDim, fontWeight: 400, cursor: 'default',
};

// ─── InkStamp · reusable passport-style ink stamp ─────────────────────────
// Circular or oval rubber stamp with rotated text arc + center glyph + city
// name + date. Renders as SVG for crispness. Rotatable, tintable.
function InkStamp({
  shape = 'circle', city = 'HANOI', code = 'HAN',
  date = '04·26', glyph = '✈', rotate = -8, size = 120,
  color = '#dc2626', opacity = 0.78, double = false,
}) {
  const r = size / 2;
  const arcId = `stamp-arc-${city}-${code}-${Math.round(rotate * 100)}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ transform: `rotate(${rotate}deg)`, opacity, overflow: 'visible' }}>
      <defs>
        <path id={arcId} d={`M ${r},${r} m -${r - 10},0 a ${r - 10},${r - 10} 0 1,1 ${(r - 10) * 2},0`} />
      </defs>
      {/* Outer ring */}
      {shape === 'circle' ? (
        <>
          <circle cx={r} cy={r} r={r - 2} fill="none" stroke={color} strokeWidth="2.2" />
          {double && <circle cx={r} cy={r} r={r - 7} fill="none" stroke={color} strokeWidth="1" />}
          <circle cx={r} cy={r} r={r - 14} fill="none" stroke={color} strokeWidth="1" strokeDasharray="2 2" />
        </>
      ) : (
        <>
          <rect x="2" y={r - size * 0.28} width={size - 4} height={size * 0.56}
            rx={size * 0.28} ry={size * 0.28}
            fill="none" stroke={color} strokeWidth="2.2" />
          {double && <rect x="6" y={r - size * 0.24} width={size - 12} height={size * 0.48}
            rx={size * 0.24} ry={size * 0.24}
            fill="none" stroke={color} strokeWidth="1" />}
        </>
      )}
      {/* Upper arc text */}
      {shape === 'circle' && (
        <text fill={color} fontFamily="ui-monospace,monospace" fontSize={size * 0.1}
          fontWeight="700" letterSpacing={size * 0.025}>
          <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
            ★ ARRIVED · {city} ★
          </textPath>
        </text>
      )}
      {/* Center glyph + details */}
      <g transform={`translate(${r}, ${r})`} fill={color} textAnchor="middle">
        <text y={-size * 0.04} fontFamily="serif" fontSize={size * 0.26} fontStyle="italic">
          {glyph}
        </text>
        <text y={size * 0.14} fontFamily="ui-monospace,monospace" fontSize={size * 0.1} fontWeight="700" letterSpacing={size * 0.01}>
          {code}
        </text>
        <text y={size * 0.25} fontFamily="ui-monospace,monospace" fontSize={size * 0.075} letterSpacing={size * 0.01}>
          {date}
        </text>
      </g>
      {/* Ink bleed spots */}
      <circle cx={size * 0.15} cy={size * 0.2} r="1" fill={color} opacity="0.3" />
      <circle cx={size * 0.82} cy={size * 0.78} r="1.5" fill={color} opacity="0.3" />
    </svg>
  );
}

// ─── Landing L1 · Zine / Passport vibe (Gen Z) ──────────────────────────────
// Keeps the collection / specimen DNA but pivots the delivery:
// chunky condensed display type, saturated color blocks, sticker peels with
// shadow + rotation, rubber stamps, handwritten scrawl, passport stamp strip,
// film-polaroid grid. Gen Z travel audience: "go outside + flex."

function LandingSpecimen({ compact }) {
  const w = compact ? 390 : 1280;
  return (
    <div style={{
      width: w, height: compact ? 3000 : 4600, background: '#f5f1e8',
      fontFamily: TYPE.ui, color: '#0a0a1f', overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Hot-orange sunburst wash in upper right */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '60%', height: '45%',
        background: 'radial-gradient(ellipse at 80% 20%, rgba(251,146,60,0.22), transparent 55%)',
        pointerEvents: 'none',
      }} />
      {/* Electric-blue wash bottom-left */}
      <div style={{
        position: 'absolute', bottom: '35%', left: 0, width: '40%', height: '30%',
        background: 'radial-gradient(ellipse at 10% 80%, rgba(125,211,252,0.18), transparent 60%)',
        pointerEvents: 'none',
      }} />
      {/* Paper grain */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'radial-gradient(circle at 1px 1px, #0a0a1f 1px, transparent 0)',
        backgroundSize: '4px 4px',
        pointerEvents: 'none',
      }} />

      <MkNav compact={compact} dark={false} />

      {/* ── Hero · zine layout ───────────────────────────────────────── */}
      <section style={{
        padding: compact ? '20px 20px 40px' : '40px 80px 80px',
        display: 'grid',
        gridTemplateColumns: compact ? '1fr' : '1.15fr 1fr',
        gap: compact ? 28 : 60,
        alignItems: 'center', position: 'relative',
      }}>
        {/* Scattered ink stamps floating in the hero bg */}
        {!compact && (
          <>
            <div style={{ position: 'absolute', top: 30, right: 540, zIndex: 1, pointerEvents: 'none' }}>
              <InkStamp shape="circle" city="HANOI" code="HAN" date="04·18·26" glyph="✈" rotate={-14} size={130} color="#dc2626" opacity={0.5} double />
            </div>
            <div style={{ position: 'absolute', bottom: 40, left: 360, zIndex: 0, pointerEvents: 'none' }}>
              <InkStamp shape="oval" city="VISA VALID" code="ISSUED" date="CAT · TOURIST" glyph="★" rotate={8} size={170} color="#1e40af" opacity={0.4} />
            </div>
          </>
        )}
        {compact && (
          <div style={{ position: 'absolute', top: 20, right: 0, zIndex: 0, pointerEvents: 'none' }}>
            <InkStamp shape="circle" city="HANOI" code="HAN" date="04·18" glyph="✈" rotate={-10} size={90} color="#dc2626" opacity={0.35} double />
          </div>
        )}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Passport header · issue badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            padding: compact ? '8px 14px' : '10px 18px',
            background: '#0a0a1f', color: '#fde68a',
            fontFamily: TYPE.mono, fontSize: compact ? 10 : 11, fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            marginBottom: compact ? 16 : 24,
            border: '2px solid #0a0a1f',
            boxShadow: `4px 4px 0 ${BRAND.accent}`,
            transform: 'rotate(-0.8deg)',
          }}>
            <span style={{ color: '#fb923c' }}>◎</span>
            <span>THE GEKNEE PASSPORT · ISSUE 001 · SPRING '26</span>
          </div>

          {/* Giant chunky headline */}
          <h1 style={{
            fontFamily: TYPE.ui, fontWeight: 900,
            fontSize: compact ? 68 : 148, lineHeight: 0.85, margin: 0,
            letterSpacing: '-0.05em',
            color: '#0a0a1f',
            textTransform: 'uppercase',
          }}>
            GO<br />
            <span style={{
              background: BRAND.accent, padding: '0 0.1em',
              display: 'inline-block', transform: 'rotate(-1deg)',
              boxShadow: '5px 5px 0 #0a0a1f',
              border: '2px solid #0a0a1f',
            }}>THERE.</span><br />
            PROVE<br />
            <span style={{
              fontFamily: TYPE.display, fontStyle: 'italic', fontWeight: 400,
              color: '#0a0a1f',
              textTransform: 'lowercase',
              letterSpacing: '-0.03em',
            }}>it.</span>
          </h1>

          <p style={{
            fontFamily: TYPE.ui, fontSize: compact ? 16 : 20, lineHeight: 1.4,
            maxWidth: 480, marginTop: compact ? 20 : 32, color: '#3a3a30',
            fontWeight: 500,
          }}>
            60 monuments. 7 rarity tiers. Your phone checks you're actually there.{' '}
            <span style={{ background: '#fde68a', padding: '1px 4px' }}>
              No couch-unlocks. No loot boxes.
            </span>{' '}
            Go do the thing.
          </p>

          <div style={{ display: 'flex', gap: 10, marginTop: compact ? 22 : 32, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{
              padding: '16px 24px', background: '#0a0a1f', color: '#fff',
              fontFamily: TYPE.ui, fontSize: 14, fontWeight: 700, letterSpacing: '0.04em',
              textTransform: 'uppercase',
              boxShadow: `4px 4px 0 ${BRAND.accent}`,
              border: '2px solid #0a0a1f',
              transform: 'rotate(-0.5deg)',
            }}>Start collecting →</div>
            <div style={{
              padding: '16px 24px', background: 'transparent', color: '#0a0a1f',
              fontFamily: TYPE.ui, fontSize: 14, fontWeight: 600, letterSpacing: '0.04em',
              textTransform: 'uppercase',
              border: '2px solid #0a0a1f',
            }}>How it works</div>
            {!compact && (
              <div style={{
                fontFamily: TYPE.display, fontStyle: 'italic', fontSize: 14,
                color: '#6b6b55', marginLeft: 12, transform: 'rotate(-3deg)',
              }}>
                ↑ takes 40 seconds
              </div>
            )}
          </div>
        </div>

        {/* Specimen card — rotated passport page */}
        <div style={{
          position: 'relative',
          transform: compact ? 'rotate(1.5deg)' : 'rotate(3deg)',
          zIndex: 2,
        }}>
          {/* Proper ink stamp diagonal over corner */}
          <div style={{
            position: 'absolute', top: -30, right: -40, zIndex: 3,
          }}>
            <InkStamp
              shape="circle" city="PARIS" code="CDG" date="04·18·26"
              glyph="✦" rotate={-18} size={compact ? 110 : 150}
              color="#dc2626" opacity={0.82} double
            />
          </div>
          <SpecimenCard compact={compact} />
          {/* Secondary stamp — "VISA VALID" strip */}
          {!compact && (
            <div style={{
              position: 'absolute', bottom: -26, right: 40, zIndex: 3,
            }}>
              <InkStamp
                shape="oval" city="GOLD · TIER IV"
                code="TROCADÉRO" date="BLUE HOUR · ✓"
                glyph="◈" rotate={6} size={180}
                color="#1e40af" opacity={0.72}
              />
            </div>
          )}
          {/* Scrawl annotation */}
          {!compact && (
            <div style={{
              position: 'absolute', bottom: -54, left: -30,
              fontFamily: TYPE.display, fontStyle: 'italic', fontSize: 15,
              color: BRAND.accent,
              transform: 'rotate(-4deg)',
            }}>
              ← my first gold. trocadéro, blue hour.
              <svg width="40" height="28" style={{ marginLeft: 8, verticalAlign: 'middle' }} viewBox="0 0 40 28">
                <path d="M2 14 Q14 2 26 14 L22 10 M26 14 L22 18" fill="none" stroke={BRAND.accent} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>
      </section>

      {/* ── Passport stamp strip · countries visited ───────────────── */}
      <PassportStrip compact={compact} />

      {/* Rarity curve */}
      {!compact && <RarityCurveSection />}
      {compact && <RarityCurveCompact />}

      {/* Share cards strip */}
      <section style={{
        padding: compact ? '48px 20px' : '100px 80px',
        background: '#0a0a1f', color: '#fff',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* hot-pink sunburst in the corner */}
        <div style={{
          position: 'absolute', top: 0, right: 0, width: '50%', height: '80%',
          background: 'radial-gradient(ellipse at 100% 0%, rgba(251,146,60,0.2), transparent 55%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          fontFamily: TYPE.mono, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
          color: BRAND.accent, fontWeight: 700, marginBottom: 10,
        }}>§ Flex responsibly</div>
        <h2 style={{
          fontFamily: TYPE.ui, fontWeight: 900,
          fontSize: compact ? 44 : 88, margin: 0, letterSpacing: '-0.04em', lineHeight: 0.9,
          textTransform: 'uppercase',
        }}>
          One tap.<br/>
          <span style={{
            fontFamily: TYPE.display, fontStyle: 'italic', fontWeight: 400,
            color: BRAND.accent, textTransform: 'lowercase',
          }}>
            and everyone knows.
          </span>
        </h2>
        <p style={{
          color: BRAND.inkDim, marginTop: 16, fontSize: compact ? 14 : 17,
          maxWidth: 560, lineHeight: 1.5, fontWeight: 500,
        }}>
          Drops into iMessage, Discord, the group chat. Your friends land on your
          spectator globe and start their own collection. Or don't. It's fine.
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr' : 'repeat(3, 1fr)',
          gap: compact ? 16 : 20, marginTop: compact ? 28 : 40,
        }}>
          {[
            { mk: 'eiffelTower',   skin: 'gold',      city: 'Paris' },
            { mk: 'statueLiberty', skin: 'aurora',    city: 'New York' },
            { mk: 'pyramidGiza',   skin: 'celestial', city: 'Giza' },
          ].map(c => <ShareCardMini key={c.mk} {...c} />)}
        </div>
      </section>

      {/* Mechanic · three editorial steps (01 02 03) */}
      <MechanicEditorial compact={compact} />

      {/* Polaroid wall · real-people field photos */}
      <PolaroidWall compact={compact} />

      {/* Featured monuments · 12-up contact sheet of mini specimen cards */}
      <FeaturedContactSheet compact={compact} />

      {/* Pro upsell · editorial black band */}
      <ProBand compact={compact} />

      {/* Stat line */}
      <StatLine compact={compact} />

      {/* Footer */}
      <FooterEditorial compact={compact} />
    </div>
  );
}

function SpecimenCard({ compact }) {
  // Museum specimen label look — tan card with tier badge, monument silhouette, meta table.
  return (
    <div style={{
      background: '#fff', padding: compact ? 18 : 28,
      border: '1px solid #0a0a1f',
      boxShadow: '12px 14px 0 #0a0a1f',
      fontFamily: TYPE.ui, position: 'relative',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        paddingBottom: 12, borderBottom: '1px solid #0a0a1f', marginBottom: 18,
      }}>
        <div style={{ fontFamily: TYPE.mono, fontSize: 10, letterSpacing: '0.12em' }}>
          No. 041 / 420<br />
          <span style={{ color: '#6b6b55' }}>EIF · gold</span>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: BRAND.gold,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #0a0a1f',
        }}>
          <span style={{ fontFamily: TYPE.display, fontSize: 14, fontStyle: 'italic', color: '#0a0a1f' }}>IV</span>
        </div>
      </div>

      {/* Eiffel silhouette */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
        <svg width={compact ? 120 : 180} height={compact ? 160 : 240} viewBox="0 0 120 160" fill="none">
          <defs>
            <linearGradient id="gold-spec" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fde68a" /><stop offset="1" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <path d="M60 10 L56 28 L52 52 L44 90 L30 150 L45 150 L50 120 L70 120 L75 150 L90 150 L76 90 L68 52 L64 28 Z"
            fill="url(#gold-spec)" stroke="#0a0a1f" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M44 90 L76 90 M40 110 L80 110 M35 130 L85 130" stroke="#0a0a1f" strokeWidth="0.8" />
          <circle cx="60" cy="10" r="2.5" fill={BRAND.gold} stroke="#0a0a1f" />
        </svg>
      </div>

      <div style={{ fontFamily: TYPE.display, fontSize: compact ? 22 : 28, margin: '0 0 2px' }}>
        Eiffel Tower
      </div>
      <div style={{ fontSize: 11, color: '#6b6b55', letterSpacing: '0.1em', marginBottom: 16 }}>
        PARIS, FRANCE · 48.858° N · 2.294° E
      </div>

      <table style={{ width: '100%', fontSize: 11, color: '#3a3a30', borderCollapse: 'collapse' }}>
        <tbody>
          {[
            ['Tier', 'Gold (IV / VII)'],
            ['Unlocked by', '@nghia'],
            ['Quest', 'Photo from Trocadéro, blue hour'],
            ['Collected', '2026 · 04 · 18'],
          ].map(([k, v]) => (
            <tr key={k} style={{ borderTop: '1px solid rgba(10,10,31,0.1)' }}>
              <td style={{ padding: '6px 0', color: '#6b6b55', letterSpacing: '0.05em' }}>{k}</td>
              <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 500 }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── PassportStrip · stamp row with fake stamps ─────────────────────────
function PassportStrip({ compact }) {
  const stamps = [
    { city: 'PARIS',   code: 'CDG', color: '#a78bfa', date: '04.18.26', glyph: '✦' },
    { city: 'TOKYO',   code: 'HND', color: '#fb923c', date: '03.22.26', glyph: '◉' },
    { city: 'RIO',     code: 'GIG', color: '#7dd3fc', date: '02.11.26', glyph: '◬' },
    { city: 'ROME',    code: 'FCO', color: '#fde68a', date: '01.05.26', glyph: '✱' },
    { city: 'CAIRO',   code: 'CAI', color: '#fca5a5', date: '12.14.25', glyph: '◈' },
    { city: 'BOGOTÁ',  code: 'BOG', color: '#86efac', date: '11.02.25', glyph: '▲' },
  ];
  const shown = compact ? stamps.slice(0, 3) : stamps;
  return (
    <section style={{
      padding: compact ? '24px 20px 32px' : '24px 80px 60px',
      borderTop: '1.5px dashed #0a0a1f',
      borderBottom: '1.5px dashed #0a0a1f',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        fontFamily: TYPE.mono, fontSize: 10, letterSpacing: '0.22em',
        color: '#6b6b55', fontWeight: 700, marginBottom: 18,
      }}>
        § PASSPORT · 6 STAMPS THIS YEAR
      </div>
      <div style={{
        display: 'flex', gap: compact ? 12 : 24, flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        {shown.map((s, i) => (
          <div key={s.city} style={{
            transform: `rotate(${(i % 2 ? -1 : 1) * (2 + i % 3)}deg)`,
            padding: compact ? '10px 14px' : '14px 20px',
            border: `2.5px solid ${s.color}`,
            color: s.color,
            fontFamily: TYPE.mono,
            position: 'relative',
            minWidth: compact ? 100 : 130,
          }}>
            <div style={{ fontSize: compact ? 9 : 10, letterSpacing: '0.2em', fontWeight: 700 }}>
              ✈ ARRIVED · {s.code}
            </div>
            <div style={{
              fontFamily: TYPE.ui, fontSize: compact ? 20 : 28, fontWeight: 900,
              letterSpacing: '-0.02em', color: '#0a0a1f', lineHeight: 1.1, marginTop: 4,
            }}>
              {s.city}
            </div>
            <div style={{ fontSize: compact ? 9 : 10, letterSpacing: '0.15em', marginTop: 4 }}>
              {s.glyph} {s.date}
            </div>
            {/* inner double border */}
            <div style={{
              position: 'absolute', inset: 3,
              border: `1px dashed ${s.color}`,
              pointerEvents: 'none',
            }} />
          </div>
        ))}
        {!compact && (
          <div style={{
            fontFamily: TYPE.display, fontStyle: 'italic', fontSize: 18,
            color: '#6b6b55', transform: 'rotate(-2deg)',
          }}>
            + 54 more waiting →
          </div>
        )}
      </div>
    </section>
  );
}

// ─── PolaroidWall · messy film-grid of player photos ───────────────────
function PolaroidWall({ compact }) {
  const shots = [
    { city: 'Paris',     caption: 'trocadéro golden hour',  tint: '#fde68a', glyph: 'eiffel' },
    { city: 'Kyoto',     caption: '5 am at fushimi inari',  tint: '#fca5a5', glyph: 'torii' },
    { city: 'Giza',      caption: 'she\'s real.',           tint: '#fef3c7', glyph: 'pyramid' },
    { city: 'Reykjavík', caption: 'aurora drop attempt 3',   tint: '#86efac', glyph: 'aurora' },
    { city: 'Rio',       caption: 'took the tram',          tint: '#7dd3fc', glyph: 'christ' },
    { city: 'Cusco',     caption: 'altitude gang',          tint: '#c4b5fd', glyph: 'machu' },
  ];
  const shown = compact ? shots.slice(0, 4) : shots;
  return (
    <section style={{
      padding: compact ? '48px 20px' : '100px 80px',
      background: '#efe9d9',
      borderTop: '1px solid rgba(10,10,31,0.12)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: compact ? 24 : 48, gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: TYPE.mono, fontSize: 10, letterSpacing: '0.22em', color: '#6b6b55', fontWeight: 700, marginBottom: 12 }}>
            § FIELD PHOTOS · LAST 24H
          </div>
          <h2 style={{
            fontFamily: TYPE.ui, fontWeight: 900,
            fontSize: compact ? 44 : 88, margin: 0, letterSpacing: '-0.04em', lineHeight: 0.9,
            textTransform: 'uppercase',
          }}>
            Real places.<br />
            <span style={{
              fontFamily: TYPE.display, fontStyle: 'italic', fontWeight: 400,
              textTransform: 'lowercase', color: BRAND.accent,
            }}>
              real people showing up.
            </span>
          </h2>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: compact ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)',
        gap: compact ? 16 : 18,
      }}>
        {shown.map((s, i) => (
          <div key={s.city} style={{
            background: '#fff',
            padding: '10px 10px 36px',
            boxShadow: '4px 6px 0 rgba(10,10,31,0.85)',
            border: '1px solid #0a0a1f',
            transform: `rotate(${((i * 37) % 7) - 3}deg)`,
            position: 'relative',
          }}>
            {/* "photo" */}
            <div style={{
              aspectRatio: '1/1',
              background: `linear-gradient(180deg, ${s.tint}aa, ${s.tint}55)`,
              position: 'relative', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PolaroidGlyph kind={s.glyph} />
              {/* film-scan scratches */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'repeating-linear-gradient(95deg, transparent 0 20px, rgba(10,10,31,0.04) 20px 21px)',
              }} />
              {/* light leak */}
              <div style={{
                position: 'absolute', top: 0, right: 0, width: '30%', height: '100%',
                background: 'linear-gradient(-45deg, rgba(251,146,60,0.35), transparent 60%)',
              }} />
            </div>
            {/* caption */}
            <div style={{
              position: 'absolute', bottom: 8, left: 10, right: 10,
              fontFamily: TYPE.display, fontStyle: 'italic', fontSize: 12,
              color: '#0a0a1f',
            }}>
              {s.city} <span style={{ color: '#6b6b55' }}>· {s.caption}</span>
            </div>
            {/* tape */}
            {i % 3 === 0 && (
              <div style={{
                position: 'absolute', top: -6, left: '30%', width: 44, height: 16,
                background: 'rgba(251,191,36,0.55)',
                border: '1px solid rgba(10,10,31,0.2)',
                transform: 'rotate(-6deg)',
              }} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function PolaroidGlyph({ kind }) {
  const common = { fill: 'none', stroke: '#0a0a1f', strokeWidth: 1.5, strokeLinejoin: 'round', strokeLinecap: 'round' };
  if (kind === 'eiffel') return <svg width="48" height="60" viewBox="0 0 48 60" {...common}><path d="M24 4 L20 18 L16 32 L8 56 L40 56 L32 32 L28 18 Z M14 40 L34 40 M12 48 L36 48"/></svg>;
  if (kind === 'torii') return <svg width="60" height="50" viewBox="0 0 60 50" {...common}><path d="M6 12 Q30 4 54 12 L52 18 L8 18 Z M14 18 L14 46 M46 18 L46 46 M10 24 L50 24"/></svg>;
  if (kind === 'pyramid') return <svg width="60" height="50" viewBox="0 0 60 50" {...common}><path d="M30 6 L54 44 L6 44 Z M30 6 L30 44 M18 30 L30 44 L42 30"/></svg>;
  if (kind === 'aurora') return <svg width="60" height="50" viewBox="0 0 60 50" {...common}><path d="M4 34 Q20 10 32 20 Q40 28 56 14"/><path d="M4 40 Q20 18 32 26 Q40 34 56 22"/></svg>;
  if (kind === 'christ') return <svg width="50" height="60" viewBox="0 0 50 60" {...common}><circle cx="25" cy="10" r="4"/><path d="M25 14 L25 48 M8 24 L42 24 M16 48 L34 48"/></svg>;
  if (kind === 'machu') return <svg width="60" height="50" viewBox="0 0 60 50" {...common}><path d="M4 44 L16 24 L22 30 L30 14 L38 28 L44 20 L56 44"/></svg>;
  return <circle cx="30" cy="30" r="14" {...common} />;
}

// ─── MechanicEditorial · 01 · 02 · 03 tri-step narrative ─────────────────
function MechanicEditorial({ compact }) {
  const steps = [
    {
      n: '01', kw: 'SHOW UP', title: 'Go there. For real.',
      body: 'No photo uploads from your couch. Your phone checks your GPS. Within 40m of the monument, the field is warm and the quests unlock.',
      ill: 'pin',
    },
    {
      n: '02', kw: 'DO THE QUEST', title: 'Prove you were there.',
      body: 'Each monument has 3 quests — one easy (Stone), one hard (rare skin), one rumored (Celestial). Photograph it at blue hour. Find the hidden angle. Be there at 5 AM.',
      ill: 'quest',
    },
    {
      n: '03', kw: 'CARD DROPS', title: 'You earn the card.',
      body: 'Your name. The date. The tier. The quest. Permanent in your collection. One tap to share — and watch the group chat light up.',
      ill: 'card',
    },
  ];
  return (
    <section style={{
      padding: compact ? '64px 20px' : '140px 80px',
      background: '#f5f1e8',
      borderTop: '1px solid rgba(10,10,31,0.12)',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        marginBottom: compact ? 40 : 80, gap: 40, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontFamily: TYPE.mono, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#6b6b55', fontWeight: 700, marginBottom: 14 }}>
            § How it works · no gatekeeping
          </div>
          <h2 style={{
            fontFamily: TYPE.ui, fontWeight: 900,
            fontSize: compact ? 52 : 104, margin: 0, letterSpacing: '-0.04em', lineHeight: 0.88,
            textTransform: 'uppercase',
          }}>
            3 steps.<br/>
            <span style={{
              fontFamily: TYPE.display, fontStyle: 'italic', fontWeight: 400,
              color: BRAND.accent, textTransform: 'lowercase',
            }}>zero shortcuts.</span>
          </h2>
        </div>
        {!compact && (
          <div style={{ fontSize: 13, color: '#3a3a30', maxWidth: 300, lineHeight: 1.55, fontWeight: 500 }}>
            We verify by location, time, and sometimes a little sleuthing. If you didn't
            go, you don't get the card. That's the whole point.
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(3, 1fr)', gap: compact ? 40 : 30, borderTop: '2px solid #0a0a1f' }}>
        {steps.map(s => (
          <div key={s.n} style={{
            padding: compact ? '24px 0' : '40px 24px 40px 0',
            borderRight: compact ? 'none' : '1px solid rgba(10,10,31,0.1)',
            borderBottom: compact ? '1px solid rgba(10,10,31,0.1)' : 'none',
          }}>
            <div style={{
              fontFamily: TYPE.display, fontSize: compact ? 48 : 80, fontWeight: 400,
              color: BRAND.accent, lineHeight: 1, marginBottom: 18, fontStyle: 'italic',
            }}>{s.n}</div>
            <MechanicIllustration kind={s.ill} compact={compact} />
            <div style={{
              fontFamily: TYPE.mono, fontSize: 10, letterSpacing: '0.18em',
              color: '#6b6b55', marginTop: 20, marginBottom: 8,
            }}>{s.kw}</div>
            <div style={{
              fontFamily: TYPE.display, fontSize: compact ? 26 : 32, fontWeight: 400,
              letterSpacing: '-0.01em', lineHeight: 1.1, marginBottom: 14,
            }}>{s.title}</div>
            <div style={{ fontSize: 13, color: '#3a3a30', lineHeight: 1.55 }}>
              {s.body}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MechanicIllustration({ kind, compact }) {
  const h = compact ? 140 : 180;
  if (kind === 'pin') {
    return (
      <svg width="100%" height={h} viewBox="0 0 280 180" fill="none" style={{ display: 'block' }}>
        {/* topographic rings */}
        <ellipse cx="140" cy="110" rx="120" ry="28" stroke="#0a0a1f" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.3" />
        <ellipse cx="140" cy="110" rx="80"  ry="18" stroke="#0a0a1f" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.5" />
        <ellipse cx="140" cy="110" rx="44"  ry="10" stroke="#0a0a1f" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.7" />
        {/* 40m radius halo */}
        <ellipse cx="140" cy="110" rx="44" ry="10" fill={BRAND.accent} opacity="0.1" />
        <ellipse cx="140" cy="110" rx="44" ry="10" stroke={BRAND.accent} strokeWidth="1" />
        {/* pin */}
        <path d="M140 50 C152 50 158 60 158 72 C158 84 148 92 140 110 C132 92 122 84 122 72 C122 60 128 50 140 50 Z" fill="#0a0a1f" />
        <circle cx="140" cy="72" r="6" fill="#f5f1e8" />
        {/* label */}
        <text x="190" y="115" fontFamily="ui-monospace,monospace" fontSize="9" fill="#6b6b55" letterSpacing="1">40m · WARM</text>
      </svg>
    );
  }
  if (kind === 'quest') {
    return (
      <svg width="100%" height={h} viewBox="0 0 280 180" fill="none" style={{ display: 'block' }}>
        {/* 3 quest cards */}
        {[0, 1, 2].map(i => (
          <g key={i} transform={`translate(${40 + i * 68}, ${30 + i * 4})`}>
            <rect width="70" height="100" fill="#fff" stroke="#0a0a1f" strokeWidth="1" />
            <rect x="0" y="0" width="70" height="14" fill={i === 0 ? '#a8a8a8' : i === 1 ? '#fbbf24' : BRAND.accent} />
            <text x="6" y="10" fontFamily="ui-monospace,monospace" fontSize="7" fill={i === 1 ? '#0a0a1f' : '#fff'} letterSpacing="0.5">
              {i === 0 ? 'STONE · EASY' : i === 1 ? 'GOLD · HARD' : 'CELESTIAL · ?'}
            </text>
            {/* checkmarks or lock */}
            <g transform="translate(25, 50)">
              {i === 0 ? (
                <path d="M-8 0 L-2 6 L10 -8" stroke="#0a0a1f" strokeWidth="2" fill="none" strokeLinecap="round" />
              ) : i === 1 ? (
                <g>
                  <rect x="-7" y="-2" width="14" height="10" fill="none" stroke="#0a0a1f" strokeWidth="1.2" rx="1" />
                  <path d="M-4 -2 L-4 -6 a4 4 0 0 1 8 0 L4 -2" fill="none" stroke="#0a0a1f" strokeWidth="1.2" />
                </g>
              ) : (
                <text x="0" y="5" textAnchor="middle" fontFamily="serif" fontSize="18" fill="#0a0a1f" fontStyle="italic">?</text>
              )}
            </g>
          </g>
        ))}
      </svg>
    );
  }
  // card
  return (
    <svg width="100%" height={h} viewBox="0 0 280 180" fill="none" style={{ display: 'block' }}>
      {/* emerging card stack */}
      <rect x="50" y="25" width="150" height="130" fill="#fff" stroke="#0a0a1f" strokeWidth="1" transform="rotate(-4, 125, 90)" />
      <rect x="60" y="30" width="150" height="130" fill="#fff" stroke="#0a0a1f" strokeWidth="1" />
      {/* gold halo */}
      <circle cx="95" cy="55" r="12" fill={BRAND.gold} stroke="#0a0a1f" strokeWidth="1.2" />
      <text x="95" y="60" textAnchor="middle" fontFamily="serif" fontSize="11" fontStyle="italic">IV</text>
      {/* lines on card */}
      <line x1="80" y1="80" x2="190" y2="80" stroke="#0a0a1f" strokeWidth="0.8" />
      <line x1="80" y1="100" x2="160" y2="100" stroke="#0a0a1f" strokeWidth="0.4" />
      <line x1="80" y1="110" x2="170" y2="110" stroke="#0a0a1f" strokeWidth="0.4" />
      <line x1="80" y1="120" x2="150" y2="120" stroke="#0a0a1f" strokeWidth="0.4" />
      {/* sparkle */}
      <path d="M225 40 L225 50 M220 45 L230 45" stroke={BRAND.accent} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M215 70 L215 76 M212 73 L218 73" stroke={BRAND.accent} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

// ─── FeaturedContactSheet · 12-up mini specimen cards ────────────────────
function FeaturedContactSheet({ compact }) {
  const feat = [
    { n: 'No.001', name: 'Eiffel Tower',      city: 'Paris',        skin: 'gold',      color: '#fbbf24' },
    { n: 'No.002', name: 'Statue of Liberty', city: 'New York',     skin: 'aurora',    color: '#7cff97' },
    { n: 'No.003', name: 'Pyramid of Giza',   city: 'Giza',         skin: 'celestial', color: BRAND.accent },
    { n: 'No.004', name: 'Sydney Opera House',city: 'Sydney',       skin: 'silver',    color: '#e8e8e8' },
    { n: 'No.005', name: 'Taj Mahal',         city: 'Agra',         skin: 'diamond',   color: '#b9f2ff' },
    { n: 'No.006', name: 'Colosseum',         city: 'Rome',         skin: 'bronze',    color: '#cd7f32' },
    { n: 'No.007', name: 'Golden Gate',       city: 'San Francisco',skin: 'stone',     color: '#a8a8a8' },
    { n: 'No.008', name: 'Christ Redeemer',   city: 'Rio',          skin: 'gold',      color: '#fbbf24' },
    { n: 'No.009', name: 'Machu Picchu',      city: 'Cusco',        skin: 'aurora',    color: '#7cff97' },
    { n: 'No.010', name: 'Big Ben',           city: 'London',       skin: 'silver',    color: '#e8e8e8' },
    { n: 'No.011', name: 'Mt. Fuji',          city: 'Honshu',       skin: 'diamond',   color: '#b9f2ff' },
    { n: 'No.012', name: 'Burj Khalifa',      city: 'Dubai',        skin: 'stone',     color: '#a8a8a8' },
  ];
  const cols = compact ? 2 : 4;
  return (
    <section style={{
      padding: compact ? '64px 20px' : '140px 80px',
      background: '#efe9d9',
      borderTop: '1px solid rgba(10,10,31,0.12)',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        marginBottom: compact ? 32 : 60, gap: 40, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#6b6b55', fontWeight: 600, marginBottom: 14 }}>
            § Selected monuments · 12 of 60
          </div>
          <h2 style={{
            fontFamily: TYPE.display, fontWeight: 400,
            fontSize: compact ? 42 : 72, margin: 0, letterSpacing: '-0.025em', lineHeight: 0.98,
            maxWidth: 720,
          }}>
            Sixty <em style={{ color: BRAND.accent }}>specimens</em>.<br />Each one waits for you.
          </h2>
        </div>
        {!compact && (
          <div style={{ fontSize: 12, color: '#6b6b55', fontFamily: TYPE.mono, letterSpacing: '0.08em' }}>
            SEE ALL 60 →
          </div>
        )}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: compact ? 10 : 18,
      }}>
        {feat.map(f => <MiniSpecimen key={f.n} {...f} compact={compact} />)}
      </div>
    </section>
  );
}

function MiniSpecimen({ n, name, city, skin, color, compact }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #0a0a1f',
      boxShadow: '5px 5px 0 #0a0a1f',
      padding: compact ? 12 : 16,
      display: 'flex', flexDirection: 'column', gap: 10,
      aspectRatio: '3/4', position: 'relative',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontFamily: TYPE.mono, fontSize: 8, letterSpacing: '0.1em', color: '#6b6b55' }}>
          {n}
        </div>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          background: color, border: '1px solid #0a0a1f',
        }} />
      </div>
      <div style={{
        flex: 1,
        background: `linear-gradient(135deg, ${color}18, ${color}02)`,
        border: '1px solid rgba(10,10,31,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <MonumentGlyph name={name} color={color} />
      </div>
      <div>
        <div style={{
          fontFamily: TYPE.display, fontSize: compact ? 14 : 17, fontWeight: 400,
          lineHeight: 1.05, marginBottom: 2, letterSpacing: '-0.01em',
        }}>{name}</div>
        <div style={{
          fontFamily: TYPE.mono, fontSize: 8, color: '#6b6b55',
          letterSpacing: '0.1em',
        }}>
          {city.toUpperCase()} · {skin.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

function MonumentGlyph({ name, color }) {
  // Abstract glyph per monument (simple geometric marks — not literal)
  const glyphs = {
    'Eiffel Tower':       <path d="M30 8 L24 50 L10 52 L50 52 L36 50 Z" />,
    'Statue of Liberty':  <g><circle cx="30" cy="18" r="10" fill="none" strokeWidth="2" /><path d="M30 28 L30 52 M20 36 L40 36" /></g>,
    'Pyramid of Giza':    <path d="M30 10 L54 52 L6 52 Z" />,
    'Sydney Opera House': <path d="M6 48 Q14 36 22 48 M22 48 Q30 30 38 48 M38 48 Q46 34 54 48" />,
    'Taj Mahal':          <g><rect x="18" y="30" width="24" height="20" /><path d="M30 14 Q24 22 24 30 M30 14 Q36 22 36 30" /></g>,
    'Colosseum':          <g><ellipse cx="30" cy="36" rx="22" ry="12" fill="none" strokeWidth="2" /><path d="M10 36 L10 48 M20 36 L20 50 M30 36 L30 50 M40 36 L40 50 M50 36 L50 48" /></g>,
    'Golden Gate':        <g><path d="M6 36 L16 10 L16 50 M44 50 L44 10 L54 36" /><path d="M16 24 L44 24" strokeDasharray="2 2" /></g>,
    'Christ Redeemer':    <g><circle cx="30" cy="16" r="4" /><path d="M30 20 L30 48 M14 28 L46 28" /></g>,
    'Machu Picchu':       <path d="M6 50 L14 38 L22 44 L30 28 L38 40 L46 32 L54 50" />,
    'Big Ben':            <g><rect x="22" y="14" width="16" height="36" /><circle cx="30" cy="24" r="4" fill="none" strokeWidth="1.5" /><path d="M30 10 L30 14" /></g>,
    'Mt. Fuji':           <g><path d="M6 48 L22 22 L30 30 L38 22 L54 48" /><path d="M18 28 L22 22 L26 26 M34 26 L38 22 L42 28" stroke="#0a0a1f" strokeWidth="0.8" fill="none" /></g>,
    'Burj Khalifa':       <path d="M28 8 L26 20 L22 50 L38 50 L34 20 L32 8 Z" />,
  };
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill={color} stroke="#0a0a1f" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round">
      {glyphs[name] || <circle cx="30" cy="30" r="18" />}
    </svg>
  );
}

// ─── ProBand · editorial pro upsell ──────────────────────────────────────
function ProBand({ compact }) {
  return (
    <section style={{
      padding: compact ? '56px 20px' : '140px 80px',
      background: '#0a0a1f', color: '#fff', position: 'relative', overflow: 'hidden',
    }}>
      {/* orange sunburst corner */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '50%', height: '80%',
        background: 'radial-gradient(ellipse at 0% 0%, rgba(251,146,60,0.2), transparent 55%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `repeating-linear-gradient(90deg, ${BRAND.accent} 0 12px, transparent 12px 24px)`,
        opacity: 0.5,
      }} />
      <div style={{
        display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr',
        gap: compact ? 40 : 80, alignItems: 'center', position: 'relative',
      }}>
        <div>
          <div style={{ fontFamily: TYPE.mono, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: BRAND.accent, fontWeight: 700, marginBottom: 14 }}>
            § Pro · optional tier for the try-hards
          </div>
          <h2 style={{
            fontFamily: TYPE.ui, fontWeight: 900,
            fontSize: compact ? 48 : 96, margin: 0, letterSpacing: '-0.04em', lineHeight: 0.88,
            textTransform: 'uppercase',
          }}>
            The game<br/>is free.<br/>
            <span style={{
              fontFamily: TYPE.display, fontStyle: 'italic', fontWeight: 400,
              color: BRAND.accent, textTransform: 'lowercase',
            }}>
              the planner is five.
            </span>
          </h2>
          <p style={{
            fontFamily: TYPE.ui, fontSize: compact ? 15 : 18, lineHeight: 1.5,
            color: BRAND.inkDim, marginTop: compact ? 20 : 32, fontWeight: 500, maxWidth: 480,
          }}>
            Want help drafting the trip? Timing the rare-tier quests? Knowing when the
            aurora's actually live in Reykjavík? That's Pro. If you don't, don't.
          </p>
        </div>
        <div style={{
          border: `2.5px solid ${BRAND.accent}`,
          padding: compact ? 24 : 40,
          position: 'relative',
          background: 'rgba(167,139,250,0.05)',
          transform: 'rotate(-1deg)',
          boxShadow: `8px 8px 0 ${BRAND.accent}`,
        }}>
          {/* sticker */}
          <div style={{
            position: 'absolute', top: -18, right: -18,
            background: '#fde68a', color: '#0a0a1f',
            padding: '6px 14px', transform: 'rotate(8deg)',
            fontFamily: TYPE.ui, fontSize: 11, fontWeight: 900, letterSpacing: '0.08em',
            border: '2px solid #0a0a1f', boxShadow: '3px 3px 0 #0a0a1f',
          }}>
            STUDENT · 50% OFF
          </div>
          <div style={{
            fontFamily: TYPE.ui, fontWeight: 900,
            fontSize: compact ? 72 : 108, letterSpacing: '-0.05em', lineHeight: 1,
            color: '#fff',
          }}>
            $5<span style={{ fontSize: compact ? 20 : 26, color: BRAND.inkDim, fontWeight: 500 }}>/mo</span>
          </div>
          <div style={{ fontFamily: TYPE.mono, fontSize: 10, letterSpacing: '0.2em', color: BRAND.inkMute, marginTop: 4 }}>
            OR $40 / YEAR · CANCEL ANY TIME
          </div>
          <div style={{ marginTop: compact ? 24 : 36, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              'Itineraries drafted in seconds',
              'Timing tips for the rare quests',
              'Unlimited spectator friends',
              'First dibs on new monument drops',
            ].map(x => (
              <div key={x} style={{ display: 'flex', gap: 14, fontSize: 14, color: BRAND.inkDim, fontWeight: 500 }}>
                <span style={{ color: BRAND.accent }}>✦</span>
                <span>{x}</span>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: compact ? 28 : 40,
            padding: '14px 22px',
            background: BRAND.accent, color: '#0a0a1f',
            fontSize: 14, fontWeight: 900, letterSpacing: '0.04em',
            display: 'inline-block', textTransform: 'uppercase',
            border: '2px solid #0a0a1f',
            boxShadow: '4px 4px 0 #0a0a1f',
          }}>
            Try Pro · 7 days free →
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── StatLine · in-flight numbers ────────────────────────────────────────
function StatLine({ compact }) {
  const stats = [
    { v: '60',     l: 'monuments', s: 'shipping now' },
    { v: '4,208',  l: 'players',   s: 'this week' },
    { v: '71',     l: 'countries', s: 'visited' },
    { v: '1,063',  l: 'cards',     s: 'minted today' },
  ];
  return (
    <section style={{
      padding: compact ? '40px 20px' : '60px 80px',
      background: '#f5f1e8',
      borderTop: '1px solid rgba(10,10,31,0.12)',
      borderBottom: '1px solid rgba(10,10,31,0.12)',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: compact ? 24 : 20 }}>
        {stats.map(s => (
          <div key={s.l}>
            <div style={{
              fontFamily: TYPE.display, fontSize: compact ? 44 : 72, fontWeight: 400,
              letterSpacing: '-0.025em', lineHeight: 1, color: '#0a0a1f',
            }}>{s.v}</div>
            <div style={{
              fontFamily: TYPE.mono, fontSize: 10, letterSpacing: '0.18em',
              color: '#6b6b55', marginTop: 8, textTransform: 'uppercase',
            }}>{s.l} · {s.s}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── FooterEditorial · legal + links + manifesto ─────────────────────────
function FooterEditorial({ compact }) {
  return (
    <section style={{
      padding: compact ? '48px 20px 36px' : '100px 80px 60px',
      background: '#f5f1e8', color: '#0a0a1f',
    }}>
      <div style={{
        fontFamily: TYPE.ui, fontSize: compact ? 36 : 64, fontWeight: 900,
        letterSpacing: '-0.03em', lineHeight: 0.95, maxWidth: 960, marginBottom: compact ? 36 : 60,
        textTransform: 'uppercase',
      }}>
        Go outside.<br/>
        <span style={{
          fontFamily: TYPE.display, fontStyle: 'italic', fontWeight: 400,
          color: BRAND.accent, textTransform: 'lowercase',
        }}>
          the world is the game board.
        </span>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: compact ? '1fr 1fr' : 'repeat(5, 1fr)',
        gap: compact ? 24 : 40,
        paddingTop: compact ? 24 : 40,
        borderTop: '1px solid rgba(10,10,31,0.2)',
      }}>
        <div>
          <div style={{ fontFamily: TYPE.display, fontSize: 24, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 6 }}>
            geknee
          </div>
          <div style={{ fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.15em', color: '#6b6b55' }}>
            EST. 2026 · HANOI · SF
          </div>
        </div>
        {[
          { h: 'Product',   items: ['Open the globe', 'The collection', 'Leaderboard', 'Pro'] },
          { h: 'Company',   items: ['About', 'Blog', 'Careers', 'Press'] },
          { h: 'Players',   items: ['How it works', 'Rarity tiers', 'Community', 'Friends'] },
          { h: 'Legal',     items: ['Terms', 'Privacy', 'Cookies', 'Contact'] },
        ].map(col => (
          <div key={col.h}>
            <div style={{
              fontFamily: TYPE.mono, fontSize: 10, letterSpacing: '0.18em',
              color: '#6b6b55', marginBottom: 14, textTransform: 'uppercase',
            }}>§ {col.h}</div>
            {col.items.map(i => (
              <div key={i} style={{ fontSize: 13, color: '#0a0a1f', marginBottom: 8 }}>{i}</div>
            ))}
          </div>
        ))}
      </div>
      <div style={{
        marginTop: compact ? 32 : 60, paddingTop: 20,
        borderTop: '1px solid rgba(10,10,31,0.1)',
        display: 'flex', justifyContent: 'space-between',
        fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.12em', color: '#6b6b55',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div>© 2026 geknee · All specimens permanent</div>
        <div>v 0.1.0 · handmade in Hanoi</div>
      </div>
    </section>
  );
}

function RarityCurveSection() {
  // 7 tiers rendered as a descending-rarity bar chart: stone 70%, bronze 38%, silver 18%, gold 7%, diamond 2.4%, aurora 0.6%, celestial 0.1%
  const tiers = [
    { id: 'stone',     label: 'Stone',     pct: 70,  color: '#a8a8a8' },
    { id: 'bronze',    label: 'Bronze',    pct: 38,  color: '#cd7f32' },
    { id: 'silver',    label: 'Silver',    pct: 18,  color: '#e8e8e8' },
    { id: 'gold',      label: 'Gold',      pct: 7,   color: '#fbbf24' },
    { id: 'diamond',   label: 'Diamond',   pct: 2.4, color: '#b9f2ff' },
    { id: 'aurora',    label: 'Aurora',    pct: 0.6, color: '#7cff97' },
    { id: 'celestial', label: 'Celestial', pct: 0.1, color: BRAND.accent },
  ];
  return (
    <section style={{ padding: '80px 80px', borderTop: '1px solid rgba(10,10,31,0.12)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 60, alignItems: 'end' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#6b6b55', fontWeight: 600, marginBottom: 14 }}>
            § Rarity distribution
          </div>
          <h2 style={{ fontFamily: TYPE.display, fontWeight: 400, fontSize: 56, margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
            Seven tiers.<br /><em style={{ color: BRAND.accent }}>One in a thousand</em> reaches Celestial.
          </h2>
          <p style={{ fontSize: 14, color: '#3a3a30', marginTop: 20, maxWidth: 420, lineHeight: 1.55 }}>
            Drop rates fall exponentially. Base tiers unlock on first visit; rarer tiers require harder quests, multiple returns, and timing.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'end', gap: 14, height: 320 }}>
          {tiers.map(t => (
            <div key={t.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ fontFamily: TYPE.mono, fontSize: 10, color: '#6b6b55' }}>
                {t.pct < 1 ? `${t.pct}%` : `${t.pct}%`}
              </div>
              <div style={{
                width: '100%', height: `${Math.max(6, t.pct * 4.2)}px`,
                background: t.color, border: '1px solid #0a0a1f',
                boxShadow: `4px 4px 0 rgba(10,10,31,0.15)`,
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', top: -1, left: -1, right: -1,
                  height: 3, background: 'rgba(10,10,31,0.35)',
                }} />
              </div>
              <div style={{
                fontFamily: TYPE.display, fontSize: 13, fontStyle: 'italic',
                color: '#0a0a1f',
              }}>{t.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RarityCurveCompact() {
  const tiers = [
    { label: 'Stone',     pct: 70,  color: '#a8a8a8' },
    { label: 'Bronze',    pct: 38,  color: '#cd7f32' },
    { label: 'Silver',    pct: 18,  color: '#e8e8e8' },
    { label: 'Gold',      pct: 7,   color: '#fbbf24' },
    { label: 'Diamond',   pct: 2.4, color: '#b9f2ff' },
    { label: 'Aurora',    pct: 0.6, color: '#7cff97' },
    { label: 'Celestial', pct: 0.1, color: BRAND.accent },
  ];
  return (
    <section style={{ padding: '48px 20px', borderTop: '1px solid rgba(10,10,31,0.12)' }}>
      <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#6b6b55', fontWeight: 600, marginBottom: 10 }}>
        § Rarity distribution
      </div>
      <h2 style={{ fontFamily: TYPE.display, fontWeight: 400, fontSize: 34, margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
        One in a thousand reaches <em style={{ color: BRAND.accent }}>Celestial</em>.
      </h2>
      <div style={{ marginTop: 24 }}>
        {tiers.map(t => (
          <div key={t.label} style={{
            display: 'grid', gridTemplateColumns: '80px 1fr 50px', alignItems: 'center',
            gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(10,10,31,0.08)',
          }}>
            <div style={{ fontFamily: TYPE.display, fontSize: 14, fontStyle: 'italic' }}>{t.label}</div>
            <div style={{ background: 'rgba(10,10,31,0.06)', height: 10, position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${Math.max(2, t.pct)}%`,
                background: t.color, border: '1px solid #0a0a1f',
              }} />
            </div>
            <div style={{ fontFamily: TYPE.mono, fontSize: 10, color: '#6b6b55', textAlign: 'right' }}>{t.pct}%</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ShareCardMini({ mk, skin, city }) {
  const color = SKIN_META[skin].color;
  const name = MK_META[mk].name;
  return (
    <div style={{
      aspectRatio: '12/7',
      background: `radial-gradient(ellipse at 25% 30%, ${color}22, rgba(10,10,31,0.95) 70%), #05050f`,
      border: `1px solid ${color}55`,
      borderRadius: 8, padding: 20,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* tier ring */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          border: `2px solid ${color}`, boxShadow: `0 0 18px ${color}66`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${color}15`,
        }}>
          <span style={{ fontFamily: TYPE.display, fontSize: 15, fontStyle: 'italic', color }}>
            {skin[0].toUpperCase()}
          </span>
        </div>
        <div style={{
          fontFamily: TYPE.mono, fontSize: 9, letterSpacing: '0.12em',
          color: BRAND.inkDim,
        }}>
          NO. 041 · {skin.toUpperCase()}
        </div>
      </div>
      <div>
        <div style={{
          fontFamily: TYPE.display, fontSize: 22, color: BRAND.ink,
          letterSpacing: '-0.01em', lineHeight: 1.1,
        }}>{name}</div>
        <div style={{
          fontFamily: TYPE.ui, fontSize: 11, color: BRAND.inkDim, marginTop: 4,
          letterSpacing: '0.05em',
        }}>
          {city} · collected by @nghia → <span style={{ color }}>visit the globe</span>
        </div>
      </div>
    </div>
  );
}

// ─── Landing L2 · Cosmic (refined) ──────────────────────────────────────────

function LandingCosmic({ compact }) {
  return (
    <div style={{
      width: compact ? 390 : 1280,
      height: compact ? 1600 : 2400,
      background: `radial-gradient(ellipse at 30% 20%, rgba(167,139,250,0.18) 0%, ${BRAND.bg} 55%, #020208 100%)`,
      fontFamily: TYPE.ui, color: BRAND.ink, overflow: 'hidden',
      position: 'relative',
    }}>
      <StarBg density={compact ? 30 : 80} />
      <MkNav compact={compact} dark />

      {/* Hero */}
      <section style={{
        padding: compact ? '32px 20px 48px' : '60px 80px 80px',
        display: 'grid',
        gridTemplateColumns: compact ? '1fr' : '1.1fr 1fr',
        gap: compact ? 32 : 60, alignItems: 'center',
        position: 'relative', zIndex: 2,
      }}>
        <div>
          <div style={{
            display: 'inline-block',
            fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
            color: BRAND.accent, fontWeight: 600, marginBottom: compact ? 20 : 24,
          }}>
            ✦ Collection game · Trip planner inside
          </div>
          <h1 style={{
            fontFamily: TYPE.display, fontWeight: 400,
            fontSize: compact ? 52 : 96, lineHeight: 0.98, margin: 0,
            letterSpacing: '-0.035em',
          }}>
            Collect<br />
            <em style={{ color: BRAND.accent, fontStyle: 'italic' }}>the world.</em>
          </h1>
          <p style={{
            fontFamily: TYPE.display, fontSize: compact ? 17 : 22, lineHeight: 1.45,
            maxWidth: 480, marginTop: compact ? 20 : 32, color: BRAND.inkDim,
            fontWeight: 300,
          }}>
            A 3D globe where every monument is a collectible. Visit in person,
            complete the quest, unlock the rare skin. No shortcuts.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: compact ? 24 : 36, flexWrap: 'wrap' }}>
            <span style={{
              padding: '14px 22px', borderRadius: 12,
              background: BRAND.accent, color: '#0a0a1f',
              fontSize: 13, fontWeight: 600, letterSpacing: '0.01em',
            }}>Open the globe →</span>
            <span style={{
              padding: '14px 22px', borderRadius: 12,
              border: `1px solid ${BRAND.borderHi}`,
              color: BRAND.ink, fontSize: 13, fontWeight: 500,
            }}>See the collection</span>
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 28, fontSize: 12, color: BRAND.inkMute }}>
            <span>✓ Free forever</span>
            <span>✓ No card to start</span>
            <span>✓ 60+ monuments</span>
          </div>
        </div>

        <div style={{
          position: 'relative',
          aspectRatio: '1 / 1',
          maxWidth: compact ? 280 : 460,
          margin: '0 auto',
        }}>
          <CosmicGlobe />
        </div>
      </section>

      {/* Rarity (cosmic variant) */}
      <section style={{
        padding: compact ? '48px 20px' : '60px 80px',
        borderTop: `1px solid ${BRAND.border}`, position: 'relative', zIndex: 2,
      }}>
        <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: BRAND.accent, fontWeight: 600, marginBottom: 10 }}>
          § Seven tiers
        </div>
        <h2 style={{ fontFamily: TYPE.display, fontWeight: 400, fontSize: compact ? 32 : 52, margin: 0, letterSpacing: '-0.02em' }}>
          The rarer the skin, <em style={{ color: BRAND.accent }}>the harder the trip.</em>
        </h2>
        <div style={{
          display: 'grid', gridTemplateColumns: compact ? 'repeat(2,1fr)' : 'repeat(7,1fr)',
          gap: compact ? 10 : 14, marginTop: compact ? 24 : 40,
        }}>
          {[
            { id: 'stone',     color: '#a8a8a8', drop: '70%'  },
            { id: 'bronze',    color: '#cd7f32', drop: '38%'  },
            { id: 'silver',    color: '#e8e8e8', drop: '18%'  },
            { id: 'gold',      color: '#fbbf24', drop: '7%'   },
            { id: 'diamond',   color: '#b9f2ff', drop: '2.4%' },
            { id: 'aurora',    color: '#7cff97', drop: '0.6%' },
            { id: 'celestial', color: BRAND.accent, drop: '0.1%' },
          ].map(t => (
            <div key={t.id} style={{
              aspectRatio: '1',
              background: `radial-gradient(circle at 50% 35%, ${t.color}22, transparent 70%), rgba(13,13,36,0.6)`,
              border: `1px solid ${t.color}55`,
              borderRadius: 14,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: 14,
            }}>
              <div style={{
                width: compact ? 36 : 44, height: compact ? 36 : 44, borderRadius: '50%',
                border: `2px solid ${t.color}`, boxShadow: `0 0 20px ${t.color}66`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${t.color}15`, marginBottom: 10,
              }}>
                <span style={{ fontFamily: TYPE.display, fontSize: 14, fontStyle: 'italic', color: t.color }}>
                  {t.id[0].toUpperCase()}
                </span>
              </div>
              <div style={{ fontFamily: TYPE.display, fontSize: 13, fontStyle: 'italic', color: BRAND.ink }}>
                {t.id[0].toUpperCase() + t.id.slice(1)}
              </div>
              <div style={{ fontFamily: TYPE.mono, fontSize: 10, color: BRAND.inkMute, marginTop: 4 }}>
                drop {t.drop}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Share cards */}
      <section style={{ padding: compact ? '48px 20px' : '60px 80px', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: BRAND.accent, fontWeight: 600, marginBottom: 10 }}>
          § Every unlock is a share
        </div>
        <h2 style={{ fontFamily: TYPE.display, fontWeight: 400, fontSize: compact ? 32 : 52, margin: 0, letterSpacing: '-0.02em' }}>
          One tap. Your friends <em style={{ color: BRAND.accent }}>start collecting.</em>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(3,1fr)', gap: compact ? 12 : 20, marginTop: 32 }}>
          {[
            { mk: 'eiffelTower',   skin: 'gold',      city: 'Paris' },
            { mk: 'statueLiberty', skin: 'aurora',    city: 'New York' },
            { mk: 'pyramidGiza',   skin: 'celestial', city: 'Giza' },
          ].map(c => <ShareCardMini key={c.mk} {...c} />)}
        </div>
      </section>
    </div>
  );
}

function CosmicGlobe() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: `1px solid ${BRAND.borderHi}`,
        animation: 'pulseRing 5s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', inset: '10%', borderRadius: '50%',
        border: `1px solid ${BRAND.accent}55`,
        animation: 'pulseRing 7s ease-in-out infinite 1s',
      }} />
      <div style={{
        position: 'absolute', inset: '18%', borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, #2a2a55, #0a0a1f 70%)`,
        boxShadow: `inset -20px -30px 60px #000, 0 0 60px ${BRAND.accent}33`,
        overflow: 'hidden',
      }}>
        <svg viewBox="-50 -50 100 100" style={{ width: '100%', height: '100%', opacity: 0.45 }}>
          {[-60,-30,0,30,60].map(l => (
            <ellipse key={l} cx="0" cy={l*0.5} rx="48" ry="3" fill="none" stroke={BRAND.accent2} strokeWidth="0.3" />
          ))}
          {[-60,-30,0,30,60].map(l => (
            <ellipse key={'m'+l} cx={l*0.4} cy="0" rx={Math.abs(Math.cos(l*Math.PI/180)*48)} ry="48" fill="none" stroke={BRAND.accent2} strokeWidth="0.3" />
          ))}
        </svg>
      </div>
      {[{c: BRAND.gold, t:'25%', l:'60%'}, {c: '#7cff97', t:'55%', l:'30%'}, {c: BRAND.accent, t:'40%', l:'72%'}].map((p, i) => (
        <div key={i} style={{
          position: 'absolute', top: p.t, left: p.l,
          width: 10, height: 10, borderRadius: '50%',
          background: p.c, boxShadow: `0 0 20px ${p.c}, 0 0 40px ${p.c}88`,
        }} />
      ))}
    </div>
  );
}

// ─── Landing L3 · Collection-first (contact sheet) ──────────────────────────

const ALL_MK = [
  'eiffelTower','colosseum','tajMahal','greatWall','statueLiberty','sagradaFamilia',
  'machuPicchu','christRedeem','angkorWat','pyramidGiza','goldenGate','bigBen',
  'acropolis','sydneyOpera','neuschwanstein','stonehenge','iguazuFalls','tokyoSkytree',
  'victoriaFalls','moaiEaster','chichenItza','petra','mountFuji','hagiaSofia',
  'blueMosque','forbidden','buckingham','louvre','pisa','alhambra',
  'saintBasil','rushmore','niagara','dubaiBurj','templebar','uluru',
  'banff','patagonia','tulum','marbleCanyon','yellowstone','halong',
  'santorini','cinqueTerre','bali','kyotoFushimi','versailles','versailles2',
  'pradoBeach','danube','bosphorus','amazon','pompeii','cappadocia',
  'saharaDune','everest','kilimanjaro','northernLights','antarctica','galapagos',
];

function LandingCollectionFirst({ compact }) {
  const cols = compact ? 6 : 10;
  return (
    <div style={{
      width: compact ? 390 : 1280,
      height: compact ? 1600 : 2400,
      background: BRAND.bg,
      fontFamily: TYPE.ui, color: BRAND.ink, overflow: 'hidden',
      position: 'relative',
    }}>
      <MkNav compact={compact} dark />

      {/* Hero — text over the contact sheet */}
      <section style={{ padding: compact ? '20px 20px 0' : '40px 80px 0', position: 'relative', zIndex: 3 }}>
        <div style={{
          display: 'inline-block',
          fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
          color: BRAND.accent, fontWeight: 600, marginBottom: compact ? 20 : 28,
        }}>
          ✦ 420 collectibles · 7 rarity tiers each
        </div>
        <h1 style={{
          fontFamily: TYPE.display, fontWeight: 400,
          fontSize: compact ? 52 : 128, lineHeight: 0.92, margin: 0,
          letterSpacing: '-0.04em',
          maxWidth: compact ? '100%' : 1000,
        }}>
          The <em style={{ color: BRAND.accent, fontStyle: 'italic' }}>world</em> is<br />
          a collection.
        </h1>
        <p style={{
          fontFamily: TYPE.display, fontSize: compact ? 17 : 22, lineHeight: 1.45,
          maxWidth: 520, marginTop: compact ? 20 : 28, color: BRAND.inkDim,
          fontWeight: 300,
        }}>
          Sixty monuments, seven rarity tiers each. Here they all are.
          The dim ones are still out there, waiting.
        </p>
      </section>

      {/* Contact sheet — all monuments as tiny medallions */}
      <section style={{ padding: compact ? '32px 16px' : '60px 80px', position: 'relative' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: compact ? 8 : 14,
        }}>
          {ALL_MK.map((mk, i) => {
            // Deterministic "is unlocked" pattern for demo
            const unlocked = (i * 7) % 11 < 4;
            const skin = unlocked
              ? ['gold', 'silver', 'bronze', 'gold', 'diamond'][i % 5]
              : null;
            const color = skin ? SKIN_META[skin].color : BRAND.border;
            return (
              <div key={mk + i} style={{
                aspectRatio: '1',
                borderRadius: '50%',
                border: `1.5px solid ${skin ? color : 'rgba(255,255,255,0.08)'}`,
                background: skin
                  ? `radial-gradient(circle at 50% 35%, ${color}22, transparent 70%), rgba(13,13,36,0.8)`
                  : 'rgba(13,13,36,0.4)',
                boxShadow: skin ? `0 0 12px ${color}44` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: skin ? 1 : 0.35,
              }}>
                <span style={{
                  fontFamily: TYPE.display, fontSize: compact ? 10 : 13,
                  fontStyle: 'italic',
                  color: skin ? color : BRAND.inkMute,
                }}>
                  {mk.slice(0, 2).toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: compact ? 24 : 40, flexWrap: 'wrap' }}>
          <span style={{
            padding: '14px 22px', borderRadius: 12,
            background: BRAND.accent, color: '#0a0a1f',
            fontSize: 13, fontWeight: 600,
          }}>Open the globe →</span>
          <span style={{
            padding: '14px 22px', borderRadius: 12,
            border: `1px solid ${BRAND.borderHi}`,
            color: BRAND.ink, fontSize: 13, fontWeight: 500,
          }}>How scoring works</span>
        </div>
      </section>

      {/* Three spotlight rows */}
      <section style={{ padding: compact ? '32px 20px' : '60px 80px', borderTop: `1px solid ${BRAND.border}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr 1fr', gap: compact ? 20 : 28 }}>
          {[
            { glyph: '◉', title: 'Go there', body: 'Unlock the base tier the moment your quest verifies on-site.' },
            { glyph: '✦', title: 'Go back', body: 'Rare skins only come from return visits on harder conditions.' },
            { glyph: '◬', title: 'Go viral', body: 'Every unlock makes a share card. Friends land on your globe.' },
          ].map(x => (
            <div key={x.title}>
              <div style={{ fontSize: 40, color: BRAND.accent, fontFamily: TYPE.display, marginBottom: 14 }}>{x.glyph}</div>
              <div style={{ fontFamily: TYPE.display, fontSize: 24, fontWeight: 400, marginBottom: 8 }}>{x.title}</div>
              <div style={{ fontSize: 14, color: BRAND.inkDim, lineHeight: 1.5 }}>{x.body}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Public profile ─────────────────────────────────────────────────────────

const MK_META = {
  eiffelTower: { name: 'Eiffel Tower', city: 'Paris' },
  colosseum: { name: 'Colosseum', city: 'Rome' },
  tajMahal: { name: 'Taj Mahal', city: 'Agra' },
  greatWall: { name: 'Great Wall', city: 'China' },
  statueLiberty: { name: 'Statue of Liberty', city: 'New York' },
  machuPicchu: { name: 'Machu Picchu', city: 'Peru' },
  christRedeem: { name: 'Christ the Redeemer', city: 'Rio' },
  angkorWat: { name: 'Angkor Wat', city: 'Cambodia' },
  pyramidGiza: { name: 'Pyramids of Giza', city: 'Giza' },
  goldenGate: { name: 'Golden Gate', city: 'San Francisco' },
  bigBen: { name: 'Big Ben', city: 'London' },
  acropolis: { name: 'Acropolis', city: 'Athens' },
  sydneyOpera: { name: 'Sydney Opera', city: 'Sydney' },
  sagradaFamilia: { name: 'Sagrada Família', city: 'Barcelona' },
  stonehenge: { name: 'Stonehenge', city: 'Wiltshire' },
  mountFuji: { name: 'Mount Fuji', city: 'Japan' },
};

const SKIN_META = {
  stone:     { color: '#a8a8a8', rank: 1, label: 'Stone' },
  bronze:    { color: '#cd7f32', rank: 2, label: 'Bronze' },
  silver:    { color: '#e8e8e8', rank: 3, label: 'Silver' },
  gold:      { color: '#fbbf24', rank: 4, label: 'Gold' },
  diamond:   { color: '#b9f2ff', rank: 5, label: 'Diamond' },
  aurora:    { color: '#7cff97', rank: 6, label: 'Aurora' },
  celestial: { color: BRAND.accent, rank: 7, label: 'Celestial' },
};

function PublicProfile({ compact, view = 'visitor' }) {
  // view: 'visitor' (someone else's) or 'owner' (your own)
  const collected = [
    { mk: 'eiffelTower',    skin: 'gold',      owned: ['stone','gold'] },
    { mk: 'colosseum',      skin: 'silver',    owned: ['stone','bronze','silver'] },
    { mk: 'tajMahal',       skin: 'diamond',   owned: ['stone','diamond'] },
    { mk: 'statueLiberty',  skin: 'aurora',    owned: ['stone','aurora'] },
    { mk: 'goldenGate',     skin: 'bronze',    owned: ['stone','bronze'] },
    { mk: 'bigBen',         skin: 'gold',      owned: ['stone','gold'] },
    { mk: 'acropolis',      skin: 'stone',     owned: ['stone'] },
    { mk: 'sagradaFamilia', skin: 'celestial', owned: ['stone','gold','celestial'] },
    { mk: 'pyramidGiza',    skin: 'silver',    owned: ['stone','silver'] },
    { mk: 'machuPicchu',    skin: 'gold',      owned: ['stone','gold'] },
    { mk: 'angkorWat',      skin: 'bronze',    owned: ['stone','bronze'] },
    { mk: 'mountFuji',      skin: 'stone',     owned: ['stone'] },
  ];
  const rare = collected.filter(c => SKIN_META[c.skin].rank >= 4).length;

  return (
    <div style={{
      width: compact ? 390 : 1280,
      minHeight: compact ? 1400 : 1800,
      background: `radial-gradient(ellipse at 30% 10%, rgba(167,139,250,0.12), ${BRAND.bg} 55%)`,
      fontFamily: TYPE.ui, color: BRAND.ink, overflow: 'hidden',
      position: 'relative',
    }}>
      <StarBg density={compact ? 20 : 50} />
      <MkNav compact={compact} dark />

      {/* Identity band */}
      <section style={{
        padding: compact ? '20px 20px' : '24px 40px 20px',
        position: 'relative', zIndex: 2,
      }}>
        <div style={{
          display: 'flex', gap: compact ? 16 : 20, alignItems: 'center',
          flexWrap: compact ? 'wrap' : 'nowrap',
        }}>
          <div style={{
            width: compact ? 64 : 84, height: compact ? 64 : 84, borderRadius: '50%',
            background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.accent2})`,
            border: `2px solid ${BRAND.borderHi}`,
            boxShadow: `0 0 30px ${BRAND.accent}33`,
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: TYPE.display, fontSize: compact ? 26 : 34, fontStyle: 'italic',
            color: '#0a0a1f',
          }}>N</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
              color: BRAND.accent, fontWeight: 600, marginBottom: 4,
            }}>
              {view === 'owner' ? 'Your globe' : `You're visiting`}
            </div>
            <h1 style={{
              fontFamily: TYPE.display, fontWeight: 400,
              fontSize: compact ? 32 : 44, margin: 0, letterSpacing: '-0.02em',
              lineHeight: 1,
            }}>
              Nghia Pham
            </h1>
            <div style={{ fontSize: 12, color: BRAND.inkMute, marginTop: 6, letterSpacing: '0.04em' }}>
              @nghia · collector since April 2026 · geknee.com/u/nghia
            </div>
          </div>
          {view === 'visitor' && !compact && (
            <div style={{
              padding: '12px 20px', borderRadius: 12,
              background: BRAND.accent, color: '#0a0a1f',
              fontSize: 13, fontWeight: 600,
            }}>Start your own globe →</div>
          )}
        </div>

        {/* Stats row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: compact ? 'repeat(3, 1fr)' : 'repeat(4, auto) 1fr',
          gap: compact ? 10 : 28, alignItems: 'end',
          marginTop: compact ? 20 : 28,
          padding: compact ? '16px 0' : '20px 0',
          borderTop: `1px solid ${BRAND.border}`,
          borderBottom: `1px solid ${BRAND.border}`,
        }}>
          <Stat v={collected.length} l="Collected" />
          <Stat v={rare} l="Rare tier+" c={BRAND.gold} />
          <Stat v={1} l="Celestial" c={BRAND.accent} />
          {!compact && <Stat v="#14" l="Rank (global)" />}
          {!compact && (
            <div style={{ textAlign: 'right', fontSize: 11, color: BRAND.inkMute }}>
              Last unlock · Sagrada Família · 2 days ago
            </div>
          )}
        </div>
      </section>

      {/* Globe hero */}
      <section style={{
        position: 'relative', margin: compact ? '16px 20px' : '28px 40px',
        aspectRatio: '16/9',
        borderRadius: 16, overflow: 'hidden',
        background: `radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.15), #030510 70%)`,
        border: `1px solid ${BRAND.border}`,
      }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <CosmicGlobe />
        </div>
        <div style={{
          position: 'absolute', left: compact ? 12 : 20, bottom: compact ? 12 : 20,
          padding: '8px 14px', borderRadius: 999,
          background: 'rgba(10,10,31,0.7)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${BRAND.border}`,
          fontFamily: TYPE.mono, fontSize: 10, color: BRAND.inkDim,
          letterSpacing: '0.08em',
        }}>
          DRAG TO EXPLORE · {collected.length} UNLOCKED
        </div>
      </section>

      {/* Collection grid */}
      <section style={{ padding: compact ? '8px 20px 40px' : '20px 40px 60px' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: compact ? 14 : 20,
        }}>
          <h2 style={{ fontFamily: TYPE.display, fontWeight: 400, fontSize: compact ? 24 : 34, margin: 0, letterSpacing: '-0.02em' }}>
            Collection
          </h2>
          <div style={{ display: 'flex', gap: 6, fontSize: 11, color: BRAND.inkDim }}>
            <span style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(167,139,250,0.16)', border: `1px solid ${BRAND.borderHi}`, color: BRAND.accent }}>All 12</span>
            <span style={{ padding: '6px 12px', borderRadius: 999, border: `1px solid ${BRAND.border}` }}>Rare only</span>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${compact ? 3 : 6}, 1fr)`,
          gap: compact ? 10 : 14,
        }}>
          {collected.map(c => {
            const meta = SKIN_META[c.skin];
            const monName = MK_META[c.mk].name;
            const monCity = MK_META[c.mk].city;
            return (
              <div key={c.mk} style={{
                background: `radial-gradient(circle at 50% 30%, ${meta.color}22, transparent 70%), rgba(13,13,36,0.7)`,
                border: `1px solid ${meta.color}55`,
                borderRadius: 14,
                padding: compact ? '14px 10px' : '18px 14px',
                textAlign: 'center',
              }}>
                <div style={{
                  width: compact ? 44 : 56, height: compact ? 44 : 56,
                  margin: '0 auto 10px',
                  borderRadius: '50%',
                  border: `2px solid ${meta.color}`,
                  boxShadow: `0 0 18px ${meta.color}66`,
                  background: `${meta.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontFamily: TYPE.display, fontSize: compact ? 15 : 20, fontStyle: 'italic', color: meta.color }}>
                    {c.mk.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div style={{
                  fontFamily: TYPE.display, fontSize: compact ? 13 : 15, fontStyle: 'italic',
                }}>{monName}</div>
                <div style={{ fontSize: 10, color: BRAND.inkMute, marginTop: 2 }}>{monCity}</div>
                <div style={{
                  fontSize: 9, fontFamily: TYPE.mono, marginTop: 10, color: meta.color,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                }}>
                  {meta.label} · {meta.rank}/7
                </div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 4 }}>
                  {['stone','bronze','silver','gold','diamond','aurora','celestial'].map(s => {
                    const owned = c.owned.includes(s);
                    return (
                      <span key={s} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: owned ? SKIN_META[s].color : 'rgba(255,255,255,0.1)',
                        boxShadow: owned ? `0 0 5px ${SKIN_META[s].color}` : 'none',
                      }} />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ v, l, c = BRAND.ink }) {
  return (
    <div>
      <div style={{ fontFamily: TYPE.display, fontSize: 28, fontWeight: 400, color: c, lineHeight: 1, fontStyle: 'italic' }}>
        {v}
      </div>
      <div style={{
        fontSize: 10, color: BRAND.inkMute, marginTop: 4,
        letterSpacing: '0.16em', textTransform: 'uppercase',
      }}>{l}</div>
    </div>
  );
}

// ─── Leaderboard ────────────────────────────────────────────────────────────

function Leaderboard({ compact }) {
  const rows = [
    { rank: 1, name: 'Elena Voss',    handle: 'elena',    rare: 18, total: 42, flag: '🇩🇪', top: 'celestial' },
    { rank: 2, name: 'Kenji Abe',     handle: 'kenji',    rare: 15, total: 38, flag: '🇯🇵', top: 'aurora' },
    { rank: 3, name: 'Aria Chen',     handle: 'ariac',    rare: 14, total: 44, flag: '🇸🇬', top: 'diamond' },
    { rank: 4, name: 'Marco Bianchi', handle: 'marco',    rare: 12, total: 36, flag: '🇮🇹', top: 'diamond' },
    { rank: 5, name: 'Sofia Reyes',   handle: 'sofia',    rare: 11, total: 31, flag: '🇲🇽', top: 'gold' },
    { rank: 6, name: 'Wale Oyebanji', handle: 'wale',     rare: 10, total: 28, flag: '🇳🇬', top: 'gold' },
    { rank: 7, name: 'Priya Nair',    handle: 'priya',    rare: 9,  total: 30, flag: '🇮🇳', top: 'gold' },
    { rank: 8, name: 'Lars Holmberg', handle: 'lars',     rare: 9,  total: 22, flag: '🇸🇪', top: 'gold' },
    { rank: 9, name: 'Chloé Dubois',  handle: 'chloe',    rare: 8,  total: 26, flag: '🇫🇷', top: 'gold' },
    { rank:10, name: 'Diego Muñoz',   handle: 'diegom',   rare: 8,  total: 24, flag: '🇨🇱', top: 'gold' },
    { rank:11, name: 'Isabella Rossi',handle: 'isabella', rare: 7,  total: 20, flag: '🇮🇹', top: 'gold' },
    { rank:12, name: 'Ahmet Demir',   handle: 'ahmet',    rare: 7,  total: 19, flag: '🇹🇷', top: 'gold' },
  ];
  const you = { rank: 14, name: 'Nghia Pham', handle: 'nghia', rare: 6, total: 18, flag: '🇻🇳', top: 'gold' };

  return (
    <div style={{
      width: compact ? 390 : 1280,
      minHeight: compact ? 1400 : 1400,
      background: `radial-gradient(ellipse at 50% 5%, rgba(251,191,36,0.08), ${BRAND.bg} 55%)`,
      fontFamily: TYPE.ui, color: BRAND.ink, overflow: 'hidden',
      position: 'relative',
    }}>
      <StarBg density={compact ? 20 : 50} />
      <MkNav compact={compact} dark />

      <section style={{ padding: compact ? '24px 20px 20px' : '48px 60px 32px', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: BRAND.gold, fontWeight: 600, marginBottom: 10 }}>
          § Top collectors · updated every minute
        </div>
        <h1 style={{
          fontFamily: TYPE.display, fontWeight: 400,
          fontSize: compact ? 42 : 72, margin: 0, letterSpacing: '-0.03em',
        }}>
          The <em style={{ color: BRAND.gold, fontStyle: 'italic' }}>Leaderboard</em>.
        </h1>
        <p style={{ fontSize: compact ? 14 : 16, color: BRAND.inkDim, marginTop: 12, maxWidth: 520, lineHeight: 1.5 }}>
          Ranked by rare-tier monuments — Gold, Diamond, Aurora, Celestial.
          Earned only by going there and completing the harder quests.
        </p>
      </section>

      {/* Podium — top 3 as editorial spotlight */}
      {!compact && (
        <section style={{ padding: '0 60px 32px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr 1fr', gap: 20, alignItems: 'end' }}>
            <PodiumCard row={rows[1]} medal="II" accent="#e8e8e8" />
            <PodiumCard row={rows[0]} medal="I"  accent={BRAND.gold} big />
            <PodiumCard row={rows[2]} medal="III" accent="#cd7f32" />
          </div>
        </section>
      )}

      {/* Table */}
      <section style={{ padding: compact ? '0 20px 32px' : '20px 60px 40px', position: 'relative', zIndex: 2 }}>
        <div style={{
          background: 'rgba(13,13,36,0.6)',
          border: `1px solid ${BRAND.border}`,
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          {/* header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: compact ? '32px 1fr 40px 40px' : '48px 48px 1fr auto 80px 80px',
            gap: compact ? 10 : 18, alignItems: 'center',
            padding: compact ? '10px 14px' : '14px 22px',
            fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: BRAND.inkMute, fontWeight: 600,
            borderBottom: `1px solid ${BRAND.border}`,
            background: 'rgba(255,255,255,0.02)',
          }}>
            <div>#</div>
            {!compact && <div></div>}
            <div>Collector</div>
            {!compact && <div>Top tier</div>}
            <div style={{ textAlign: 'right', color: BRAND.gold }}>Rare</div>
            <div style={{ textAlign: 'right' }}>Total</div>
          </div>

          {rows.slice(compact ? 0 : 3).map(r => (
            <LbRow key={r.handle} row={r} compact={compact} />
          ))}

          {/* "you" row */}
          <div style={{ borderTop: `1px solid ${BRAND.borderHi}`, background: 'rgba(167,139,250,0.06)' }}>
            <LbRow row={you} compact={compact} isYou />
          </div>
        </div>
      </section>
    </div>
  );
}

function PodiumCard({ row, medal, accent, big }) {
  return (
    <div style={{
      padding: big ? '28px 24px 32px' : '22px 20px 24px',
      background: `radial-gradient(circle at 50% 10%, ${accent}22, transparent 70%), rgba(13,13,36,0.7)`,
      border: `1px solid ${accent}55`,
      borderRadius: 16,
      textAlign: 'center',
      transform: big ? 'translateY(-12px)' : 'none',
      boxShadow: big ? `0 20px 60px ${accent}22` : 'none',
    }}>
      <div style={{
        fontFamily: TYPE.display, fontSize: big ? 64 : 44, fontStyle: 'italic',
        color: accent, lineHeight: 1, margin: '0 0 10px',
      }}>{medal}</div>
      <div style={{
        width: big ? 72 : 56, height: big ? 72 : 56, borderRadius: '50%', margin: '0 auto 14px',
        background: `linear-gradient(135deg, ${accent}, #0a0a1f)`,
        border: `2px solid ${accent}`,
        boxShadow: `0 0 30px ${accent}66`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: big ? 28 : 22,
      }}>{row.flag}</div>
      <div style={{ fontFamily: TYPE.display, fontSize: big ? 24 : 20, fontWeight: 400 }}>
        {row.name}
      </div>
      <div style={{ fontSize: 11, color: BRAND.inkMute, marginTop: 2 }}>@{row.handle}</div>
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 18, marginTop: 14,
        paddingTop: 14, borderTop: `1px solid ${BRAND.border}`,
      }}>
        <div>
          <div style={{ fontFamily: TYPE.display, fontSize: 22, color: BRAND.gold, fontStyle: 'italic' }}>{row.rare}</div>
          <div style={{ fontSize: 9, color: BRAND.inkMute, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Rare</div>
        </div>
        <div>
          <div style={{ fontFamily: TYPE.display, fontSize: 22, fontStyle: 'italic' }}>{row.total}</div>
          <div style={{ fontSize: 9, color: BRAND.inkMute, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Total</div>
        </div>
      </div>
    </div>
  );
}

function LbRow({ row, compact, isYou }) {
  const podium = row.rank <= 3;
  const accent = row.rank === 1 ? BRAND.gold : row.rank === 2 ? '#e8e8e8' : row.rank === 3 ? '#cd7f32' : BRAND.inkMute;
  const topColor = SKIN_META[row.top].color;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: compact ? '32px 1fr 40px 40px' : '48px 48px 1fr auto 80px 80px',
      gap: compact ? 10 : 18, alignItems: 'center',
      padding: compact ? '12px 14px' : '14px 22px',
      borderTop: `1px solid ${BRAND.border}`,
      background: isYou ? 'transparent' : podium ? `linear-gradient(90deg, ${accent}10, transparent 30%)` : 'transparent',
    }}>
      <div style={{
        fontFamily: TYPE.display, fontSize: compact ? 17 : 22,
        fontStyle: 'italic',
        color: podium ? accent : BRAND.inkMute,
        textAlign: 'center',
      }}>
        {isYou ? '—' : row.rank}
      </div>
      {!compact && (
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.accent2})`,
          border: podium ? `2px solid ${accent}` : `1px solid ${BRAND.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}>{row.flag}</div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: TYPE.display, fontStyle: isYou ? 'italic' : 'normal',
          fontSize: compact ? 14 : 16, fontWeight: 400,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {row.name}{isYou && ' (you)'}
        </div>
        <div style={{ fontSize: 11, color: BRAND.inkMute, marginTop: 2 }}>
          #{row.rank} · @{row.handle}
        </div>
      </div>
      {!compact && (
        <div style={{
          padding: '4px 10px', borderRadius: 999,
          background: `${topColor}15`, border: `1px solid ${topColor}55`,
          fontSize: 10, color: topColor, letterSpacing: '0.1em', textTransform: 'uppercase',
          fontWeight: 600,
        }}>
          {SKIN_META[row.top].label}
        </div>
      )}
      <div style={{ textAlign: 'right', fontFamily: TYPE.display, fontSize: compact ? 16 : 20, fontStyle: 'italic', color: BRAND.gold }}>
        {row.rare}
      </div>
      <div style={{ textAlign: 'right', fontFamily: TYPE.display, fontSize: compact ? 14 : 17, color: BRAND.inkDim }}>
        {row.total}
      </div>
    </div>
  );
}

// ─── Unlock toast · 4 skin variants ─────────────────────────────────────────

function UnlockToastStack() {
  const variants = [
    { mk: 'goldenGate',     skin: 'stone',     quest: 'Visited Crissy Field viewpoint' },
    { mk: 'eiffelTower',    skin: 'gold',      quest: 'Blue-hour photo, Trocadéro' },
    { mk: 'statueLiberty',  skin: 'aurora',    quest: 'Third visit · winter storm timing' },
    { mk: 'sagradaFamilia', skin: 'celestial', quest: 'All 3 skins + 1-in-1000 roll' },
  ];
  return (
    <div style={{
      width: 900, padding: '40px 30px',
      background: `radial-gradient(ellipse at 30% 10%, rgba(167,139,250,0.15), ${BRAND.bg} 60%)`,
      display: 'flex', flexDirection: 'column', gap: 24,
      position: 'relative', overflow: 'hidden',
    }}>
      <StarBg density={30} />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: BRAND.accent, fontWeight: 600, marginBottom: 8, fontFamily: TYPE.ui }}>
          § Unlock toast · four tier states
        </div>
        <h2 style={{ fontFamily: TYPE.display, fontSize: 30, fontWeight: 400, margin: 0, color: BRAND.ink, letterSpacing: '-0.02em' }}>
          Tier-specific celebration.
        </h2>
        <p style={{ fontSize: 13, color: BRAND.inkDim, marginTop: 8, fontFamily: TYPE.ui }}>
          Each skin gets its own glow, CTA color, and quest line. Celestial and Aurora add a subtle particle aura.
        </p>
      </div>
      {variants.map(v => <UnlockToastSingle key={v.skin} {...v} />)}
    </div>
  );
}

function UnlockToastSingle({ mk, skin, quest }) {
  const meta = SKIN_META[skin];
  const monName = MK_META[mk].name;
  const isRare = meta.rank >= 4;
  return (
    <div style={{
      position: 'relative', zIndex: 2,
      background: 'rgba(13,13,36,0.9)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${meta.color}55`,
      boxShadow: `0 14px 40px rgba(0,0,0,0.5), 0 0 32px ${meta.color}22`,
      borderRadius: 14,
      padding: '14px 16px 14px 18px',
      display: 'flex', alignItems: 'center', gap: 16,
      color: BRAND.ink,
      fontFamily: TYPE.ui,
      overflow: 'hidden',
    }}>
      {/* Aura for rare */}
      {isRare && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 15% 50%, ${meta.color}22, transparent 50%)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Medallion */}
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        border: `2px solid ${meta.color}`,
        boxShadow: `0 0 20px ${meta.color}66, inset 0 0 12px ${meta.color}33`,
        background: `radial-gradient(circle, ${meta.color}22, transparent)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        <span style={{ fontFamily: TYPE.display, fontSize: 20, fontStyle: 'italic', color: meta.color }}>
          {meta.rank}
        </span>
      </div>

      <div style={{ minWidth: 0, flex: 1, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 10, color: meta.color, letterSpacing: '0.14em', fontWeight: 700, textTransform: 'uppercase' }}>
          {isRare ? `Rare unlock · ${meta.label}` : `New unlock · ${meta.label}`}
        </div>
        <div style={{
          fontFamily: TYPE.display, fontSize: 18, fontWeight: 400, marginTop: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {monName}
        </div>
        <div style={{ fontSize: 11, color: BRAND.inkMute, marginTop: 2 }}>
          {quest}
        </div>
      </div>

      <button style={{
        border: 'none',
        background: `linear-gradient(135deg, ${meta.color}, ${darken(meta.color)})`,
        color: meta.rank >= 3 ? '#0a0a1f' : '#fff',
        fontFamily: TYPE.ui, fontWeight: 600, fontSize: 13,
        padding: '11px 18px', borderRadius: 10,
        cursor: 'pointer', whiteSpace: 'nowrap',
        position: 'relative', zIndex: 1,
      }}>
        Share →
      </button>
      <button style={{
        border: 'none', background: 'transparent', color: BRAND.inkMute,
        fontSize: 18, cursor: 'pointer', padding: 4, lineHeight: 1, position: 'relative', zIndex: 1,
      }}>×</button>
    </div>
  );
}

function darken(hex) {
  // quick-n-dirty: add 40% black tint
  if (!hex.startsWith('#')) return hex;
  const r = parseInt(hex.slice(1,3), 16) * 0.6;
  const g = parseInt(hex.slice(3,5), 16) * 0.6;
  const b = parseInt(hex.slice(5,7), 16) * 0.6;
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

// ─── Share card · OG render ─────────────────────────────────────────────────

function ShareCardOG() {
  return (
    <div style={{
      width: 1200, height: 630,
      background: `radial-gradient(ellipse at 25% 30%, ${BRAND.gold}15, #05050f 65%), #030510`,
      color: BRAND.ink, fontFamily: TYPE.ui,
      display: 'grid', gridTemplateColumns: '1.2fr 1fr',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* stars */}
      <StarBg density={50} />
      {/* Left: monument treatment */}
      <div style={{ padding: '60px 60px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
        <div>
          <div style={{ fontSize: 13, letterSpacing: '0.22em', color: BRAND.gold, fontWeight: 600, textTransform: 'uppercase' }}>
            ✦ Gold tier unlocked
          </div>
          <h1 style={{
            fontFamily: TYPE.display, fontSize: 96, fontWeight: 400,
            letterSpacing: '-0.03em', lineHeight: 0.95, margin: '20px 0 0',
          }}>
            Eiffel<br />Tower.
          </h1>
          <p style={{ fontSize: 20, color: BRAND.inkDim, marginTop: 24, fontFamily: TYPE.display, fontWeight: 300 }}>
            Nghia just collected No. 041 in Gold.
          </p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          paddingTop: 24, borderTop: `1px solid ${BRAND.border}`,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.accent2})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: TYPE.display, fontSize: 16, fontStyle: 'italic', color: '#0a0a1f',
          }}>N</div>
          <div style={{ fontSize: 14, color: BRAND.ink }}>@nghia</div>
          <div style={{ marginLeft: 'auto', fontSize: 13, color: BRAND.accent, fontWeight: 600 }}>
            geknee.com/u/nghia →
          </div>
        </div>
      </div>

      {/* Right: specimen + polaroid */}
      <div style={{ position: 'relative', padding: '40px', zIndex: 2 }}>
        {/* tier medallion */}
        <div style={{
          position: 'absolute', top: 60, right: 60,
          width: 140, height: 140, borderRadius: '50%',
          background: `radial-gradient(circle, ${BRAND.gold}44, transparent 70%)`,
          border: `2px solid ${BRAND.gold}`,
          boxShadow: `0 0 40px ${BRAND.gold}66`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: TYPE.display, fontSize: 60, fontStyle: 'italic', color: BRAND.gold }}>IV</span>
        </div>
        {/* polaroid proof */}
        <div style={{
          position: 'absolute', bottom: 60, right: 80,
          width: 240, padding: 14,
          background: '#f5f1e8',
          transform: 'rotate(-4deg)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        }}>
          <div style={{
            height: 180,
            background: `linear-gradient(135deg, ${BRAND.gold}, #d97706)`,
            borderRadius: 2,
          }}>
            {/* tower silhouette */}
            <svg viewBox="0 0 120 160" style={{ width: '100%', height: '100%' }}>
              <path d="M60 10 L56 28 L44 90 L30 150 L90 150 L76 90 L64 28 Z"
                fill="rgba(10,10,31,0.4)" />
            </svg>
          </div>
          <div style={{
            marginTop: 12, fontFamily: TYPE.display, fontStyle: 'italic',
            fontSize: 12, color: '#3a3a30', textAlign: 'center',
          }}>
            proof of presence · 2026 · 04 · 18
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  LandingSpecimen, LandingCosmic, LandingCollectionFirst,
  PublicProfile, Leaderboard, UnlockToastStack, ShareCardOG,
  MK_META, SKIN_META,
});
