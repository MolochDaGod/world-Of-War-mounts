/**
 * CommanderSelectPanel — pre-battle commander chooser.
 *
 * Shows 3 commander archetypes for the player's selected race.
 * Player picks ONE; it spawns as a special hero unit when battle starts.
 * Can also skip (no commander).
 */
import { useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { useShallow }   from 'zustand/react/shallow';
import {
  CommanderDef, getCommandersForRace,
  COMMANDER_BY_ID,
} from '@/game/data/CommanderDefs';
import { FACTION_TO_RACE } from '@/game/data/FactionData';
import { ABILITY_DEFS } from '@/game/data/AbilityDefs';

const ARCHETYPE_ICON: Record<string, string> = {
  champion: '⚔️',
  warlord:  '🛡️',
  archmage: '🔮',
};

const ARCHETYPE_LABEL: Record<string, string> = {
  champion: 'Champion',
  warlord:  'Warlord',
  archmage: 'Archmage',
};

const BONUS_LABEL: Record<string, string> = {
  attack:  'ATK Aura',
  defense: 'DEF Aura',
  speed:   'SPD Aura',
};

const BONUS_COLOR: Record<string, string> = {
  attack:  '#ff7043',
  defense: '#42a5f5',
  speed:   '#66bb6a',
};

function CommanderCard({
  def,
  selected,
  onSelect,
}: {
  def: CommanderDef;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const [hover, setHover] = useState(false);
  const active = selected || hover;
  const bColor = BONUS_COLOR[def.leadershipBonus.type] ?? '#aaa';

  return (
    <div
      onClick={() => onSelect(selected ? '' : def.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: 1,
        maxWidth: 200,
        minWidth: 150,
        background: selected
          ? 'rgba(255,215,0,0.12)'
          : hover
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.03)',
        border: `1.5px solid ${selected ? 'rgba(255,215,0,0.7)' : active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 10,
        padding: '14px 12px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        position: 'relative',
        boxShadow: selected ? '0 0 20px rgba(255,215,0,0.25)' : undefined,
      }}
    >
      {selected && (
        <div style={{
          position: 'absolute', top: 6, right: 8,
          fontSize: 14, color: '#ffd700',
        }}>♛</div>
      )}

      {/* Archetype badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2,
      }}>
        <span style={{ fontSize: 18 }}>{ARCHETYPE_ICON[def.archetype]}</span>
        <span style={{
          fontSize: 9, letterSpacing: '0.08em',
          color: '#888', textTransform: 'uppercase',
        }}>
          {ARCHETYPE_LABEL[def.archetype]}
        </span>
      </div>

      <div style={{ fontWeight: 800, fontSize: 14, color: selected ? '#ffd700' : '#fff', lineHeight: 1.2 }}>
        {def.name}
      </div>
      <div style={{ fontSize: 10, color: '#aaa', fontStyle: 'italic' }}>{def.title}</div>

      <div style={{ fontSize: 9, color: '#ccc', lineHeight: 1.5, marginTop: 2 }}>
        {def.lore}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
        <StatPill label="HP" value={`${(def.hp / 1000).toFixed(0)}k`} color="#e0e0e0" />
        <StatPill
          label={BONUS_LABEL[def.leadershipBonus.type]}
          value={`+${Math.round((def.leadershipBonus.multiplier - 1) * 100)}%`}
          color={bColor}
        />
        <StatPill label="Radius" value={`${def.leadershipBonus.auraRadius}m`} color="#b39ddb" />
      </div>

      {/* Passive ability row */}
      <div style={{
        marginTop: 5, padding: '5px 7px',
        background: 'rgba(180,120,255,0.08)',
        border: '1px solid rgba(180,120,255,0.18)',
        borderRadius: 5,
        fontSize: 8, color: '#c9a0ff',
        lineHeight: 1.4,
      }}>
        <span style={{ fontWeight: 700, letterSpacing: '0.06em' }}>PASSIVE · </span>
        {def.heroPassive ?? `${def.leadershipBonus.type === 'attack' ? '⚔' : def.leadershipBonus.type === 'defense' ? '🛡' : '💨'} Leadership: +${Math.round((def.leadershipBonus.multiplier - 1) * 100)}% ${def.leadershipBonus.type} to allies within ${def.leadershipBonus.auraRadius}m`}
      </div>

      {/* Hero abilities */}
      <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
          {def.heroAbilities.map((ab, i) => (
            <div key={i} style={{
              flex: 1, padding: '3px 5px',
              background: 'rgba(255,215,0,0.07)',
              border: '1px solid rgba(255,215,0,0.2)',
              borderRadius: 4,
              fontSize: 7, color: '#ffd700', textAlign: 'center',
            }}>
              {ABILITY_DEFS[ab].name}
            </div>
          ))}
        </div>

      {/* Scale note */}
      <div style={{ fontSize: 8, color: '#666', marginTop: 4 }}>
        ★ 1.5× Scale · Solo Hero Unit
      </div>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 4, padding: '1px 6px',
      fontSize: 9, display: 'flex', gap: 4, alignItems: 'center',
    }}>
      <span style={{ color: '#777' }}>{label}</span>
      <span style={{ color, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface Props {
  /** Which faction's race to show commanders for. Falls back to selectedRace. */
  faction?: string;
}

export function CommanderSelectPanel({ faction: _ }: Props) {
  const { selectedRace, playerCommander, setPlayerCommander } = useGameStore(
    useShallow(s => ({
      selectedRace:      s.selectedRace,
      playerCommander:   s.playerCommander,
      setPlayerCommander: s.setPlayerCommander,
    })),
  );

  const commanders = getCommandersForRace(selectedRace);
  const chosen     = playerCommander ? COMMANDER_BY_ID[playerCommander] : null;

  return (
    <div style={{
      background: 'rgba(0,0,0,0.55)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '14px 14px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', color: '#ffd700' }}>
            FIELD COMMANDER
          </div>
          <div style={{ fontSize: 9, color: '#888', marginTop: 1 }}>
            Choose one hero to lead your army — or march without one.
          </div>
        </div>
        {chosen && (
          <div style={{
            fontSize: 9, color: '#888', cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4, padding: '2px 6px',
          }}
            onClick={() => setPlayerCommander(null)}
          >
            ✕ Clear
          </div>
        )}
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {commanders.map(def => (
          <CommanderCard
            key={def.id}
            def={def}
            selected={playerCommander === def.id}
            onSelect={id => setPlayerCommander(id || null)}
          />
        ))}
      </div>

      {chosen && (
        <div style={{
          marginTop: 10, padding: '7px 10px',
          background: 'rgba(255,215,0,0.08)',
          border: '1px solid rgba(255,215,0,0.25)',
          borderRadius: 6, fontSize: 10, color: '#ffd700',
        }}>
          ♛ {chosen.name} will lead your forces — {Math.round((chosen.leadershipBonus.multiplier - 1) * 100)}%{' '}
          {chosen.leadershipBonus.type} boost to allies within {chosen.leadershipBonus.auraRadius}m
        </div>
      )}
    </div>
  );
}
