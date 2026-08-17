---
name: Zustand v5 + R3F subscription cascade
description: How Zustand v5 useSyncExternalStore causes "Maximum update depth exceeded" in React Three Fiber, and the patterns that fix it.
---

## The Problem

Zustand v5 uses `useSyncExternalStore`, which sends **synchronous notifications** to ALL React subscribers every time `set()` is called. Inside an R3F Canvas, `useFrame` callbacks run at 60fps and frequently call Zustand actions (e.g. `tickTime`, `updateUnit`, `moveAnimal`). When multiple React components subscribe to state that is written at high frequency, the synchronous notification storm exceeds React's maximum update depth limit.

**Error**: `Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate.`

## Root Cause Pattern

Any component using `useStore(s => s.someHighFrequencyState)` where `someHighFrequencyState` is written inside a `useFrame` callback (directly or via a store action called from useFrame) will trigger synchronous React re-renders at frame rate.

Compounding factors:
- Multiple components subscribing to the same high-frequency state (cascading updates)
- Components INSIDE the Canvas (e.g. UnitManager) cascading into the R3F render cycle
- Whole-store subscriptions: `useStore()` with no selector

## Crash-Causing Examples Found in This Project

| Component | Bad subscription | Write frequency |
|---|---|---|
| `TimeOfDay` | `s => s.timeOfDay` | 60fps (WorldTick useFrame) |
| `UnitManager` | `s => s.units` | 30Hz (CombatSystem useFrame) |
| `GameHUD` | `useGameStore()` no selector | Whole store, 30Hz |
| `OpenWorldHUD` | `s => s.units` | 30Hz |
| `WildAnimals` | `s => s.animals`, `s => s.units` | 10Hz × N animals |
| `BaseUnit` | Full `unit` prop from UnitManager | 30Hz via parent |

## Fix Patterns

### 1. Derived primitive selector (most important)
For state that changes at high frequency, derive a primitive (string/number/boolean) that only changes on meaningful game events. Zustand compares with `Object.is`, so primitive stability breaks the cascade.

```tsx
// BAD — re-renders at 30Hz when any unit updates
const units = useGameStore(s => s.units);

// GOOD — only re-renders when a unit dies (boolean flip)
const showEndScreen = useGameStore(s => {
  const { units } = s;
  if (units.length === 0) return false;
  return !units.some(u => u.teamId === 1 && u.state !== 'dead')
      || !units.some(u => u.teamId === 2 && u.state !== 'dead');
});

// GOOD — only re-renders when units are added/removed (string changes)
const unitMetaStr = useGameStore(
  s => s.units.map(u => `${u.id}|${u.race}|${u.type}|${u.teamId}`).join(',')
);
```

### 2. getState() inside useFrame (for position/movement)
Position, velocity, targetPosition — anything that changes every frame — must be read from `getState()` inside `useFrame`, never subscribed reactively.

```tsx
// BAD — subscribes to position (written 30Hz)
const unit = useGameStore(s => s.units.find(u => u.id === unitId));
useFrame(() => { grp.position.set(...unit.position); }); // stale closure too

// GOOD — reads fresh from store every frame, no React subscription
useFrame(() => {
  const unit = useGameStore.getState().units.find(u => u.id === unitId);
  if (!unit) return;
  const [tx, , tz] = unit.position;
  grp.position.x += (tx - grp.position.x) * 0.18;
});
```

### 3. Per-entity subscriptions (break aggregate cascade)
Instead of one parent subscribing to all entities, each entity subscribes to its own slice. With primitive selectors, each entity only re-renders when its own state changes.

```tsx
// BAD — UnitManager subscribes to ALL units, re-renders on any unit change
const units = useGameStore(s => s.units);
// renders <FBXUnit unit={unit} /> — prop changes at 30Hz

// GOOD — UnitManager subscribes to stable ID list only
const unitMetaStr = useGameStore(s => s.units.map(u => `${u.id}|...`).join(','));
// renders <FBXUnit unitId={id} /> — each FBXUnit subscribes to its OWN unit
// FBXUnit internally: useGameStore(s => s.units.find(u => u.id === unitId)?.health ?? 0)
```

### 4. Interval polling for display-only time values
For UI elements that display time derived from 60fps state (e.g. clock), poll at display frequency (1Hz) instead of subscribing.

```tsx
// BAD — TimeOfDay subscribes to timeOfDay (written 60fps)
const timeOfDay = useWorldStore(s => s.timeOfDay);

// GOOD — polls getState() at 1Hz, no Zustand subscription
const [display, setDisplay] = useState(() => useWorldStore.getState());
useEffect(() => {
  const id = setInterval(() => {
    const s = useWorldStore.getState();
    setDisplay({ timeOfDay: s.timeOfDay, dayCount: s.dayCount });
  }, 1000);
  return () => clearInterval(id);
}, []);
```

## Why

Zustand v5 changed from v4's batched `setState` to `useSyncExternalStore` which uses React's synchronous render scheduling. In React 18 Concurrent Mode, synchronous external store changes can bypass React's batching and trigger immediate synchronous renders. When multiple high-frequency writes happen inside a single rAF tick (from useFrame), the accumulated synchronous render requests exceed React's internal update depth limit (≈25 nested synchronous renders).

## How to Apply

Any time a component inside an R3F Canvas OR a high-frequency-rendered DOM component subscribes to state written inside `useFrame`:
1. Check if the subscription can be replaced with a derived primitive selector
2. Move position/velocity reads to `getState()` inside `useFrame`
3. For collections (units, animals), use a stable ID-list selector + per-entity child subscriptions
4. For display-only time values, poll with `setInterval` instead of subscribing

### 5. Batch multiple set() calls into one (multi-entity AI ticks)
When a `useFrame` loop iterates over N entities and calls a store action for each one, that's N sequential synchronous `useSyncExternalStore` notifications in a single RAF tick — enough to hit React's update depth limit even if each individual subscriber returns a stable value.

Fix: collect all per-entity mutations into an array during the loop, then apply them in a SINGLE `set()` call after the loop via a dedicated batch action.

```tsx
// BAD — 16 animals × 2 actions = up to 32 set() calls per 10Hz tick
for (const animal of animals) {
  setAnimalBehavior(animal.id, 'chase', target);  // set() call #1
  moveAnimal(animal.id, newPos);                   // set() call #2
}

// GOOD — one set() for the entire tick
const updates: AnimalTickUpdate[] = [];
for (const animal of animals) {
  updates.push({ id: animal.id, behavior: 'chase', targetPosition: target, position: newPos });
}
batchUpdateAnimals(updates); // single set() call
```

The batch action does one `.map()` pass over the array using a `Map<id, update>` for O(n) lookup.

Files in this project that implement these patterns correctly:
- `UnitManager.tsx`, `FBXUnit.tsx`, `BaseUnit.tsx` — per-unit subscriptions, position from getState()
- `WildAnimals.tsx` — stable ID string selector; batch update via `batchUpdateAnimals()` once per 10Hz tick
- `GameScene.tsx` (WorldTick) — getState() in useFrame, not reactive subscription
- `OpenWorldHUD.tsx` (TimeOfDay) — interval polling at 1Hz

## Pattern 6 — `useShallow` for array/object selectors

Any `useGameStore(s => s.units.filter(...))` returns a **new reference on every call**. In Zustand v5, `useSyncExternalStore` calls `getSnapshot()` multiple times per cycle; new reference each time → React sees "inconsistent snapshot" → schedules another render → **"Maximum update depth exceeded"**.

**Fix:** wrap with `useShallow` from `zustand/react/shallow`:
```tsx
import { useShallow } from 'zustand/react/shallow';
const units = useGameStore(useShallow(s => s.units.filter(u => u.teamId === 2)));
```
`useShallow` caches the last result via `useRef`; returns same reference when shallow-equal → stable `getSnapshot()` → no cascade. Apply to **every** selector returning an array or object literal.

## Pattern 7 — Combine all store writes per tick into one set()

Multiple sequential `set()` calls in one `useFrame` tick (e.g. `batchUpdateUnits` + 2× `setTeamScore`) each fire a synchronous notification. **Fix:** one dedicated action:
```ts
batchCombatTick: (patches, scoreDelta1, scoreDelta2) => set(state => ({
  units: state.units.map(u => { const p = patches.get(u.id); return p ? {...u,...p} : u; }),
  teamScores: { team1: state.teamScores.team1 + scoreDelta1, team2: state.teamScores.team2 + scoreDelta2 },
})),
```
One `set()` = one notification = one re-render round.
