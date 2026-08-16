/**
 * GameHUD — battle-phase overlay.
 *
 * Previously subscribed to useGameStore() with no selector — which wired up
 * the entire game store including `units` (written ~30Hz by CombatSystem),
 * causing 30Hz DOM re-renders of the whole HUD tree.
 *
 * Now uses targeted primitive selectors:
 * - phase, teamScores, activeAbility: low-frequency, only change on game events
 * - living1/living2/totalCount: derived numbers that only change when units die
 * - selectedUnit: changes on selection, then on health updates to the selected unit
 * - miniMapUnits: still 30Hz (position display) but isolated to just this selector
 */
import { useGameStore, AbilityType } from '../game/store/gameStore';

const ABILITIES: { id: AbilityType; key: string; name: string; icon: string; color: string }[] = [
  { id: 'ice',       key: 'Q', name: 'Frost Nova',      icon: '❄',  color: '#88ccff' },
  { id: 'lightning', key: 'E', name: 'Chain Lightning', icon: '⚡', color: '#aaffee' },
  { id: 'meteor',    key: 'R', name: 'Meteor Strike',   icon: '☄',  color: '#ff8833' },
  { id: 'fire',      key: 'F', name: 'Inferno',         icon: '🔥', color: '#ff4400' },
  { id: 'wind',      key: 'T', name: 'Tornado',         icon: '🌪',  color: '#aaddcc' },
];

export function GameHUD() {
  // ── Stable / low-frequency selectors ────────────────────────────────────────
  const phase         = useGameStore(s => s.phase);
  const teamScores    = useGameStore(s => s.teamScores);
  const activeAbility = useGameStore(s => s.activeAbility);
  const setActiveAbility = useGameStore(s => s.setActiveAbility);

  // ── Derived counts — only change when a unit dies, not on position updates ──
  const living1    = useGameStore(s => s.units.filter(u => u.teamId === 1 && u.state !== 'dead').length);
  const living2    = useGameStore(s => s.units.filter(u => u.teamId === 2 && u.state !== 'dead').length);
  const totalCount = useGameStore(s => s.units.length);

  // ── Selected unit card — subscribes to the currently selected unit's data ───
  // Re-renders when selection changes or when the selected unit takes damage.
  const selectedUnit = useGameStore(s => {
    const id = s.selectedUnitIds[0];
    return id ? s.units.find(u => u.id === id) : undefined;
  });

  // ── Mini-map unit positions — 30Hz but scoped to just this selector ─────────
  const miniMapUnits = useGameStore(s =>
    s.units.filter(u => u.state !== 'dead').map(u => ({
      id: u.id, teamId: u.teamId, x: u.position[0], z: u.position[2],
    }))
  );

  if (phase !== 'battle') return null;

  const handleRestart = () => {
    useGameStore.setState({ units: [], phase: 'menu' });
  };

  return (
    <div className="absolute inset-0 z-40 pointer-events-none flex flex-col justify-between p-4 select-none">

      {/* ── Top bar ── */}
      <div className="flex justify-between items-start w-full">

        {/* Team 1 status */}
        <div className="hud-panel px-6 py-3 rounded-2xl pointer-events-auto min-w-[180px]">
          <div className="text-blue-400 font-serif text-lg font-bold flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            Player
          </div>
          <div className="text-3xl font-bold text-white mt-1">{teamScores.team1}</div>
          <div className="text-xs text-gray-400 mt-1">{living1} units alive</div>
        </div>

        {/* Centre — status + restart */}
        <div className="flex flex-col items-center gap-2 pointer-events-auto">
          <div className="hud-panel px-8 py-2 rounded-full text-amber-400/80 font-serif text-sm tracking-widest">
            {activeAbility
              ? `Click to cast ${activeAbility.toUpperCase()} · ESC to cancel`
              : 'Select ability & click battlefield to cast'}
          </div>
          <button
            onClick={handleRestart}
            className="text-gray-500 hover:text-gray-300 text-xs tracking-wider transition-colors bg-black/30 px-4 py-1 rounded-full"
          >
            ↩ Main Menu
          </button>
        </div>

        {/* Team 2 status */}
        <div className="hud-panel px-6 py-3 rounded-2xl pointer-events-auto min-w-[180px] text-right">
          <div className="text-red-400 font-serif text-lg font-bold flex items-center justify-end gap-2">
            Enemy
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          </div>
          <div className="text-3xl font-bold text-white mt-1">{teamScores.team2}</div>
          <div className="text-xs text-gray-400 mt-1">{living2} units alive</div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="flex justify-between items-end w-full pointer-events-auto">

        {/* Selected unit card */}
        <div className="hud-panel w-72 rounded-2xl p-4 flex flex-col gap-2 min-h-[120px]">
          {selectedUnit ? (
            <>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: selectedUnit.teamId === 1 ? '#3b82f6' : '#ef4444' }}
                />
                <h3 className="font-serif text-amber-400 text-lg capitalize">
                  {selectedUnit.race} {selectedUnit.type}
                </h3>
              </div>
              {/* HP bar */}
              <div className="w-full bg-black/50 rounded-full h-3 border border-white/10">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(selectedUnit.health / selectedUnit.maxHealth) * 100}%`,
                    background: selectedUnit.health / selectedUnit.maxHealth > 0.6
                      ? '#22c55e' : selectedUnit.health / selectedUnit.maxHealth > 0.3
                      ? '#eab308' : '#ef4444',
                  }}
                />
              </div>
              <div className="text-xs text-gray-400">
                {Math.ceil(selectedUnit.health)} / {selectedUnit.maxHealth} HP
              </div>
              <div className="text-sm text-gray-300 mt-auto capitalize">
                State: <span className="text-white">{selectedUnit.state}</span>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
              <span className="text-2xl opacity-30">⚔</span>
              <span className="text-sm italic">Click a unit to inspect</span>
            </div>
          )}
        </div>

        {/* Ability bar */}
        <div className="flex flex-col items-center gap-2">
          <div className="hud-panel px-4 py-3 rounded-2xl flex gap-3">
            {ABILITIES.map(ab => {
              const active = activeAbility === ab.id;
              return (
                <button
                  key={ab.id}
                  onClick={() => setActiveAbility(active ? null : ab.id)}
                  title={`${ab.name} (${ab.key})`}
                  className={`relative w-16 h-16 rounded-xl border-2 transition-all duration-150 flex flex-col items-center justify-center gap-1 ${
                    active
                      ? 'border-amber-400 scale-110 bg-amber-950/60 shadow-[0_0_20px_rgba(245,166,35,0.5)]'
                      : 'border-white/10 hover:border-white/30 bg-black/40 hover:bg-black/60'
                  }`}
                >
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-amber-700 rounded-md flex items-center justify-center text-xs font-bold text-white shadow">
                    {ab.key}
                  </span>
                  <span className="text-xl leading-none">{ab.icon}</span>
                  <span className="text-[10px] text-gray-400 leading-none">{ab.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mini-map */}
        <div className="hud-panel w-52 h-52 rounded-2xl p-2">
          <div className="w-full h-full bg-[#0a0d14] rounded-xl relative overflow-hidden border border-white/5">
            {/* Battlefield grid lines */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '25% 25%',
            }} />
            {/* Centre marker */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border border-amber-500/20" />
            </div>
            {/* Unit dots */}
            {miniMapUnits.map(u => (
              <div
                key={u.id}
                className="absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                style={{
                  left:       `${50 + (u.x / 50) * 50}%`,
                  top:        `${50 + (u.z / 50) * 50}%`,
                  background: u.teamId === 1 ? '#3b82f6' : '#ef4444',
                  boxShadow:  u.teamId === 1 ? '0 0 4px #3b82f6' : '0 0 4px #ef4444',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Victory / defeat banner */}
      {(living1 === 0 || living2 === 0) && totalCount > 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-auto">
          <div className="hud-panel p-12 rounded-3xl text-center flex flex-col gap-6">
            <h2 className="font-serif text-5xl text-amber-400">
              {living1 === 0 ? '☠ Defeat' : '⚔ Victory'}
            </h2>
            <p className="text-gray-400 text-lg">
              {living1 === 0
                ? 'Your army has been destroyed!'
                : 'The enemy has been vanquished!'}
            </p>
            <div className="text-gray-300 text-base">
              Score — Player: <strong className="text-blue-400">{teamScores.team1}</strong> &nbsp;/&nbsp;
              Enemy: <strong className="text-red-400">{teamScores.team2}</strong>
            </div>
            <button
              onClick={handleRestart}
              className="px-10 py-4 bg-amber-600 hover:bg-amber-500 text-white font-serif text-xl rounded-full transition-all hover:scale-105"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
