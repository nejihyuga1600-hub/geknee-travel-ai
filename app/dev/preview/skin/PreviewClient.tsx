'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Suspense, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

// Loads one GLB, normalises it to ~1-unit bounding box so scale is consistent
// across any Meshy export regardless of native units.
function Monument({ url, turntable }: { url: string; turntable: boolean }) {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);

  const obj = useMemo(() => {
    const c = scene.clone();
    const box = new THREE.Box3().setFromObject(c);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const norm = 2 / maxDim;
      c.scale.setScalar(norm);
      c.position.y = -box.min.y * norm;
    }
    return c;
  }, [scene]);

  useFrame((_, dt) => {
    if (turntable && ref.current) ref.current.rotation.y += dt * 0.35;
  });

  return (
    <group ref={ref}>
      <primitive object={obj} />
    </group>
  );
}

export default function PreviewClient({ url, name, style }: { url: string; name: string; style: string }) {
  const [turntable, setTurntable] = useState(true);
  const [wireframeBg, setWireframeBg] = useState(false);

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 240px', gap: 16 }}>
      <div style={{
        aspectRatio: '16/10',
        background: wireframeBg ? 'transparent' : 'radial-gradient(circle at 50% 40%, #142050, #030510)',
        border: '1px solid rgba(148,163,184,0.15)',
        borderRadius: 14,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Checker bg to reveal alpha / material edges when turned on */}
        {wireframeBg && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage:
              'linear-gradient(45deg, #1e293b 25%, transparent 25%), ' +
              'linear-gradient(-45deg, #1e293b 25%, transparent 25%), ' +
              'linear-gradient(45deg, transparent 75%, #1e293b 75%), ' +
              'linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0',
          }} />
        )}

        <Canvas camera={{ position: [3, 2, 3], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true }} style={{ position: 'absolute', inset: 0 }}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[5, 8, 5]} intensity={1.4} color="#fff4d0" />
          <directionalLight position={[-4, 3, -4]} intensity={0.6} color="#dcefff" />
          <Suspense fallback={null}>
            <Monument url={url} turntable={turntable} />
          </Suspense>
          <OrbitControls enableDamping dampingFactor={0.08} minDistance={1.5} maxDistance={12} />
          {/* Ground plane that helps judge scale / shadow */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
            <circleGeometry args={[4, 48]} />
            <meshStandardMaterial color="#0f172a" roughness={0.9} />
          </mesh>
        </Canvas>
      </div>

      <aside style={{
        background: 'rgba(15,23,42,0.6)',
        border: '1px solid rgba(148,163,184,0.15)',
        borderRadius: 14,
        padding: 18,
        display: 'flex', flexDirection: 'column', gap: 14,
        fontSize: 13, color: '#cbd5e1',
      }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.6, marginBottom: 4 }}>Blob URL</div>
          <code style={{ fontSize: 11, wordBreak: 'break-all', color: '#94a3b8' }}>{url}</code>
        </div>
        <hr style={{ border: 0, borderTop: '1px solid rgba(148,163,184,0.15)' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={turntable} onChange={(e) => setTurntable(e.target.checked)} />
          Auto-rotate
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={wireframeBg} onChange={(e) => setWireframeBg(e.target.checked)} />
          Checker backdrop
        </label>
        <hr style={{ border: 0, borderTop: '1px solid rgba(148,163,184,0.15)' }} />
        <div style={{ fontSize: 12, lineHeight: 1.5 }}>
          <strong style={{ color: '#e2e8f0' }}>Next steps:</strong><br />
          Run <code style={{ color: '#c4b5fd' }}>bin/meshy-promote.mjs {name} {style}</code> to upload + wire the skin into <code>AVAILABLE_SKINS</code>.<br /><br />
          Or delete <code style={{ color: '#fca5a5' }}>preview/{name}_{style}.glb</code> from the blob dashboard to reject.
        </div>
      </aside>
    </div>
  );
}
