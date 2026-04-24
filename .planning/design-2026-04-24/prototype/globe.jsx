// Shared cosmic globe — CSS/SVG take on the Three.js original. Handles fly-to by lat/lon.
const { useEffect, useRef, useState, useMemo } = React;

// A few iconic landmark positions (lat, lon) — subset of the repo's L map
const LANDMARKS = [
  { id: 'eiffel',   name: 'Eiffel Tower',     city: 'Paris',          lat: 48.86,   lon:   2.29 },
  { id: 'fuji',     name: 'Mount Fuji',       city: 'Japan',          lat: 35.36,   lon: 138.73 },
  { id: 'machu',    name: 'Machu Picchu',     city: 'Peru',           lat: -13.16,  lon: -72.54 },
  { id: 'taj',      name: 'Taj Mahal',        city: 'Agra',           lat: 27.17,   lon:  78.04 },
  { id: 'colos',    name: 'Colosseum',        city: 'Rome',           lat: 41.89,   lon:  12.49 },
  { id: 'opera',    name: 'Sydney Opera',     city: 'Sydney',         lat: -33.86,  lon: 151.21 },
  { id: 'petra',    name: 'Petra',            city: 'Jordan',         lat: 30.33,   lon:  35.44 },
  { id: 'cristo',   name: 'Christ Redeemer',  city: 'Rio',            lat: -22.95,  lon: -43.21 },
  { id: 'wall',     name: 'Great Wall',       city: 'China',          lat: 40.43,   lon: 116.57 },
  { id: 'pyramid',  name: 'Pyramids of Giza', city: 'Egypt',          lat: 29.98,   lon:  31.13 },
  { id: 'santorini',name: 'Santorini',        city: 'Greece',         lat: 36.39,   lon:  25.46 },
  { id: 'bali',     name: 'Uluwatu',          city: 'Bali',           lat: -8.83,   lon: 115.09 },
  { id: 'iceland',  name: 'Blue Lagoon',      city: 'Iceland',        lat: 63.88,   lon: -22.45 },
  { id: 'patagonia',name: 'Torres del Paine', city: 'Patagonia',      lat: -50.94,  lon: -73.41 },
];

// Project lat/lon to 2D given a camera rotation (yaw=long-rotation, pitch=tilt)
function project(lat, lon, yaw, pitch, R) {
  const φ = (lat * Math.PI) / 180;
  const λ = ((lon + yaw) * Math.PI) / 180;
  // 3D point on unit sphere
  let x = Math.cos(φ) * Math.sin(λ);
  let y = Math.sin(φ);
  let z = Math.cos(φ) * Math.cos(λ);
  // apply pitch rotation around X axis
  const p = (pitch * Math.PI) / 180;
  const y2 = y * Math.cos(p) - z * Math.sin(p);
  const z2 = y * Math.sin(p) + z * Math.cos(p);
  return { x: x * R, y: y2 * R, z: z2, visible: z2 > -0.05 };
}

function Globe({
  size = 460,
  accent = '#a78bfa',
  target = null,            // { lat, lon } — triggers flyTo
  onLandmarkClick,
  showLandmarks = true,
  quiet = false,            // if true, more restrained styling
  dense = false,            // include bloom + outer ring
  idleSpin = true,
}) {
  const [yaw, setYaw] = useState(-15);
  const [pitch, setPitch] = useState(-18);
  const [dragging, setDragging] = useState(false);
  const last = useRef({ x: 0, y: 0 });
  const rafRef = useRef();
  const flyRef = useRef();
  const [hover, setHover] = useState(null);
  const R = size / 2 - 18;

  // idle rotation
  useEffect(() => {
    if (!idleSpin || dragging || flyRef.current) return;
    let raf;
    const tick = () => {
      setYaw(y => y - 0.04);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [idleSpin, dragging]);

  // fly to target
  useEffect(() => {
    if (!target) return;
    if (flyRef.current) cancelAnimationFrame(flyRef.current);
    // desired yaw rotates so that target.lon sits at 0 (facing camera)
    const targetYaw   = -target.lon;
    const targetPitch = -target.lat + 5; // slight tilt
    const startYaw   = ((yaw + 540) % 360) - 180;
    const startPitch = pitch;
    // shortest-path yaw
    let dYaw = targetYaw - startYaw;
    while (dYaw > 180)  dYaw -= 360;
    while (dYaw < -180) dYaw += 360;
    const startT = performance.now();
    const dur = 1400;
    const tick = (now) => {
      const t = Math.min(1, (now - startT) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      setYaw(startYaw + dYaw * e);
      setPitch(startPitch + (targetPitch - startPitch) * e);
      if (t < 1) {
        flyRef.current = requestAnimationFrame(tick);
      } else {
        flyRef.current = null;
      }
    };
    flyRef.current = requestAnimationFrame(tick);
    return () => flyRef.current && cancelAnimationFrame(flyRef.current);
  }, [target]);

  const onDown = (e) => {
    const pt = e.touches ? e.touches[0] : e;
    last.current = { x: pt.clientX, y: pt.clientY };
    setDragging(true);
  };
  const onMove = (e) => {
    if (!dragging) return;
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - last.current.x;
    const dy = pt.clientY - last.current.y;
    setYaw(y => y + dx * 0.35);
    setPitch(p => Math.max(-80, Math.min(80, p + dy * 0.3)));
    last.current = { x: pt.clientX, y: pt.clientY };
  };
  const onUp = () => setDragging(false);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging]);

  // Build meridian/parallel grid
  const grid = useMemo(() => {
    const lines = [];
    // parallels
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts = [];
      for (let lon = -180; lon <= 180; lon += 6) {
        const p = project(lat, lon, yaw, pitch, R);
        pts.push({ ...p });
      }
      lines.push({ pts, kind: 'parallel', lat });
    }
    // meridians
    for (let lon = -180; lon < 180; lon += 30) {
      const pts = [];
      for (let lat = -85; lat <= 85; lat += 4) {
        const p = project(lat, lon, yaw, pitch, R);
        pts.push({ ...p });
      }
      lines.push({ pts, kind: 'meridian', lon });
    }
    return lines;
  }, [yaw, pitch, R]);

  return (
    <div
      onMouseDown={onDown}
      onTouchStart={onDown}
      style={{
        position: 'relative',
        width: size, height: size,
        userSelect: 'none',
        cursor: dragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
    >
      <svg key={`g-${size}`} width={size} height={size} viewBox={`${-size/2} ${-size/2} ${size} ${size}`} style={{ display: 'block', overflow: 'visible', width: size, height: size }}>
        <defs>
          <radialGradient id="glob-atmo" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor={accent} stopOpacity="0" />
            <stop offset="85%" stopColor={accent} stopOpacity={dense ? 0.35 : 0.18} />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glob-fill" cx="38%" cy="35%" r="75%">
            <stop offset="0%"   stopColor="#1a2550" />
            <stop offset="55%"  stopColor="#0b1030" />
            <stop offset="100%" stopColor="#04061a" />
          </radialGradient>
          <radialGradient id="glob-shine" cx="30%" cy="25%" r="45%">
            <stop offset="0%"  stopColor="rgba(255,255,255,0.22)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <filter id="glob-blur"><feGaussianBlur stdDeviation="0.5" /></filter>
        </defs>

        {/* atmosphere */}
        <circle cx="0" cy="0" r={R + 14} fill="url(#glob-atmo)" />
        {/* sphere */}
        <circle cx="0" cy="0" r={R} fill="url(#glob-fill)" stroke={`${accent}33`} strokeWidth="0.6" />

        {/* latitude/longitude grid */}
        <g filter="url(#glob-blur)" opacity={quiet ? 0.35 : 0.55}>
          {grid.map((line, i) => (
            <polyline
              key={i}
              points={line.pts.filter(p => p.visible).map(p => `${p.x},${-p.y}`).join(' ')}
              fill="none"
              stroke={line.kind === 'meridian' && line.lon === 0 ? accent : 'rgba(180,200,255,0.35)'}
              strokeWidth={line.kind === 'meridian' && line.lon === 0 ? 0.9 : 0.6}
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* land-ish blobs — suggestive, not geographic */}
        <LandMasses yaw={yaw} pitch={pitch} R={R} />

        {/* highlight */}
        <circle cx="0" cy="0" r={R} fill="url(#glob-shine)" pointerEvents="none" />

        {/* landmarks */}
        {showLandmarks && LANDMARKS.map(lm => {
          const p = project(lm.lat, lm.lon, yaw, pitch, R);
          if (!p.visible) return null;
          const isHover = hover === lm.id;
          return (
            <g
              key={lm.id}
              transform={`translate(${p.x}, ${-p.y})`}
              onMouseEnter={() => setHover(lm.id)}
              onMouseLeave={() => setHover(null)}
              onClick={(e) => { e.stopPropagation(); onLandmarkClick && onLandmarkClick(lm); }}
              style={{ cursor: 'pointer' }}
            >
              <circle r={isHover ? 8 : 4} fill={accent} opacity={isHover ? 0.2 : 0.5} />
              <circle r={isHover ? 3.2 : 2.2} fill="#fff" />
              {isHover && (
                <g transform="translate(8,-10)">
                  <rect x="0" y="-10" width={lm.name.length * 6.2 + 16} height="20" rx="10"
                    fill="rgba(10,12,28,0.95)" stroke={`${accent}66`} strokeWidth="0.6" />
                  <text x="8" y="4" fontSize="10" fill="#fff" fontFamily="Inter, system-ui">
                    {lm.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* subtle starfield around */}
      {dense && <Starfield size={size} />}
    </div>
  );
}

// Stylized continent-ish blobs projected onto the sphere
const CONTINENTS = [
  // Very rough: (lat, lon, rx, ry) ellipses for each continent
  { lat:  50, lon:  15, rx: 28, ry: 18, name: 'eu' },   // Europe
  { lat:  10, lon:  20, rx: 22, ry: 30, name: 'af' },   // Africa
  { lat:  35, lon:  90, rx: 42, ry: 26, name: 'as' },   // Asia
  { lat: -25, lon: 135, rx: 18, ry: 10, name: 'au' },   // Australia
  { lat:  45, lon: -100, rx: 28, ry: 22, name: 'na' },  // N America
  { lat: -15, lon: -60,  rx: 18, ry: 25, name: 'sa' },  // S America
  { lat: -75, lon:   0,  rx: 40, ry: 8,  name: 'an' },  // Antarctica
];

function LandMasses({ yaw, pitch, R }) {
  // sample points across ellipse, project each
  const pts = useMemo(() => {
    const out = [];
    CONTINENTS.forEach(c => {
      const pathPts = [];
      const N = 28;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        const lat = c.lat + Math.sin(a) * c.ry;
        const lon = c.lon + Math.cos(a) * c.rx;
        pathPts.push(project(lat, lon, yaw, pitch, R));
      }
      out.push({ c, pts: pathPts });
    });
    return out;
  }, [yaw, pitch, R]);

  return (
    <g opacity="0.75">
      {pts.map(({ c, pts }) => {
        const visPts = pts.filter(p => p.visible);
        if (visPts.length < 4) return null;
        const d = visPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${-p.y}`).join(' ') + 'Z';
        return (
          <path key={c.name} d={d}
            fill="rgba(167,139,250,0.22)"
            stroke="rgba(167,139,250,0.5)"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        );
      })}
    </g>
  );
}

function Starfield({ size }) {
  const stars = useMemo(() => {
    const out = [];
    for (let i = 0; i < 40; i++) {
      out.push({
        x: (Math.random() - 0.5) * size * 1.4,
        y: (Math.random() - 0.5) * size * 1.4,
        r: Math.random() * 1.2 + 0.3,
        o: Math.random() * 0.5 + 0.2,
      });
    }
    return out;
  }, [size]);
  return (
    <svg width={size} height={size} viewBox={`${-size/2} ${-size/2} ${size} ${size}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
      ))}
    </svg>
  );
}

window.Globe = Globe;
window.LANDMARKS = LANDMARKS;
