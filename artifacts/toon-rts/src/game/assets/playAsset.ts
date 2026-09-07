/**
 * Play-kit URL helpers + uniform SI fit (1 unit = 1 m, human ~1.8 m).
 * Never non-uniform scale. Never treat SPA HTML as a mesh.
 */
import * as THREE from 'three';

export const HUMAN_HEIGHT_M = 1.8;

export function isGltfUrl(url: string): boolean {
  return /\.(glb|gltf)(\?|#|$)/i.test(url);
}

export function isFbxUrl(url: string): boolean {
  return /\.fbx(\?|#|$)/i.test(url);
}

export function glbSibling(url: string): string {
  return url.replace(/\.fbx$/i, '.glb');
}

/** Bone-box in world space — not unskinned mesh AABB, not pelvis-as-feet. */
export function boneBodyBox(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const wp = new THREE.Vector3();
  let bones = 0;
  root.traverse(obj => {
    if ((obj as THREE.Bone).isBone) {
      obj.getWorldPosition(wp);
      box.expandByPoint(wp);
      bones++;
    }
  });
  if (bones < 4) {
    root.traverse(node => {
      const skinned = node as THREE.SkinnedMesh;
      if (skinned.isSkinnedMesh && skinned.visible) {
        try {
          box.expandByObject(skinned);
        } catch {
          /* skip */
        }
      }
    });
  }
  return box;
}

/**
 * Uniform SI fit. Reset scale, snap 10×/100×, then residual toward 1.8 m.
 * Does not stretch axes. Does not height-fit weapons.
 */
export function fitToonKitSi(root: THREE.Object3D, targetH = HUMAN_HEIGHT_M): number {
  root.scale.setScalar(1);
  root.updateMatrixWorld(true);
  const h0 = boneBodyBox(root).getSize(new THREE.Vector3()).y;
  if (!(h0 > 0.001) || !Number.isFinite(h0)) return 1;
  const decade = Math.pow(10, Math.round(Math.log10(targetH / h0)));
  if (Number.isFinite(decade) && decade > 0) {
    root.scale.multiplyScalar(decade);
  }
  root.updateMatrixWorld(true);
  const h1 = boneBodyBox(root).getSize(new THREE.Vector3()).y;
  if (h1 > 0.001 && Number.isFinite(h1)) {
    const residual = targetH / h1;
    if (residual > 0.02 && residual < 12) {
      root.scale.multiplyScalar(residual);
    }
  }
  return root.scale.x;
}

export function groundKitFeet(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  const box = boneBodyBox(root);
  if (!Number.isFinite(box.min.y)) return;
  root.position.y -= box.min.y;
}
