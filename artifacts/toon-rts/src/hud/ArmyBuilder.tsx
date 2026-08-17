/**
 * ArmyBuilder — Total War-style army composition screen.
 *
 * Layout:
 *   Top:    Race selectors (player left, enemy right) + gold counter
 *   Middle: 2×5 unit card grid (10 archetypes)
 *   Bottom: Player army slots (up to 8) + BATTLE button
 */
import { useState } from 'react';
import {
  useGameStore,
  Race,
  REGIMENT_DEFS,
} from '@/game/store/gameStore';
import { useShallow } from 'zustand/react/shallow';
import {
  UNIT_ROSTER,
  UnitDef,
  RACE_META,
  getUnitName,
  getUnitDescription,
} from '@/game/data/UnitRoster';

const ALL_RACES: Race[] = [
  'WesternKingdoms', 'Elves', 'Dwarves', 'Orcs', 'Barbarians', 'Undead',
];

// ── Stat bar ─────────────────────────────────────────────────────────────────
function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
      <span style={{ width: 36, fontSize: 9, color: '#aaa', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
        <div
          style={{
            width: `${value}%`, height: '100%', borderRadius: 2,
            background: value > 70 ? '#4caf50' : value > 40 ? '#ff9800' : '#f44336',
          }}
        />
      </div>
    </div>
  );
}

// ── Unit card ─────────────────────────────────────────────────────────────────
function UnitCard({
  def, index, race, gold, onAdd,
}: {
  def: UnitDef; index: number; race: Race; gold: number; onAdd: () => void;
}) {
  const name = getUnitName(race, index);
  const desc = getUnitDescription(index);
  const cost = def.cost;
  const canAfford = gold >= cost;
  const regDef = REGIMENT_DEFS[def.type];
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={canAfford ? onAdd : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={desc}
      style={{
        background: hover && canAfford
          ? 'rgba(255,215,0,0.15)'
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hover && canAfford ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 8,
        cursor: canAfford ? 'pointer' : 'not-allowed',
        padding: '8px 6px',
        textAlign: 'left',
        opacity: canAfford ? 1 : 0.45,
        transition: 'background 0.15s, border 0.15s, opacity 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        minHeight: 110,
      }}
    >
      {/* Icon + name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 22 }}>{def.icon}</span>
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#f0e8d5',
            fontFamily: "'Cinzel', serif", lineHeight: 1.2,
          }}>
            {name}
          </div>
          <div style={{ fontSize: 9, color: '#aaa', marginTop: 1 }}>
            {regDef.maxSoldiers} men · {def.isRanged ? 'Ranged' : 'Melee'}
          </div>
        </div>
      </div>

      {/* Stat bars */}
      <div style={{ marginTop: 2 }}>
        <StatBar label="ATK" value={def.statAttack} />
        <StatBar label="DEF" value={def.statDefense} />
        <StatBar label="SPD" value={def.statSpeed} />
        {def.isRanged && <StatBar label="RNG" value={def.statRange} />}
      </div>

      {/* Cost */}
      <div style={{
        marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <span style={{ fontSize: 12 }}>💰</span>
        <span style={{ fontSize: 11, color: canAfford ? '#ffd700' : '#888', fontWeight: 700 }}>
          {cost}
        </span>
      </div>
    </button>
  );
}

// ── Race selector pill ────────────────────────────────────────────────────────
function RacePill({
  race, selected, onSelect,
}: { race: Race; selected: boolean; onSelect: () => void }) {
  const meta = RACE_META[race];
  return (
    <button
      onClick={onSelect}
      style={{
        background: selected ? meta.bgColor : 'rgba(255,255,255,0.04)',
        border: `1px solid ${selected ? meta.color : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 6,
        padding: '4px 10px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        color: selected ? meta.color : '#888',
        fontSize: 12,
        fontWeight: selected ? 700 : 400,
        fontFamily: "'Cinzel', serif",
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 14 }}>{meta.icon}</span>
      {race}
    </button>
  );
}

// ── Army slot strip ───────────────────────────────────────────────────────────
function ArmySlot({
  def, index, race, onRemove,
}: { def: UnitDef; index: number; race: Race; onRemove: () => void }) {
  const name = getUnitName(race, UNIT_ROSTER.findIndex(u => u.type === def.type));
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,215,0,0.25)',
        borderRadius: 8,
        padding: '6px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        minWidth: 64,
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.1s',
      }}
      onClick={onRemove}
      title={`Remove ${name}`}
    >
      <span style={{ fontSize: 20 }}>{def.icon}</span>
      <span style={{ fontSize: 9, color: '#ccc', textAlign: 'center', lineHeight: 1.2 }}>{name}</span>
      <span style={{
        position: 'absolute', top: 2, right: 4, fontSize: 10, color: '#f44', fontWeight: 700,
      }}>×</span>
    </div>
  );
}

function EmptySlot() {
  return (
    <div style={{
      border: '1px dashed rgba(255,255,255,0.15)',
      borderRadius: 8,
      minWidth: 64,
      minHeight: 72,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'rgba(255,255,255,0.2)',
      fontSize: 20,
    }}>+</div>
  );
}

// ── Main ArmyBuilder component ────────────────────────────────────────────────
export function ArmyBuilder() {
  // Primitives — individual selectors (stable, no useShallow needed)
  const selectedRace = useGameStore(s => s.selectedRace);
  const enemyRace    = useGameStore(s => s.enemyRace);
  const gold         = useGameStore(s => s.gold);
  const difficulty   = useGameStore(s => s.difficulty);

  // Array — must use useShallow to avoid new-object-every-render infinite loop
  const playerArmy = useGameStore(useShallow(s => s.playerArmy));

  // Actions — stable function refs, individual selectors are safe
  const setSelectedRace    = useGameStore(s => s.setSelectedRace);
  const setEnemyRace       = useGameStore(s => s.setEnemyRace);
  const addToPlayerArmy    = useGameStore(s => s.addToPlayerArmy);
  const removeFromPlayerArmy = useGameStore(s => s.removeFromPlayerArmy);
  const clearPlayerArmy    = useGameStore(s => s.clearPlayerArmy);
  const spawnArmies        = useGameStore(s => s.spawnArmies);
  const setDifficulty      = useGameStore(s => s.setDifficulty);

  const [tab, setTab] = useState<'player' | 'enemy'>('player');

  const playerMeta = RACE_META[selectedRace];
  const enemyMeta  = RACE_META[enemyRace];

  return (
    <div
      className="pointer-events-auto"
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(5,8,15,0.92)',
        backdropFilter: 'blur(8px)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(0,0,0,0.4)',
        borderBottom: '1px solid rgba(255,215,0,0.2)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 20, color: '#ffd700',
          textShadow: '0 0 20px rgba(255,215,0,0.4)',
        }}>
          ⚔ Army Muster
        </div>

        {/* Gold counter */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,215,0,0.1)',
          border: '1px solid rgba(255,215,0,0.3)',
          borderRadius: 8, padding: '5px 14px',
        }}>
          <span style={{ fontSize: 18 }}>💰</span>
          <span style={{
            fontSize: 20, fontWeight: 700, color: '#ffd700',
            fontFamily: "'Cinzel', serif",
          }}>{gold}</span>
          <span style={{ fontSize: 11, color: '#aaa' }}>gold remaining</span>
        </div>

        {/* Difficulty */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['easy', 'normal', 'hard'] as const).map(d => (
            <button key={d} onClick={() => setDifficulty(d)} style={{
              background: difficulty === d ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${difficulty === d ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 6, padding: '4px 12px', cursor: 'pointer',
              color: difficulty === d ? '#ffd700' : '#888',
              fontSize: 11, fontFamily: "'Cinzel', serif",
            }}>{d[0].toUpperCase() + d.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left panel — race + unit grid */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          padding: '12px 16px', overflow: 'hidden',
        }}>
          {/* Race selector tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            <button onClick={() => setTab('player')} style={{
              background: tab === 'player' ? playerMeta.bgColor : 'transparent',
              border: `1px solid ${tab === 'player' ? playerMeta.color : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '6px 6px 0 0', padding: '5px 14px', cursor: 'pointer',
              color: tab === 'player' ? playerMeta.color : '#666',
              fontSize: 12, fontFamily: "'Cinzel', serif",
            }}>
              {playerMeta.icon} Your Army
            </button>
            <button onClick={() => setTab('enemy')} style={{
              background: tab === 'enemy' ? enemyMeta.bgColor : 'transparent',
              border: `1px solid ${tab === 'enemy' ? enemyMeta.color : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '6px 6px 0 0', padding: '5px 14px', cursor: 'pointer',
              color: tab === 'enemy' ? enemyMeta.color : '#666',
              fontSize: 12, fontFamily: "'Cinzel', serif",
            }}>
              {enemyMeta.icon} Enemy
            </button>
          </div>

          {tab === 'player' ? (
            <>
              {/* Player race selection */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>SELECT YOUR RACE</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {ALL_RACES.map(r => (
                    <RacePill
                      key={r} race={r}
                      selected={selectedRace === r}
                      onSelect={() => { setSelectedRace(r); clearPlayerArmy(); }}
                    />
                  ))}
                </div>
              </div>

              {/* Unit grid 2 rows × 5 cols */}
              <div style={{ fontSize: 10, color: '#888', marginBottom: 6 }}>
                CHOOSE REGIMENTS · click to add · {playerArmy.length}/8 slots used
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 6, flex: 1, overflow: 'auto',
              }}>
                {UNIT_ROSTER.map((def, i) => (
                  <UnitCard
                    key={def.type} def={def} index={i}
                    race={selectedRace} gold={gold}
                    onAdd={() => addToPlayerArmy({ unitType: def.type })}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Enemy race selection */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>SELECT ENEMY RACE</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {ALL_RACES.map(r => (
                    <RacePill
                      key={r} race={r}
                      selected={enemyRace === r}
                      onSelect={() => setEnemyRace(r)}
                    />
                  ))}
                </div>
              </div>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 12, color: '#666',
              }}>
                <span style={{ fontSize: 48 }}>{enemyMeta.icon}</span>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: enemyMeta.color }}>
                  {enemyRace}
                </div>
                <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 260 }}>
                  The enemy general will muster a force matching your army's strength.
                  Select their race then go to Your Army to build your force.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right panel — army preview */}
        <div style={{
          width: 220, borderLeft: '1px solid rgba(255,215,0,0.12)',
          padding: '16px 12px', display: 'flex',
          flexDirection: 'column', gap: 8, overflow: 'auto', flexShrink: 0,
        }}>
          <div style={{
            fontFamily: "'Cinzel', serif", fontSize: 12,
            color: '#ffd700', marginBottom: 4,
          }}>
            {playerMeta.icon} {selectedRace} Force
          </div>

          {/* Spend summary */}
          <div style={{ fontSize: 10, color: '#888' }}>
            Spent: {2000 - gold} / 2000 gold
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: 4 }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: '#ffd700',
              width: `${((2000 - gold) / 2000) * 100}%`,
            }} />
          </div>

          {playerArmy.length === 0 ? (
            <div style={{ color: '#444', fontSize: 12, textAlign: 'center', marginTop: 20 }}>
              No regiments mustered yet.{'\n'}Click units to add them.
            </div>
          ) : (
            playerArmy.map((slot, i) => {
              const def = UNIT_ROSTER.find(u => u.type === slot.unitType);
              if (!def) return null;
              const idx = UNIT_ROSTER.indexOf(def);
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6, padding: '5px 8px', cursor: 'pointer',
                }}
                  onClick={() => removeFromPlayerArmy(i)}
                  title="Click to remove"
                >
                  <span style={{ fontSize: 18 }}>{def.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getUnitName(selectedRace, idx)}
                    </div>
                    <div style={{ fontSize: 9, color: '#888' }}>
                      {REGIMENT_DEFS[slot.unitType]?.maxSoldiers} men
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: '#f44' }}>×</span>
                </div>
              );
            })
          )}

          {/* Clear */}
          {playerArmy.length > 0 && (
            <button onClick={clearPlayerArmy} style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 5, padding: '4px 8px',
              color: '#888', fontSize: 10, cursor: 'pointer', marginTop: 4,
            }}>
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* ── BOTTOM — army strip + battle button ────────────────────── */}
      <div style={{
        background: 'rgba(0,0,0,0.5)',
        borderTop: '1px solid rgba(255,215,0,0.15)',
        padding: '10px 20px',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        {/* Army slot strip */}
        <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Array.from({ length: 8 }).map((_, i) => {
            const slot = playerArmy[i];
            if (!slot) return <EmptySlot key={i} />;
            const def = UNIT_ROSTER.find(u => u.type === slot.unitType);
            if (!def) return <EmptySlot key={i} />;
            const idx = UNIT_ROSTER.indexOf(def);
            return (
              <ArmySlot
                key={i} def={def} index={idx}
                race={selectedRace}
                onRemove={() => removeFromPlayerArmy(i)}
              />
            );
          })}
        </div>

        {/* Battle button */}
        <button
          onClick={() => playerArmy.length > 0 && spawnArmies()}
          disabled={playerArmy.length === 0}
          style={{
            background: playerArmy.length > 0
              ? 'linear-gradient(135deg, #b8860b 0%, #ffd700 50%, #b8860b 100%)'
              : 'rgba(100,100,100,0.3)',
            border: 'none',
            borderRadius: 10,
            padding: '14px 36px',
            fontFamily: "'Cinzel', serif",
            fontSize: 18,
            fontWeight: 700,
            color: playerArmy.length > 0 ? '#1a0e00' : '#555',
            cursor: playerArmy.length > 0 ? 'pointer' : 'not-allowed',
            textShadow: playerArmy.length > 0 ? '0 1px 0 rgba(255,255,255,0.3)' : 'none',
            boxShadow: playerArmy.length > 0 ? '0 0 24px rgba(255,215,0,0.4)' : 'none',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          ⚔ March to Battle
        </button>
      </div>
    </div>
  );
}
