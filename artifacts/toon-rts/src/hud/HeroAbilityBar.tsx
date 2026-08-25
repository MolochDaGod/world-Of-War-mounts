/**
 * HeroAbilityBar — the two active abilities of the player's living commander.
 *
 * Hero abilities are self-targeted at the commander, so a click or the displayed
 * number key casts immediately without changing the battlefield targeting mode.
 */
import { useEffect } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { ABILITY_DEFS } from '@/game/data/AbilityDefs';
import { COMMANDER_BY_ID } from '@/game/data/CommanderDefs';
import { ABILITY_ICON, GameIcon } from './GameIcon';

function formatCooldown(seconds: number) {
  if (seconds <= 0) return 'READY';
  return `${Math.ceil(seconds)}s`;
}

export function HeroAbilityBar() {
  const phase = useGameStore(s => s.phase);
  const playerCommander = useGameStore(s => s.playerCommander);
  const units = useGameStore(s => s.units);
  const combatElapsed = useGameStore(s => s.combatElapsed);
  const triggerAbility = useGameStore(s => s.triggerAbility);

  const commander = playerCommander ? COMMANDER_BY_ID[playerCommander] : null;
  const hero = commander
    ? units.find(u => u.teamId === 1 && u.isCommander && u.commanderArchetype === commander.id && u.state !== 'dead')
    : undefined;

  useEffect(() => {
    if (phase !== 'battle' || !commander || !hero) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const abilityId = commander.heroAbilities[Number(event.key) - 1];
      if (!abilityId) return;
      triggerAbility([hero.id], abilityId);
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, commander, hero?.id, triggerAbility]);

  if (phase !== 'battle' || !commander || !hero) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      pointerEvents: 'all',
    }}>
      <div style={{
        color: '#ffd700',
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: '0.16em',
        textShadow: '0 1px 4px #000',
      }}>
        <GameIcon name="crown" size={12} /> {commander.name.toUpperCase()} · HERO ABILITIES
      </div>
      <div style={{
        display: 'flex',
        gap: 6,
        padding: '5px 8px',
        background: 'rgba(22,16,8,0.82)',
        border: '1px solid rgba(255,215,0,0.38)',
        borderRadius: 9,
        boxShadow: '0 0 16px rgba(255,180,0,0.15)',
        backdropFilter: 'blur(6px)',
      }}>
        {commander.heroAbilities.map(abilityId => {
          const def = ABILITY_DEFS[abilityId];
          const chargeState = hero.abilityCharges?.[abilityId];
          const charges = chargeState?.charges ?? def.maxCharges;
          const cooldown = Math.max(0, (chargeState?.nextChargeAt ?? 0) - combatElapsed);
          const ready = charges > 0;
          const active =
            (abilityId === 'cavalry_charge' && !!hero.chargeBoost) ||
            (abilityId === 'shield_wall' && (hero.shieldWallUntil ?? 0) > combatElapsed) ||
            (abilityId === 'formation_lock' && (hero.formationLockUntil ?? 0) > combatElapsed) ||
            (abilityId === 'arcane_barrier' && (hero.arcaneBarrierUntil ?? 0) > combatElapsed);

          return (
            <button
              key={abilityId}
              type="button"
              disabled={!ready}
              onClick={() => triggerAbility([hero.id], abilityId)}
              title={`${def.name}: ${def.description}`}
              style={{
                position: 'relative',
                minWidth: 82,
                minHeight: 54,
                padding: '4px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                borderRadius: 7,
                border: `1.5px solid ${active || ready ? def.color : 'rgba(255,255,255,0.15)'}`,
                background: active ? `${def.color}33` : ready ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.38)',
                color: active || ready ? def.color : 'rgba(255,255,255,0.4)',
                cursor: ready ? 'pointer' : 'not-allowed',
                opacity: ready || active ? 1 : 0.65,
                transition: 'all 0.12s',
              }}
            >
              <span style={{
                position: 'absolute',
                top: -7,
                right: -5,
                minWidth: 18,
                height: 18,
                padding: '0 3px',
                borderRadius: 4,
                background: '#8b5a16',
                color: '#fff',
                fontSize: 10,
                fontWeight: 800,
              }}>
                {commander.heroAbilities.indexOf(abilityId) + 1}
              </span>
              <GameIcon name={ABILITY_ICON[abilityId]} size={19} />
              <span style={{ fontSize: 9, fontWeight: 800, lineHeight: 1.1, textAlign: 'center' }}>{def.name}</span>
              <span style={{ fontSize: 8, color: ready ? '#ddd' : '#999' }}>
                {charges}/{def.maxCharges} · {formatCooldown(cooldown)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}