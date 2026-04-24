// Variant A — "Atlas": globe full-bleed, planning in one expanding bottom sheet
// (React hooks via globe.jsx)
function AtlasPlanner({ compact = false }) {
  const [trip, updateTrip] = useTripState(DEFAULT_TRIP);
  const [sheet, setSheet] = useState('peek'); // 'peek' | 'open' | 'full'
  const [step, setStep]   = useState(0);      // 0 destination, 1 dates, 2 style, 3 review
  const [target, setTarget] = useState(null);
  const [destDraft, setDestDraft] = useState(trip.destination);
  const [genieOpen, setGenieOpen] = useState(false);

  const steps = ['Destination', 'Dates', 'Style', 'Review'];
  const done = [!!trip.destination, !!trip.startDate, !!trip.style, !!trip.budget];

  const pickLandmark = (lm) => {
    updateTrip({ destination: lm.name, lat: lm.lat, lon: lm.lon });
    setDestDraft(lm.name);
    setTarget({ lat: lm.lat, lon: lm.lon });
    setSheet('open');
    setStep(1);
  };

  const submitDest = () => {
    if (!destDraft.trim()) return;
    // fake geocode against LANDMARKS
    const match = LANDMARKS.find(l =>
      l.name.toLowerCase().includes(destDraft.toLowerCase()) ||
      l.city.toLowerCase().includes(destDraft.toLowerCase())
    ) || LANDMARKS[Math.floor(Math.random() * LANDMARKS.length)];
    updateTrip({ destination: destDraft, lat: match.lat, lon: match.lon });
    setTarget({ lat: match.lat, lon: match.lon });
    setSheet('open');
    setStep(1);
  };

  const sheetHeight = sheet === 'peek' ? 92 : sheet === 'open' ? (compact ? 420 : 340) : '85%';

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: `radial-gradient(ellipse at 50% 40%, ${BRAND.bg2}, ${BRAND.bg} 70%)`,
      overflow: 'hidden', fontFamily: TYPE.ui, color: BRAND.ink,
    }}>
      <StarBg density={compact ? 50 : 120} />

      {/* Top bar — product chrome (HOME · Collection · Go Pro · Trips & Friends · avatar · menu) */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: compact ? '12px 14px' : '18px 24px',
      }}>
        {/* Left: HOME pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 6 : 10 }}>
          <NavPill>
            <GlobeIcon /> {!compact && <span style={{ fontWeight: 600, letterSpacing: '0.04em' }}>HOME</span>}
          </NavPill>
          {!compact && (
            <span style={{ fontSize: 11, color: BRAND.inkMute, letterSpacing: '0.1em', marginLeft: 6 }}>
              · AUTO-SAVED
            </span>
          )}
        </div>

        {/* Right: Collection · Go Pro · Trips & Friends · avatar · menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 6 : 8 }}>
          {!compact && (
            <>
              <NavPill>
                <ColIcon /> <span>Collection</span>
              </NavPill>
              <NavPill accent>
                <SparkleIcon /> <span style={{ fontWeight: 600 }}>Go Pro</span>
              </NavPill>
              <NavPill>
                <TripsIcon /> <span>Trips &amp; Friends</span>
              </NavPill>
            </>
          )}
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.accent2})`,
            color: '#0a0a1f', display: 'grid', placeItems: 'center',
            fontFamily: TYPE.display, fontWeight: 700, fontSize: 14,
            border: `1px solid ${BRAND.border}`,
            cursor: 'pointer',
          }}>N</div>
          <NavPill iconOnly>
            <MenuIcon />
          </NavPill>
        </div>
      </div>

      {/* Globe — centered, shifted up as sheet expands */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: `translate(-50%, ${sheet === 'peek' ? '-52%' : sheet === 'open' ? '-70%' : '-120%'}) scale(${sheet === 'full' ? 0.4 : 1})`,
        transition: 'transform 600ms cubic-bezier(0.23,1,0.32,1)',
      }}>
        <Globe
          size={compact ? 280 : 560}
          accent={BRAND.accent}
          target={target}
          onLandmarkClick={pickLandmark}
          dense
          quiet={sheet !== 'peek'}
          idleSpin={sheet === 'peek'}
        />
      </div>

      {/* Ambient hint above sheet when peek */}
      {sheet === 'peek' && (
        <div style={{
          position: 'absolute', top: compact ? 72 : 90, left: 0, right: 0, textAlign: 'center',
          zIndex: 5, pointerEvents: 'none',
        }}>
          <div style={{ fontFamily: TYPE.display, fontSize: compact ? 28 : 48, fontWeight: 400,
            letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 8 }}>
            Where are you <em style={{ fontStyle: 'italic', color: BRAND.accent }}>wandering</em>?
          </div>
          <div style={{ color: BRAND.inkDim, fontSize: compact ? 12 : 14 }}>
            Spin the globe · tap a landmark · or type below
          </div>
        </div>
      )}

      {/* Bottom sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20,
        height: sheetHeight,
        background: `linear-gradient(180deg, rgba(10,10,31,0.85), rgba(10,10,31,0.98))`,
        backdropFilter: 'blur(20px)',
        borderTop: `1px solid ${BRAND.border}`,
        borderRadius: '24px 24px 0 0',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
        transition: 'height 500ms cubic-bezier(0.23,1,0.32,1)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Grab bar + tabs */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: compact ? '10px 14px' : '14px 24px',
          borderBottom: sheet !== 'peek' ? `1px solid ${BRAND.border}` : 'none',
          cursor: 'pointer',
        }} onClick={() => setSheet(s => s === 'peek' ? 'open' : s === 'open' ? 'full' : 'peek')}>
          <div style={{
            width: 36, height: 3, borderRadius: 2, background: BRAND.inkMute, opacity: 0.5,
            position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          }} />
          {sheet === 'peek' ? (
            <div style={{ flex: 1, display: 'flex', gap: 10, alignItems: 'center', paddingTop: 8 }}>
              <QuietInput
                value={destDraft} onChange={setDestDraft}
                placeholder="Try 'Kyoto', 'Iceland', 'somewhere warm'…"
                onSubmit={submitDest}
                width="100%"
              />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 20, overflowX: 'auto', paddingTop: 2 }}>
                {steps.map((s, i) => (
                  <div key={s} onClick={(e) => { e.stopPropagation(); setStep(i); }}>
                    <StepMarker idx={i} active={step === i} done={done[i] && step !== i} label={!compact || step === i ? s : null} compact={compact} />
                  </div>
                ))}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setSheet('peek'); }}
                style={{
                  background: 'none', border: 'none', color: BRAND.inkMute, fontSize: 18,
                  cursor: 'pointer', padding: 4,
                }}>↓</button>
            </>
          )}
        </div>

        {/* Step content */}
        {sheet !== 'peek' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: compact ? '16px 16px 80px' : '22px 28px 80px' }}>
            {step === 0 && (
              <StepDestination trip={trip} update={updateTrip} pickLandmark={pickLandmark}
                destDraft={destDraft} setDestDraft={setDestDraft} submitDest={submitDest} />
            )}
            {step === 1 && <StepDates trip={trip} update={updateTrip} />}
            {step === 2 && <StepStyle trip={trip} update={updateTrip} />}
            {step === 3 && <StepReview trip={trip} />}

            {/* Footer nav */}
            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              padding: compact ? '12px 16px' : '14px 28px',
              borderTop: `1px solid ${BRAND.border}`,
              background: 'rgba(10,10,31,0.92)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: 12,
            }}>
              <div style={{ color: BRAND.inkMute }}>
                {trip.destination ? `${trip.destination} · ${trip.nights}n` : 'no destination yet'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {step > 0 && (
                  <button onClick={() => setStep(step - 1)} style={btnGhost}>Back</button>
                )}
                {step < 3 ? (
                  <button onClick={() => setStep(step + 1)} style={btnPrimary}>
                    Continue →
                  </button>
                ) : (
                  <button style={btnPrimary}>Build itinerary ✦</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Genie corner chat — quiet affordance; opens a popover */}
      <GenieCorner
        trip={trip} step={step} steps={steps}
        open={genieOpen} setOpen={setGenieOpen}
        bottomOffset={sheet === 'peek' ? 108 : (compact ? 440 : 360)}
        compact={compact}
      />
    </div>
  );
}
function StepDestination({ trip, update, pickLandmark, destDraft, setDestDraft, submitDest }) {
  return (
    <div>
      <h3 style={{ fontFamily: TYPE.display, fontSize: 24, fontWeight: 400, margin: '0 0 16px',
        letterSpacing: '-0.01em' }}>
        Where to?
      </h3>
      <QuietInput value={destDraft} onChange={setDestDraft} placeholder="City, country, or a mood…"
        onSubmit={submitDest} />
      <div style={{ marginTop: 20, fontSize: 10, color: BRAND.inkMute, letterSpacing: '0.12em',
        textTransform: 'uppercase', fontWeight: 600 }}>
        Trending
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 10, marginTop: 10 }}>
        {LANDMARKS.slice(0, 8).map(lm => (
          <button key={lm.id} onClick={() => pickLandmark(lm)}
            style={{
              background: 'rgba(255,255,255,0.03)', border: `1px solid ${BRAND.border}`,
              borderRadius: 12, padding: '12px', textAlign: 'left', cursor: 'pointer',
              color: BRAND.ink, fontFamily: TYPE.ui,
            }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{lm.name}</div>
            <div style={{ fontSize: 11, color: BRAND.inkMute, marginTop: 2 }}>{lm.city}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepDates({ trip, update }) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return (
    <div>
      <h3 style={{ fontFamily: TYPE.display, fontSize: 24, fontWeight: 400, margin: '0 0 6px' }}>
        When?
      </h3>
      <div style={{ color: BRAND.inkDim, fontSize: 13, marginBottom: 20 }}>
        {trip.destination ? `For your trip to ${trip.destination}` : 'Pick a travel window — dates optional'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Depart" value={trip.startDate} onChange={v => update({ startDate: v })} type="date" />
        <Field label="Return" value={trip.endDate} onChange={v => update({ endDate: v })} type="date" />
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 10, color: BRAND.inkMute, letterSpacing: '0.12em',
          textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
          Flexible? Pick a month
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {months.map(m => <Chip key={m} small>{m}</Chip>)}
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 10, color: BRAND.inkMute, letterSpacing: '0.12em',
          textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
          Trip length · {trip.nights} nights
        </div>
        <input type="range" min="2" max="21" value={trip.nights}
          onChange={e => update({ nights: +e.target.value })}
          style={{ width: '100%', accentColor: BRAND.accent }} />
      </div>
    </div>
  );
}

function StepStyle({ trip, update }) {
  const styles = [
    { id: 'relaxed',   label: 'Relaxed',   desc: 'Slow mornings, long dinners' },
    { id: 'adventure', label: 'Adventure', desc: 'Hikes, surf, off-grid' },
    { id: 'culture',   label: 'Culture',   desc: 'Museums, history, walks' },
    { id: 'foodie',    label: 'Foodie',    desc: 'Chasing every market and kitchen' },
    { id: 'luxury',    label: 'Luxury',    desc: 'Spas, suites, first-class' },
    { id: 'budget',    label: 'Budget',    desc: 'Hostels, buses, street food' },
  ];
  const budgets = ['$', '$$', '$$$', '$$$$'];
  return (
    <div>
      <h3 style={{ fontFamily: TYPE.display, fontSize: 24, fontWeight: 400, margin: '0 0 20px' }}>
        What kind of trip?
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 10 }}>
        {styles.map(s => (
          <button key={s.id} onClick={() => update({ style: s.id })}
            style={{
              background: trip.style === s.id ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${trip.style === s.id ? BRAND.borderHi : BRAND.border}`,
              borderRadius: 14, padding: '14px', textAlign: 'left', cursor: 'pointer',
              color: BRAND.ink, fontFamily: TYPE.ui, transition: 'all 160ms',
            }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: BRAND.inkMute, marginTop: 3 }}>{s.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 10, color: BRAND.inkMute, letterSpacing: '0.12em',
          textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
          Budget per person
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {budgets.map(b => (
            <button key={b} onClick={() => update({ budget: b })}
              style={{
                flex: 1, padding: '10px 0',
                background: trip.budget === b ? 'rgba(167,139,250,0.16)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${trip.budget === b ? BRAND.borderHi : BRAND.border}`,
                borderRadius: 10, color: trip.budget === b ? BRAND.accent : BRAND.inkDim,
                fontFamily: TYPE.ui, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>{b}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepReview({ trip }) {
  return (
    <div>
      <h3 style={{ fontFamily: TYPE.display, fontSize: 24, fontWeight: 400, margin: '0 0 20px' }}>
        Here's your trip.
      </h3>
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: `1px solid ${BRAND.border}`,
        borderRadius: 16, padding: 20,
      }}>
        <Row k="Destination" v={trip.destination || '—'} />
        <Row k="Dates"       v={trip.startDate ? `${trip.startDate} → ${trip.endDate || '?'}` : `${trip.nights} flexible nights`} />
        <Row k="Style"       v={trip.style || '—'} />
        <Row k="Budget"      v={trip.budget || '—'} />
        <Row k="From"        v={trip.origin} />
      </div>
      <div style={{ marginTop: 16, padding: 16, borderRadius: 12,
        background: `linear-gradient(135deg, ${BRAND.accent}22, ${BRAND.accent2}11)`,
        border: `1px solid ${BRAND.borderHi}` }}>
        <div style={{ fontSize: 11, color: BRAND.accent, letterSpacing: '0.1em',
          textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
          ✦ Your genie says
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: BRAND.ink }}>
          Based on a {trip.style || 'relaxed'} trip to {trip.destination || 'somewhere new'}, I'll draft a {trip.nights}-night itinerary. Should take about 20 seconds.
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: `1px solid ${BRAND.border}`,
      fontFamily: TYPE.ui, fontSize: 13,
    }}>
      <span style={{ color: BRAND.inkMute }}>{k}</span>
      <span style={{ color: BRAND.ink, fontWeight: 500 }}>{v}</span>
    </div>
  );
}

const btnPrimary = {
  background: BRAND.accent, color: '#0a0a1f',
  border: 'none', padding: '10px 18px', borderRadius: 10,
  fontFamily: TYPE.ui, fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const btnGhost = {
  background: 'transparent', color: BRAND.inkDim,
  border: `1px solid ${BRAND.border}`, padding: '10px 16px', borderRadius: 10,
  fontFamily: TYPE.ui, fontSize: 13, fontWeight: 500, cursor: 'pointer',
};

// ── Nav pill + icons ─────────────────────────────────────────────
function NavPill({ children, accent, iconOnly, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: accent ? 'rgba(167,139,250,0.14)' : 'rgba(18,18,40,0.55)',
      border: `1px solid ${accent ? BRAND.borderHi : BRAND.border}`,
      backdropFilter: 'blur(10px)',
      color: accent ? BRAND.accent : BRAND.ink,
      padding: iconOnly ? '8px 10px' : '8px 14px',
      borderRadius: 12,
      fontFamily: TYPE.ui, fontSize: 13, fontWeight: 500,
      cursor: 'pointer', whiteSpace: 'nowrap',
      transition: 'all 150ms',
    }}>{children}</button>
  );
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M1.5 8h13M8 1.5c2 2 2 11 0 13M8 1.5c-2 2-2 11 0 13" />
    </svg>
  );
}
function ColIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M3 6V14M13 6V14M3 6h10M2 6l6-4 6 4M5.5 14h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5z" opacity="0.95"/>
    </svg>
  );
}
function TripsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M5 8a2 2 0 104 0 2 2 0 00-4 0zM11.5 10a1.5 1.5 0 10.01-3M1.5 13c.5-2 2.5-3 5.5-3s5 1 5.5 3" strokeLinecap="round" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
    </svg>
  );
}

// ── Genie corner chat ─────────────────────────────────────────────
function GenieCorner({ trip, step, steps, open, setOpen, bottomOffset, compact }) {
  const [messages, setMessages] = useState([
    { role: 'genie', text: "Hey — I'm here if you want a nudge. Ask about pricing, seasons, itineraries, anything." },
  ]);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' });
  }, [messages, open]);

  const send = () => {
    if (!draft.trim()) return;
    const text = draft.trim();
    setMessages(m => [...m, { role: 'user', text }]);
    setDraft('');
    // fake streamed reply
    setTimeout(() => {
      const context = trip.destination
        ? `For ${trip.destination}${trip.style ? ` (${trip.style})` : ''}: `
        : '';
      const replies = [
        `${context}Good question. Based on what you've told me, I'd lean toward shoulder season — fewer crowds, better prices.`,
        `${context}Roughly $${trip.budget === '$' ? 90 : trip.budget === '$$' ? 180 : trip.budget === '$$$' ? 350 : 650}/day covers lodging, food, and a couple of experiences. I can tighten that if you share more.`,
        `${context}I'd budget 2–3 days for the signature spots and leave the rest unstructured. That's usually where the best memories happen.`,
      ];
      setMessages(m => [...m, { role: 'genie', text: replies[Math.floor(Math.random() * replies.length)] }]);
    }, 550);
  };

  const suggestions = step === 0
    ? ['Warm, under $2k', 'Somewhere I can hike', 'Best food in Asia']
    : step === 1
      ? ['When is shoulder season?', 'Cheapest month to fly']
      : step === 2
        ? ['Is adventure too much for a first trip?', 'Explain each style']
        : ['Summarize my trip', 'Estimate total cost'];

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'absolute',
          right: compact ? 14 : 24,
          bottom: bottomOffset + (compact ? 12 : 16),
          width: compact ? 44 : 52, height: compact ? 44 : 52, borderRadius: 14,
          background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.accent2})`,
          color: '#0a0a1f',
          border: `1px solid ${BRAND.borderHi}`,
          cursor: 'pointer',
          display: 'grid', placeItems: 'center',
          fontFamily: TYPE.display, fontSize: 20, fontWeight: 600,
          boxShadow: '0 10px 30px rgba(167,139,250,0.25)',
          zIndex: 30,
          transition: 'transform 150ms, box-shadow 150ms',
          transform: open ? 'scale(0.94)' : 'scale(1)',
        }}
        title="Ask your assistant"
      >✦</button>

      {/* Popover panel */}
      {open && (
        <div style={{
          position: 'absolute',
          right: compact ? 14 : 24,
          bottom: bottomOffset + (compact ? 66 : 82),
          width: compact ? 300 : 360,
          maxHeight: compact ? 420 : 480,
          background: 'rgba(13,13,36,0.96)',
          backdropFilter: 'blur(18px)',
          border: `1px solid ${BRAND.borderHi}`,
          borderRadius: 18,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          zIndex: 30,
          display: 'flex', flexDirection: 'column',
          animation: 'fadeUp 220ms cubic-bezier(0.23,1,0.32,1)',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: `1px solid ${BRAND.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 26, height: 26, borderRadius: 8,
                background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.accent2})`,
                color: '#0a0a1f', display: 'grid', placeItems: 'center',
                fontFamily: TYPE.display, fontWeight: 600, fontSize: 13,
              }}>✦</span>
              <div>
                <div style={{ fontFamily: TYPE.display, fontSize: 15, fontWeight: 500 }}>Assistant</div>
                <div style={{ fontSize: 10, color: BRAND.inkMute, letterSpacing: '0.1em' }}>
                  <span style={{ color: '#34d399' }}>●</span> ONLINE · {steps[step]}
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'none', border: 'none', color: BRAND.inkMute,
              fontSize: 20, cursor: 'pointer', padding: 4, lineHeight: 1,
            }}>×</button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{
            flex: 1, overflowY: 'auto',
            padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'genie' ? 'flex-start' : 'flex-end',
                maxWidth: '85%',
                padding: '10px 12px',
                borderRadius: m.role === 'genie' ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                background: m.role === 'genie' ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${m.role === 'genie' ? BRAND.borderHi : BRAND.border}`,
                color: BRAND.ink, fontSize: 13, lineHeight: 1.5,
                animation: 'fadeUp 200ms ease both',
              }}>{m.text}</div>
            ))}
          </div>

          {/* Suggestion chips */}
          <div style={{
            padding: '0 16px 10px', display: 'flex', gap: 6, flexWrap: 'wrap',
          }}>
            {suggestions.map(s => (
              <button key={s}
                onClick={() => { setDraft(s); setTimeout(send, 50); }}
                style={{
                  fontFamily: TYPE.ui, fontSize: 11,
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${BRAND.border}`,
                  color: BRAND.inkDim, padding: '5px 10px', borderRadius: 999,
                  cursor: 'pointer',
                }}>{s}</button>
            ))}
          </div>

          {/* Input */}
          <div style={{
            padding: 10, borderTop: `1px solid ${BRAND.border}`,
            display: 'flex', gap: 8,
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '0 0 18px 18px',
          }}>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send(); }}
              placeholder="Ask anything…"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${BRAND.border}`, borderRadius: 10,
                padding: '8px 12px', color: BRAND.ink,
                fontFamily: TYPE.ui, fontSize: 13, outline: 'none',
              }}
            />
            <button onClick={send} disabled={!draft.trim()} style={{
              background: draft.trim() ? BRAND.accent : 'rgba(255,255,255,0.05)',
              color: draft.trim() ? '#0a0a1f' : BRAND.inkMute,
              border: 'none', padding: '8px 14px', borderRadius: 10,
              fontFamily: TYPE.ui, fontSize: 12, fontWeight: 600,
              cursor: draft.trim() ? 'pointer' : 'not-allowed',
            }}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}

window.AtlasPlanner = AtlasPlanner;
