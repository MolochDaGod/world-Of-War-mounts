---
name: Battlefield readiness gate
description: The map loading screen is authoritative before deployment begins.
---

The two-minute preparation phase begins only after the selected map's declared environment and active-army files have been fetched successfully. A failed required asset must keep the player on a visible retryable error state; cached or empty Three.js loading-manager queues are not proof that a battlefield is ready.

**Why:** The generic Three.js loading manager can finish without observing the full selected map, especially when assets are cached or queued before the UI subscribes. Starting preparation then produces a mismatch between the tactical timer and what the player can see.

**How to apply:** When adding visible map, regiment, or commander asset families, include them in the explicit selected-map readiness manifest. Do not replace this gate with a timeout or a warning-only failure path.