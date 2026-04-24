"use client";
// Atlas shell globe — full-bleed decorative Three.js sphere. The real Atlas
// will hook landmark clicks back into the trip state; this shell just shows
// the planet + stars while the bottom sheet drives the flow. Lightweight on
// purpose — no monuments, no Mapbox — so the sheet choreography is the star.

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Sphere } from "@react-three/drei";

export default function AtlasGlobe({ scale = 1 }: { scale?: number }) {
  return (
    <Canvas
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      camera={{ position: [0, 0, 26 / scale], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 6, 12]} intensity={0.95} />
      <directionalLight position={[-8, -4, -10]} intensity={0.22} color="#a78bfa" />

      <Stars radius={140} depth={60} count={3500} factor={4} saturation={0} fade speed={0.25} />

      <Sphere args={[9, 96, 96]}>
        <meshStandardMaterial
          color="#213a6b"
          roughness={0.7}
          metalness={0.05}
          emissive="#0a0a1f"
          emissiveIntensity={0.3}
        />
      </Sphere>

      <OrbitControls
        makeDefault
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
        autoRotate
        autoRotateSpeed={0.32}
      />
    </Canvas>
  );
}
