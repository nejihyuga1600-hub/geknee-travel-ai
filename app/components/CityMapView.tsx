'use client';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type MonumentMarker = { mk: string; name: string; lat: number; lon: number; glbUrl: string };

type Props = {
  name: string;
  lat: number;
  lon: number;
  monuments: MonumentMarker[];
  onClose: () => void;
};

// Mapbox zoom 0 = whole earth, 10 = city, 14 = neighbourhood. Below this we
// assume the user has zoomed out of the city and return to the 3D globe.
const RETURN_TO_GLOBE_ZOOM = 7;
// Render GLBs at roughly iconic scale — ~300m is taller than a real Eiffel (330m)
// but reads clearly at city zoom. Tune per-monument later if needed.
const MODEL_METERS = 300;

export default function CityMapView({ name, lat, lon, monuments, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

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
    new mapboxgl.Marker({ color: '#f59e0b' }).setLngLat([lon, lat]).addTo(map);

    // Auto-return to globe if user zooms out past the city-region threshold.
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

      if (monuments.length === 0) return;
      addMonumentLayer(map, monuments);
    });

    return () => {
      map.off('zoomend', onZoom);
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lon, monuments]);

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
    </div>
  );
}

// ─── Mapbox custom layer: renders each collected monument's GLB at its lat/lon ──
// Works by sharing the Mapbox canvas GL context with a Three.js WebGLRenderer.
// Mapbox hands us a model-view-projection matrix per frame (in Mercator world
// coords); we wrap each monument in a group positioned at its mercator coord
// and scaled by meter-in-mercator-units so MODEL_METERS renders as N real metres.
function addMonumentLayer(map: mapboxgl.Map, monuments: MonumentMarker[]) {
  let camera: THREE.Camera;
  let scene: THREE.Scene;
  let renderer: THREE.WebGLRenderer;
  const groups = new Map<string, { group: THREE.Group; transform: ReturnType<typeof modelTransformFor> }>();

  function modelTransformFor(lat: number, lon: number) {
    const mc = mapboxgl.MercatorCoordinate.fromLngLat([lon, lat], 0);
    const scale = mc.meterInMercatorCoordinateUnits() * MODEL_METERS;
    return {
      translateX: mc.x,
      translateY: mc.y,
      translateZ: mc.z,
      rotateX: Math.PI / 2,
      rotateY: 0,
      rotateZ: 0,
      scale,
    };
  }

  const customLayer: mapboxgl.CustomLayerInterface = {
    id: 'collected-monuments',
    type: 'custom',
    renderingMode: '3d',

    onAdd(_map, gl) {
      camera = new THREE.Camera();
      scene = new THREE.Scene();
      // Soft fill so materials aren't pitch black from their PBR side
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dir = new THREE.DirectionalLight(0xffffff, 1.2);
      dir.position.set(0.6, -0.7, 0.8);
      scene.add(dir);

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
            const group = new THREE.Group();
            // Re-seat the model's bounding box so the base sits at y=0 (ground plane)
            const obj = gltf.scene;
            const box = new THREE.Box3().setFromObject(obj);
            obj.position.y = -box.min.y;
            group.add(obj);
            const transform = modelTransformFor(mon.lat, mon.lon);
            groups.set(mon.mk, { group, transform });
            scene.add(group);
          },
          undefined,
          (err) => console.warn('[CityMapView] GLB load failed', mon.mk, err),
        );
      });
    },

    render(_gl, matrix) {
      if (!renderer || !scene) return;

      const m = new THREE.Matrix4().fromArray(matrix as unknown as number[]);

      // Reset then render each monument at its own transform.
      renderer.resetState();
      groups.forEach(({ group, transform }) => {
        const rotX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), transform.rotateX);
        const l = new THREE.Matrix4()
          .makeTranslation(transform.translateX, transform.translateY, transform.translateZ)
          .scale(new THREE.Vector3(transform.scale, -transform.scale, transform.scale))
          .multiply(rotX);
        group.matrix.identity();
        group.matrixAutoUpdate = false;
        camera.projectionMatrix = m.clone().multiply(l);
        renderer.render(group, camera);
      });

      map.triggerRepaint();
    },
  };

  map.addLayer(customLayer);
}
