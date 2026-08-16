/**
 * GameLoadingScreen
 *
 * Sits above the Canvas as a DOM overlay and hooks into THREE.DefaultLoadingManager
 * to show real loading progress.  The Canvas stays mounted behind it so FBX/texture
 * streaming begins immediately rather than waiting for the UI to appear.
 *
 * Lifecycle:
 *  1. Mount → loading=true, subscribe to DefaultLoadingManager callbacks.
 *  2. onProgress → update percentage and current asset name.
 *  3. onLoad → loading=false → 600ms CSS fade-out → unmounted via state.
 *  4. onError → log warning; non-critical assets (e.g. missing TGA) are skipped.
 *
 * The 1-second minimum display time prevents a jarring flash when the first
 * few assets load instantly from the browser cache.
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// Asset filename → human-readable category label
function assetLabel(url: string): string {
  if (/\.fbx$/i.test(url))    return 'Loading character model…';
  if (/\.tga$/i.test(url))    return 'Loading texture…';
  if (/\.png$/i.test(url))    return 'Loading texture…';
  if (/\.jpg$/i.test(url))    return 'Loading image…';
  if (/\.glb$/i.test(url))    return 'Loading 3-D asset…';
  if (/\.gltf$/i.test(url))   return 'Loading scene…';
  if (/\.wasm$/i.test(url))   return 'Initialising physics…';
  return 'Loading…';
}

interface Props {
  /** Minimum time (ms) the screen stays visible — avoids a flash on cached loads. */
  minDisplayMs?: number;
}

export function GameLoadingScreen({ minDisplayMs = 1000 }: Props) {
  const [visible,  setVisible]  = useState(true);   // CSS opacity
  const [mounted,  setMounted]  = useState(true);   // DOM presence
  const [pct,      setPct]      = useState(0);       // 0–100
  const [label,    setLabel]    = useState('Initialising engine…');

  const mountTimeRef  = useRef(Date.now());
  const doneRef       = useRef(false);

  useEffect(() => {
    const mgr = THREE.DefaultLoadingManager;

    const onStart = (_url: string, _loaded: number, total: number) => {
      if (total > 0) setPct(0);
    };

    const onProgress = (url: string, loaded: number, total: number) => {
      if (total > 0) setPct(Math.round((loaded / total) * 100));
      setLabel(assetLabel(url));
    };

    const onLoad = () => {
      if (doneRef.current) return;
      doneRef.current = true;

      const elapsed = Date.now() - mountTimeRef.current;
      const delay   = Math.max(0, minDisplayMs - elapsed);

      setTimeout(() => {
        setPct(100);
        setLabel('Ready!');

        // Fade out over 600 ms, then remove from DOM
        setTimeout(() => setVisible(false),  60);
        setTimeout(() => setMounted(false), 660);
      }, delay);
    };

    const onError = (url: string) => {
      console.warn('[GameLoader] Failed to load asset:', url);
      // Don't block — non-critical assets can fail silently
    };

    mgr.onStart    = onStart;
    mgr.onProgress = onProgress;
    mgr.onLoad     = onLoad;
    mgr.onError    = onError;

    // Fallback: if DefaultLoadingManager never fires onLoad (e.g. all assets
    // were already cached and no new items were queued), dismiss after 2s.
    const quickCheck = setTimeout(() => {
      if (!doneRef.current) onLoad();
    }, 2000);

    return () => {
      clearTimeout(quickCheck);
      // Restore no-op handlers so the manager doesn't call stale closures
      mgr.onStart    = () => {};
      mgr.onProgress = () => {};
      mgr.onLoad     = () => {};
      mgr.onError    = () => {};
    };
  }, [minDisplayMs]);

  if (!mounted) return null;

  return (
    <div
      aria-label="Loading game assets"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="absolute inset-0 z-[9999] flex flex-col items-center justify-center bg-[#080c14]"
      style={{
        transition: 'opacity 0.6s ease-out',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* ── Logo / title ── */}
      <div className="flex flex-col items-center gap-6 mb-12">
        <div className="relative">
          <span
            className="font-serif text-5xl font-bold tracking-widest select-none"
            style={{
              color: '#c8a45a',
              textShadow: '0 0 40px rgba(200,164,90,0.6), 0 0 80px rgba(200,164,90,0.3)',
            }}
          >
            RACE WARS
          </span>
          {/* Animated underline */}
          <div
            className="absolute -bottom-2 left-0 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent"
            style={{ width: `${pct}%`, transition: 'width 0.3s ease-out' }}
          />
        </div>
        <span className="text-gray-500 text-sm tracking-widest uppercase font-mono">
          Toon RTS
        </span>
      </div>

      {/* ── Progress bar ── */}
      <div className="w-80 flex flex-col gap-3">
        <div className="relative h-2 rounded-full overflow-hidden bg-white/5 border border-white/10">
          {/* Track fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${pct}%`,
              transition: 'width 0.25s ease-out',
              background: 'linear-gradient(90deg, #78350f, #d97706, #fbbf24)',
              boxShadow: '0 0 12px rgba(251,191,36,0.6)',
            }}
          />
          {/* Shimmer */}
          <div
            className="absolute inset-y-0 w-16 rounded-full"
            style={{
              left: `${pct - 5}%`,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              transition: 'left 0.25s ease-out',
            }}
          />
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-xs font-mono truncate max-w-[220px]">{label}</span>
          <span className="text-amber-500 text-xs font-mono tabular-nums">{pct}%</span>
        </div>
      </div>

      {/* ── Animated loading dots ── */}
      <div className="flex gap-1.5 mt-8">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-amber-600/60"
            style={{
              animation: 'pulse 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* ── Tip ── */}
      <p className="absolute bottom-8 text-gray-600 text-xs font-mono tracking-wider">
        Tip: Press Q / E / R / F / T to select abilities during battle
      </p>
    </div>
  );
}
