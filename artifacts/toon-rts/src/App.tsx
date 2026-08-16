import { GameScene }       from './game/GameScene';
import { OpenWorldHUD }    from './hud/OpenWorldHUD';
import { DifficultySelect } from './hud/DifficultySelect';
import { RaceSelector }    from './hud/RaceSelector';
import { useGameStore }    from './game/store/gameStore';

export default function App() {
  const phase = useGameStore(s => s.phase);

  return (
    <div className="w-full h-screen overflow-hidden bg-[#0d1420] text-foreground font-sans selection:bg-amber-500/30 relative">
      {/* R3F canvas — always mounted so assets stream in while on menus */}
      <GameScene />

      {/* 2-D overlay layers */}
      {phase === 'menu' && <RaceSelector />}
      {phase === 'setup' && <DifficultySelect />}
      {(phase === 'battle' || phase === 'victory') && <OpenWorldHUD />}
    </div>
  );
}
