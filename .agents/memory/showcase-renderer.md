---
name: Showcase renderer
description: Why the unit showcase uses the existing React Three Fiber stack rather than Threepipe.
---

Use the existing Three.js / React Three Fiber renderer for the standalone unit showcase unless a compatible Threepipe release becomes available through the workspace package registry.

**Why:** The available Threepipe package was blocked by the workspace registry and uses a different Three.js peer build. Forcing that dependency would risk duplicate or incompatible Three.js instances in the existing battle renderer.

**How to apply:** Keep the showcase lazily loaded and reuse the game's verified character asset paths. Treat any future Threepipe adoption as a compatibility migration that needs isolated verification, rather than adding it beside the current renderer.