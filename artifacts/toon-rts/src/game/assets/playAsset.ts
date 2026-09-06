/**
 * Play-kit URL helpers. Production bodies/anims on this host are Unity FBX
 * (cm author, scale 0.01). Equipment is glTF-binary (.glb) via useGLTF.
 * Prefer .glb/.gltf when a real binary exists; never treat SPA HTML as a mesh.
 */

export function isGltfUrl(url: string): boolean {
  return /\.(glb|gltf)(\?|#|$)/i.test(url);
}

export function isFbxUrl(url: string): boolean {
  return /\.fbx(\?|#|$)/i.test(url);
}

/** Swap .FBX → .glb for a sibling bake if one is ever uploaded. */
export function glbSibling(url: string): string {
  return url.replace(/\.fbx$/i, '.glb');
}
