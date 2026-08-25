import * as THREE from 'three';
import { useEffect } from 'react';
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader.js';
import { GameScene } from './GameScene';
import { GameLoadingScreen } from './assets/GameLoadingScreen';
import { preloadBattleAssets } from './assets/mapAssetGate';
import { useGameStore } from './store/gameStore';
import {
  markGameRuntimeMounted,
  markGameRuntimeUnmounted,
} from './diagnostics/runtimeLifecycleDiagnostics';

// Register the FBX texture loader only when the battle runtime is requested.
THREE.DefaultLoadingManager.addHandler(/\.tga$/i, new TGALoader());

// Avoid validating the full FBX catalog while the player is still on the menu.
if (import.meta.env.DEV) {
  import('./assets/checkFbxPaths').then(({ checkFbxPaths }) => checkFbxPaths());
}

/**
 * The complete Three.js runtime is intentionally a separate lazy chunk.
 * Menus do not need the canvas or its world assets, so defer both until a
 * battle starts instead of loading models while the player picks an army.
 */
export function GameRuntime() {
  const phase = useGameStore(s => s.phase);
  const mapType = useGameStore(s => s.mapType);
  const units = useGameStore(s => s.units);
  const assetLoadKey = useGameStore(s => s.preparationAssetLoadKey);

  useEffect(() => {
    markGameRuntimeMounted();
    return () => {
      markGameRuntimeUnmounted();
    };
  }, []);

  useEffect(() => {
    if (phase !== 'preparation') return;

    const controller = new AbortController();
    const { setPreparationAssetProgress, markPreparationAssetsReady, setPreparationAssetError } =
      useGameStore.getState();

    void preloadBattleAssets(
      mapType,
      units,
      ({ completed, total, message }) => {
        setPreparationAssetProgress(total > 0 ? Math.round((completed / total) * 100) : 100, message);
      },
      controller.signal,
    ).then(() => {
      if (!controller.signal.aborted) markPreparationAssetsReady();
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setPreparationAssetError(error instanceof Error ? error.message : 'Unable to load required battlefield assets.');
      }
    });

    return () => controller.abort();
  }, [assetLoadKey, mapType, phase, units]);

  return (
    <>
      <GameLoadingScreen />
      <GameScene />
    </>
  );
}