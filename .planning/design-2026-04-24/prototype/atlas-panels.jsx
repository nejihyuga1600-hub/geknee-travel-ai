// Atlas panel states — Collection, Trips & Friends, Go Pro, Summary, City, Settings
// Based on the repo's MonumentShop, TripSocialPanel, UpgradeModal, SettingsPanel,
// and CityMapView components.

function AtlasWithPanel({ panel, compact = false }) {
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: `radial-gradient(ellipse at 50% 40%, ${BRAND.bg2}, ${BRAND.bg} 70%)`,
      overflow: 'hidden', fontFamily: TYPE.ui, color: BRAND.ink,
    }}>
      <StarBg density={compact ? 50 : 120} />

      {/* Faded globe backdrop (hidden for city + summary since they have their own bg) */}
      {panel !== 'city' && panel !== 'summary' && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -55%)', opacity: 0.35, filter: 'blur(2px)',
        }}>
          <Globe size={compact ? 260 : 520} accent={BRAND.accent} quiet idleSpin={false} />
        </div>
      )}

      {/* Top nav (dimmed) */}
      {panel !== 'city' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: compact ? '12px 14px' : '18px 24px', opacity: 0.5, pointerEvents: 'none',
        }}>
          <NavPill><GlobeIcon /> {!compact && <span style={{ fontWeight: 600, letterSpacing: '0.04em' }}>HOME</span>}</NavPill>
          <div style={{ display: 'flex', gap: 8 }}>
            {!compact && <><NavPill><ColIcon /> Collection</NavPill>
            <NavPill accent><SparkleIcon /> Go Pro</NavPill>
            <NavPill><TripsIcon /> Trips &amp; Friends</NavPill></>}
            <div style={{ width: 34, height: 34, borderRadius: '50%',
              background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.accent2})`,
              color: '#0a0a1f', display: 'grid', placeItems: 'center',
              fontFamily: TYPE.display, fontWeight: 700, fontSize: 14 }}>N</div>
          </div>
        </div>
      )}

      {panel === 'collection' && <CollectionPanel compact={compact} />}
      {panel === 'trips'      && <TripsFriendsPanel compact={compact} />}
      {panel === 'upgrade'    && <UpgradePanel compact={compact} />}
      {panel === 'summary'    && <SummaryPanel compact={compact} />}
      {panel === 'city'       && <CityPanel compact={compact} />}
      {panel === 'settings'   && <SettingsPanelMock compact={compact} />}
    </div>
  );
}

// ─── Collection (MonumentShop — 6-tier rarity) ────────────────────────────
// Mirrors the real rarity ladder: common · uncommon · rare · epic · legendary · mythic
const RARITY = {
  common:    { ring: 'rgba(148,163,208,0.30)', label: '#9ca3af', swatch: '#9ca3af' },
  uncommon:  { ring: 'rgba(52,211,153,0.55)',  label: '#34d399', swatch: '#34d399' },
  rare:      { ring: 'rgba(125,211,252,0.60)', label: '#7dd3fc', swatch: '#7dd3fc' },
  epic:      { ring: 'rgba(167,139,250,0.60)', label: '#a78bfa', swatch: '#a78bfa' },
  legendary: { ring: 'rgba(251,191,36,0.65)',  label: '#fbbf24', swatch: '#fbbf24' },
  mythic:    { ring: 'rgba(244,114,182,0.65)', label: '#f472b6', swatch: '#f472b6' },
};

// Each monument has 3 missions → each awards a specific skin. Owned skin = the
// one you've earned. (Mirrors MonumentShop.tsx from the repo.)
const MONUMENTS = [
  { id: 'eiffel',  name: 'Eiffel Tower',        city: 'Paris',         glyph: '◈',
    rarity: 'rare',     ownedSkin: 'gold',     skinsEarned: 2, skinsTotal: 3, fact: 'Iron grows 15 cm taller on hot days.' },
  { id: 'colos',   name: 'Colosseum',           city: 'Rome',          glyph: '◉',
    rarity: 'legendary', ownedSkin: 'bronze',   skinsEarned: 1, skinsTotal: 3, fact: '80 arches, 50,000 seats, minutes to empty.' },
  { id: 'taj',     name: 'Taj Mahal',           city: 'Agra',          glyph: '◊',
    rarity: 'legendary', ownedSkin: null,       skinsEarned: 0, skinsTotal: 3 },
  { id: 'wall',    name: 'Great Wall',          city: 'Beijing',       glyph: '⬢',
    rarity: 'legendary', ownedSkin: null,       skinsEarned: 0, skinsTotal: 3 },
  { id: 'lib',     name: 'Statue of Liberty',   city: 'New York',      glyph: '▲',
    rarity: 'rare',     ownedSkin: 'silver',   skinsEarned: 1, skinsTotal: 3, fact: 'Index finger is 2.4 m long.' },
  { id: 'sagrada', name: 'Sagrada Família',     city: 'Barcelona',     glyph: '✦',
    rarity: 'rare',     ownedSkin: null,       skinsEarned: 0, skinsTotal: 3 },
  { id: 'machu',   name: 'Machu Picchu',        city: 'Cusco',         glyph: '◬',
    rarity: 'legendary', ownedSkin: null,       skinsEarned: 0, skinsTotal: 3 },
  { id: 'cristo',  name: 'Christ the Redeemer', city: 'Rio',           glyph: '✧',
    rarity: 'rare',     ownedSkin: null,       skinsEarned: 0, skinsTotal: 3 },
  { id: 'opera',   name: 'Sydney Opera',        city: 'Sydney',        glyph: '◈',
    rarity: 'rare',     ownedSkin: 'silver',   skinsEarned: 1, skinsTotal: 3, fact: '1,056,000 self-cleaning Swedish tiles.' },
  { id: 'petra',   name: 'Petra',               city: 'Jordan',        glyph: '◇',
    rarity: 'epic',     ownedSkin: null,       skinsEarned: 0, skinsTotal: 3 },
  { id: 'angkor',  name: 'Angkor Wat',          city: 'Siem Reap',     glyph: '◉',
    rarity: 'legendary', ownedSkin: null,       skinsEarned: 0, skinsTotal: 3 },
  { id: 'stone',   name: 'Stonehenge',          city: 'Wiltshire',     glyph: '◼',
    rarity: 'common',   ownedSkin: 'stone',    skinsEarned: 1, skinsTotal: 3, fact: 'Stones travelled 250 km from Wales.' },
  { id: 'golden',  name: 'Golden Gate Bridge',  city: 'San Francisco', glyph: '╫',
    rarity: 'common',   ownedSkin: 'bronze',   skinsEarned: 1, skinsTotal: 3, fact: '80,000 mi of suspension cable wire.' },
  { id: 'bigben',  name: 'Big Ben',             city: 'London',        glyph: '⏲',
    rarity: 'common',   ownedSkin: null,       skinsEarned: 0, skinsTotal: 3 },
  { id: 'acro',    name: 'Acropolis',           city: 'Athens',        glyph: '⏛',
    rarity: 'rare',     ownedSkin: null,       skinsEarned: 0, skinsTotal: 3 },
  { id: 'pyr',     name: 'Pyramids of Giza',    city: 'Cairo',         glyph: '▲',
    rarity: 'legendary', ownedSkin: null,       skinsEarned: 0, skinsTotal: 3 },
];

// Exemplar skin palette (maps to the GLB rarity tiers on Vercel Blob)
const SKIN = {
  stone:   { name: 'Stone',   color: '#9ca3af', rarity: 'common' },
  bronze:  { name: 'Bronze',  color: '#cd7f32', rarity: 'common' },
  silver:  { name: 'Silver',  color: '#c0c0c0', rarity: 'uncommon' },
  gold:    { name: 'Gold',    color: '#f59e0b', rarity: 'rare' },
  diamond: { name: 'Diamond', color: '#67e8f9', rarity: 'epic' },
  aurora:  { name: 'Aurora',  color: '#34d399', rarity: 'legendary' },
  celestial:{name: 'Celestial',color:'#818cf8', rarity: 'mythic' },
};

function CollectionPanel({ compact }) {
  const [tab, setTab] = useState('unlocked');
  const unlocked = MONUMENTS.filter(m => m.ownedSkin);
  const filtered = tab === 'unlocked' ? unlocked : MONUMENTS;
  const skinsEarnedTotal = MONUMENTS.reduce((n, m) => n + m.skinsEarned, 0);
  const skinsTotal = MONUMENTS.reduce((n, m) => n + m.skinsTotal, 0);

  return (
    <div style={{
      position: 'absolute', top: compact ? 66 : 80, left: compact ? 12 : '8%', right: compact ? 12 : '8%',
      bottom: compact ? 12 : 40, zIndex: 30,
      background: 'rgba(12,12,30,0.92)', backdropFilter: 'blur(20px)',
      border: `1px solid ${BRAND.borderHi}`, borderRadius: 20,
      boxShadow: '0 40px 120px rgba(0,0,0,0.6)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      animation: 'fadeUp 280ms cubic-bezier(0.23,1,0.32,1)',
    }}>
      {/* Header */}
      <div style={{ padding: compact ? '14px 16px' : '22px 28px', borderBottom: `1px solid ${BRAND.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, color: BRAND.accent, letterSpacing: '0.16em', fontWeight: 600, marginBottom: 4 }}>
              ◈ YOUR COLLECTION
            </div>
            <div style={{ fontFamily: TYPE.display, fontSize: compact ? 22 : 30, fontWeight: 400, letterSpacing: '-0.02em' }}>
              Monuments, <em style={{ color: BRAND.accent }}>earned</em>.
            </div>
            <div style={{ color: BRAND.inkDim, fontSize: compact ? 12 : 13, marginTop: 4 }}>
              {unlocked.length} of {MONUMENTS.length} unlocked · {skinsEarnedTotal} of {skinsTotal} skins
            </div>
          </div>
          <button style={{ background: 'none', border: 'none', color: BRAND.inkMute,
            fontSize: 24, cursor: 'pointer', padding: 4, lineHeight: 1 }}>×</button>
        </div>

        {/* XP bar */}
        <div style={{ marginTop: compact ? 14 : 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: BRAND.inkMute, marginBottom: 6 }}>
            <span>LEVEL 4 · WANDERER</span>
            <span>620 / 1000 XP</span>
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: '62%', height: '100%',
              background: `linear-gradient(90deg, ${BRAND.accent}, ${BRAND.accent2})` }} />
          </div>
        </div>

        {/* Rarity legend — 6 tiers */}
        {!compact && (
          <div style={{ marginTop: 14, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {Object.entries(RARITY).map(([k, r]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: r.label, fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: r.swatch }} />
                {k}
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: compact ? 12 : 16 }}>
          {['unlocked', 'all'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? 'rgba(167,139,250,0.15)' : 'transparent',
              color: tab === t ? BRAND.accent : BRAND.inkDim,
              border: `1px solid ${tab === t ? BRAND.borderHi : 'transparent'}`,
              padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
              fontFamily: TYPE.ui, fontSize: 12, fontWeight: 500,
              textTransform: 'capitalize',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: compact ? 14 : 22 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: compact ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: compact ? 10 : 14,
        }}>
          {filtered.map(m => <MonumentCard key={m.id} m={m} compact={compact} />)}
        </div>
      </div>
    </div>
  );
}

function MonumentCard({ m, compact }) {
  const r = RARITY[m.rarity];
  const owned = !!m.ownedSkin;
  const skin = owned ? SKIN[m.ownedSkin] : null;

  return (
    <div style={{
      position: 'relative',
      background: owned
        ? `linear-gradient(165deg, ${skin.color}18, rgba(255,255,255,0.03))`
        : 'rgba(255,255,255,0.02)',
      border: `1px solid ${owned ? r.ring : BRAND.border}`,
      borderRadius: 14, padding: compact ? 12 : 16,
      opacity: owned ? 1 : 0.55,
      transition: 'transform 150ms',
      cursor: 'pointer',
    }}>
      <div style={{
        width: compact ? 48 : 64, height: compact ? 48 : 64,
        borderRadius: 10,
        background: owned ? `radial-gradient(circle, ${skin.color}33, transparent)` : 'rgba(255,255,255,0.04)',
        display: 'grid', placeItems: 'center', marginBottom: 10,
        fontSize: compact ? 22 : 28, color: owned ? skin.color : BRAND.inkMute,
        fontFamily: TYPE.display,
      }}>
        {owned ? m.glyph : '◌'}
      </div>
      <div style={{ fontSize: compact ? 13 : 14, fontWeight: 500, color: owned ? BRAND.ink : BRAND.inkDim,
        fontFamily: TYPE.display, letterSpacing: '-0.01em', marginBottom: 2 }}>
        {owned ? m.name : '???'}
      </div>
      <div style={{ fontSize: 10, color: BRAND.inkMute, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {m.city}
      </div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: r.label }}>
          {m.rarity}
        </div>
        <div style={{ fontSize: 10, color: BRAND.inkMute, fontFamily: TYPE.mono }}>
          {m.skinsEarned}/{m.skinsTotal}
        </div>
      </div>
      {!owned && (
        <div style={{ position: 'absolute', top: 8, right: 8,
          fontSize: 9, color: BRAND.inkMute, letterSpacing: '0.1em' }}>
          ⌕ VISIT TO UNLOCK
        </div>
      )}
    </div>
  );
}

// ─── Trips & Friends ──────────────────────────────────────────────────────
const SAVED_TRIPS = [
  { title: 'Kyoto autumn',       loc: 'Kyoto, Japan',       dates: 'Oct 12–22', nights: 10, active: true },
  { title: 'Iceland ring road',  loc: 'Reykjavík',          dates: 'Jun 1–14',  nights: 13 },
  { title: 'Bali honeymoon',     loc: 'Ubud, Bali',         dates: 'Draft',     nights: 7 },
  { title: 'Patagonia trek',     loc: 'Torres del Paine',   dates: 'Mar 2027',  nights: 18 },
];
const FRIENDS = [
  { name: 'Maya Chen',    un: 'mayac',  online: true,  last: 'shared Kyoto autumn' },
  { name: 'Tomas Rivera', un: 'tomasr', online: true,  last: 'typing…' },
  { name: 'Priya Ram',    un: 'priya',  online: false, last: '2h ago' },
  { name: 'Jon Doh',      un: 'jon',    online: false, last: 'yesterday' },
];

function TripsFriendsPanel({ compact }) {
  const [tab, setTab] = useState('trips');
  return (
    <div style={{
      position: 'absolute', top: compact ? 66 : 80, right: compact ? 12 : 40,
      bottom: compact ? 12 : 40, width: compact ? 'calc(100% - 24px)' : 460,
      zIndex: 30,
      background: 'rgba(12,12,30,0.94)', backdropFilter: 'blur(20px)',
      border: `1px solid ${BRAND.borderHi}`, borderRadius: 20,
      boxShadow: '0 40px 120px rgba(0,0,0,0.6)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      animation: 'fadeUp 260ms cubic-bezier(0.23,1,0.32,1)',
    }}>
      <div style={{ padding: '18px 22px', borderBottom: `1px solid ${BRAND.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: TYPE.display, fontSize: 22, fontWeight: 400, letterSpacing: '-0.01em' }}>
            Trips &amp; Friends
          </div>
          <div style={{ fontSize: 11, color: BRAND.inkMute, letterSpacing: '0.08em', marginTop: 2 }}>
            @nghiap · 4 trips · 4 friends
          </div>
        </div>
        <button style={{ background: 'none', border: 'none', color: BRAND.inkMute,
          fontSize: 22, cursor: 'pointer' }}>×</button>
      </div>
      <div style={{ display: 'flex', borderBottom: `1px solid ${BRAND.border}` }}>
        {['trips', 'friends'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '12px 0',
            background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === t ? BRAND.accent : 'transparent'}`,
            color: tab === t ? BRAND.ink : BRAND.inkMute,
            fontFamily: TYPE.ui, fontSize: 13, fontWeight: 500,
            cursor: 'pointer', textTransform: 'capitalize',
          }}>{t}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
        {tab === 'trips' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SAVED_TRIPS.map((t, i) => <TripRow key={i} t={t} />)}
            <button style={{ marginTop: 6, padding: '12px', background: 'transparent',
              border: `1px dashed ${BRAND.border}`, borderRadius: 12,
              color: BRAND.inkDim, fontSize: 12, fontFamily: TYPE.ui, cursor: 'pointer' }}>
              + Save current trip
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 10, color: BRAND.inkMute, letterSpacing: '0.12em',
              marginBottom: 8, fontWeight: 600 }}>● ONLINE</div>
            {FRIENDS.filter(f => f.online).map(f => <FriendRow key={f.un} f={f} />)}
            <div style={{ fontSize: 10, color: BRAND.inkMute, letterSpacing: '0.12em',
              margin: '14px 0 8px', fontWeight: 600 }}>○ OFFLINE</div>
            {FRIENDS.filter(f => !f.online).map(f => <FriendRow key={f.un} f={f} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function TripRow({ t }) {
  return (
    <div style={{
      padding: '12px 14px',
      background: t.active ? `linear-gradient(135deg, ${BRAND.accent}14, transparent)` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${t.active ? BRAND.borderHi : BRAND.border}`,
      borderRadius: 12, cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <div style={{ fontFamily: TYPE.display, fontSize: 15, fontWeight: 500 }}>{t.title}</div>
        {t.active && <span style={{ fontSize: 9, color: BRAND.accent, letterSpacing: '0.14em', fontWeight: 600 }}>● ACTIVE</span>}
      </div>
      <div style={{ fontSize: 12, color: BRAND.inkDim }}>{t.loc}</div>
      <div style={{ fontSize: 11, color: BRAND.inkMute, marginTop: 2 }}>
        {t.dates} {t.nights && `· ${t.nights} nights`}
      </div>
    </div>
  );
}

function FriendRow({ f }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 6px', borderRadius: 10, cursor: 'pointer' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%',
          background: `linear-gradient(135deg, ${BRAND.accent}55, ${BRAND.accent2}55)`,
          color: BRAND.ink, display: 'grid', placeItems: 'center',
          fontSize: 13, fontWeight: 600 }}>{f.name.split(' ').map(w => w[0]).join('')}</div>
        <div style={{ position: 'absolute', bottom: 0, right: 0,
          width: 10, height: 10, borderRadius: '50%',
          background: f.online ? '#34d399' : '#4b5563', border: '2px solid #0c0c1e' }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: BRAND.ink, fontWeight: 500 }}>{f.name}</div>
        <div style={{ fontSize: 11, color: BRAND.inkMute }}>@{f.un} · {f.last}</div>
      </div>
    </div>
  );
}

// ─── Go Pro ────────────────────────────────────────────────────────────────
function UpgradePanel({ compact }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 30,
      display: 'grid', placeItems: 'center',
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)',
      animation: 'fadeUp 240ms cubic-bezier(0.23,1,0.32,1)',
    }}>
      <div style={{
        width: compact ? '92%' : 440,
        maxHeight: compact ? '92%' : 'auto',
        background: `linear-gradient(135deg, #0f0f2a, #1a1240)`,
        border: `1px solid ${BRAND.borderHi}`, borderRadius: 24,
        padding: compact ? '26px 22px' : '36px 32px',
        boxShadow: '0 40px 120px rgba(0,0,0,0.7)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 220, height: 220,
          borderRadius: '50%', background: `radial-gradient(circle, ${BRAND.accent}44, transparent 70%)`,
          pointerEvents: 'none',
        }} />
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16,
            background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.accent2})`,
            margin: '0 auto 16px', display: 'grid', placeItems: 'center',
            fontFamily: TYPE.display, fontSize: 28, color: '#0a0a1f' }}>✦</div>
          <div style={{ fontFamily: TYPE.display, fontSize: compact ? 26 : 32, fontWeight: 400,
            letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 8 }}>
            GeKnee <em style={{ color: BRAND.accent }}>Pro</em>
          </div>
          <div style={{ color: BRAND.inkDim, fontSize: 13, marginBottom: 20 }}>
            Unlimited trips. All AI styles. Priority support.
          </div>

          {/* Real usage bar — shows free-tier cap (3/5 of monthly generations) */}
          <div style={{ textAlign: 'left', padding: '12px 14px', marginBottom: 16,
            background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: `1px solid ${BRAND.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: BRAND.inkMute, marginBottom: 6 }}>
              <span style={{ letterSpacing: '0.1em' }}>YOUR USAGE · APRIL</span>
              <span>3 / 5 trips</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: '60%', height: '100%', background: BRAND.accent2 }} />
            </div>
          </div>

          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10,
            marginBottom: 20, padding: '18px 20px',
            background: 'rgba(255,255,255,0.03)', borderRadius: 14 }}>
            {[
              ['Unlimited trip generations', 'vs. 5/month free'],
              ['All 12 AI travel styles',    '5 free'],
              ['Unlimited saved trips',      '3 free'],
              ['Priority support',           '12h response'],
              ['Early access',               'new monuments, styles'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%',
                  background: BRAND.accent, color: '#0a0a1f',
                  display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>✓</div>
                <div style={{ fontSize: 13, color: BRAND.ink, flex: 1 }}>{k}</div>
                <div style={{ fontSize: 10, color: BRAND.inkMute, fontStyle: 'italic' }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ border: `1px solid ${BRAND.border}`, borderRadius: 14, padding: '14px 10px', cursor: 'pointer' }}>
              <div style={{ fontSize: 10, color: BRAND.inkMute, letterSpacing: '0.1em' }}>MONTHLY</div>
              <div style={{ fontFamily: TYPE.display, fontSize: 26, fontWeight: 500, marginTop: 4 }}>
                $9<span style={{ fontSize: 13, color: BRAND.inkDim }}>/mo</span>
              </div>
            </div>
            <div style={{ border: `2px solid ${BRAND.accent}`, borderRadius: 14, padding: '14px 10px',
              background: `${BRAND.accent}14`, cursor: 'pointer', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -10, right: 10,
                background: BRAND.accent, color: '#0a0a1f',
                fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                letterSpacing: '0.1em' }}>SAVE 33%</div>
              <div style={{ fontSize: 10, color: BRAND.accent, letterSpacing: '0.1em', fontWeight: 600 }}>YEARLY</div>
              <div style={{ fontFamily: TYPE.display, fontSize: 26, fontWeight: 500, marginTop: 4 }}>
                $72<span style={{ fontSize: 13, color: BRAND.inkDim }}>/yr</span>
              </div>
            </div>
          </div>
          <button style={{ width: '100%', padding: '14px',
            background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.accent2})`,
            color: '#0a0a1f', border: 'none', borderRadius: 12,
            fontFamily: TYPE.ui, fontSize: 14, fontWeight: 700, cursor: 'pointer',
            letterSpacing: '0.02em' }}>
            Start 7-day free trial →
          </button>
          <div style={{ fontSize: 10, color: BRAND.inkMute, marginTop: 12, letterSpacing: '0.06em' }}>
            Cancel anytime · Powered by Stripe
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Summary / Itinerary (Atlas sheet-full state) ──────────────────────────
const DAY_PLAN = [
  { day: 1, title: 'Arrive in Kyoto', city: 'Kyoto',
    items: [
      { time: '14:00', what: 'Check in · Hotel Kanra',      kind: 'stay',   cost: 220 },
      { time: '16:30', what: 'Philosopher\'s Path walk',    kind: 'walk',   cost: 0 },
      { time: '19:30', what: 'Kaiseki at Giro Giro Hitoshina', kind: 'food', cost: 85 },
    ]},
  { day: 2, title: 'Temples east',   city: 'Kyoto',
    items: [
      { time: '07:30', what: 'Kiyomizu-dera before crowds', kind: 'sight', cost: 4 },
      { time: '10:00', what: 'Matcha at Sazen-ya',          kind: 'food',  cost: 12 },
      { time: '13:00', what: 'Nishiki Market lunch crawl',  kind: 'food',  cost: 30 },
      { time: '16:00', what: 'Fushimi Inari sunset climb',  kind: 'sight', cost: 0 },
    ]},
  { day: 3, title: 'Arashiyama day trip', city: 'Arashiyama',
    items: [
      { time: '08:00', what: 'Train to Saga-Arashiyama',    kind: 'travel', cost: 8 },
      { time: '09:30', what: 'Bamboo grove + Tenryū-ji',    kind: 'sight',  cost: 6 },
      { time: '12:30', what: 'Yuba lunch by the river',     kind: 'food',   cost: 38 },
      { time: '17:00', what: 'Return + onsen at the hotel', kind: 'stay',   cost: 0 },
    ]},
  { day: 4, title: 'Nara daytrip', city: 'Nara',
    items: [
      { time: '09:00', what: 'Train to Nara',               kind: 'travel', cost: 12 },
      { time: '10:30', what: 'Tōdai-ji + deer park',        kind: 'sight',  cost: 8 },
      { time: '19:00', what: 'Return · pocho bar, Pontocho', kind: 'food',  cost: 55 },
    ]},
];
const KIND_GLYPH = { stay: '◉', sight: '◈', food: '⏧', travel: '→', walk: '◬' };
const KIND_COLOR = { stay: '#a78bfa', sight: '#7dd3fc', food: '#fbbf24', travel: '#9ca3af', walk: '#34d399' };

function SummaryPanel({ compact }) {
  const [activeDay, setActiveDay] = useState(2);
  const day = DAY_PLAN.find(d => d.day === activeDay) || DAY_PLAN[0];
  const totalCost = DAY_PLAN.reduce((s, d) => s + d.items.reduce((ss, i) => ss + i.cost, 0), 0);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      background: `linear-gradient(180deg, rgba(10,10,31,0.96), rgba(10,10,31,1))`,
      display: 'flex', flexDirection: compact ? 'column' : 'row',
      animation: 'fadeUp 280ms cubic-bezier(0.23,1,0.32,1)',
    }}>
      {/* Left · trip header + day selector */}
      <div style={{
        width: compact ? '100%' : 320,
        padding: compact ? '68px 18px 14px' : '92px 28px 28px',
        borderRight: compact ? 'none' : `1px solid ${BRAND.border}`,
        borderBottom: compact ? `1px solid ${BRAND.border}` : 'none',
      }}>
        <div style={{ fontSize: 10, color: BRAND.accent, letterSpacing: '0.16em',
          fontWeight: 600, marginBottom: 6 }}>✦ YOUR ITINERARY</div>
        <div style={{ fontFamily: TYPE.display, fontSize: compact ? 24 : 34, fontWeight: 400,
          letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          Kyoto <em style={{ color: BRAND.accent }}>autumn</em>
        </div>
        <div style={{ color: BRAND.inkDim, fontSize: 13, marginTop: 6 }}>
          Oct 12 → 22 · 10 nights · relaxed · $$$
        </div>

        {/* Totals */}
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Stat k="Est. total"   v={`$${totalCost}`} sub="per person" />
          <Stat k="Locked steps" v="4 / 4" sub="dates · style · bag" />
        </div>

        {/* Day selector */}
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 10, color: BRAND.inkMute, letterSpacing: '0.12em',
            textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Days</div>
          <div style={{ display: 'flex', flexDirection: compact ? 'row' : 'column', gap: 4,
            flexWrap: compact ? 'wrap' : 'nowrap' }}>
            {DAY_PLAN.map(d => (
              <button key={d.day} onClick={() => setActiveDay(d.day)} style={{
                textAlign: 'left', padding: '8px 12px',
                background: activeDay === d.day ? 'rgba(167,139,250,0.14)' : 'transparent',
                border: `1px solid ${activeDay === d.day ? BRAND.borderHi : 'transparent'}`,
                borderRadius: 10, color: activeDay === d.day ? BRAND.ink : BRAND.inkDim,
                fontFamily: TYPE.ui, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontFamily: TYPE.mono, fontSize: 11, color: BRAND.inkMute,
                  width: 18 }}>D{d.day}</span>
                <span style={{ flex: 1 }}>{d.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        {!compact && (
          <div style={{ marginTop: 'auto', paddingTop: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button style={{ padding: '12px', background: BRAND.accent, color: '#0a0a1f',
              border: 'none', borderRadius: 12, fontFamily: TYPE.ui, fontSize: 13,
              fontWeight: 600, cursor: 'pointer' }}>Book flights →</button>
            <button style={{ padding: '12px', background: 'transparent', color: BRAND.inkDim,
              border: `1px solid ${BRAND.border}`, borderRadius: 12, fontFamily: TYPE.ui,
              fontSize: 13, cursor: 'pointer' }}>Regenerate ↻</button>
          </div>
        )}
      </div>

      {/* Right · day timeline */}
      <div style={{ flex: 1, overflowY: 'auto', padding: compact ? '14px 18px 40px' : '92px 48px 48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10, color: BRAND.inkMute, letterSpacing: '0.16em',
              fontWeight: 600 }}>DAY {day.day} · {day.city.toUpperCase()}</div>
            <div style={{ fontFamily: TYPE.display, fontSize: compact ? 22 : 30, fontWeight: 400,
              letterSpacing: '-0.01em' }}>{day.title}</div>
          </div>
          <div style={{ fontSize: 12, color: BRAND.inkDim }}>
            ${day.items.reduce((s, i) => s + i.cost, 0)} est.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {day.items.map((it, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'stretch', gap: 14,
              background: 'rgba(255,255,255,0.025)', borderRadius: 14,
              border: `1px solid ${BRAND.border}`, padding: '14px 16px',
              position: 'relative',
            }}>
              <div style={{ fontFamily: TYPE.mono, fontSize: 11, color: BRAND.inkMute, width: 42,
                flexShrink: 0, paddingTop: 2 }}>{it.time}</div>
              <div style={{ width: 28, display: 'grid', placeItems: 'center', flexShrink: 0,
                fontFamily: TYPE.display, fontSize: 18, color: KIND_COLOR[it.kind] }}>
                {KIND_GLYPH[it.kind]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: BRAND.ink, fontWeight: 500 }}>{it.what}</div>
                <div style={{ fontSize: 10, color: BRAND.inkMute, letterSpacing: '0.12em',
                  textTransform: 'uppercase', marginTop: 3 }}>{it.kind}</div>
              </div>
              <div style={{ fontSize: 13, color: it.cost === 0 ? BRAND.inkMute : BRAND.ink,
                fontWeight: 500, paddingTop: 2 }}>
                {it.cost === 0 ? 'free' : `$${it.cost}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ k, v, sub }) {
  return (
    <div style={{ padding: '10px 12px',
      background: 'rgba(255,255,255,0.03)', borderRadius: 10,
      border: `1px solid ${BRAND.border}` }}>
      <div style={{ fontSize: 10, color: BRAND.inkMute, letterSpacing: '0.12em', fontWeight: 600 }}>{k.toUpperCase()}</div>
      <div style={{ fontFamily: TYPE.display, fontSize: 20, fontWeight: 500, marginTop: 3 }}>{v}</div>
      {sub && <div style={{ fontSize: 10, color: BRAND.inkMute, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── City drill-in (Mapbox-style) ──────────────────────────────────────────
// After a destination is picked, the globe "lands" into a 3D-buildings city view.
// Mocked with a hand-styled map illustration since we can't load real Mapbox.
function CityPanel({ compact }) {
  const cityMonuments = [
    { id: 'kinkaku',  name: 'Kinkaku-ji',   x: 28, y: 34, rarity: 'legendary', owned: false },
    { id: 'fushimi',  name: 'Fushimi Inari', x: 64, y: 72, rarity: 'rare',      owned: true  },
    { id: 'kiyomizu', name: 'Kiyomizu-dera', x: 58, y: 48, rarity: 'rare',      owned: false },
    { id: 'gion',     name: 'Gion District', x: 52, y: 42, rarity: 'common',   owned: true  },
    { id: 'nijo',     name: 'Nijō Castle',   x: 40, y: 38, rarity: 'uncommon', owned: false },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 25,
      background: '#060816', overflow: 'hidden',
      animation: 'fadeUp 320ms cubic-bezier(0.23,1,0.32,1)',
    }}>
      {/* Fake satellite terrain — layered gradients suggesting a pitched-45 3D city */}
      <div style={{ position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 140% 80% at 50% 120%, #1a2a1c 0%, transparent 50%),
          radial-gradient(ellipse 100% 60% at 30% 30%, #2b2218 0%, transparent 55%),
          radial-gradient(ellipse 90% 70% at 72% 60%, #1c2432 0%, transparent 60%),
          linear-gradient(180deg, #0a1220 0%, #121a2c 40%, #1a2232 100%)
        `,
        transform: 'perspective(1400px) rotateX(45deg) scale(1.8) translateY(8%)',
        transformOrigin: '50% 70%',
      }} />

      {/* Grid overlay — suggests streets */}
      <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <pattern id="streetgrid" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M6 0H0V6" fill="none" stroke="rgba(200,220,255,0.10)" strokeWidth="0.2" />
          </pattern>
        </defs>
        <g style={{ transform: 'perspective(1400px) rotateX(45deg) scale(1.8) translateY(8%)', transformOrigin: '50% 70%' }}>
          <rect width="100" height="100" fill="url(#streetgrid)" />
        </g>
      </svg>

      {/* Faux 3D building extrusions — rectangles sized by "height" */}
      <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} viewBox="0 0 1000 600">
        {[...Array(80)].map((_, i) => {
          const bx = (i * 83 + (i % 7) * 41) % 1000;
          const by = 160 + ((i * 37) % 380);
          const bw = 18 + ((i * 13) % 24);
          const bh = 8 + ((i * 19) % 40);
          return (
            <g key={i}>
              <polygon points={`${bx},${by} ${bx+bw},${by-bh*0.3} ${bx+bw},${by+bh*0.7} ${bx},${by+bh}`}
                fill="rgba(203,213,225,0.35)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
              <polygon points={`${bx+bw},${by-bh*0.3} ${bx+bw+bw*0.25},${by-bh*0.15} ${bx+bw+bw*0.25},${by+bh*0.85} ${bx+bw},${by+bh*0.7}`}
                fill="rgba(148,163,184,0.28)" />
            </g>
          );
        })}
      </svg>

      {/* Monument rings */}
      {cityMonuments.map(m => {
        const r = RARITY[m.rarity];
        return (
          <div key={m.id} style={{
            position: 'absolute', left: `${m.x}%`, top: `${m.y}%`,
            transform: 'translate(-50%, -50%)', pointerEvents: 'auto',
            cursor: 'pointer',
          }}>
            <div style={{ position: 'relative', width: compact ? 52 : 72, height: compact ? 52 : 72 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%',
                border: `2px solid ${r.swatch}`, opacity: m.owned ? 1 : 0.45,
                animation: 'pulseDot 2.4s ease-in-out infinite',
                boxShadow: m.owned ? `0 0 20px ${r.swatch}66` : 'none',
              }} />
              <div style={{ position: 'absolute', inset: compact ? 14 : 20,
                borderRadius: '50%', background: m.owned ? `${r.swatch}55` : 'rgba(255,255,255,0.08)',
                border: `1px solid ${r.swatch}`, display: 'grid', placeItems: 'center',
                fontFamily: TYPE.display, fontSize: compact ? 11 : 14, color: '#fff' }}>
                {m.owned ? '◆' : '◇'}
              </div>
            </div>
            <div style={{ position: 'absolute', top: '100%', left: '50%',
              transform: 'translate(-50%, 6px)', whiteSpace: 'nowrap',
              background: 'rgba(6,8,22,0.85)', backdropFilter: 'blur(10px)',
              border: `1px solid ${r.swatch}44`, borderRadius: 8,
              padding: '3px 8px', fontSize: 10, color: BRAND.ink,
              letterSpacing: '0.04em', fontWeight: 500 }}>
              {m.name}
            </div>
          </div>
        );
      })}

      {/* Top chip — city label */}
      <div style={{ position: 'absolute', top: compact ? 14 : 24, left: '50%',
        transform: 'translateX(-50%)', zIndex: 10,
        background: 'rgba(6,8,22,0.85)', backdropFilter: 'blur(14px)',
        border: `1px solid ${BRAND.borderHi}`, borderRadius: 12,
        padding: '10px 18px', display: 'flex', gap: 12, alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <span style={{ fontFamily: TYPE.display, fontSize: 15, fontWeight: 500, color: BRAND.ink }}>Kyoto, Japan</span>
        <span style={{ fontSize: 10, color: BRAND.inkMute, letterSpacing: '0.1em' }}>zoom out to return to globe</span>
      </div>

      {/* Top-left back */}
      <button style={{ position: 'absolute', top: compact ? 14 : 24, left: compact ? 14 : 24,
        zIndex: 10, background: 'rgba(6,8,22,0.8)', backdropFilter: 'blur(10px)',
        border: `1px solid ${BRAND.border}`, color: BRAND.ink,
        padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
        fontFamily: TYPE.ui, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Globe
      </button>

      {/* Bottom sheet — adding to trip */}
      <div style={{ position: 'absolute', left: compact ? 12 : 24, right: compact ? 12 : 24,
        bottom: compact ? 12 : 24, zIndex: 10,
        background: 'rgba(10,10,31,0.88)', backdropFilter: 'blur(18px)',
        border: `1px solid ${BRAND.borderHi}`, borderRadius: 14,
        padding: compact ? '12px 14px' : '14px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: BRAND.inkMute, letterSpacing: '0.12em', fontWeight: 600 }}>ADD TO TRIP</div>
          <div style={{ fontFamily: TYPE.display, fontSize: compact ? 15 : 17, marginTop: 2 }}>
            5 monuments nearby · 2 in your collection
          </div>
        </div>
        <button style={{ padding: '10px 16px', background: BRAND.accent, color: '#0a0a1f',
          border: 'none', borderRadius: 10, fontFamily: TYPE.ui, fontSize: 13,
          fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Plan Kyoto →
        </button>
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────
function SettingsPanelMock({ compact }) {
  const [section, setSection] = useState('account');
  const sections = [
    { id: 'account',  label: 'Account',      glyph: '◉' },
    { id: 'language', label: 'Language',     glyph: '◈' },
    { id: 'privacy',  label: 'Privacy & AI', glyph: '◬' },
    { id: 'notif',    label: 'Notifications',glyph: '✦' },
    { id: 'profile',  label: 'Travel profile', glyph: '◇' },
    { id: 'about',    label: 'About',        glyph: '⏣' },
  ];

  return (
    <div style={{
      position: 'absolute', top: compact ? 66 : 80, left: '50%',
      transform: 'translateX(-50%)',
      width: compact ? 'calc(100% - 24px)' : 720,
      bottom: compact ? 12 : 40, zIndex: 30,
      background: 'rgba(12,12,30,0.94)', backdropFilter: 'blur(20px)',
      border: `1px solid ${BRAND.borderHi}`, borderRadius: 20,
      boxShadow: '0 40px 120px rgba(0,0,0,0.6)',
      display: 'flex', flexDirection: compact ? 'column' : 'row',
      overflow: 'hidden',
      animation: 'fadeUp 280ms cubic-bezier(0.23,1,0.32,1)',
    }}>
      {/* Sidebar */}
      <div style={{
        width: compact ? '100%' : 200, padding: compact ? '14px 14px 4px' : '22px 14px',
        borderRight: compact ? 'none' : `1px solid ${BRAND.border}`,
        borderBottom: compact ? `1px solid ${BRAND.border}` : 'none',
      }}>
        <div style={{ fontFamily: TYPE.display, fontSize: compact ? 18 : 22,
          fontWeight: 400, letterSpacing: '-0.01em', padding: '0 8px', marginBottom: 12 }}>
          Settings
        </div>
        <div style={{ display: compact ? 'flex' : 'block',
          gap: compact ? 4 : 0, flexWrap: compact ? 'wrap' : 'nowrap' }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', marginBottom: compact ? 0 : 2,
              background: section === s.id ? 'rgba(167,139,250,0.14)' : 'transparent',
              border: `1px solid ${section === s.id ? BRAND.borderHi : 'transparent'}`,
              borderRadius: 10, color: section === s.id ? BRAND.ink : BRAND.inkDim,
              fontFamily: TYPE.ui, fontSize: 13, width: compact ? 'auto' : '100%',
              textAlign: 'left', cursor: 'pointer',
            }}>
              <span style={{ color: section === s.id ? BRAND.accent : BRAND.inkMute,
                fontFamily: TYPE.display, fontSize: 14 }}>{s.glyph}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Panel body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: compact ? '14px 18px' : '22px 28px' }}>
        {section === 'account' && (
          <SettingsBody title="Account">
            <SRow k="Name" v="Nghia Phan" action="Edit" />
            <SRow k="Email" v="nghiap…@gmail.com" action="Change" />
            <SRow k="Username" v="@nghiap" action="Edit" />
            <SRow k="Plan" v="Free · 3/5 this month" accent action="Upgrade" />
            <SRow k="Sign out" v="" danger action="Sign out →" last />
          </SettingsBody>
        )}
        {section === 'language' && (
          <SettingsBody title="Language & region">
            <SRow k="Interface" v="English" action="Change" />
            <SRow k="Timezone" v="America/Los_Angeles" action="Change" />
            <SRow k="Date format" v="MMM D, YYYY" action="Change" />
            <SRow k="Units" v="Imperial (mi / °F)" action="Change" last />
          </SettingsBody>
        )}
        {section === 'privacy' && (
          <SettingsBody title="Privacy & AI">
            <SRow k="Location tracking" v="Only while planning" toggle />
            <SRow k="Share trips with friends" v="Selected friends only" toggle on />
            <SRow k="AI context" v="Full history" action="Change" sub="Full · Minimal · None" />
            <SRow k="Saved chats" v="Stored 30 days" action="Clear now" last />
          </SettingsBody>
        )}
        {section === 'notif' && (
          <SettingsBody title="Notifications">
            <SRow k="Trip reminders" v="7 days before departure" toggle on />
            <SRow k="Friend activity" v="Shared trips, messages" toggle on />
            <SRow k="Deals & suggestions" v="Flight drops, seasonal" toggle />
            <SRow k="Monument unlocks" v="When you earn a new skin" toggle on last />
          </SettingsBody>
        )}
        {section === 'profile' && (
          <SettingsBody title="Travel profile"
            subtitle="Used to pre-fill the Style step — constraints the AI respects.">
            <SRow k="Mobility" v="No constraints" action="Edit" />
            <SRow k="Dietary" v="Vegetarian · no shellfish" action="Edit" />
            <SRow k="Accessibility" v="—" action="Add" />
            <SRow k="Home airport" v="SFO" action="Change" />
            <SRow k="Passport country" v="Vietnam" action="Change" last />
          </SettingsBody>
        )}
        {section === 'about' && (
          <SettingsBody title="About">
            <SRow k="Version" v="geknee 0.1.0" />
            <SRow k="Terms of service" v="" action="Open →" />
            <SRow k="Privacy policy" v="" action="Open →" />
            <SRow k="Feedback" v="tell us what's broken" action="Send →" last />
          </SettingsBody>
        )}
      </div>
    </div>
  );
}

function SettingsBody({ title, subtitle, children }) {
  return (
    <div>
      <div style={{ fontFamily: TYPE.display, fontSize: 24, fontWeight: 400,
        letterSpacing: '-0.01em', marginBottom: subtitle ? 4 : 16 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: BRAND.inkDim, marginBottom: 16 }}>{subtitle}</div>}
      <div style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${BRAND.border}`,
        borderRadius: 12, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function SRow({ k, v, sub, action, toggle, on, accent, danger, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 16px', borderBottom: last ? 'none' : `1px solid ${BRAND.border}`,
      gap: 14,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: danger ? BRAND.danger : BRAND.ink }}>{k}</div>
        {v && <div style={{ fontSize: 12, color: accent ? BRAND.accent : BRAND.inkDim, marginTop: 2 }}>{v}</div>}
        {sub && <div style={{ fontSize: 10, color: BRAND.inkMute, marginTop: 2, letterSpacing: '0.08em' }}>{sub}</div>}
      </div>
      {toggle ? (
        <div style={{ width: 40, height: 22, borderRadius: 11,
          background: on ? BRAND.accent : 'rgba(255,255,255,0.15)',
          position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 3, left: on ? 21 : 3,
            width: 16, height: 16, borderRadius: '50%', background: '#fff',
            transition: 'left 180ms' }} />
        </div>
      ) : action ? (
        <button style={{ background: 'transparent', border: `1px solid ${BRAND.border}`,
          color: accent ? BRAND.accent : danger ? BRAND.danger : BRAND.inkDim,
          padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
          fontFamily: TYPE.ui, fontSize: 12, whiteSpace: 'nowrap' }}>
          {action}
        </button>
      ) : null}
    </div>
  );
}

window.AtlasWithPanel = AtlasWithPanel;
