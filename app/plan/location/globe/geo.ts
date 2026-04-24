// Globe geometry constants + pure math helpers. No React, no r3f, no DOM —
// safe to import from any context.
//
// Split #2 from LocationClient.tsx.

import * as THREE from 'three';

// Globe radius in world units. Landmarks + cities + labels all scale by R.
export const R = 10;

// Quaternion-carrying surface position used by the Lm component to orient
// landmarks so their local Y points outward from the sphere centre.
export type SurfPos = { pos: [number, number, number]; q: THREE.Quaternion };

/**
 * Converts lat/lon to a 3-D surface position on the globe plus the
 * quaternion that rotates local Y → the outward radial direction.
 *
 * Convention (matches Three.js SphereGeometry UV seam):
 *   lon = 0° (Greenwich) → +X
 *   lon = 90°E           → -Z
 *   lon = 90°W           → +Z
 */
export function geo(lat: number, lon: number): SurfPos {
  const φ = (lat * Math.PI) / 180;
  const λ = (lon * Math.PI) / 180;
  const x =  R * Math.cos(φ) * Math.cos(λ);
  const y =  R * Math.sin(φ);
  const z = -R * Math.cos(φ) * Math.sin(λ);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(x, y, z).normalize(),
  );
  return { pos: [x, y, z], q };
}

/**
 * Position-only variant of geo() for places that don't need orientation
 * (city dots, state labels, scattered pins).
 */
export function geoPos(lat: number, lon: number, r: number): [number, number, number] {
  const phi = (lat * Math.PI) / 180;
  const lam = (lon * Math.PI) / 180;
  return [
     r * Math.cos(phi) * Math.cos(lam),
     r * Math.sin(phi),
    -r * Math.cos(phi) * Math.sin(lam),
  ];
}

// Landmark density thresholds — used by Lm to shrink landmarks that are
// packed close together so they don't overlap at default scale.
export const DENSITY_THR = 6;   // degrees
export const DENSITY_MIN = 0.3; // floor (never smaller than 30% of base)
