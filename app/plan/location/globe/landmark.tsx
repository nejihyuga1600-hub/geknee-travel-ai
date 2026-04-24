"use client";
// Landmark system — materials, primitives, GLB loader, hover label, bridges,
// and the <Lm /> placement wrapper. Extracted from LocationClient.tsx so the
// globe scene file can stay focused on camera / globe / page glue.
//
// Pure-data siblings supply everything this module needs to stay self-contained:
//   geo.ts       — SurfPos type
//   info.ts      — LmInfo type
//   skins.ts     — monument skin registry (file prefixes, available skins, ring colors)
//   locations.ts — pre-computed landmark positions + density map

import { useFrame } from "@react-three/fiber";
import { useGLTF, Html, Sparkles } from "@react-three/drei";
import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  Component,
  Suspense,
  type ReactNode,
} from "react";
import * as THREE from "three";

import { type SurfPos } from "./geo";
import { type LmInfo } from "./info";
import { LM_DENSITY } from "./locations";
import {
  MONUMENT_FILE_PREFIX,
  AVAILABLE_SKINS,
  MONUMENT_LATLON,
  SKIN_RING_COLOR,
} from "./skins";

// ─── Landmark system ──────────────────────────────────────────────────────────
// Base candy-gloss material (Mario Galaxy feel)
export function Mat({ c }: { c: string }) {
  return <meshStandardMaterial color={c} roughness={0.08} metalness={0.18} emissive={c} emissiveIntensity={0.12}/>;
}
// Weathered stone / masonry (Colosseum, Stonehenge, Petra rock face, Acropolis marble)
export function MatStone({ c }: { c: string }) {
  return <meshStandardMaterial color={c} roughness={0.82} metalness={0.0} emissive={c} emissiveIntensity={0.04}/>;
}
// Polished marble / white stone (Taj Mahal, Christ the Redeemer)
export function MatMarble({ c }: { c: string }) {
  return <meshStandardMaterial color={c} roughness={0.22} metalness={0.06} emissive={c} emissiveIntensity={0.08}/>;
}
// Iron / painted steel (Eiffel Tower, Golden Gate Bridge)
export function MatMetal({ c }: { c: string }) {
  return <meshStandardMaterial color={c} roughness={0.38} metalness={0.72} emissive={c} emissiveIntensity={0.06}/>;
}
// Oxidised copper / patina (Statue of Liberty)
export function MatPatina({ c }: { c: string }) {
  return <meshStandardMaterial color={c} roughness={0.6} metalness={0.42} emissive={c} emissiveIntensity={0.1}/>;
}
// Polished gold / gilded (Angkor Wat, Borobudur, temple finials)
export function MatGold({ c }: { c: string }) {
  return <meshStandardMaterial color={c} roughness={0.14} metalness={0.88} emissive={c} emissiveIntensity={0.18}/>;
}
// Sandstone / desert rock (Petra background, Pyramids, Grand Canyon)
export function MatSand({ c }: { c: string }) {
  return <meshStandardMaterial color={c} roughness={0.9} metalness={0.0} emissive={c} emissiveIntensity={0.05}/>;
}
// Glass / water / ice surfaces
export function MatGlass({ c }: { c: string }) {
  return <meshStandardMaterial color={c} roughness={0.04} metalness={0.05} emissive={c} emissiveIntensity={0.22} transparent opacity={0.82}/>;
}

// Typed mesh helpers — accept optional mat override for per-surface materials
export function Box({ p, s, c, M = Mat }: { p:[number,number,number]; s:[number,number,number]; c:string; M?:React.FC<{c:string}> }) {
  return <mesh position={p}><boxGeometry args={s}/><M c={c}/></mesh>;
}
export function Cone({ p, r, h, seg=32, c, M = Mat }: { p:[number,number,number]; r:number; h:number; seg?:number; c:string; M?:React.FC<{c:string}> }) {
  return <mesh position={p}><coneGeometry args={[r,h,seg]}/><M c={c}/></mesh>;
}
export function Cyl({ p, rt, rb, h, seg=32, c, M = Mat }: { p:[number,number,number]; rt:number; rb:number; h:number; seg?:number; c:string; M?:React.FC<{c:string}> }) {
  return <mesh position={p}><cylinderGeometry args={[rt,rb,h,seg]}/><M c={c}/></mesh>;
}
export function Ball({ p, r, c, M = Mat }: { p:[number,number,number]; r:number; c:string; M?:React.FC<{c:string}> }) {
  return <mesh position={p}><sphereGeometry args={[r,48,48]}/><M c={c}/></mesh>;
}


// ─── GLB model registry ────────────────────────────────────────────────────────
export const BLOB_BASE = 'https://mrfgpxw07gmgmriv.public.blob.vercel-storage.com/models';

// GLB models served from Vercel Blob. Entries here render as the default (pre-skin)
// model for ANY viewer — even non-collected users. The base eiffel_tower.glb ships
// without materials/normals and renders invisibly, so it is intentionally NOT listed:
// non-collected users fall through to the primitive children (visible iron tower),
// collected users hit skinPath and load a skin GLB (stone/gold/etc, full PBR).
export const MODELS: Record<string, { path: string; scale: number }> = {};

// ─── GLB error boundary — falls back to primitive geometry if .glb missing ────
class ModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// Loads a GLB, normalises it to fit a 1-unit bounding box with base at y=0,
// then multiplies by `scale` so it matches the surrounding Lm s-wrapper size.
export function GlbModel({ path, scale }: { path: string; scale: number }) {
  const { scene } = useGLTF(path);
  const obj = useMemo(() => {
    const c = scene.clone();
    const box = new THREE.Box3().setFromObject(c);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const norm = scale / maxDim;          // normalise longest axis → scale units
      c.scale.setScalar(norm);
      c.position.y = -box.min.y * norm;    // lift base to y=0 (globe surface)
    }
    return c;
  }, [scene, scale]);
  return <primitive object={obj} frustumCulled={false} />;
}

// ─── Hover label ──────────────────────────────────────────────────────────────
export async function wikiSummary(title: string, thumbPx = 800): Promise<{ img: string | null; extract: string; description: string }> {
  const t = encodeURIComponent(title.replace(/ /g, "_"));
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${t}&redirects&prop=pageimages|extracts|description&pithumbsize=${thumbPx}&exintro&explaintext&format=json&origin=*`;
  const r = await fetch(url);
  if (!r.ok) return { img: null, extract: "", description: "" };
  const d = await r.json();
  const page: any = Object.values(d.query.pages)[0];
  return { img: page?.thumbnail?.source ?? null, extract: page?.extract ?? "", description: page?.description ?? "" };
}

export function LandmarkLabel({ info, planUrl }: { info: LmInfo; planUrl?: string }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    wikiSummary(info.name).then(({ img }) => { if (!cancelled && img) setImgUrl(img); }).catch(() => {});
    return () => { cancelled = true; };
  }, [info.name]);

  return (
    <div style={{
      position: "relative",
      background: "linear-gradient(150deg, #0e2a6e 0%, #061840 100%)",
      border: "2.5px solid #50c8ff",
      borderRadius: "18px",
      overflow: "hidden",
      width: "240px",
      boxShadow: "0 0 22px rgba(60,180,255,0.55), 0 8px 28px rgba(0,0,0,0.5)",
      fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
      pointerEvents: planUrl ? "auto" : "none",
      userSelect: "none",
    }}>
      {imgUrl && (
        <img src={imgUrl} alt={info.name} style={{
          display: "block", width: "100%", height: "130px",
          objectFit: "cover", borderBottom: "1.5px solid #50c8ff",
        }} />
      )}

      <div style={{ padding: "10px 14px 13px", textAlign: "center" }}>
        <div style={{
          fontSize: "13px", fontWeight: 800, color: "#ffffff",
          letterSpacing: "0.02em", marginBottom: "3px",
          textShadow: "0 0 12px rgba(100,210,255,0.9)",
        }}>
          {info.name}
        </div>

        <div style={{ fontSize: "10px", fontWeight: 600, color: "#80d8ff", marginBottom: "7px" }}>
          {String.fromCodePoint(0x1F4CD)} {info.location}
        </div>

        <div style={{
          fontSize: "10px", color: "#c0ecff", lineHeight: 1.5,
          borderTop: "1px solid rgba(80,200,255,0.25)", paddingTop: "7px",
          textAlign: "left",
        }}>
          {info.fact}
        </div>

        {planUrl && (
          <a
            href={planUrl}
            style={{
              display: "block", marginTop: "10px",
              padding: "8px 0", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg,#06b6d4,#6366f1)",
              color: "#fff", fontSize: "11px", fontWeight: 700,
              textAlign: "center", textDecoration: "none",
              cursor: "pointer",
            }}
          >
            Ready to plan your trip? {String.fromCodePoint(0x27A4)}
          </a>
        )}
      </div>

      <div style={{
        position: "absolute", bottom: "-12px", left: "50%", transform: "translateX(-50%)",
        width: 0, height: 0,
        borderLeft: "9px solid transparent", borderRight: "9px solid transparent",
        borderTop: "12px solid #50c8ff",
      }} />
      <div style={{
        position: "absolute", bottom: "-9px", left: "50%", transform: "translateX(-50%)",
        width: 0, height: 0,
        borderLeft: "7px solid transparent", borderRight: "7px solid transparent",
        borderTop: "10px solid #061840",
      }} />
    </div>
  );
}

// Places children on the globe surface at the given lat/lon, standing upright.
// ─── Globe-click navigation bridge
let _lmNav: ((loc: string) => void) | null = null;
export function _setLmNav(fn: (loc: string) => void) { _lmNav = fn; }
let _lmNavDirect: ((loc: string) => void) | null = null;
export function _setLmNavDirect(fn: (loc: string) => void) { _lmNavDirect = fn; }
let _globeClick: (() => void) | null = null;
export function _setGlobeClick(fn: () => void) { _globeClick = fn; }

// ─── Globe data-ready bridge (GlobeScene → LocationPage)
let _onGlobeReady: (() => void) | null = null;

// ─── Collected monuments bridge (LocationPage → Lm)
let _collectedMonuments = new Set<string>();
let _activeSkins = new Map<string, string>();
let _monumentVersion = 0;
const _monumentListeners = new Set<() => void>();
export function _setCollectedMonuments(ids: Set<string>) {
  _collectedMonuments = ids;
  _monumentVersion++;
  _monumentListeners.forEach(fn => fn());
}
export function _setActiveSkins(skins: Map<string, string>) {
  _activeSkins = skins;
  _monumentVersion++;
  _monumentListeners.forEach(fn => fn());
}
export function useMonumentBridge(mk?: string) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const cb = () => setTick(t => t + 1);
    _monumentListeners.add(cb);
    return () => { _monumentListeners.delete(cb); };
  }, []);
  return {
    isCollected: mk ? _collectedMonuments.has(mk) : false,
    activeSkin: mk ? _activeSkins.get(mk) : undefined,
  };
}

export function Lm({ p, s = 0.4, info, mk, children }: { p: SurfPos; s?: number; info?: LmInfo; mk?: string; children: ReactNode }) {
  const { isCollected, activeSkin } = useMonumentBridge(mk);
  const [hovered, setHovered]         = useState(false);
  const [mobileActive, setMobileActive] = useState(false);
  const effectiveSkin = (isCollected && (!activeSkin || activeSkin === 'default')) ? 'stone' : activeSkin;
  const hasSkinGlb = !!(mk && effectiveSkin && AVAILABLE_SKINS[mk]?.has(effectiveSkin));
  const skinPath = hasSkinGlb ?
    `${BLOB_BASE}/${MONUMENT_FILE_PREFIX[mk!] ?? mk}_${effectiveSkin}.glb` : undefined;
  const model   = mk ? MODELS[mk] : undefined;
  const density = LM_DENSITY.get(p) ?? 1;
  const effS    = s * density;

  // ─── Animation state refs ───────────────────────────────────────────────────
  const prevCollectedRef = useRef(isCollected);
  const prevSkinRef = useRef(activeSkin);

  // Unlock celebration animation state
  const unlockAnimRef = useRef({
    active: false,
    time: 0,               // elapsed seconds since unlock
    ringScale: 0,
    ringOpacity: 0.7,
    modelScale: 1,
    sparkleActive: false,
  });

  // Skin switch animation state
  const skinAnimRef = useRef({
    active: false,
    time: 0,
    phase: 'idle' as 'idle' | 'fadeOut' | 'flash' | 'fadeIn',
    opacity: 1,
    rotation: 0,
    flashIntensity: 0,
  });

  // Ring animation ref (continuous for collected monuments)
  const ringRef = useRef<THREE.Mesh>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const modelGroupRef = useRef<THREE.Group>(null);
  const sparkleGroupRef = useRef<THREE.Group>(null);
  const flashLightRef = useRef<THREE.PointLight>(null);

  // Detect unlock transition (isCollected: false → true)
  useEffect(() => {
    if (isCollected && !prevCollectedRef.current) {
      unlockAnimRef.current = {
        active: true,
        time: 0,
        ringScale: 0,
        ringOpacity: 1.0,
        modelScale: 1.0,
        sparkleActive: true,
      };
    }
    prevCollectedRef.current = isCollected;
  }, [isCollected]);

  // Detect skin switch (activeSkin changes)
  useEffect(() => {
    if (prevSkinRef.current !== undefined && activeSkin !== prevSkinRef.current) {
      skinAnimRef.current = {
        active: true,
        time: 0,
        phase: 'fadeOut',
        opacity: 1,
        rotation: 0,
        flashIntensity: 0,
      };
    }
    prevSkinRef.current = activeSkin;
  }, [activeSkin]);

  // Ring color based on current skin rarity
  const ringColor = effectiveSkin ? (SKIN_RING_COLOR[effectiveSkin] ?? '#ffd700') : '#ffd700';

  // ─── Per-frame animation loop ───────────────────────────────────────────────
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05); // clamp to avoid jumps

    // === Unlock celebration animation ===
    const ua = unlockAnimRef.current;
    if (ua.active) {
      ua.time += dt;

      // Ring scale: 0 → 1.2 → 1.0 (spring bounce over 0.6s)
      if (ua.time < 0.3) {
        ua.ringScale = (ua.time / 0.3) * 1.2;
      } else if (ua.time < 0.6) {
        const t = (ua.time - 0.3) / 0.3;
        ua.ringScale = 1.2 - 0.2 * t; // 1.2 → 1.0
      } else {
        ua.ringScale = 1.0;
      }

      // Ring pulse glow for 3 seconds (opacity 0.5 → 1.0 pulsing)
      if (ua.time < 3.0) {
        ua.ringOpacity = 0.75 + 0.25 * Math.sin(ua.time * 6);
      } else {
        ua.ringOpacity = 0.7;
      }

      // Model scale pop: 1.0 → 1.15 → 1.0 over 0.5s
      if (ua.time < 0.25) {
        ua.modelScale = 1.0 + 0.15 * (ua.time / 0.25);
      } else if (ua.time < 0.5) {
        const t = (ua.time - 0.25) / 0.25;
        ua.modelScale = 1.15 - 0.15 * t;
      } else {
        ua.modelScale = 1.0;
      }

      // Sparkles active for 2 seconds
      if (ua.time > 2.0) {
        ua.sparkleActive = false;
      }

      // End unlock animation after 3 seconds
      if (ua.time >= 3.0) {
        ua.active = false;
        ua.ringScale = 1.0;
        ua.modelScale = 1.0;
      }

      // Apply model scale
      if (modelGroupRef.current) {
        const ms = ua.modelScale;
        modelGroupRef.current.scale.set(ms, ms, ms);
      }
    }

    // Apply ring animation (scale + opacity)
    if (ringRef.current) {
      const rs = ua.active ? ua.ringScale : 1.0;
      ringRef.current.scale.set(rs, rs, rs);
      // Slow continuous rotation for collected rings
      ringRef.current.rotation.z += dt * 0.3;
    }
    if (ringMatRef.current) {
      ringMatRef.current.opacity = ua.active ? ua.ringOpacity : 0.7;
    }

    // Sparkle group visibility
    if (sparkleGroupRef.current) {
      sparkleGroupRef.current.visible = ua.sparkleActive;
    }

    // === Skin switch animation ===
    const sa = skinAnimRef.current;
    if (sa.active) {
      sa.time += dt;

      switch (sa.phase) {
        case 'fadeOut':
          // Fade out over 0.3s
          sa.opacity = Math.max(0, 1 - sa.time / 0.3);
          if (sa.time >= 0.3) {
            sa.phase = 'flash';
            sa.time = 0;
            sa.opacity = 0;
            sa.flashIntensity = 2.0;
          }
          break;
        case 'flash':
          // Brief flash for 0.15s
          sa.flashIntensity = 2.0 * Math.max(0, 1 - sa.time / 0.15);
          if (sa.time >= 0.15) {
            sa.phase = 'fadeIn';
            sa.time = 0;
            sa.flashIntensity = 0;
          }
          break;
        case 'fadeIn':
          // Fade in over 0.5s
          sa.opacity = Math.min(1, sa.time / 0.5);
          // 360° rotation over 0.8s
          sa.rotation = Math.min(1, sa.time / 0.8) * Math.PI * 2;
          if (sa.time >= 0.8) {
            sa.active = false;
            sa.phase = 'idle';
            sa.opacity = 1;
            sa.rotation = 0;
            sa.flashIntensity = 0;
          }
          break;
      }

      // Apply skin switch visual effects
      if (modelGroupRef.current) {
        // Apply opacity to all mesh materials in the model
        modelGroupRef.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (mat && mat.isMeshStandardMaterial) {
              mat.transparent = true;
              mat.opacity = sa.opacity;
              mat.needsUpdate = true;
            }
          }
        });
        // Apply rotation spin
        if (sa.phase === 'fadeIn' || sa.phase === 'flash') {
          modelGroupRef.current.rotation.y = sa.rotation;
        } else {
          modelGroupRef.current.rotation.y = 0;
        }
      }

      // Flash light
      if (flashLightRef.current) {
        flashLightRef.current.intensity = sa.flashIntensity;
      }
    }
  });

  // Dismiss when another mobile city card is activated
  const posKey = `${p.pos[0]},${p.pos[1]},${p.pos[2]}`;
  useEffect(() => {
    const handler = (e: Event) => {
      const key = (e as CustomEvent<{ key: string }>).detail.key;
      if (key !== posKey) setMobileActive(false);
    };
    window.addEventListener('geknee:mobilecity', handler);
    return () => window.removeEventListener('geknee:mobilecity', handler);
  }, [posKey]);

  const handleClick = (e: React.PointerEvent<THREE.Mesh>) => {
    e.stopPropagation();
    if (!info) return;
    const key = posKey;
    if (!mobileActive) {
      window.dispatchEvent(new CustomEvent('geknee:mobilecity', { detail: { key } }));
    }
    setMobileActive(prev => !prev);
  };

  const showLabel = mobileActive;

  // Only show landmark once collected. Uncollected / mk-less decorative Lms stay hidden.
  // Placed AFTER all hooks to satisfy Rules of Hooks across isCollected transitions.
  if (!mk || !isCollected) return null;

  return (
    <group position={p.pos} quaternion={p.q}>
      <group scale={effS}>
        <group ref={modelGroupRef}>
          {(skinPath || model) ? (
            <ModelErrorBoundary fallback={model ? (
              <ModelErrorBoundary fallback={<>{children}</>}>
                <Suspense fallback={<>{children}</>}>
                  <GlbModel path={model.path} scale={1} />
                </Suspense>
              </ModelErrorBoundary>
            ) : <>{children}</>}>
              <Suspense fallback={<>{children}</>}>
                <GlbModel path={skinPath ?? model!.path} scale={1} />
              </Suspense>
            </ModelErrorBoundary>
          ) : children}
        </group>

        {/* Flash point light for skin switch transition */}
        <pointLight ref={flashLightRef} position={[0, 0.5, 0]} color="#fffbe6" intensity={0} distance={3} />

        {/* Spotlights to illuminate the skin GLB — Meshy materials are very dark
            under the scene's ambient light. These stay local (distance-capped)
            so they don't leak into neighbouring landmarks. */}
        <pointLight position={[1.2, 1.5, 1.2]}  color="#fff4d0" intensity={6} distance={3} decay={2} />
        <pointLight position={[-1.2, 1.5, -1.2]} color="#dcefff" intensity={3} distance={3} decay={2} />

        {/* Unlock sparkle burst */}
        <group ref={sparkleGroupRef} visible={false}>
          <Sparkles
            count={40}
            scale={[2, 2, 2]}
            size={6}
            speed={2}
            opacity={0.8}
            color="#ffd700"
          />
        </group>

        {isCollected && (
          <mesh ref={ringRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.6, 0.8, 32]} />
            <meshBasicMaterial ref={ringMatRef} color={ringColor} transparent opacity={0.7} />
          </mesh>
        )}

        <mesh
          position={[0, 0.5, 0]}
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true);  document.body.style.cursor = "pointer"; }}
          onPointerOut={(e)  => { e.stopPropagation(); setHovered(false); document.body.style.cursor = "auto"; }}
          onClick={handleClick as any}
        >
          <sphereGeometry args={[0.7, 6, 4]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      {showLabel && info && (
        <Html
          center
          position={[0, effS * 1.8 + 0.3, 0]}
          distanceFactor={14}
          zIndexRange={[200, 100]}
          style={{ pointerEvents: mobileActive ? "auto" : "none" }}
        >
          <LandmarkLabel
            info={info}
            planUrl={mobileActive ? `/plan/style?location=${encodeURIComponent(info.name)}` : undefined}
          />
        </Html>
      )}
    </group>
  );
}


// ─── Bridge trigger wrappers ─────────────────────────────────────────────────
// Module-private `let` bindings can't be read directly by importers, so expose
// narrow trigger functions. Setters above are already exported.
export function _triggerLmNav(loc: string) { _lmNav?.(loc); }
export function _triggerLmNavDirect(loc: string) { _lmNavDirect?.(loc); }
export function _triggerGlobeClick() { _globeClick?.(); }
export function _setOnGlobeReady(fn: (() => void) | null) { _onGlobeReady = fn; }
export function _triggerGlobeReady() { _onGlobeReady?.(); }
