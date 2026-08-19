import { lazy, Suspense } from 'react';
import { useGameStore }     from './game/store/gameStore';

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

export default function App() {
  const phase = useGameStore(s => s.phase);
  const isBattleActive = phase === 'battle' || phase === 'victory';

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
        {phase === 'menu'                              && <RaceSelector />}
        {phase === 'setup'                             && <ArmyBuilder />}
        {(phase === 'battle' || phase === 'victory')   && <OpenWorldHUD />}
      </Suspense>
    </div>
  );
}
