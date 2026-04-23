'use client';
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type MonumentMarker = {
  mk: string;
  name: string;
  lat: number;
  lon: number;
  glbUrl: string;
  ringColor: string;
};

type Props = {
  name: string;
  lat: number;
  lon: number;
  monuments: MonumentMarker[];
  onClose: () => void;
};

// Mapbox zoom 0 = whole earth, 7 ≈ country, 10 ≈ city, 14 ≈ neighbourhood.
const RETURN_TO_GLOBE_ZOOM = 7;
// Fit each GLB to a ~120 m bounding cube — real Eiffel is 330 m but that
// dominates the view at city zoom; iconic-but-not-overwhelming reads better.
const MODEL_METERS = 120;

export default function CityMapView({ name, lat, lon, monuments, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Controls both the 3D layer and the ring visibility.
  const [showMonuments, setShowMonuments] = useState(true);
  const showMonumentsRef = useRef(showMonuments);
  showMonumentsRef.current = showMonuments;

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !containerRef.current) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [lon, lat],
      zoom: 12,
      pitch: 45,
      bearing: 0,
      antialias: true,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

    const onZoom = () => {
      if (map.getZoom() < RETURN_TO_GLOBE_ZOOM) onCloseRef.current();
    };
    map.on('zoomend', onZoom);

    map.on('style.load', () => {
      map.setFog({
        color: 'rgb(6, 8, 22)',
        'horizon-blend': 0.25,
        'space-color': 'rgb(6, 8, 22)',
        'star-intensity': 0.3,
      });

      if (!map.getLayer('3d-buildings')) {
        map.addLayer({
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': '#cbd5e1',
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 14.5, ['get', 'height']],
            'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 14, 0, 14.5, ['get', 'min_height']],
            'fill-extrusion-opacity': 0.85,
          },
        });
      }

      addMonumentRings(map, monuments);
      if (monuments.length > 0) addMonumentModelLayer(map, monuments, showMonumentsRef);
    });

    return () => {
      map.off('zoomend', onZoom);
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lon, monuments]);

  // Sync toggle state into Mapbox layers imperatively so we don't rebuild the whole map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const vis = showMonuments ? 'visible' : 'none';
    if (map.getLayer('monument-rings'))  map.setLayoutProperty('monument-rings', 'visibility', vis);
    if (map.getLayer('monument-models')) map.setLayoutProperty('monument-models', 'visibility', vis);
  }, [showMonuments]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#060816',
      animation: 'mapFadeIn 0.3s ease-out',
    }}>
      <style>{`@keyframes mapFadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>

      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {!token && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: 'system-ui', textAlign: 'center', padding: 32,
        }}>
          <div style={{ maxWidth: 520, background: 'rgba(6,8,22,0.85)', border: '1px solid rgba(100,210,255,0.3)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>Mapbox token required</h2>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: '#c0ecff' }}>
              Add <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> to your Vercel environment variables.
            </p>
          </div>
        </div>
      )}

      {/* City name + exit hint */}
      <div style={{
        position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(6,8,22,0.85)', border: '1px solid rgba(100,210,255,0.4)',
        backdropFilter: 'blur(12px)', borderRadius: 10,
        color: '#fff', fontSize: 13, fontWeight: 700,
        padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <span>{name}</span>
        <span style={{ opacity: 0.5, fontSize: 11, fontWeight: 500 }}>zoom out to return to globe</span>
      </div>

      {/* Monument visibility toggle */}
      {monuments.length > 0 && (
        <button
          onClick={() => setShowMonuments((v) => !v)}
          style={{
            position: 'absolute', top: 18, left: 18,
            background: 'rgba(6,8,22,0.85)',
            border: `1px solid ${showMonuments ? 'rgba(245,158,11,0.6)' : 'rgba(100,210,255,0.4)'}`,
            backdropFilter: 'blur(12px)', borderRadius: 10,
            color: '#fff', fontSize: 12, fontWeight: 700,
            padding: '10px 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {showMonuments ? 'Hide monuments' : 'Show monuments'}
        </button>
      )}
    </div>
  );
}

// ─── Golden rings (native Mapbox layer) ───────────────────────────────────────
// A GeoJSON circle layer per-feature — rendered as a 2D footprint on the ground.
// Keeps the visual cue from the globe without fighting the 3D layer for ordering.
function addMonumentRings(map: mapboxgl.Map, monuments: MonumentMarker[]) {
  if (monuments.length === 0) return;
  const features = monuments.map((mon) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [mon.lon, mon.lat] },
    properties: { mk: mon.mk, name: mon.name, ringColor: mon.ringColor },
  }));
  if (!map.getSource('monument-points')) {
    map.addSource('monument-points', { type: 'geojson', data: { type: 'FeatureCollection', features } });
  }
  if (!map.getLayer('monument-rings')) {
    map.addLayer({
      id: 'monument-rings',
      type: 'circle',
      source: 'monument-points',
      paint: {
        'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 10, 10, 18, 80],
        'circle-color': 'rgba(0,0,0,0)',
        'circle-stroke-width': 3,
        'circle-stroke-color': ['get', 'ringColor'],
        'circle-stroke-opacity': 0.9,
        'circle-pitch-alignment': 'map',
      },
    });
  }
}

// ─── 3D monument GLBs (custom Three.js layer) ─────────────────────────────────
function addMonumentModelLayer(
  map: mapboxgl.Map,
  monuments: MonumentMarker[],
  showRef: { current: boolean },
) {
  type GroupEntry = {
    mk: string;
    group: THREE.Group;
    transform: { x: number; y: number; z: number; scale: number };
  };

  let camera: THREE.Camera;
  let scene: THREE.Scene;
  let renderer: THREE.WebGLRenderer;
  const groups: GroupEntry[] = [];

  function transformFor(lat: number, lon: number) {
    const mc = mapboxgl.MercatorCoordinate.fromLngLat([lon, lat], 0);
    return {
      x: mc.x,
      y: mc.y,
      z: mc.z,
      scale: mc.meterInMercatorCoordinateUnits() * MODEL_METERS,
    };
  }

  const layer: mapboxgl.CustomLayerInterface = {
    id: 'monument-models',
    type: 'custom',
    renderingMode: '3d',

    onAdd(_map, gl) {
      camera = new THREE.Camera();
      scene = new THREE.Scene();

      // Lights: generous ambient so PBR materials don't read black, plus a warm
      // key + cool fill for dimensionality. These live on the SCENE so every
      // renderer.render(scene, ...) call actually lights the monuments.
      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const key = new THREE.DirectionalLight(0xfff4d0, 1.2);
      key.position.set(1, 1, 1).normalize();
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xdcefff, 0.5);
      fill.position.set(-1, 0.5, -0.5).normalize();
      scene.add(fill);

      renderer = new THREE.WebGLRenderer({
        canvas: _map.getCanvas(),
        context: gl,
        antialias: true,
      });
      renderer.autoClear = false;

      const loader = new GLTFLoader();
      monuments.forEach((mon) => {
        loader.load(
          mon.glbUrl,
          (gltf) => {
            // Normalize to ~1 unit bounding cube so MODEL_METERS controls the final size
            const obj = gltf.scene;
            const box = new THREE.Box3().setFromObject(obj);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            const norm = maxDim > 0 ? 1 / maxDim : 1;
            obj.scale.setScalar(norm);
            // Base at y=0 in group space
            obj.position.y = -box.min.y * norm;

            const group = new THREE.Group();
            group.add(obj);
            scene.add(group);
            groups.push({ mk: mon.mk, group, transform: transformFor(mon.lat, mon.lon) });
          },
          undefined,
          (err) => console.warn('[CityMapView] GLB load failed', mon.mk, err),
        );
      });
    },

    render(_gl, matrix) {
      if (!renderer || !scene || !showRef.current) return;

      const base = new THREE.Matrix4().fromArray(matrix as unknown as number[]);
      const rotX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);

      renderer.resetState();

      // Render scene once per monument: hide all other groups, set projection
      // to that group's local transform, render scene (lights apply).
      for (let i = 0; i < groups.length; i++) {
        const { group, transform } = groups[i];
        for (let j = 0; j < groups.length; j++) groups[j].group.visible = i === j;

        const local = new THREE.Matrix4()
          .makeTranslation(transform.x, transform.y, transform.z)
          .scale(new THREE.Vector3(transform.scale, -transform.scale, transform.scale))
          .multiply(rotX);

        camera.projectionMatrix = base.clone().multiply(local);
        renderer.render(scene, camera);
      }

      // Restore visibility so subsequent frames don't lose a group.
      for (let j = 0; j < groups.length; j++) groups[j].group.visible = true;

      map.triggerRepaint();
    },
  };

  map.addLayer(layer);
}
