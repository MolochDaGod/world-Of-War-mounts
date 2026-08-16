import { GameScene } from './game/GameScene';
import { GameHUD } from './hud/GameHUD';
import { RaceSelector } from './hud/RaceSelector';
import { useGameStore } from './game/store/gameStore';

export default function App() {
  const phase = useGameStore(state => state.phase);

  return (
    <div className="w-full h-screen overflow-hidden bg-[#0d0f14] text-foreground font-sans selection:bg-amber-500/30 relative">
      <GameScene />
      
      {phase === 'menu' || phase === 'setup' ? (
        <RaceSelector />
      ) : (
        <GameHUD />
      )}
    </div>
  );
}
