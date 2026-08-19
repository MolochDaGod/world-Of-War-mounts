import * as THREE from 'three';
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader.js';
import { GameScene } from './GameScene';
import { GameLoadingScreen } from './assets/GameLoadingScreen';

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
  return (
    <>
      <GameLoadingScreen minDisplayMs={800} />
      <GameScene />
    </>
  );
}