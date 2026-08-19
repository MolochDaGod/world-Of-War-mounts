---
name: Toon RTS dev memory budget
description: Rules for keeping the Vite dev session stable with the game's large public asset catalog.
---

**Rule:** Restrict Tailwind content discovery to `src`, avoid eager GLTF/scene preloads, and keep the Three.js runtime behind the active-battle lazy boundary.

**Why:** Automatic source scanning and eager game resources can make the first browser load exceed the workspace memory budget, terminating Vite instead of serving the menu.

**How to apply:** When adding UI or assets, do not widen Tailwind's source scope into the public asset tree. New battle-only renderers, loaders, and diagnostic passes belong in the lazy battle runtime or a local Suspense boundary rather than the menu entry path.