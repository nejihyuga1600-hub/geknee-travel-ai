"use client";
// Atlas shell globe — Earth-textured Three.js sphere. Stepping stone: uses
// /public/earth_terrain.jpg so the atlas preview reads as a real planet, not
// a placeholder ball. Full GlobeScene (country borders, monuments, click-to-
// fly) lives in LocationClient.tsx and is a separate extraction.

import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, Stars, Sphere } from "@react-three/drei";
import { Suspense } from "react";
import * as THREE from "three";

function EarthSphere() {
  const [color, bump] = useLoader(THREE.TextureLoader, [
    "/earth_terrain.jpg",
    "/earth_bump.jpg",
  ]);
  // Equirectangular textures need linear filtering and sRGB color space
  color.colorSpace = THREE.SRGBColorSpace;
  return (
    <Sphere args={[9, 128, 128]}>
      <meshStandardMaterial
        map={color}
        bumpMap={bump}
        bumpScale={0.06}
        roughness={0.85}
        metalness={0.02}
      />
    </Sphere>
  );
}

export default function AtlasGlobe({ scale = 1 }: { scale?: number }) {
  return (
    <Canvas
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      camera={{ position: [0, 0, 26 / scale], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[10, 6, 12]} intensity={1.1} />
      <directionalLight position={[-8, -4, -10]} intensity={0.18} color="#a78bfa" />

      <Stars radius={140} depth={60} count={3500} factor={4} saturation={0} fade speed={0.25} />

      <Suspense fallback={
        <Sphere args={[9, 64, 64]}>
          <meshStandardMaterial color="#213a6b" roughness={0.7} />
        </Sphere>
      }>
        <EarthSphere />
      </Suspense>

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
