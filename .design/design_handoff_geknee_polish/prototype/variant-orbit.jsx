// Variant B — "Orbit": left rail planner + globe on the right
// (React hooks via globe.jsx)
function OrbitPlanner({ compact = false }) {
  const [trip, updateTrip] = useTripState(DEFAULT_TRIP);
  const [target, setTarget] = useState(null);
  const [destDraft, setDestDraft] = useState(trip.destination);
  const [genieOpen, setGenieOpen] = useState(false);
  const [activeCard, setActiveCard] = useState(null);

  const pickLandmark = (lm) => {
    updateTrip({ destination: lm.name, lat: lm.lat, lon: lm.lon });
    setDestDraft(lm.name);
    setTarget({ lat: lm.lat, lon: lm.lon });
    setActiveCard('dates');
  };

  const submitDest = () => {
    if (!destDraft.trim()) return;
    const match = LANDMARKS.find(l =>
      l.name.toLowerCase().includes(destDraft.toLowerCase()) ||
      l.city.toLowerCase().includes(destDraft.toLowerCase())
    ) || LANDMARKS[Math.floor(Math.random() * LANDMARKS.length)];
    updateTrip({ destination: destDraft, lat: match.lat, lon: match.lon });
    setTarget({ lat: match.lat, lon: match.lon });
    setActiveCard('dates');
  };

  const completion = [trip.destination, trip.startDate || trip.nights, trip.style, trip.budget].filter(Boolean).length;

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: BRAND.bg,
      overflow: 'hidden', fontFamily: TYPE.ui, color: BRAND.ink,
      display: 'flex', flexDirection: compact ? 'column' : 'row',
    }}>
      <StarBg density={compact ? 40 : 100} />

      {/* LEFT / TOP: Planning rail */}
      <div style={{
        width: compact ? '100%' : 400,
        flexShrink: 0,
        height: compact ? 'auto' : '100%',
        borderRight: compact ? 'none' : `1px solid ${BRAND.border}`,
        borderBottom: compact ? `1px solid ${BRAND.border}` : 'none',
        display: 'flex', flexDirection: 'column',
        background: `linear-gradient(180deg, rgba(10,10,31,0.65), rgba(5,5,15,0.4))`,
        backdropFilter: 'blur(12px)',
        position: 'relative', zIndex: 5,
      }}>
        {/* Header */}
        <div style={{
          padding: compact ? '14px 18px' : '22px 26px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.accent2})`,
              display: 'grid', placeItems: 'center',
              fontFamily: TYPE.display, fontWeight: 700, fontSize: 14, color: '#0a0a1f',
            }}>g</div>
            <div>
              <div style={{ fontFamily: TYPE.display, fontSize: 18, fontWeight: 500 }}>geknee</div>
              <div style={{ fontSize: 10, color: BRAND.inkMute, letterSpacing: '0.1em' }}>
                TRIP · {completion}/4 SET
              </div>
            </div>
          </div>
          <button style={{
            background: 'none', border: `1px solid ${BRAND.border}`, color: BRAND.inkDim,
            padding: '6px 12px', borderRadius: 999, fontFamily: TYPE.ui, fontSize: 11, cursor: 'pointer',
          }}>Sign in</button>
        </div>

        {/* Progress bar — subtle */}
        <div style={{ height: 2, background: BRAND.border, margin: '0 26px', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{ width: `${completion * 25}%`, height: '100%',
            background: `linear-gradient(90deg, ${BRAND.accent}, ${BRAND.accent2})`,
            transition: 'width 400ms ease' }} />
        </div>

        {/* Planner cards */}
        <div style={{ flex: 1, overflowY: 'auto', padding: compact ? '14px 18px' : '22px 26px 26px' }}>
          <Card
            k="destination" active={activeCard === 'destination'} setActive={setActiveCard}
            label="Where" value={trip.destination} icon="◉"
            placeholder="Unset — spin the globe or type"
          >
            <QuietInput value={destDraft} onChange={setDestDraft} onSubmit={submitDest}
              placeholder="City, country, or mood…" />
            <div style={{ marginTop: 12, fontSize: 10, color: BRAND.inkMute, letterSpacing: '0.12em',
              textTransform: 'uppercase', fontWeight: 600 }}>Trending</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {LANDMARKS.slice(0, 6).map(lm => (
                <Chip key={lm.id} small onClick={() => pickLandmark(lm)}>{lm.city}</Chip>
              ))}
            </div>
          </Card>

          <Card
            k="dates" active={activeCard === 'dates'} setActive={setActiveCard}
            label="When" value={trip.startDate ? `${trip.startDate} → ${trip.endDate}` : `${trip.nights} flexible nights`}
            icon="◷" placeholder="Unset — or keep flexible"
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Depart" value={trip.startDate} onChange={v => updateTrip({ startDate: v })} type="date" />
              <Field label="Return" value={trip.endDate} onChange={v => updateTrip({ endDate: v })} type="date" />
            </div>
            <div style={{ marginTop: 12, fontSize: 10, color: BRAND.inkMute, letterSpacing: '0.12em',
              textTransform: 'uppercase', fontWeight: 600 }}>
              Nights · {trip.nights}
            </div>
            <input type="range" min="2" max="21" value={trip.nights}
              onChange={e => updateTrip({ nights: +e.target.value })}
              style={{ width: '100%', accentColor: BRAND.accent, marginTop: 4 }} />
          </Card>

          <Card
            k="style" active={activeCard === 'style'} setActive={setActiveCard}
            label="Vibe" value={trip.style} icon="✦" placeholder="Unset — relaxed, adventure, culture…"
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['relaxed','adventure','culture','foodie','luxury','budget'].map(s => (
                <Chip key={s} small active={trip.style === s} onClick={() => updateTrip({ style: s })}>
                  {s}
                </Chip>
              ))}
            </div>
          </Card>

          <Card
            k="budget" active={activeCard === 'budget'} setActive={setActiveCard}
            label="Budget" value={trip.budget} icon="◈" placeholder="Unset"
          >
            <div style={{ display: 'flex', gap: 6 }}>
              {['$','$$','$$$','$$$$'].map(b => (
                <button key={b} onClick={() => updateTrip({ budget: b })}
                  style={{
                    flex: 1, padding: '10px 0',
                    background: trip.budget === b ? 'rgba(167,139,250,0.16)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${trip.budget === b ? BRAND.borderHi : BRAND.border}`,
                    borderRadius: 10, color: trip.budget === b ? BRAND.accent : BRAND.inkDim,
                    fontFamily: TYPE.ui, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}>{b}</button>
              ))}
            </div>
          </Card>
        </div>

        {/* Footer CTA */}
        <div style={{
          padding: compact ? '12px 18px' : '16px 26px',
          borderTop: `1px solid ${BRAND.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          background: 'rgba(10,10,31,0.7)',
        }}>
          <div style={{ fontSize: 11, color: BRAND.inkMute }}>
            {completion === 4 ? 'Ready to build' : `${4 - completion} to go`}
          </div>
          <button style={{
            background: completion === 4 ? BRAND.accent : 'rgba(167,139,250,0.2)',
            color: completion === 4 ? '#0a0a1f' : BRAND.inkMute,
            border: 'none', padding: '10px 18px', borderRadius: 10,
            fontFamily: TYPE.ui, fontSize: 13, fontWeight: 600,
            cursor: completion === 4 ? 'pointer' : 'not-allowed',
          }}>Build itinerary ✦</button>
        </div>
      </div>

      {/* RIGHT: Globe + ambient */}
      <div style={{
        flex: 1, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: compact ? 320 : 'auto',
      }}>
        <Globe size={compact ? 280 : 520} accent={BRAND.accent} target={target}
          onLandmarkClick={pickLandmark} dense idleSpin={!target} />

        {/* Floating destination label */}
        {trip.destination && (
          <div style={{
            position: 'absolute', top: compact ? 18 : 40, left: '50%', transform: 'translateX(-50%)',
            textAlign: 'center', pointerEvents: 'none',
          }}>
            <div style={{ fontSize: 10, color: BRAND.accent, letterSpacing: '0.18em',
              textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
              You're exploring
            </div>
            <div style={{ fontFamily: TYPE.display, fontSize: compact ? 22 : 32, fontWeight: 400,
              letterSpacing: '-0.01em' }}>
              {trip.destination}
            </div>
          </div>
        )}

        {/* Genie tucked in corner — pulled back */}
        <button
          onClick={() => setGenieOpen(o => !o)}
          style={{
            position: 'absolute', bottom: 20, right: 20,
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${BRAND.border}`,
            color: BRAND.accent, fontFamily: TYPE.display, fontSize: 18,
            cursor: 'pointer',
          }}
          title="Ask the assistant">
          ✦
        </button>

        {genieOpen && (
          <div style={{
            position: 'absolute', bottom: 76, right: 20, width: 280,
            background: BRAND.surfaceSolid, border: `1px solid ${BRAND.border}`,
            borderRadius: 14, padding: 14, fontSize: 12,
          }}>
            <div style={{ color: BRAND.inkMute, fontSize: 10, letterSpacing: '0.12em',
              textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
              Assistant
            </div>
            <div style={{ color: BRAND.ink, lineHeight: 1.5 }}>
              {trip.destination
                ? `${trip.destination} in ${trip.startDate ? 'the selected window' : `${trip.nights} nights`}? I can suggest a day-by-day once you set your vibe.`
                : `Start anywhere — I'll fill in the rest. Try typing a mood like "warm islands, under $2k."`}
            </div>
            <input placeholder="Ask anything…" style={{
              marginTop: 10, width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${BRAND.border}`,
              borderRadius: 8, padding: '8px 10px', color: BRAND.ink, fontSize: 12, outline: 'none',
              fontFamily: TYPE.ui,
            }} />
          </div>
        )}
      </div>
    </div>
  );
}

// Expandable planner card
function Card({ k, active, setActive, label, value, icon, placeholder, children }) {
  const isOpen = active;
  return (
    <div style={{
      marginBottom: 10,
      background: isOpen ? 'rgba(255,255,255,0.03)' : 'transparent',
      border: `1px solid ${isOpen ? BRAND.borderHi : BRAND.border}`,
      borderRadius: 14,
      transition: 'all 200ms ease',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setActive(active ? null : k)}
        style={{
          width: '100%', background: 'none', border: 'none',
          padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer', color: BRAND.ink, fontFamily: TYPE.ui,
          textAlign: 'left',
        }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          display: 'grid', placeItems: 'center',
          background: isOpen ? `${BRAND.accent}22` : 'rgba(255,255,255,0.04)',
          color: isOpen ? BRAND.accent : BRAND.inkMute,
          fontSize: 14, fontFamily: TYPE.display,
        }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: BRAND.inkMute, letterSpacing: '0.12em',
            textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: value ? BRAND.ink : BRAND.inkMute,
            marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {value || placeholder}
          </div>
        </div>
        <span style={{ color: BRAND.inkMute, fontSize: 12,
          transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>▼</span>
      </button>
      {isOpen && (
        <div style={{ padding: '0 16px 16px' }}>{children}</div>
      )}
    </div>
  );
}

window.OrbitPlanner = OrbitPlanner;
