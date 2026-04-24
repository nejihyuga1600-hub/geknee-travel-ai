// Variant C — "Conversation": the Genie drives, globe is a quiet backdrop, cards appear inline
// (React hooks via globe.jsx)
function ConversationPlanner({ compact = false }) {
  const [trip, updateTrip] = useTripState(DEFAULT_TRIP);
  const [target, setTarget] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'genie', content: "Hi. I'm your travel assistant. Tell me where you're dreaming of — a city, a country, or just a feeling. I'll take it from there." },
  ]);
  const [draft, setDraft] = useState('');
  const [phase, setPhase] = useState('destination'); // destination → dates → style → budget → done
  const endRef = useRef();

  useEffect(() => {
    endRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' });
  }, [messages, phase]);

  const say = (role, content, card) => {
    setMessages(m => [...m, { role, content, card }]);
  };

  const submitInput = () => {
    if (!draft.trim()) return;
    const text = draft.trim();
    setDraft('');
    say('user', text);

    if (phase === 'destination') {
      const match = LANDMARKS.find(l =>
        l.name.toLowerCase().includes(text.toLowerCase()) ||
        l.city.toLowerCase().includes(text.toLowerCase())
      ) || LANDMARKS[Math.floor(Math.random() * LANDMARKS.length)];
      updateTrip({ destination: match.name, lat: match.lat, lon: match.lon });
      setTarget({ lat: match.lat, lon: match.lon });
      setTimeout(() => {
        say('genie', `${match.name} — beautiful choice. When are you thinking of going?`, 'dates');
        setPhase('dates');
      }, 500);
    } else {
      setTimeout(() => say('genie', "Got it."), 300);
    }
  };

  const pickLandmark = (lm) => {
    updateTrip({ destination: lm.name, lat: lm.lat, lon: lm.lon });
    setTarget({ lat: lm.lat, lon: lm.lon });
    say('user', lm.name);
    setTimeout(() => {
      say('genie', `${lm.name}. Nice. When are you thinking?`, 'dates');
      setPhase('dates');
    }, 450);
  };

  const completeCard = (kind, summary) => {
    say('user', summary);
    if (kind === 'dates')  { setTimeout(() => { say('genie', "What kind of trip is this? Relaxed, adventure, foodie…?", 'style'); setPhase('style'); }, 350); }
    if (kind === 'style')  { setTimeout(() => { say('genie', "And budget per person?", 'budget'); setPhase('budget'); }, 350); }
    if (kind === 'budget') { setTimeout(() => { say('genie', "Perfect. I have everything I need. Ready to build your itinerary?", 'review'); setPhase('done'); }, 350); }
  };

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: BRAND.bg, overflow: 'hidden',
      fontFamily: TYPE.ui, color: BRAND.ink,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Ambient globe behind everything */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'grid', placeItems: 'center',
        pointerEvents: 'none',
        filter: 'blur(0.5px)',
        opacity: 0.55,
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <Globe size={compact ? 380 : 700} accent={BRAND.accent} target={target}
            onLandmarkClick={pickLandmark} dense quiet idleSpin={!target} showLandmarks={false} />
        </div>
      </div>
      <StarBg density={compact ? 40 : 80} />

      {/* Top bar */}
      <div style={{
        position: 'relative', zIndex: 10,
        padding: compact ? '14px 18px' : '20px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.accent2})`,
            display: 'grid', placeItems: 'center',
            fontFamily: TYPE.display, fontWeight: 700, fontSize: 14, color: '#0a0a1f',
          }}>g</div>
          <div style={{ fontFamily: TYPE.display, fontSize: compact ? 17 : 20, fontWeight: 500 }}>geknee</div>
        </div>
        {trip.destination && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(10,10,31,0.72)', backdropFilter: 'blur(10px)',
            border: `1px solid ${BRAND.border}`, borderRadius: 999,
            padding: '6px 14px', fontSize: 12,
          }}>
            <span style={{ color: BRAND.accent }}>◉</span>
            <span>{trip.destination}</span>
            {trip.nights && <span style={{ color: BRAND.inkMute }}>· {trip.nights}n</span>}
            {trip.style  && <span style={{ color: BRAND.inkMute }}>· {trip.style}</span>}
            {trip.budget && <span style={{ color: BRAND.inkMute }}>· {trip.budget}</span>}
          </div>
        )}
      </div>

      {/* Conversation column */}
      <div ref={endRef} style={{
        flex: 1, overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        padding: compact ? '10px 14px 20px' : '20px 28px 40px',
        position: 'relative', zIndex: 5,
      }}>
        <div style={{ width: '100%', maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role} content={m.content} />
          ))}
          {/* Phase card */}
          {phase === 'dates' && (
            <InlineCard title="When are you going?">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Depart" value={trip.startDate} onChange={v => updateTrip({ startDate: v })} type="date" />
                <Field label="Return" value={trip.endDate} onChange={v => updateTrip({ endDate: v })} type="date" />
              </div>
              <div style={{ marginTop: 14, fontSize: 10, color: BRAND.inkMute, letterSpacing: '0.12em',
                textTransform: 'uppercase', fontWeight: 600 }}>Or stay flexible — {trip.nights} nights</div>
              <input type="range" min="2" max="21" value={trip.nights}
                onChange={e => updateTrip({ nights: +e.target.value })}
                style={{ width: '100%', accentColor: BRAND.accent, marginTop: 4 }} />
              <button
                onClick={() => completeCard('dates', trip.startDate ? `${trip.startDate} → ${trip.endDate}` : `${trip.nights} flexible nights`)}
                style={{
                  marginTop: 12, background: BRAND.accent, color: '#0a0a1f', border: 'none',
                  padding: '10px 16px', borderRadius: 10, fontFamily: TYPE.ui, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                }}>Next →</button>
            </InlineCard>
          )}
          {phase === 'style' && (
            <InlineCard title="What kind of trip?">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['relaxed','adventure','culture','foodie','luxury','budget'].map(s => (
                  <Chip key={s} active={trip.style === s} onClick={() => updateTrip({ style: s })}>
                    {s}
                  </Chip>
                ))}
              </div>
              {trip.style && (
                <button
                  onClick={() => completeCard('style', trip.style)}
                  style={{
                    marginTop: 12, background: BRAND.accent, color: '#0a0a1f', border: 'none',
                    padding: '10px 16px', borderRadius: 10, fontFamily: TYPE.ui, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                  }}>Next →</button>
              )}
            </InlineCard>
          )}
          {phase === 'budget' && (
            <InlineCard title="Budget per person?">
              <div style={{ display: 'flex', gap: 8 }}>
                {['$','$$','$$$','$$$$'].map(b => (
                  <button key={b} onClick={() => updateTrip({ budget: b })}
                    style={{
                      flex: 1, padding: '14px 0',
                      background: trip.budget === b ? 'rgba(167,139,250,0.16)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${trip.budget === b ? BRAND.borderHi : BRAND.border}`,
                      borderRadius: 10, color: trip.budget === b ? BRAND.accent : BRAND.inkDim,
                      fontFamily: TYPE.ui, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                    }}>{b}</button>
                ))}
              </div>
              {trip.budget && (
                <button
                  onClick={() => completeCard('budget', trip.budget)}
                  style={{
                    marginTop: 12, background: BRAND.accent, color: '#0a0a1f', border: 'none',
                    padding: '10px 16px', borderRadius: 10, fontFamily: TYPE.ui, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                  }}>Next →</button>
              )}
            </InlineCard>
          )}
          {phase === 'done' && (
            <InlineCard title="Your trip" accent>
              <Row k="Destination" v={trip.destination} />
              <Row k="Dates" v={trip.startDate ? `${trip.startDate} → ${trip.endDate || '?'}` : `${trip.nights} flexible nights`} />
              <Row k="Style" v={trip.style} />
              <Row k="Budget" v={trip.budget} />
              <button style={{
                marginTop: 14, width: '100%', background: BRAND.accent, color: '#0a0a1f', border: 'none',
                padding: '12px', borderRadius: 10, fontFamily: TYPE.ui, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>Build itinerary ✦</button>
            </InlineCard>
          )}

          {/* Suggestion chips while destination phase */}
          {phase === 'destination' && messages.length < 3 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {LANDMARKS.slice(0, 6).map(lm => (
                <Chip key={lm.id} small onClick={() => pickLandmark(lm)}>{lm.name}</Chip>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      <div style={{
        position: 'relative', zIndex: 10,
        padding: compact ? '10px 14px 14px' : '16px 28px 22px',
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: 620,
          display: 'flex', gap: 8, alignItems: 'center',
          background: 'rgba(10,10,31,0.85)', backdropFilter: 'blur(14px)',
          border: `1px solid ${BRAND.border}`, borderRadius: 14,
          padding: '6px 6px 6px 16px',
        }}>
          <input
            value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitInput(); }}
            placeholder={
              phase === 'destination' ? 'Try "warm islands under $2k", "Japan in spring"…' :
              phase === 'done' ? 'Ask me anything about your trip' :
              'Tell me more…'
            }
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: BRAND.ink, fontFamily: TYPE.ui, fontSize: 14, padding: '10px 0',
            }}
          />
          <button
            onClick={submitInput}
            disabled={!draft.trim()}
            style={{
              background: draft.trim() ? BRAND.accent : 'rgba(255,255,255,0.06)',
              color: draft.trim() ? '#0a0a1f' : BRAND.inkMute,
              border: 'none', padding: '10px 16px', borderRadius: 10,
              fontFamily: TYPE.ui, fontSize: 13, fontWeight: 600,
              cursor: draft.trim() ? 'pointer' : 'not-allowed',
            }}>Send</button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ role, content }) {
  const isGenie = role === 'genie';
  return (
    <div style={{
      alignSelf: isGenie ? 'flex-start' : 'flex-end',
      maxWidth: '85%',
    }}>
      {isGenie && (
        <div style={{
          fontSize: 10, color: BRAND.accent, letterSpacing: '0.14em',
          textTransform: 'uppercase', fontWeight: 600, marginBottom: 4, paddingLeft: 2,
        }}>
          ✦ Assistant
        </div>
      )}
      <div style={{
        background: isGenie ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${isGenie ? BRAND.borderHi : BRAND.border}`,
        borderRadius: isGenie ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
        padding: '12px 16px',
        color: BRAND.ink, fontSize: 14, lineHeight: 1.55,
        fontFamily: isGenie ? TYPE.display : TYPE.ui,
        fontWeight: isGenie ? 400 : 500,
        fontStyle: isGenie ? 'normal' : 'normal',
      }}>{content}</div>
    </div>
  );
}

function InlineCard({ title, children, accent }) {
  return (
    <div style={{
      background: accent
        ? `linear-gradient(135deg, ${BRAND.accent}1a, ${BRAND.accent2}11)`
        : 'rgba(255,255,255,0.04)',
      border: `1px solid ${accent ? BRAND.borderHi : BRAND.border}`,
      borderRadius: 16, padding: 18,
    }}>
      <div style={{ fontFamily: TYPE.display, fontSize: 18, fontWeight: 400, marginBottom: 14,
        letterSpacing: '-0.01em' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

window.ConversationPlanner = ConversationPlanner;
