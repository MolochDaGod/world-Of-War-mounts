import { useGameStore, Race } from '../game/store/gameStore';
import { useState } from 'react';

const races: { name: Race, desc: string, units: string }[] = [
  { name: 'Barbarians', desc: 'Fierce warriors from the northern steppes.', units: 'Berserkers, Wolf Riders' },
  { name: 'Dwarves', desc: 'Stout defenders of the mountain halls.', units: 'Shieldbearers, Gyrocopters' },
  { name: 'Elves', desc: 'Masters of magic and archery.', units: 'Rangers, Unicorn Knights' },
  { name: 'Orcs', desc: 'A relentless tide of greenskins.', units: 'Grunts, Warg Riders' },
  { name: 'Undead', desc: 'The restless dead seeking to consume all.', units: 'Skeletons, Death Knights' },
  { name: 'WesternKingdoms', desc: 'Noble knights and disciplined infantry.', units: 'Swordsmen, Paladins' },
];

export function RaceSelector() {
  const { setPhase, setSelectedRace, spawnInitialArmies } = useGameStore();
  const [selected, setSelected] = useState<Race>('WesternKingdoms');

  const handleStart = () => {
    setSelectedRace(selected);
    spawnInitialArmies(); // Transitions to 'battle' phase internally
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0d0f14]/90 backdrop-blur-sm">
      <div className="max-w-5xl w-full p-8">
        <h1 className="text-5xl font-serif text-center text-amber-500 mb-12 drop-shadow-md">Choose Your Faction</h1>
        
        <div className="grid grid-cols-3 gap-6 mb-12">
          {races.map(r => (
            <div 
              key={r.name}
              onClick={() => setSelected(r.name)}
              className={`hud-panel p-6 rounded-xl cursor-pointer transition-all duration-200 hover:scale-105 ${
                selected === r.name ? 'ring-2 ring-amber-500 bg-[#1a2233]/90' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <h3 className="text-2xl font-serif text-amber-400 mb-2">{r.name}</h3>
              <p className="text-sm text-gray-300 mb-4">{r.desc}</p>
              <div className="text-xs text-amber-500/70 uppercase tracking-wider font-semibold">
                Core Units: {r.units}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button 
            onClick={handleStart}
            className="px-12 py-4 bg-amber-600 hover:bg-amber-500 text-white font-serif text-2xl rounded-full shadow-[0_0_20px_rgba(245,166,35,0.4)] transition-all hover:scale-105 active:scale-95"
          >
            Enter Battlefield
          </button>
        </div>
      </div>
    </div>
  );
}
