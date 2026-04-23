# Code Review: Visual Polish Commit

**Reviewed:** 2026-04-16T17:31:00Z
**Depth:** standard
**Files Reviewed:** 10 source files
**Status:** issues_found

## Summary

This commit adds modal animations, Fresnel shader atmosphere, bloom post-processing, spring camera easing, sparkle particles, a toast notification system, shimmer skeleton loading, and page fade-in. The changes are mostly additive CSS animations and visual effects. Several bugs and performance concerns were found.

---

## Critical Issues

### CR-01: ShaderMaterial uniforms recreated every render

**File:** `app/plan/location/LocationClient.tsx` (Fresnel atmosphere spheres in GlobeScene)
**Issue:** The `uniforms` object with `new THREE.Color(...)` and `{ value: ... }` is declared inline in JSX. Every render of `GlobeScene` creates new uniform objects and new `THREE.Color` instances. While R3F's `shaderMaterial` reconciler may handle this gracefully for simple cases, the shader source strings are also inline -- causing R3F to diff string props each frame. On the globe page where `useFrame` triggers continuous re-renders, this creates unnecessary GC pressure and potential shader recompilation.
**Fix:** Hoist uniforms and shader strings to module-level constants or use `useMemo`:
```tsx
// At module level (outside component):
const ATMOSPHERE_VERT = `
  varying vec3 vNormal; varying vec3 vPosition;
  void main() { ... }
`;
const ATMOSPHERE_FRAG = `...`;
const INNER_UNIFORMS = {
  glowColor: { value: new THREE.Color("#4488ff") },
  intensity: { value: 0.7 },
};
// Then in JSX: <shaderMaterial uniforms={INNER_UNIFORMS} vertexShader={ATMOSPHERE_VERT} ... />
```

### CR-02: Spring easing formula exceeds bounds (overshoots past 1.0)

**File:** `app/plan/location/LocationClient.tsx` (lines ~6093 and ~6473 in diff context)
**Issue:** The easing formula `1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 0.8)` is intended to create a damped spring feel. However, when `t` is in range ~0.0-0.625, `Math.cos(t * PI * 0.8)` is positive and `Math.pow(1-t, 3)` is large, so the result is less than 1 (fine). But at `t` around 0.7-0.9, `Math.cos(t * PI * 0.8)` goes negative (cos crosses zero at `t = 0.625`), making the expression `1 - (small_positive * negative) = 1 + positive`, so **ease exceeds 1.0**. At `t=0.8`: `1 - Math.pow(0.2, 3) * Math.cos(0.64*PI) = 1 - 0.008 * (-0.77) = 1.006`. At `t=0.7`: `1 - 0.027 * cos(0.56*PI) = 1 - 0.027 * (-0.187) = 1.005`. The overshoot is small (~0.5-1%) but it means:
- Camera zoom distance momentarily goes past the target (visible pop/snap at end)
- Quaternion slerp with `t > 1` extrapolates past the target orientation, causing a visible jitter before snapping to final position
**Fix:** Clamp the result, or use a proper spring formula:
```tsx
// Quick fix: clamp
const ease = Math.min(1, Math.max(0, 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 0.8)));

// Better: use a standard critically-damped spring
const ease = 1 - (1 + 3 * t) * Math.exp(-3 * t); // no overshoot, smooth settle
```

---

## Warnings

### WR-01: Toast timers not cleaned up on unmount (potential memory leak)

**File:** `app/components/Toast.tsx:19-22`
**Issue:** The `show` callback fires two nested `setTimeout` calls (at 3500ms and 3800ms) but never stores or clears the timer IDs. If the `ToastProvider` unmounts before timers fire (e.g., during navigation), the `setToasts` calls execute on an unmounted component. In React 18+ with concurrent features this can cause warnings and leaked state updates. In a layout-level provider this is low-risk (rarely unmounts), but it is still a defect.
**Fix:** Track timer IDs and clear on unmount:
```tsx
const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

const show = useCallback((message: string, type: ToastType = 'info') => {
  const id = _nextId++;
  setToasts(prev => [...prev, { id, message, type }]);
  const t1 = setTimeout(() => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    const t2 = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timersRef.current.delete(t2);
    }, 300);
    timersRef.current.add(t2);
    timersRef.current.delete(t1);
  }, 3500);
  timersRef.current.add(t1);
}, []);

useEffect(() => () => timersRef.current.forEach(clearTimeout), []);
```

### WR-02: Module-level mutable counter (`_nextId`) unsafe with SSR/concurrent rendering

**File:** `app/components/Toast.tsx:11`
**Issue:** `let _nextId = 0` is a module-level mutable variable. In SSR environments (Next.js), this variable is shared across all requests in the same server process. While toast IDs are only used client-side (the file has `'use client'`), the module still gets loaded server-side for the initial render. If `show` were ever called during SSR (unlikely but possible in edge cases), IDs would leak across requests. More practically, with React StrictMode double-invocation in dev, IDs will skip numbers (cosmetic, not a bug).
**Fix:** Move the counter inside the provider using `useRef`:
```tsx
const nextIdRef = useRef(0);
// In show: const id = nextIdRef.current++;
```

### WR-03: `pageFadeIn` animation wrapper replays on every client-side navigation

**File:** `app/layout.tsx:37`
**Issue:** The `<div style={{ animation: 'pageFadeIn 0.35s ease-out' }}>{children}</div>` wraps all children in the root layout. In Next.js App Router, the root layout persists across navigations -- it does NOT remount. So this animation only fires once on initial page load. However, if the intent was per-page transitions, this does not achieve that. More importantly, the wrapper div adds an extra DOM node around every page, which could interfere with flex/grid layouts that expect direct children.
**Fix:** If the animation should be per-page, move it to a client component that uses `usePathname()` as a key to re-trigger. If it is only for initial load, consider applying it to `<body>` directly instead of adding a wrapper div.

### WR-04: Bloom + Fresnel + Sparkles GPU cost stacking

**File:** `app/plan/location/LocationClient.tsx` (GlobeScene + LocationPage)
**Issue:** The commit adds three GPU-intensive features simultaneously: two Fresnel shader spheres (96x96 segments each = ~18K triangles per sphere), Sparkles particle system (60 particles with billboard rendering), and full-screen Bloom post-processing (requires extra render passes + mipmap blur). While Bloom is gated by `!isMobile`, the Fresnel shaders and Sparkles are NOT gated. On low-end mobile GPUs (which this codebase already detects via `isMobile`), the two extra 96-segment spheres with custom fragment shaders add meaningful fill-rate cost on top of the existing globe rendering.
**Fix:** Gate the Fresnel spheres behind `!isMobile` or reduce mobile segment count:
```tsx
<Sphere args={[R * 1.025, isMobile ? 32 : 96, isMobile ? 32 : 96]}>
```
And gate Sparkles similarly: `{flying && !isMobile && <Sparkles ... />}`

---

## Info

### IN-01: Duplicate shader code between inner and outer atmosphere

**File:** `app/plan/location/LocationClient.tsx`
**Issue:** The vertex and fragment shaders for the inner and outer atmosphere spheres are identical except for the `pow` exponent (3.0 vs 2.0). This is ~30 lines of duplicated inline GLSL.
**Fix:** Extract a shared shader factory or parameterize via uniforms (add a `falloff` uniform instead of hardcoding the exponent).

### IN-02: `colors` and `icons` objects recreated every render in ToastProvider

**File:** `app/components/Toast.tsx:25-35`
**Issue:** The `colors` and `icons` record objects are declared inside the component body, so they are recreated on every render. These are static data.
**Fix:** Move them to module level (above the component function).

### IN-03: Shimmer skeleton animation delay uses string concatenation for CSS

**File:** `app/plan/summary/page.tsx` (shimmer skeleton section)
**Issue:** The animation property `animation: shimmer 1.5s infinite linear ${i * 0.1}s` uses template literal interpolation for the delay. This is fine functionally, but the inline style objects are recreated each render for the 5 skeleton bars. Minor -- cosmetic only.
**Fix:** No action needed, but could extract to a small CSS class with `animation-delay` custom property for cleanliness.

---

_Reviewed: 2026-04-16T17:31:00Z_
_Reviewer: Claude (code-reviewer)_
_Depth: standard_
