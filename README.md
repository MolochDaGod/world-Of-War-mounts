# world-Of-War-mounts

**Staged Total War battle** (Warhammer 40k 3 / Total War–like): army builder → deployment → real-time RTS control of Toon RTS regiments.

**Live:** https://world-of-war-mounts.vercel.app/

This host is **not** the Warlords island MMO. Harvest, auto-harvest, camp bag, and NPC island defense stay on Open / Warlords (`open.grudge-studio.com`, `grudgewarlords.com`). Those modules still exist in this repo but are **not mounted** on the battlefield so they do not fight the RTS mouse.

pnpm catalog workspace. Do **not** run `npm install` (that fails with `EUNSUPPORTEDPROTOCOL catalog:`).

## Apps

| Package | Role |
|---------|------|
| `@workspace/toon-rts` | Vite SPA — battlefield, HUD, loaders |
| `@workspace/api-server` | REST `/api/game` sessions (optional; SPA still plays locally) |

## Loaders and file types

Play uses **one mixer per soldier**. Do not add a second `AnimationMixer`.

| Asset | Format on this host | Loader |
|-------|---------------------|--------|
| Race body / cavalry / siege | Unity **FBX** (`/assets/Toon_RTS/…/*.FBX`) | `useFBX` → `SkeletonUtils.clone` |
| Locomotion + attack clips | **FBX** (`/assets/characters/animations/*.fbx` + race packs) | `useFBX` + `SkeletonUtils.retargetClip`, position tracks stripped |
| Weapons / shields / quivers | **glTF-binary `.glb`** | `useGLTF` (drei), bone-parented to Bip001 / `R_hand_container` aliases |
| HUD chrome | PNG (`/ui/hud/*`, CraftPix slots) | CSS `border-image` |
| Missing `.glb` / `.gltf` | **Must 404** — never SPA HTML | `vercel.json` excludes `/assets/` and `/ui/` from the catch-all rewrite |

Author FBX is centimetres. Render scale is **0.01** so a ~1.8 m human is ~1.8 world units. Feet are planted from the **bone box min.y**, not pelvis.

There is **no** production `.glb` race kit on this Vercel host yet (HEAD of `*.glb` was `text/html` SPA). Equipment GLBs are the glTF path. When race GLBs are uploaded next to the FBX, point `ToonRTSManifest` at `.glb` and keep the same regiment component.

## RTS controls (battle)

| Input | Action |
|-------|--------|
| LMB drag | Box-select team 1 |
| LMB click | Select (Shift add/remove). Enemy click = focus fire |
| RMB ground | Attack-move. **Shift+RMB** = move only |
| RMB enemy | Focus attack |
| Wheel | Zoom toward cursor |
| WASD / arrows / screen edge | Pan. MMB pan. Alt+MMB orbit |
| M / F / P / L | Move / Fight / Patrol / Lob |
| Esc | Cancel mode and pending skill |

HUD: CraftPix 9-slice panels + command/ability bars (`OpenWorldHUD`).

**One RTS mouse path:** `RTSInputController` (window capture). Do not add R3F `onClick` / `onPointerMissed` for select. `GameHUD` / `FBXUnit` are leftover files, not mounted.

## Local

```bash
COREPACK_ENABLE_STRICT=0 pnpm install
COREPACK_ENABLE_STRICT=0 pnpm --filter @workspace/toon-rts dev
```

API (optional):

```bash
PORT=8080 COREPACK_ENABLE_STRICT=0 pnpm --filter @workspace/api-server start
```

## Deploy

**Vercel** (`vercel.json`): pnpm install (not frozen), `pnpm --filter @workspace/toon-rts build`, output `artifacts/toon-rts/dist/public`. Root directory = repo root.

**Railway** (`railway.json`): `@workspace/api-server`. Health `/health`.

```bash
npx vercel --prod --yes --scope grudgenexus
```

## Notes

- `packageManager`: `pnpm@9.15.9`. `catalog:` specifiers need pnpm.
- Gameplay AI is Yuka-style seek/separation + aggro rings inside `CombatSystem` (no extra `yuka` package on this leaf).
- REST session calls are fire-and-forget; missing API does not block play.
