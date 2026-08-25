import { useEffect, useState } from 'react';
import { useGameStore, type UnitData } from '@/game/store/gameStore';
import { getCombatStats } from '@/game/data/CombatStats';
import { ABILITY_DEFS, getUnitAbilities } from '@/game/data/AbilityDefs';
import { COMMANDER_BY_ID } from '@/game/data/CommanderDefs';
import { GameIcon, UNIT_TYPE_ICON } from './GameIcon';

type ArmySummary = {
  alive: number;
  total: number;
  infantry: number;
  cavalry: number;
  siege: number;
  mage: number;
  hp: number;
  maxHp: number;
};

type BattleSnapshot = {
  phase: string;
  team1: ArmySummary;
  team2: ArmySummary;
  selected: UnitData | null;
  commander: UnitData | null;
  combatElapsed: number;
};

const emptyArmy = (): ArmySummary => ({
  alive: 0, total: 0, infantry: 0, cavalry: 0, siege: 0, mage: 0, hp: 0, maxHp: 0,
});

function isInfantry(type: UnitData['type']) {
  return ['infantry', 'swordsmen', 'spearmen', 'shieldwall', 'skirmishers', 'skeletonWarrior', 'meshyWarrior'].includes(type);
}

function takeSnapshot(): BattleSnapshot {
  const state = useGameStore.getState();
  const team1 = emptyArmy();
  const team2 = emptyArmy();

  for (const unit of state.units) {
    const summary = unit.teamId === 1 ? team1 : team2;
    summary.total++;
    if (unit.state === 'dead') continue;
    summary.alive++;
    summary.hp += unit.health;
    summary.maxHp += unit.maxHealth;
    if (isInfantry(unit.type)) summary.infantry++;
    if (unit.type === 'cavalry' || unit.type === 'heavyCavalry') summary.cavalry++;
    if (unit.type === 'catapult' || unit.type === 'boltThrower' || unit.type === 'grieeGlee') summary.siege++;
    if (unit.type === 'mage') summary.mage++;
  }

  const selected = state.units.find(unit => (
    state.selectedUnitIds.includes(unit.id) && unit.teamId === 1 && unit.state !== 'dead'
  )) ?? null;
  const commander = state.units.find(unit => (
    unit.teamId === 1 && unit.isCommander && unit.state !== 'dead'
  )) ?? null;
  return { phase: state.phase, team1, team2, selected, commander, combatElapsed: state.combatElapsed };
}

/**
 * The store changes every combat tick. A small, 4 Hz HUD snapshot keeps the
 * detailed panel readable without subscribing six separate filters to the
 * entire units array.
 */
function useBattleSnapshot() {
  const [snapshot, setSnapshot] = useState<BattleSnapshot>(takeSnapshot);
  useEffect(() => {
    const refresh = () => setSnapshot(takeSnapshot());
    const timer = window.setInterval(refresh, 250);
    return () => window.clearInterval(timer);
  }, []);
  return snapshot;
}

function ArmyColumn({ label, color, summary }: { label: string; color: string; summary: ArmySummary }) {
  const hpPct = summary.maxHp > 0 ? summary.hp / summary.maxHp : 0;
  const hpColor = hpPct > 0.6 ? '#22c55e' : hpPct > 0.3 ? '#eab308' : '#ef4444';
  const counts = [
    ['sword', 'Infantry', summary.infantry],
    ['move', 'Cavalry', summary.cavalry],
    ['bomb', 'Siege', summary.siege],
    ['wand', 'Mage', summary.mage],
  ] as const;

  return (
    <div style={{ flex: 1, padding: '6px 10px' }}>
      <div style={{ color, fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 700, marginBottom: 6, letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 6 }}>
        {counts.filter(([, , amount]) => amount > 0).map(([icon, text, amount]) => (
          <div key={text} style={{ fontSize: 11, color: '#f0e8d5', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <GameIcon name={icon} size={13} /> {text}
            </span>
            <span style={{ color: '#ffd700' }}>{amount}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>{summary.alive} / {summary.total} regiments alive</div>
      <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 4, height: 6, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ width: `${hpPct * 100}%`, height: '100%', background: hpColor, transition: 'width 0.25s ease' }} />
      </div>
      <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>{Math.ceil(summary.hp)} / {summary.maxHp} HP</div>
    </div>
  );
}

function SelectedRegimentPanel({ unit, combatElapsed }: { unit: UnitData; combatElapsed: number }) {
  const stats = getCombatStats(unit.type);
  const commander = unit.isCommander ? COMMANDER_BY_ID[unit.commanderArchetype ?? ''] : undefined;
  const abilities = commander?.heroAbilities ?? getUnitAbilities(unit.race, unit.type);
  const livingSoldiers = unit.isCommander
    ? 1
    : Math.max(1, Math.ceil((unit.health / unit.maxHealth) * unit.maxSoldiers));
  const hpPct = Math.round((unit.health / unit.maxHealth) * 100);
  const displayName = commander?.name ?? unit.type.replace(/([A-Z])/g, ' $1');

  return (
    <div style={{
      borderTop: '1px solid rgba(255,215,0,0.2)',
      padding: '8px 10px 9px',
      width: '100%',
      background: 'rgba(8,14,28,0.54)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <GameIcon name={UNIT_TYPE_ICON[unit.type] ?? 'sword'} size={15} />
        <strong style={{ fontFamily: "'Cinzel', serif", fontSize: 12, color: commander ? '#ffd700' : '#dbeafe' }}>
          {displayName}
        </strong>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: '#9ca3af', textTransform: 'uppercase' }}>{stats.role}</span>
      </div>
      {commander && (
        <div style={{ fontSize: 9, color: '#f6d365', marginBottom: 6, lineHeight: 1.35 }}>
          {commander.title} · {commander.leadershipBonus.type} aura +{Math.round((commander.leadershipBonus.multiplier - 1) * 100)}% / {commander.leadershipBonus.auraRadius}m
          {commander.heroPassive ? <><br /><span style={{ color: '#b5bdd1' }}>{commander.heroPassive}</span></> : null}
        </div>
      )}
      <div style={{ height: 5, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ height: '100%', width: `${hpPct}%`, background: hpPct > 45 ? '#34d399' : '#fb7185', transition: 'width .25s' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px 8px', fontSize: 9, color: '#c8d0e0' }}>
        <span>HP <b>{Math.ceil(unit.health)}/{unit.maxHealth}</b></span>
        <span>Troops <b>{livingSoldiers}/{unit.maxSoldiers}</b></span>
        <span>DMG <b>{stats.damage}</b></span>
        <span>Cadence <b>{stats.attackCooldown.toFixed(1)}s</b></span>
        <span>Range <b>{stats.attackRange}m</b></span>
        <span>Speed <b>{stats.speed}m/s</b></span>
      </div>
      {abilities.length > 0 && (
        <div style={{ marginTop: 7, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {abilities.map(abilityId => {
            const ability = ABILITY_DEFS[abilityId];
            const charge = unit.abilityCharges?.[abilityId];
            const charges = charge?.charges ?? ability.maxCharges;
            const cooldown = Math.max(0, (charge?.nextChargeAt ?? 0) - combatElapsed);
            const area = ability.areaEffect ?? ability.attackEffect;
            return (
              <span key={abilityId} title={ability.description} style={{
                border: `1px solid ${ability.color}66`, borderRadius: 4, padding: '2px 4px',
                fontSize: 8, color: ability.color, background: `${ability.color}16`,
              }}>
                {ability.name} {charges}/{ability.maxCharges}{cooldown > 0 ? ` · ${Math.ceil(cooldown)}s` : ''}
                {area ? ` · AOE ${area.radius}m` : ''}
              </span>
            );
          })}
        </div>
      )}
      {(unit.chargeBoost || unit.pendingAttackSkill || unit.pendingBleed || unit.standGround) && (
        <div style={{ marginTop: 6, fontSize: 9, color: '#f6d365' }}>
          {unit.chargeBoost || unit.pendingAttackSkill ? 'CHARGE ARMED' : ''}
          {unit.pendingBleed ? `${unit.chargeBoost || unit.pendingAttackSkill ? ' · ' : ''}BLEED READY` : ''}
          {unit.standGround ? `${unit.chargeBoost || unit.pendingAttackSkill || unit.pendingBleed ? ' · ' : ''}STAND GROUND` : ''}
        </div>
      )}
      <div style={{ marginTop: 6, fontSize: 8, color: '#71809c' }}>
        Shift-click adds/removes units · F then enemy click focuses fire · Shift+S holds position
      </div>
    </div>
  );
}

function CommanderStatusPanel({ unit }: { unit: UnitData }) {
  const commander = COMMANDER_BY_ID[unit.commanderArchetype ?? ''];
  if (!commander) return null;
  const hpPct = Math.max(0, Math.min(100, (unit.health / unit.maxHealth) * 100));

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      padding: '8px 10px',
      background: 'linear-gradient(90deg, rgba(180,125,35,0.22), rgba(8,14,28,0.2))',
      borderBottom: '1px solid rgba(255,215,0,0.22)',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 9, overflow: 'hidden', flex: '0 0 auto',
        border: '1px solid rgba(255,215,0,0.65)', background: '#0b1020',
        boxShadow: '0 0 14px rgba(255,194,80,0.2)',
      }}>
        {commander.avatarPath ? (
          <img src={commander.avatarPath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#ffd700' }}><GameIcon name="crown" size={24} /></div>
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: '#f6d365', fontSize: 8, letterSpacing: '0.15em', fontWeight: 800 }}>FIELD COMMANDER</div>
        <div style={{ color: '#fff2c4', fontFamily: "'Cinzel', serif", fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {commander.name}
        </div>
        <div style={{ height: 5, marginTop: 5, borderRadius: 4, background: 'rgba(0,0,0,0.45)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${hpPct}%`, background: hpPct > 45 ? '#38d99f' : '#ff7b72' }} />
        </div>
        <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: 8, marginTop: 3 }}>{Math.ceil(unit.health)} / {unit.maxHealth} HP · {commander.title}</div>
      </div>
    </div>
  );
}

export function UnitInfoPanel() {
  const snapshot = useBattleSnapshot();
  const hasUnits = snapshot.team1.total + snapshot.team2.total > 0;

  return (
    <div className="pointer-events-auto" style={{
      background: 'linear-gradient(135deg, rgba(7,12,22,0.93), rgba(20,29,46,0.86))',
      border: '1px solid rgba(255,215,0,0.2)', borderRadius: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.32)', backdropFilter: 'blur(8px)',
      width: 360, minHeight: 110, display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', position: 'relative',
    }}>
      {!hasUnits ? (
        <div style={{ flex: 1, color: 'rgba(255,255,255,0.3)', fontSize: 12, fontStyle: 'italic', padding: 16, textAlign: 'center' }}>
          No armies deployed
        </div>
      ) : (
        <>
          {snapshot.commander && <CommanderStatusPanel unit={snapshot.commander} />}
          <ArmyColumn label="Player" color="#60a5fa" summary={snapshot.team1} />
          <div style={{ width: 1, background: 'rgba(255,215,0,0.2)', margin: '8px 0' }} />
          <ArmyColumn label="Enemy" color="#f87171" summary={snapshot.team2} />
          {snapshot.selected && <SelectedRegimentPanel unit={snapshot.selected} combatElapsed={snapshot.combatElapsed} />}
        </>
      )}
      {snapshot.phase === 'victory' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', borderRadius: 12 }}>
          <div style={{ color: '#ffd700', fontFamily: "'Cinzel', serif", fontSize: 18, textShadow: '0 0 20px #ffd700' }}>Victory!</div>
        </div>
      )}
    </div>
  );
}