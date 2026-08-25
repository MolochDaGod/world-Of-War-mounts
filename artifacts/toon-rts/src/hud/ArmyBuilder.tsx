/**
 * ArmyBuilder — faction-specific army composition screen.
 *
 * Units are grouped into Infantry / Mounted / Siege sections.
 * Portrait icons come from /assets/unit-icons/ (generated AI images + reference images).
 * Faction meta from FactionData.ts; game engine uses Race internally.
 */
import { useState, useCallback } from 'react';
import { useGameStore, REGIMENT_DEFS } from '@/game/store/gameStore';
import { useShallow } from 'zustand/react/shallow';
import { CommanderSelectPanel } from './CommanderSelectPanel';
import { GameIcon, GameIconName, UNIT_TYPE_ICON } from './GameIcon';

// ── Map selector sub-component ────────────────────────────────────────────────
function MapSelector() {
  const mapType    = useGameStore(s => s.mapType);
  const setMapType = useGameStore(s => s.setMapType);

  const btn = (id: 'battlefield' | 'arena', label: string, icon: GameIconName) => {
    const active = mapType === id;
    return (
      <button
        key={id}
        onClick={() => setMapType(id)}
        style={{
          flex: 1,
          padding: '7px 0',
          background: active ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.04)',
          border: `1.5px solid ${active ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 7,
          color: active ? '#fff' : '#666',
          fontSize: 11, fontWeight: active ? 700 : 400,
          letterSpacing: '0.06em',
          cursor: 'pointer',
          transition: 'all 0.18s',
        }}
      >
        <GameIcon name={icon} size={13} /> {label}
      </button>
    );
  };

  return (
    <div>
      <div style={{ fontSize: 8, color: '#555', letterSpacing: '0.15em', marginBottom: 5 }}>
        BATTLEFIELD
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {btn('battlefield', 'Open Field', 'tree')}
        {btn('arena', 'War Zone', 'sword')}
      </div>
    </div>
  );
}
import {
  Faction, FACTION_META, FACTION_DISPLAY, FACTION_UNITS, FACTION_TO_RACE,
  RACE_TO_FACTION, FactionUnit, FACTION_ALLIES, FACTION_ALLY_DISPLAY,
  PLAYABLE_FACTIONS,
} from '@/game/data/FactionData';
import type { UnitType } from '@/game/store/gameStore';

// ── Army presets ──────────────────────────────────────────────────────────────
interface ArmyPreset {
  label: string;
  icon:  GameIconName;
  desc:  string;
  units: UnitType[];
}

/** Faction-specific quick-start army presets (max 8 slots, ~2000 gold). */
const FACTION_PRESETS: Record<Faction, ArmyPreset[]> = {
  Crusade: [
    {
      label: 'Iron Rush',  icon: 'zap',
      desc:  'Twin cavalry + skirmishers flood the flanks before the enemy forms up',
      units: ['cavalry','cavalry','skirmishers','skirmishers','skirmishers','archers','swordsmen','swordsmen'],
    },
    {
      label: 'Fortress',   icon: 'castle',
      desc:  'Shield wall anchor + pikes + mage support — nothing gets through',
      units: ['shieldwall','shieldwall','spearmen','spearmen','mage','swordsmen','archers','archers'],
    },
    {
      label: 'Holy Host',  icon: 'cross',
      desc:  'Balanced crusader formation with wizard healing and heavy lancers',
      units: ['swordsmen','swordsmen','archers','spearmen','cavalry','heavyCavalry','mage','skirmishers'],
    },
  ],
  Fabled: [
    {
      label: 'Wind Blitz', icon: 'wind',
      desc:  'Windrunners + forest riders exploit every gap at blinding speed',
      units: ['skirmishers','skirmishers','skirmishers','cavalry','cavalry','heavyCavalry','archers','archers'],
    },
    {
      label: 'Arcane Rain',icon: 'leaf',
      desc:  'Mage + double archers rain death from maximum range',
      units: ['mage','mage','archers','archers','archers','spearmen','shieldwall','swordsmen'],
    },
    {
      label: 'Elven Host', icon: 'sparkles',
      desc:  'Classic all-comers elven line — swift, versatile, lethal',
      units: ['swordsmen','swordsmen','archers','spearmen','cavalry','mage','skirmishers','heavyCavalry'],
    },
  ],
  Legion: [
    {
      label: 'Death Wave', icon: 'skull',
      desc:  'Skirmisher wraiths + death knights surge as one unstoppable horde',
      units: ['skirmishers','skirmishers','skirmishers','heavyCavalry','heavyCavalry','swordsmen','swordsmen','mage'],
    },
    {
      label: 'Dark Arts',  icon: 'ghost',
      desc:  'Twin necromancers drain life while cavalry cleans up the wounded',
      units: ['mage','mage','heavyCavalry','cavalry','swordsmen','swordsmen','spearmen','skirmishers'],
    },
    {
      label: 'Undead Wall',icon: 'shield',
      desc:  'Shields soak, mage drains, cavalry punishes anyone who breaks',
      units: ['shieldwall','shieldwall','spearmen','spearmen','mage','cavalry','swordsmen','swordsmen'],
    },
  ],
  Barbarians: [
    {
      label: 'Berserker Rush', icon: 'sparkles',
      desc:  'Swarm of berserkers and marauders crash the line before the enemy can form up',
      units: ['swordsmen','swordsmen','swordsmen','skirmishers','skirmishers','cavalry','archers','mage'],
    },
    {
      label: 'Storm Horde',    icon: 'zap',
      desc:  'Chaos riders and horse warriors hammer the flanks while shamans rain fire',
      units: ['cavalry','cavalry','heavyCavalry','skirmishers','skirmishers','mage','swordsmen','archers'],
    },
    {
      label: 'Iron Tribe',     icon: 'axe',
      desc:  'Balanced tribal host — shield bearers hold, berserkers push, shamans support',
      units: ['shieldwall','shieldwall','swordsmen','swordsmen','spearmen','mage','archers','catapult'],
    },
  ],
  Dwarves: [
    {
      label: 'Grudge Wall',    icon: 'hammer',
      desc:  'Ironbreakers anchor the centre while the grudge thrower decides the battle',
      units: ['shieldwall','shieldwall','swordsmen','swordsmen','catapult','archers','archers','mage'],
    },
    {
      label: 'Gunline',        icon: 'crosshair',
      desc:  'Thunderers and organ guns shred everything before it reaches your lines',
      units: ['archers','archers','archers','boltThrower','shieldwall','spearmen','swordsmen','mage'],
    },
    {
      label: 'Iron Host',      icon: 'shield',
      desc:  'Full battle line — ironclad cavalry protects the flanks while hammerers grind forward',
      units: ['swordsmen','swordsmen','shieldwall','spearmen','cavalry','heavyCavalry','mage','catapult'],
    },
  ],
  Orcs: [
    {
      label: 'Wolf Blitz',     icon: 'move',
      desc:  'Wolf riders and armored raiders crash the flanks before the enemy can breathe',
      units: ['cavalry','cavalry','heavyCavalry','skirmishers','skirmishers','swordsmen','mage','grieeGlee'],
    },
    {
      label: 'Warlock Storm',  icon: 'skull',
      desc:  'Warlocks and bolt hurlers devastate from range while orc warriors soak damage',
      units: ['mage','mage','boltThrower','swordsmen','swordsmen','shieldwall','skirmishers','cavalry'],
    },
    {
      label: 'Green Tide',     icon: 'leaf',
      desc:  'Sheer numbers — orc warriors, runners, and troll peons overwhelm any defence',
      units: ['swordsmen','swordsmen','swordsmen','skirmishers','skirmishers','spearmen','cavalry','grieeGlee'],
    },
  ],
};

const FACTIONS: Faction[] = PLAYABLE_FACTIONS;

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
  const [imageFailed, setImageFailed] = useState(false);
  const canAfford = gold >= unit.cost;
  const regDef = REGIMENT_DEFS[unit.type] ?? REGIMENT_DEFS.swordsmen;
  const raceLabel: Record<string, string> = {
    WesternKingdoms: 'Human',
    Elves: 'Elf',
    Undead: 'Undead',
    Barbarians: 'Barbarian',
    Dwarves: 'Dwarf',
    Orcs: 'Orc',
  };

  return (
    <div
      role="button"
      tabIndex={canAfford ? 0 : -1}
      onClick={canAfford ? onAdd : undefined}
      onKeyDown={e => {
        if (canAfford && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onAdd();
        }
      }}
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
        width: '100%', minWidth: 0, minHeight: 315,
        position: 'relative',
        outline: 'none',
        textAlign: 'left',
      }}
    >
      {/* Portrait */}
      <div style={{
        width: '100%', height: 132, marginBottom: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 6,
        background: `radial-gradient(circle at 50% 35%, ${factionMetaColor(unit.race)}22, rgba(0,0,0,0.42) 72%)`,
        border: `1px solid ${factionMetaColor(unit.race)}32`,
        overflow: 'hidden',
      }}>
        {imageFailed
          ? <GameIcon name={UNIT_TYPE_ICON[unit.type] ?? 'sword'} size={54} strokeWidth={1.35} />
          : <img
              src={resolveUnitPortrait(unit)}
              alt={`${unit.name} portrait`}
              loading="eager"
              style={{
                height: '100%', width: '100%',
                objectFit: unit.race === 'Barbarians' || unit.race === 'Dwarves' ? 'cover' : 'contain',
                imageRendering: 'auto',
              }}
              onError={() => setImageFailed(true)}
            />}
      </div>

      {/* Name */}
      <div style={{
        fontSize: 12, fontWeight: 800, color: '#f0e8d5',
        fontFamily: "'Cinzel', serif", lineHeight: 1.2,
        marginBottom: 4, textAlign: 'left',
      }}>{unit.name}</div>

      {/* Soldiers + type */}
      <div style={{
        fontSize: 9, color: '#a5aaba', marginBottom: 7,
      }}>
        <span style={{ color: factionMetaColor(unit.race), fontWeight: 700 }}>
          {raceLabel[unit.race ?? ''] ?? unit.race}
        </span>
        {' · '}{unit.maxSoldiers} {unit.maxSoldiers === 1 ? 'engine' : 'troops'}
        {' · '}{unit.isRanged ? 'Ranged' : 'Melee'}
      </div>

      {/* Stats */}
      <div style={{ marginBottom: 6 }}>
        <StatBar label="ATK" value={unit.statAttack} />
        <StatBar label="DEF" value={unit.statDefense} />
        <StatBar label="SPD" value={unit.statSpeed} />
        {unit.isRanged && <StatBar label="RNG" value={unit.statRange} />}
      </div>

      <div style={{
        minHeight: 30, marginBottom: 7,
        color: hover ? '#c8ccda' : '#777d8e',
        fontSize: 9, lineHeight: 1.35,
        transition: 'color 0.15s',
      }}>
        {unit.lore}
      </div>

      {/* Cost row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 'auto',
      }}>
        <span style={{ fontSize: 11, color: canAfford ? '#ffd700' : '#666', fontWeight: 700 }}>
           <GameIcon name="coins" size={13} /> {unit.cost}
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

function factionMetaColor(race?: string) {
  const colors: Record<string, string> = {
    WesternKingdoms: '#4a9eff',
    Elves: '#3dcc6e',
    Undead: '#cc44cc',
    Barbarians: '#e05030',
    Dwarves: '#c88840',
    Orcs: '#6abf4b',
  };
  return colors[race ?? ''] ?? '#ffd700';
}

/**
 * The newer allied rosters use their verified faction art until individual crops
 * are available, so a unit card never collapses to a blank image area.
 */
function resolveUnitPortrait(unit: FactionUnit) {
  if (unit.race === 'Barbarians') return '/assets/unit-icons/barbarian.png';
  if (unit.race === 'Dwarves') return '/assets/unit-icons/dwarf.png';

  if (unit.race === 'Orcs') {
    const byType: Partial<Record<UnitType, string>> = {
      swordsmen: '/assets/unit-icons/orc_warrior.png',
      archers: '/assets/unit-icons/orc_archer.png',
      spearmen: '/assets/unit-icons/orc_warrior.png',
      shieldwall: '/assets/unit-icons/orc_paladin.png',
      skirmishers: '/assets/unit-icons/orc_merc.png',
      cavalry: '/assets/unit-icons/wolf_mount.png',
      heavyCavalry: '/assets/unit-icons/orc_paladin.png',
      mage: '/assets/unit-icons/orc_mage.png',
      boltThrower: '/assets/unit-icons/orc_archer.png',
      catapult: '/assets/unit-icons/orc_warrior.png',
      grieeGlee: '/assets/unit-icons/orc_warrior.png',
    };
    return byType[unit.type] ?? '/assets/unit-icons/orc_warrior.png';
  }

  return unit.icon;
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, label, color }: { icon: GameIconName; label: string; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 0 8px',
      marginBottom: 6,
    }}>
      <GameIcon name={icon} size={16} />
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
      <img src={resolveUnitPortrait(unit)} alt={unit.name}
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
  const [commanderConfirmed, setCommanderConfirmed] = useState(false);
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
  const allyFaction  = FACTION_ALLIES[playerFaction as 'Crusade' | 'Fabled' | 'Legion'];
  const factionUnits = [
    ...FACTION_UNITS[playerFaction].map(unit => ({
      ...unit,
      race: FACTION_TO_RACE[playerFaction],
    })),
    ...FACTION_UNITS[allyFaction].map(unit => ({
      ...unit,
      race: FACTION_TO_RACE[allyFaction],
    })),
  ];

  // Count how many of each unit type are already in the army
  const typeCounts = playerArmy.reduce<Record<string, number>>((acc, s) => {
    const key = `${s.race ?? selectedRace}:${s.unitType}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  // Map army slots back to FactionUnit objects for display
  const armyUnits: (FactionUnit | null)[] = playerArmy.map(slot => {
    return factionUnits.find(u =>
      u.type === slot.unitType && (slot.race ?? selectedRace) === u.race,
    ) ?? null;
  });

  const handleAdd = (unit: FactionUnit) => {
    const regDef = REGIMENT_DEFS[unit.type] ?? REGIMENT_DEFS.swordsmen;
    addToPlayerArmy({
      unitType:    unit.type,
      race:        unit.race,
      maxSoldiers: unit.maxSoldiers,
      hpOverride:  Math.round(regDef.hp * (unit.maxSoldiers / regDef.maxSoldiers)),
    });
  };

  const handlePreset = useCallback((preset: ArmyPreset) => {
    clearPlayerArmy();
    for (const unitType of preset.units) {
      const fu = factionUnits.find(u => u.type === unitType);
      if (!fu) continue;
      const regDef = REGIMENT_DEFS[unitType] ?? REGIMENT_DEFS.swordsmen;
      addToPlayerArmy({
        unitType,
        race:        fu.race,
        maxSoldiers: fu.maxSoldiers,
        hpOverride:  Math.round(regDef.hp * (fu.maxSoldiers / regDef.maxSoldiers)),
      });
    }
  }, [factionUnits, clearPlayerArmy, addToPlayerArmy]);

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
          <GameIcon name="coins" size={16} />
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

      {!commanderConfirmed ? (
        <div style={{
          flex: 1, overflowY: 'auto', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          padding: '28px 24px 40px',
          background: 'radial-gradient(ellipse at 50% 30%, rgba(255,215,0,0.06), transparent 58%)',
        }}>
          <div style={{ width: 'min(980px, 100%)' }}>
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{
                color: factionMeta.primaryColor, fontSize: 10, fontWeight: 800,
                letterSpacing: '0.24em', textTransform: 'uppercase',
              }}>
                Step 1 · Choose your commander
              </div>
              <div style={{ color: '#858b9e', fontSize: 12, marginTop: 7 }}>
                Your hero is selected first and stays with you while you build the army.
              </div>
            </div>
            <CommanderSelectPanel onContinue={() => setCommanderConfirmed(true)} />
          </div>
        </div>
      ) : (
      <>
      {/* ── BODY: unit picker ───────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflowY: 'auto', padding: '14px 24px 16px',
      }}>

        {/* ── QUICK DEPLOY presets ─────────────────────────────────────── */}
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 8, color: '#555', letterSpacing: '0.15em',
            marginBottom: 7, textTransform: 'uppercase',
          }}>
            <GameIcon name="zap" size={12} /> Quick Deploy
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {FACTION_PRESETS[playerFaction]?.map(preset => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset)}
                title={preset.desc}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '8px 6px',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid rgba(255,255,255,0.12)`,
                  borderRadius: 9,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  color: '#ccc',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${factionMeta.primaryColor}18`;
                  e.currentTarget.style.borderColor = `${factionMeta.primaryColor}55`;
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                  e.currentTarget.style.color = '#ccc';
                }}
              >
      <GameIcon name={preset.icon} size={18} />
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
                  fontFamily: "'Cinzel', serif",
                }}>
                  {preset.label}
                </span>
                <span style={{ fontSize: 7, color: '#666', textAlign: 'center', lineHeight: 1.3 }}>
                  {preset.desc.slice(0, 52)}{preset.desc.length > 52 ? '…' : ''}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* INFANTRY */}
        <SectionHeader icon="sword" label="Infantry" color={factionMeta.primaryColor} />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 10, paddingBottom: 18,
        }}>
          {infantry.map(unit => (
            <UnitCard
              key={`${unit.race}-${unit.type}`}
              unit={unit}
              gold={gold}
              alreadyInArmy={typeCounts[`${unit.race}:${unit.type}`] ?? 0}
              onAdd={() => handleAdd(unit)}
            />
          ))}
        </div>

        {/* MOUNTED */}
        <SectionHeader icon="move" label="Mounted" color={factionMeta.primaryColor} />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 10, paddingBottom: 18,
        }}>
          {mounted.map(unit => (
            <UnitCard
              key={`${unit.race}-${unit.type}`}
              unit={unit}
              gold={gold}
              alreadyInArmy={typeCounts[`${unit.race}:${unit.type}`] ?? 0}
              onAdd={() => handleAdd(unit)}
            />
          ))}
        </div>

        {/* SIEGE */}
        <SectionHeader icon="bomb" label="Siege" color={factionMeta.primaryColor} />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 10, paddingBottom: 6,
        }}>
          {siege.map(unit => (
            <UnitCard
              key={`${unit.race}-${unit.type}`}
              unit={unit}
              gold={gold}
              alreadyInArmy={typeCounts[`${unit.race}:${unit.type}`] ?? 0}
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
            <GameIcon name="sword" size={15} /> BATTLE
          </button>
        </div>

        <div style={{
          fontSize: 9, color: '#333', marginTop: 6, letterSpacing: '0.15em',
        }}>
          Click a regiment to add · Click army slot to remove · {playerArmy.length === 8 ? '⚠ FULL — remove a regiment to add another' : `${8 - playerArmy.length} slots free`}
        </div>

        <div style={{ marginTop: 12 }}>
          <MapSelector />
        </div>
      </div>
      <CommanderSelectPanel compact onEdit={() => setCommanderConfirmed(false)} />
      </>
      )}
    </div>
  );
}
