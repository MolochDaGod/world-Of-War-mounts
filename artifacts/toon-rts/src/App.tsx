import { lazy, Suspense, useState } from 'react';
import { useGameStore }     from './game/store/gameStore';

const BattleMemoryStress = lazy(async () => {
  const module = await import('./game/diagnostics/BattleMemoryStress');
  return { default: module.BattleMemoryStress };
});

const WarZonePerformancePanel = lazy(async () => {
  const module = await import('./game/diagnostics/WarZonePerformancePanel');
  return { default: module.WarZonePerformancePanel };
});

const RaceSelector = lazy(async () => {
  const module = await import('./hud/RaceSelector');
  return { default: module.RaceSelector };
});

const ArmyBuilder = lazy(async () => {
  const module = await import('./hud/ArmyBuilder');
  return { default: module.ArmyBuilder };
});

const OpenWorldHUD = lazy(async () => {
  const module = await import('./hud/OpenWorldHUD');
  return { default: module.OpenWorldHUD };
});

const GameRuntime = lazy(async () => {
  const module = await import('./game/GameRuntime');
  return { default: module.GameRuntime };
});

const UnitShowcase = lazy(async () => {
  const module = await import('./showcase/UnitShowcase');
  return { default: module.UnitShowcase };
});

export default function App() {
  const phase = useGameStore(s => s.phase);
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const isBattleActive = phase === 'preparation' || phase === 'battle' || phase === 'victory';
  const isMemoryStress = import.meta.env.DEV
    && new URLSearchParams(window.location.search).get('stress') === 'memory';
  const isWarZonePerformance = import.meta.env.DEV
    && new URLSearchParams(window.location.search).get('perf') === 'warzone';

  if (showcaseOpen) {
    return (
      <div className="w-full h-screen overflow-hidden text-foreground font-sans selection:bg-amber-500/30 relative">
        <Suspense fallback={null}>
          <UnitShowcase onReturn={() => setShowcaseOpen(false)} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden text-foreground font-sans selection:bg-amber-500/30 relative">
      {/* The 3D world is only needed after the player starts a battle. */}
      {isBattleActive && (
        <Suspense fallback={null}>
          <GameRuntime />
        </Suspense>
      )}

      {/* 2-D overlay layers */}
      <Suspense fallback={null}>
        {phase === 'menu'                              && <RaceSelector onOpenShowcase={() => setShowcaseOpen(true)} />}
        {phase === 'setup'                             && <ArmyBuilder />}
        {(phase === 'preparation' || phase === 'battle' || phase === 'victory') && <OpenWorldHUD />}
      </Suspense>

      {isMemoryStress && (
        <Suspense fallback={null}>
          <BattleMemoryStress />
        </Suspense>
      )}
      {isWarZonePerformance && (
        <Suspense fallback={null}>
          <WarZonePerformancePanel />
        </Suspense>
      )}
    </div>
  );
}
