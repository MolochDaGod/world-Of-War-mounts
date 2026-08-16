import { useGameStore, AbilityType } from '../game/store/gameStore';

export function GameHUD() {
  const { phase, teamScores, selectedUnitIds, units, activeAbility, setActiveAbility } = useGameStore();

  const selectedUnit = units.find(u => u.id === selectedUnitIds[0]);

  if (phase !== 'battle') return null;

  return (
    <div className="absolute inset-0 z-40 pointer-events-none flex flex-col justify-between p-4">
      
      {/* Top Bar - Scores */}
      <div className="flex justify-center w-full">
        <div className="hud-panel px-8 py-3 rounded-full flex gap-12 items-center pointer-events-auto">
          <div className="text-blue-400 font-bold text-xl flex items-center gap-3">
            <span className="w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
            Player: {teamScores.team1}
          </div>
          <div className="text-amber-500 font-serif text-2xl font-bold tracking-widest">VS</div>
          <div className="text-red-400 font-bold text-xl flex items-center gap-3">
            Enemy: {teamScores.team2}
            <span className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
          </div>
        </div>
      </div>

      {/* Bottom Area */}
      <div className="flex justify-between items-end w-full pointer-events-auto">
        
        {/* Unit Info Panel */}
        <div className="hud-panel w-72 h-40 rounded-xl p-4 flex flex-col gap-2">
          {selectedUnit ? (
            <>
              <h3 className="font-serif text-xl text-amber-400 capitalize">{selectedUnit.race} {selectedUnit.type}</h3>
              <div className="w-full bg-black/50 rounded-full h-3 mt-2 border border-white/10">
                <div 
                  className="bg-gradient-to-r from-green-500 to-green-400 h-full rounded-full transition-all"
                  style={{ width: `${(selectedUnit.health / selectedUnit.maxHealth) * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 text-right">{Math.ceil(selectedUnit.health)} / {selectedUnit.maxHealth} HP</div>
              <div className="mt-auto text-sm text-gray-300">
                State: <span className="text-white capitalize">{selectedUnit.state}</span>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 italic">
              No unit selected
            </div>
          )}
        </div>

        {/* Ability Bar */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-amber-400/80 text-xs font-serif uppercase tracking-widest bg-black/50 px-4 py-1 rounded-full backdrop-blur-sm border border-amber-400/20">
            {activeAbility ? 'Click anywhere to cast' : 'Select an ability to cast'}
          </div>
          <div className="hud-panel px-6 py-4 rounded-2xl flex gap-4">
          {[
            { id: 'ice', key: 'Q', name: 'Frost Nova' },
            { id: 'lightning', key: 'E', name: 'Chain Lightning' },
            { id: 'meteor', key: 'R', name: 'Meteor Strike' },
            { id: 'fire', key: 'F', name: 'Fireball' },
            { id: 'wind', key: 'T', name: 'Tornado' },
          ].map(ability => (
            <div 
              key={ability.id}
              onClick={() => setActiveAbility(ability.id as AbilityType)}
              className={`relative w-16 h-16 rounded-xl border-2 ${
                activeAbility === ability.id 
                  ? 'border-amber-400 shadow-[0_0_15px_rgba(245,166,35,0.6)] scale-110' 
                  : 'border-[#ffffff1a] hover:border-amber-400/50'
              } transition-all cursor-pointer bg-black/40 flex items-center justify-center`}
            >
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-600 rounded flex items-center justify-center text-xs font-bold text-white shadow-md">
                {ability.key}
              </div>
              {/* Icon placeholder */}
              <div className={`w-8 h-8 rounded-full ${
                ability.id === 'ice' ? 'bg-cyan-400' :
                ability.id === 'lightning' ? 'bg-purple-400' :
                ability.id === 'meteor' ? 'bg-orange-500' :
                ability.id === 'wind' ? 'bg-gray-300' : 'bg-red-500'
              } opacity-80 blur-[2px]`} />
            </div>
          ))}
          </div>
        </div>

        {/* Minimap Placeholder */}
        <div className="hud-panel w-56 h-56 rounded-xl p-2 relative">
          <div className="w-full h-full bg-[#0a0d14] rounded-lg relative overflow-hidden border border-[#ffffff1a]">
            {/* Map dots */}
            {units.map(u => (
              <div 
                key={u.id}
                className={`absolute w-2 h-2 rounded-full transform -translate-x-1/2 -translate-y-1/2 ${
                  u.teamId === 1 ? 'bg-blue-500 shadow-[0_0_4px_blue]' : 'bg-red-500 shadow-[0_0_4px_red]'
                }`}
                style={{
                  left: `${50 + (u.position[0] * 1.5)}%`,
                  top: `${50 + (u.position[2] * 1.5)}%`,
                }}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
