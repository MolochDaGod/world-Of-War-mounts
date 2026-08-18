---
name: Equipment GLB bone attachment
description: Unit-scale decision when attaching GLB equipment to the character FBX skeletons.
---

# Equipment GLB → FBX bone attachment

- The equipment GLB packs are authored in metres while the character FBX rigs are in inches: rigid meshes attached to the shared container bones must be scaled by 39.3701 (metres → inches) or they render ~40× too small.
- **Why:** the mismatch is silent — weapons just look missing; the factor is exact (verified by measuring identical meshes in both formats), not a fudge.
- **How to apply:** any future bone-attachment of GLB content onto these FBX skeletons (cavalry packs, new props) needs the same conversion. Classify equipment strictly by its parent container bone, and match mesh names case-insensitively (some data references differ in case from node names).
