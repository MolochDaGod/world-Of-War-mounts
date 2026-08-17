import { useState } from 'react';
import { useGameStore, Race } from '../game/store/gameStore';

const RACES: { name: Race; desc: string; units: string; color: string }[] = [
  { name: 'Barbarians',      desc: 'Fierce warriors from the northern steppes.',       units: 'Berserkers · Wolf Riders',  color: '#c0392b' },
  { name: 'Dwarves',         desc: 'Stout defenders of the mountain halls.',            units: 'Shieldbearers · Gyrocopters', color: '#8e6b3e' },
  { name: 'Elves',           desc: 'Masters of magic, archery and bolt throwers.',      units: 'Rangers · Unicorn Knights',  color: '#27ae60' },
  { name: 'Orcs',            desc: 'A relentless greenskin tide with siege power.',     units: 'Grunts · Warg Riders',       color: '#5d8a3c' },
  { name: 'Undead',          desc: 'The restless dead seeking to consume all.',         units: 'Skeletons · Death Knights',  color: '#8e44ad' },
  { name: 'WesternKingdoms', desc: 'Noble knights and disciplined soldiers.',           units: 'Swordsmen · Paladins',       color: '#2980b9' },
];

export function RaceSelector() {
  // Actions are stable in Zustand v5 — individual selectors are safe without useShallow
  const setSelectedRace = useGameStore(s => s.setSelectedRace);
  const setEnemyRace    = useGameStore(s => s.setEnemyRace);
  const setPhase        = useGameStore(s => s.setPhase);
  const clearPlayerArmy = useGameStore(s => s.clearPlayerArmy);
  const [player, setPlayer] = useState<Race>('WesternKingdoms');
  const [enemy,  setEnemy]  = useState<Race>('Orcs');

  const handleStart = () => {
    setSelectedRace(player);
    setEnemyRace(enemy);
    clearPlayerArmy();
    setPhase('setup');
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0d0f14]/95 backdrop-blur-md overflow-auto py-8">
      {/* Title */}
      <div className="mb-10 text-center">
        <h1 className="text-6xl font-serif text-amber-500 tracking-widest drop-shadow-[0_0_30px_rgba(245,166,35,0.4)]">
          RACE WARS
        </h1>
        <p className="text-gray-400 text-lg mt-2 tracking-widest uppercase font-light">
          Choose Your Factions
        </p>
      </div>

      <div className="flex gap-16 items-start mb-10 w-full max-w-6xl px-8">
        {/* Player faction */}
        <div className="flex-1">
          <h2 className="text-center text-blue-400 font-serif text-2xl mb-5 tracking-widest uppercase">
            ⚔ Your Faction
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {RACES.map(r => (
              <button
                key={r.name}
                onClick={() => setPlayer(r.name)}
                className={`hud-panel p-4 rounded-xl text-left transition-all duration-200 hover:scale-102 cursor-pointer ${
                  player === r.name
                    ? 'ring-2 ring-blue-400 bg-blue-900/30 scale-105'
                    : 'opacity-60 hover:opacity-90'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 rounded-full" style={{ background: r.color }} />
                  <span className="font-serif text-amber-400 text-base">{r.name}</span>
                </div>
                <p className="text-gray-400 text-xs leading-snug">{r.desc}</p>
                <p className="text-xs mt-2 font-semibold" style={{ color: r.color }}>{r.units}</p>
              </button>
            ))}
          </div>
        </div>

        {/* VS divider */}
        <div className="flex flex-col items-center gap-4 pt-16">
          <div className="text-amber-500 font-serif text-4xl font-bold">VS</div>
          <div className="w-px h-32 bg-gradient-to-b from-transparent via-amber-500/50 to-transparent" />
        </div>

        {/* Enemy faction */}
        <div className="flex-1">
          <h2 className="text-center text-red-400 font-serif text-2xl mb-5 tracking-widest uppercase">
            ☠ Enemy Faction
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {RACES.map(r => (
              <button
                key={r.name}
                onClick={() => setEnemy(r.name)}
                className={`hud-panel p-4 rounded-xl text-left transition-all duration-200 hover:scale-102 cursor-pointer ${
                  enemy === r.name
                    ? 'ring-2 ring-red-400 bg-red-900/30 scale-105'
                    : 'opacity-60 hover:opacity-90'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 rounded-full" style={{ background: r.color }} />
                  <span className="font-serif text-amber-400 text-base">{r.name}</span>
                </div>
                <p className="text-gray-400 text-xs leading-snug">{r.desc}</p>
                <p className="text-xs mt-2 font-semibold" style={{ color: r.color }}>{r.units}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Warning if same faction */}
      {player === enemy && (
        <p className="text-yellow-400 text-sm mb-4 italic">
          ⚠ Mirror match — both armies will use the same models!
        </p>
      )}

      <button
        onClick={handleStart}
        className="px-16 py-5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-serif text-2xl rounded-full shadow-[0_0_30px_rgba(245,166,35,0.5)] transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(245,166,35,0.7)]"
      >
        Enter Battlefield
      </button>

      <p className="text-gray-600 text-xs mt-6 tracking-widest">
        WASD/Arrows to pan · Scroll to zoom · Q/E/R/F/T to cast abilities · Click units to select
      </p>
    </div>
  );
}
