/**
 * ArmyBuilder — faction-specific army composition screen.
 *
 * Units are grouped into Infantry / Mounted / Siege sections.
 * Portrait icons come from /assets/unit-icons/ (generated AI images + reference images).
 * Faction meta from FactionData.ts; game engine uses Race internally.
 */
import { useState } from 'react';
import { useGameStore, REGIMENT_DEFS } from '@/game/store/gameStore';
import { useShallow } from 'zustand/react/shallow';
import { CommanderSelectPanel } from './CommanderSelectPanel';
import {
  Faction, FACTION_META, FACTION_DISPLAY, FACTION_UNITS, FACTION_TO_RACE,
  RACE_TO_FACTION, FactionUnit,
} from '@/game/data/FactionData';

const FACTIONS: Faction[] = ['Crusade', 'Fabled', 'Legion'];

// ── Stat bar ──────────────────────────────────────────────────────────────────
function StatBar({ label, value }: { label: string; value: number }) {
  const color = value > 70 ? '#4caf50' : value > 40 ? '#ff9800' : '#f44336';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
      <span style={{ width: 26, fontSize: 8, color: '#888', flexShrink: 0, letterSpacing: '0.05em' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <div style={{ width: `${value}%`, height: '100%', borderRadius: 2, background: color,
          transition: 'width 0.3s ease' }} />
      </div>
      <span style={{ fontSize: 8, color, width: 20, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// ── Unit portrait card ────────────────────────────────────────────────────────
function UnitCard({
  unit, gold, alreadyInArmy, onAdd,
}: {
  unit: FactionUnit; gold: number; alreadyInArmy: number; onAdd: () => void;
}) {
  const [hover, setHover] = useState(false);
  const canAfford = gold >= unit.cost;
  const regDef = REGIMENT_DEFS[unit.type] ?? REGIMENT_DEFS.swordsmen;

  return (
    <div
      onClick={canAfford ? onAdd : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column',
        background: hover && canAfford
          ? 'rgba(255,215,0,0.09)'
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hover && canAfford ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 10, padding: '10px 8px',
        cursor: canAfford ? 'pointer' : 'default',
        opacity: canAfford ? 1 : 0.4,
        transition: 'all 0.15s',
        width: 108, flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Portrait */}
      <div style={{
        width: '100%', height: 80, marginBottom: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 6,
        background: 'rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>
        <img
          src={unit.icon}
          alt={unit.name}
          style={{ height: '100%', width: '100%', objectFit: 'contain' }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* Name */}
      <div style={{
        fontSize: 10, fontWeight: 700, color: '#f0e8d5',
        fontFamily: "'Cinzel', serif", lineHeight: 1.2,
        marginBottom: 3, textAlign: 'center',
      }}>{unit.name}</div>

      {/* Soldiers + type */}
      <div style={{
        fontSize: 9, color: '#888', textAlign: 'center', marginBottom: 5,
      }}>
        {unit.maxSoldiers} {unit.maxSoldiers === 1 ? 'engine' : 'men'}
        {' · '}{unit.isRanged ? 'Ranged' : 'Melee'}
      </div>

      {/* Stats */}
      <div style={{ marginBottom: 6 }}>
        <StatBar label="ATK" value={unit.statAttack} />
        <StatBar label="DEF" value={unit.statDefense} />
        <StatBar label="SPD" value={unit.statSpeed} />
        {unit.isRanged && <StatBar label="RNG" value={unit.statRange} />}
      </div>

      {/* Cost row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 'auto',
      }}>
        <span style={{ fontSize: 11, color: canAfford ? '#ffd700' : '#666', fontWeight: 700 }}>
          💰 {unit.cost}
        </span>
        {canAfford && (
          <span style={{
            fontSize: 14, color: '#4caf50', fontWeight: 900, lineHeight: 1,
          }}>+</span>
        )}
      </div>

      {/* Count badge if already in army */}
      {alreadyInArmy > 0 && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          background: '#ffd700', color: '#000',
          fontSize: 9, fontWeight: 900,
          width: 16, height: 16, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{alreadyInArmy}</div>
      )}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 0 8px',
      marginBottom: 6,
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
        color, textTransform: 'uppercase',
        fontFamily: "'Cinzel', serif",
      }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: `${color}30` }} />
    </div>
  );
}

// ── Army slot strip ───────────────────────────────────────────────────────────
function ArmySlot({
  unit, onRemove,
}: { unit: FactionUnit; onRemove: () => void }) {
  return (
    <div
      onClick={onRemove}
      title={`Remove ${unit.name}`}
      style={{
        width: 64, flexShrink: 0,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,215,0,0.2)',
        borderRadius: 8, padding: '5px 4px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        cursor: 'pointer', transition: 'background 0.1s',
        position: 'relative',
      }}
    >
      <img src={unit.icon} alt={unit.name}
        style={{ width: 38, height: 38, objectFit: 'contain' }}
        onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }}
      />
      <span style={{
        fontSize: 8, color: '#bbb', textAlign: 'center', lineHeight: 1.2,
      }}>{unit.name}</span>
      <span style={{
        position: 'absolute', top: 2, right: 4,
        fontSize: 9, color: '#f44', fontWeight: 900,
      }}>×</span>
    </div>
  );
}

function EmptySlot() {
  return (
    <div style={{
      width: 64, flexShrink: 0,
      border: '1px dashed rgba(255,255,255,0.12)',
      borderRadius: 8, minHeight: 72,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(255,255,255,0.18)', fontSize: 22,
    }}>+</div>
  );
}

// ── Main ArmyBuilder ──────────────────────────────────────────────────────────
export function ArmyBuilder() {
  // Store primitives — individual selectors
  const selectedRace = useGameStore(s => s.selectedRace);
  const enemyRace    = useGameStore(s => s.enemyRace);
  const gold         = useGameStore(s => s.gold);
  const difficulty   = useGameStore(s => s.difficulty);

  // Store array — useShallow required
  const playerArmy = useGameStore(useShallow(s => s.playerArmy));

  // Store actions — stable, individual selectors
  const setSelectedRace     = useGameStore(s => s.setSelectedRace);
  const setEnemyRace        = useGameStore(s => s.setEnemyRace);
  const addToPlayerArmy     = useGameStore(s => s.addToPlayerArmy);
  const removeFromPlayerArmy = useGameStore(s => s.removeFromPlayerArmy);
  const clearPlayerArmy     = useGameStore(s => s.clearPlayerArmy);
  const spawnArmies         = useGameStore(s => s.spawnArmies);
  const setDifficulty       = useGameStore(s => s.setDifficulty);
  const setPhase            = useGameStore(s => s.setPhase);

  // Derive active factions from races in store
  const playerFaction: Faction = RACE_TO_FACTION[selectedRace] ?? 'Crusade';
  const enemyFaction:  Faction = RACE_TO_FACTION[enemyRace]    ?? 'Legion';

  const factionMeta  = FACTION_META[playerFaction];
  const factionUnits = FACTION_UNITS[playerFaction];

  // Count how many of each unit type are already in the army
  const typeCounts = playerArmy.reduce<Record<string, number>>((acc, s) => {
    acc[s.unitType] = (acc[s.unitType] ?? 0) + 1;
    return acc;
  }, {});

  // Map army slots back to FactionUnit objects for display
  const armyUnits: (FactionUnit | null)[] = playerArmy.map(slot => {
    return factionUnits.find(u => u.type === slot.unitType) ?? null;
  });

  const handleAdd = (unit: FactionUnit) => {
    const regDef = REGIMENT_DEFS[unit.type] ?? REGIMENT_DEFS.swordsmen;
    addToPlayerArmy({
      unitType:    unit.type,
      maxSoldiers: unit.maxSoldiers,
      hpOverride:  Math.round(regDef.hp * (unit.maxSoldiers / regDef.maxSoldiers)),
    });
  };

  const infantry = factionUnits.filter(u => u.category === 'infantry');
  const mounted  = factionUnits.filter(u => u.category === 'mounted');
  const siege    = factionUnits.filter(u => u.category === 'siege');

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      display: 'flex', flexDirection: 'column',
      background: '#050810',
      backgroundImage: `radial-gradient(ellipse at 50% -10%, ${factionMeta.glowColor.replace('0.4','0.12')} 0%, transparent 55%)`,
      fontFamily: 'system-ui, sans-serif',
      overflow: 'hidden',
    }}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 20px',
        background: 'rgba(0,0,0,0.45)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        {/* Emblem + faction name */}
        <img src={factionMeta.emblem} alt={FACTION_DISPLAY[playerFaction]}
          style={{
            width: 42, height: 42,
            filter: `drop-shadow(0 0 10px ${factionMeta.primaryColor})`,
          }}
        />
        <div>
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 17, color: factionMeta.primaryColor,
            fontWeight: 700, letterSpacing: '0.08em',
          }}>
            {FACTION_DISPLAY[playerFaction].toUpperCase()}
          </div>
          <div style={{ fontSize: 10, color: '#555' }}>Army Muster</div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Gold */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,215,0,0.08)',
          border: '1px solid rgba(255,215,0,0.25)',
          borderRadius: 8, padding: '5px 12px',
        }}>
          <span style={{ fontSize: 16 }}>💰</span>
          <span style={{
            fontSize: 18, fontWeight: 700, color: '#ffd700',
            fontFamily: "'Cinzel', serif",
          }}>{gold}</span>
          <span style={{ fontSize: 10, color: '#666' }}>remaining</span>
        </div>

        {/* Difficulty */}
        <div style={{ display: 'flex', gap: 5 }}>
          {(['easy', 'normal', 'hard'] as const).map(d => (
            <button key={d} onClick={() => setDifficulty(d)} style={{
              background: difficulty === d ? 'rgba(255,215,0,0.18)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${difficulty === d ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 6, padding: '4px 11px', cursor: 'pointer',
              color: difficulty === d ? '#ffd700' : '#666',
              fontSize: 10, fontFamily: "'Cinzel', serif",
            }}>{d[0].toUpperCase() + d.slice(1)}</button>
          ))}
        </div>

        {/* Change faction */}
        <button
          onClick={() => setPhase('menu')}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6, padding: '4px 12px', cursor: 'pointer',
            color: '#888', fontSize: 10,
          }}>
          ← Change Faction
        </button>

        {/* Enemy picker — small inline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 10, color: '#666' }}>vs</span>
          {FACTIONS.map(f => {
            const m = FACTION_META[f];
            const sel = f === enemyFaction;
            return (
              <button key={f} onClick={() => setEnemyRace(FACTION_TO_RACE[f])} style={{
                display: 'flex', alignItems: 'center', gap: 3,
                background: sel ? `${m.primaryColor}18` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${sel ? m.primaryColor + '60' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
              }}>
                <img src={m.emblem} alt={f}
                  style={{ width: 18, height: 18, filter: sel ? 'none' : 'brightness(0.4)' }} />
                <span style={{ fontSize: 9, color: sel ? m.primaryColor : '#555' }}>
                  {FACTION_DISPLAY[f]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── BODY: unit picker ───────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', padding: '12px 20px 0',
      }}>

        {/* INFANTRY */}
        <SectionHeader icon="⚔️" label="Infantry" color={factionMeta.primaryColor} />
        <div style={{
          display: 'flex', gap: 10, flexWrap: 'nowrap',
          overflowX: 'auto', paddingBottom: 12,
        }}>
          {infantry.map(unit => (
            <UnitCard
              key={unit.type}
              unit={unit}
              gold={gold}
              alreadyInArmy={typeCounts[unit.type] ?? 0}
              onAdd={() => handleAdd(unit)}
            />
          ))}
        </div>

        {/* MOUNTED */}
        <SectionHeader icon="🐴" label="Mounted" color={factionMeta.primaryColor} />
        <div style={{
          display: 'flex', gap: 10, flexWrap: 'nowrap',
          overflowX: 'auto', paddingBottom: 12,
        }}>
          {mounted.map(unit => (
            <UnitCard
              key={unit.type}
              unit={unit}
              gold={gold}
              alreadyInArmy={typeCounts[unit.type] ?? 0}
              onAdd={() => handleAdd(unit)}
            />
          ))}
        </div>

        {/* SIEGE */}
        <SectionHeader icon="💣" label="Siege" color={factionMeta.primaryColor} />
        <div style={{
          display: 'flex', gap: 10, flexWrap: 'nowrap',
          overflowX: 'auto', paddingBottom: 12,
        }}>
          {siege.map(unit => (
            <UnitCard
              key={unit.type}
              unit={unit}
              gold={gold}
              alreadyInArmy={typeCounts[unit.type] ?? 0}
              onAdd={() => handleAdd(unit)}
            />
          ))}
        </div>
      </div>

      {/* ── ARMY STRIP ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(0,0,0,0.5)',
        borderTop: '1px solid rgba(255,215,0,0.15)',
        padding: '10px 20px',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
        }}>
          <span style={{
            fontSize: 10, color: '#888', fontFamily: "'Cinzel', serif",
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            Your Army — {playerArmy.length}/8 Regiments
          </span>
          {playerArmy.length > 0 && (
            <button onClick={clearPlayerArmy} style={{
              fontSize: 9, color: '#f44', background: 'none',
              border: 'none', cursor: 'pointer', padding: '0 4px',
            }}>Clear All</button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
          {/* Army slots */}
          <div style={{ display: 'flex', gap: 6, flex: 1, overflowX: 'auto' }}>
            {Array.from({ length: 8 }).map((_, i) => {
              const unit = armyUnits[i];
              return unit
                ? <ArmySlot key={i} unit={unit} onRemove={() => removeFromPlayerArmy(i)} />
                : <EmptySlot key={i} />;
            })}
          </div>

          {/* Battle button */}
          <button
            onClick={playerArmy.length > 0 ? spawnArmies : undefined}
            disabled={playerArmy.length === 0}
            style={{
              flexShrink: 0,
              padding: '0 32px',
              background: playerArmy.length > 0
                ? `linear-gradient(135deg, ${factionMeta.primaryColor}aa, ${factionMeta.primaryColor})`
                : 'rgba(255,255,255,0.06)',
              border: `2px solid ${playerArmy.length > 0 ? factionMeta.primaryColor : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 10,
              color: playerArmy.length > 0 ? '#fff' : '#444',
              fontFamily: "'Cinzel', serif",
              fontSize: 14, fontWeight: 700, letterSpacing: '0.08em',
              cursor: playerArmy.length > 0 ? 'pointer' : 'default',
              transition: 'all 0.2s',
              boxShadow: playerArmy.length > 0
                ? `0 0 20px ${factionMeta.glowColor}`
                : 'none',
            }}
          >
            ⚔ BATTLE
          </button>
        </div>

        <div style={{
          fontSize: 9, color: '#333', marginTop: 6, letterSpacing: '0.15em',
        }}>
          Click a regiment to add · Click army slot to remove · {playerArmy.length === 8 ? '⚠ FULL — remove a regiment to add another' : `${8 - playerArmy.length} slots free`}
        </div>

        {/* Commander selection — shown below army builder */}
        <div style={{ marginTop: 14 }}>
          <CommanderSelectPanel />
        </div>
      </div>
    </div>
  );
}
