/**
 * UnitAbilityBar — shows ability buttons for currently selected units.
 *
 * Appears during battle, above the regiment bar, when at least one selected
 * unit has abilities available.
 *
 * Ability triggers:
 *  - 'self'   → fires immediately on all qualifying selected units
 *  - 'toggle' → flips a boolean flag on the unit  (e.g. life drain)
 *  - 'ground' → sets pendingAbility so next ground click places the effect
 */
import { useGameStore } from '@/game/store/gameStore';
import { getUnitAbilities, ABILITY_DEFS, AbilityId } from '@/game/data/AbilityDefs';
import { useEffect } from 'react';
import { ABILITY_ICON, GameIcon } from './GameIcon';

/** Format seconds as 0:SS or M:SS */
function fmtCd(secs: number) {
  if (secs <= 0) return 'Ready';
  const m = Math.floor(secs / 60);
  const s = Math.ceil(secs % 60);
  return m > 0 ? `${m}:${s.toString().padStart(2,'0')}` : `${s}s`;
}

interface AbilityBtnProps {
  abilityId: AbilityId;
  charges: number;
  maxCharges: number;
  cdSecs: number;       // seconds until next charge (0 = ready)
  active?: boolean;     // toggle state (life drain)
  pending?: boolean;    // waiting for ground click
  onClick: () => void;
}

function AbilityBtn({ abilityId, charges, maxCharges, cdSecs, active, pending, onClick }: AbilityBtnProps) {
  const def  = ABILITY_DEFS[abilityId];
  const ready = charges > 0 && cdSecs <= 0;

  return (
    <button
      onClick={onClick}
      title={`${def.name}: ${def.description}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        padding: '6px 12px',
        border: `1.5px solid ${
          active  ? def.color :
          pending ? def.color :
          ready   ? `${def.color}88` :
                    'rgba(255,255,255,0.15)'
        }`,
        borderRadius: '7px',
        background: active
          ? `linear-gradient(135deg, ${def.color}44 0%, ${def.color}22 100%)`
          : pending
          ? `linear-gradient(135deg, ${def.color}33 0%, ${def.color}15 100%)`
          : ready
          ? 'rgba(0,0,0,0.55)'
          : 'rgba(0,0,0,0.35)',
        color: ready || active || pending ? def.color : 'rgba(255,255,255,0.35)',
        cursor: ready || active ? 'pointer' : 'default',
        transition: 'all 0.12s',
        minWidth: '58px',
        boxShadow: active
          ? `0 0 14px ${def.color}66`
          : pending
          ? `0 0 10px ${def.color}55`
          : ready
          ? `0 0 6px ${def.color}33`
          : 'none',
        backdropFilter: 'blur(6px)',
        position: 'relative',
        opacity: ready || active || pending ? 1 : 0.6,
      }}
    >
      {/* Shortcut badge */}
      <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em', opacity: 0.65 }}>
        [{def.shortcut}]
      </span>

      {/* Icon */}
      <GameIcon name={ABILITY_ICON[abilityId]} size={18} />

      {/* Name */}
      <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textAlign: 'center' }}>
        {def.name}
      </span>

      {/* Charge pips */}
      <div style={{ display: 'flex', gap: '3px', marginTop: '1px' }}>
        {Array.from({ length: maxCharges }, (_, i) => (
          <div
            key={i}
            style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: i < charges ? def.color : 'rgba(255,255,255,0.15)',
              boxShadow: i < charges ? `0 0 4px ${def.color}` : 'none',
            }}
          />
        ))}
      </div>

      {/* Cooldown overlay */}
      {!ready && !active && cdSecs > 0 && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: '7px',
          background: 'rgba(0,0,0,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 900,
          color: 'rgba(255,255,255,0.65)',
        }}>
          {fmtCd(cdSecs)}
        </div>
      )}

      {/* Toggle/pending indicator */}
      {(active || pending) && (
        <div style={{
          position: 'absolute',
          top: '-6px',
          right: '-6px',
          background: def.color,
          borderRadius: '50%',
          width: '10px',
          height: '10px',
          animation: 'pulse 1s ease-in-out infinite',
        }} />
      )}
    </button>
  );
}

export function UnitAbilityBar() {
  const phase          = useGameStore(s => s.phase);
  const selectedIds    = useGameStore(s => s.selectedUnitIds);
  const units          = useGameStore(s => s.units);
  const combatElapsed  = useGameStore(s => s.combatElapsed);
  const pendingAbility = useGameStore(s => s.pendingAbility);
  const triggerAbility = useGameStore(s => s.triggerAbility);
  const setPending     = useGameStore(s => s.setPendingAbility);

  // Keyboard shortcut handler per ability
  useEffect(() => {
    if (phase !== 'battle') return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      // find all selected units' abilities matching this key
      const key = e.key.toUpperCase();
      const selUnits = units.filter(u => selectedIds.includes(u.id) && u.state !== 'dead');
      for (const u of selUnits) {
        const abilityIds = getUnitAbilities(u.race, u.type);
        for (const aid of abilityIds) {
          if (ABILITY_DEFS[aid].shortcut === key) {
            handleAbility(aid, u.id);
            e.preventDefault();
            return;
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, selectedIds, units, combatElapsed]);

  if (phase !== 'battle' || selectedIds.length === 0) return null;

  // Collect abilities across selected units
  const selectedUnits = units.filter(
    u => selectedIds.includes(u.id) && u.state !== 'dead',
  );
  if (selectedUnits.length === 0) return null;

  // Gather unique ability IDs with aggregate charge info
  const abilityMap = new Map<AbilityId, {
    charges: number; maxCharges: number; cdSecs: number;
    active: boolean; unitIds: string[];
  }>();

  for (const u of selectedUnits) {
    const abilities = getUnitAbilities(u.race, u.type);
    for (const aid of abilities) {
      const def   = ABILITY_DEFS[aid];
      const state = u.abilityCharges?.[aid];
      const charges = state?.charges ?? def.maxCharges;
      const cdSecs  = Math.max(0, (state?.nextChargeAt ?? 0) - combatElapsed);
      const active  = aid === 'life_drain' && !!u.lifedrainAura;

      if (!abilityMap.has(aid)) {
        abilityMap.set(aid, { charges, maxCharges: def.maxCharges, cdSecs, active, unitIds: [u.id] });
      } else {
        const prev = abilityMap.get(aid)!;
        prev.unitIds.push(u.id);
        // Show min charges across selected units
        prev.charges  = Math.min(prev.charges, charges);
        prev.cdSecs   = Math.max(prev.cdSecs, cdSecs);
      }
    }
  }

  if (abilityMap.size === 0) return null;

  function handleAbility(aid: AbilityId, specificUnitId?: string) {
    const def   = ABILITY_DEFS[aid];
    const entry = abilityMap.get(aid);
    if (!entry) return;
    const unitIds = specificUnitId ? [specificUnitId] : entry.unitIds;

    if (def.targeting === 'ground') {
      // Set pending — next ground click will place
      setPending({ abilityId: aid, unitIds });
    } else {
      triggerAbility(unitIds, aid, undefined);
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '5px',
      pointerEvents: 'all',
    }}>
      {/* Label */}
      {pendingAbility && (
        <div style={{
          background: 'rgba(0,0,0,0.75)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: '6px',
          padding: '3px 14px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: ABILITY_DEFS[pendingAbility.abilityId].color,
          backdropFilter: 'blur(6px)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <GameIcon name={ABILITY_ICON[pendingAbility.abilityId]} size={14} />&nbsp;
          {ABILITY_DEFS[pendingAbility.abilityId].name} — click ground to place&nbsp;
          <span style={{ opacity: 0.5, cursor: 'pointer' }}
            onClick={() => setPending(null)}>[ESC]</span>
        </div>
      )}

      {/* Ability buttons */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {Array.from(abilityMap.entries()).map(([aid, info]) => (
          <AbilityBtn
            key={aid}
            abilityId={aid}
            charges={info.charges}
            maxCharges={info.maxCharges}
            cdSecs={info.cdSecs}
            active={info.active}
            pending={pendingAbility?.abilityId === aid}
            onClick={() => handleAbility(aid)}
          />
        ))}
      </div>
    </div>
  );
}
