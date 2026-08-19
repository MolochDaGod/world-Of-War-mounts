---
name: Toon RTS dev memory budget
description: Rules for keeping the Vite dev session stable with the game's large public asset catalog.
---

**Rule:** Restrict Tailwind content discovery to `src`, avoid eager GLTF/scene preloads, and keep the Three.js runtime behind the active-battle lazy boundary.

**Why:** Automatic source scanning and eager game resources can make the first browser load exceed the workspace memory budget, terminating Vite instead of serving the menu.

**How to apply:** When adding UI or assets, do not widen Tailwind's source scope into the public asset tree. New battle-only renderers, loaders, and diagnostic passes belong in the lazy battle runtime or a local Suspense boundary rather than the menu entry path.

**Rule:** With Vite dependency discovery disabled, explicitly optimize lazy battle modules' CommonJS selector and scheduler dependencies, including transitive entries through their parent package.

**Why:** Lazy React Three Fiber modules can otherwise reach the browser as raw CommonJS and fail only when a battle starts, even though the menu and production bundle load normally.

**How to apply:** Keep the optimized dependency list narrow to protect menu startup. When a deferred dependency fails at runtime, use Vite's nested dependency form (`parent > dependency`) rather than hard-coding pnpm store paths.