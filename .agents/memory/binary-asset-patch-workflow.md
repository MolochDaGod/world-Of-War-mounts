---
name: Binary asset patch workflow
description: Preserve uploaded binary game assets when applying later source patches.
---

When adding uploaded binary assets, perform the final binary copy after all source-text patches, then verify the exact public URL returns the expected asset.

**Why:** In this workspace, a later text patch operation reset a newly copied GLB directory even though the source patches succeeded. This can leave code and asset tests referring to files that were present earlier in the turn but no longer exist.

**How to apply:** For new images, models, audio, or other binary public assets, finish text edits first. Copy/extract the binary asset into its canonical public directory last, run the asset-existence check, and avoid further source patch operations unless the binary asset is restored afterward.