import { useState } from 'react';
import { useWorldStore } from '@/game/store/worldStore';
import { GameUI } from '@/game/assets/CraftpixManifest';

type Tab = 'upgrades' | 'buildings';

const UPGRADE_TYPES = [
  { key: 'infantry', label: 'Infantry',  icon: GameUI.upgradeIco1 },
  { key: 'cavalry',  label: 'Cavalry',   icon: GameUI.upgradeIco2 },
  { key: 'siege',    label: 'Siege',     icon: GameUI.upgradeIco3 },
  { key: 'magic',    label: 'Magic',     icon: GameUI.upgradeIco4 },
  { key: 'defense',  label: 'Defense',   icon: GameUI.upgradeIco5 },
];

const STAT_COSTS: Record<string, number[]> = {
  attack:  [25, 50, 75],
  defense: [25, 50, 75],
  speed:   [20, 40, 60],
};

const BUILDINGS: { id: string; label: string; icon: string; desc: string; costs: Record<string, number> }[] = [
  { id: 'barracks',    label: 'Barracks',    icon: '🏰', desc: 'Train infantry units',        costs: { wood: 80, gold: 50  } },
  { id: 'stable',      label: 'Stable',      icon: '🐴', desc: 'Train cavalry units',         costs: { wood: 60, gold: 80  } },
  { id: 'mage_tower',  label: 'Mage Tower',  icon: '🔮', desc: 'Unlocks magic abilities',      costs: { wood: 40, gold: 120, crystal: 30 } },
  { id: 'mine',        label: 'Mine',        icon: '⛏️',  desc: 'Passively gathers coal+gold', costs: { wood: 100, coal: 20 } },
  { id: 'lumber_camp', label: 'Lumber Camp', icon: '🪵',  desc: 'Passively gathers wood',       costs: { wood: 50, gold: 30  } },
];

interface ShopPanelProps {
  onClose: () => void;
}

export function ShopPanel({ onClose }: ShopPanelProps) {
  const [tab, setTab] = useState<Tab>('upgrades');
  const upgrades       = useWorldStore(s => s.upgrades);
  const resources      = useWorldStore(s => s.resources);
  const upgradeUnit    = useWorldStore(s => s.upgradeUnit);
  const spendResources = useWorldStore(s => s.spendResources);

  const handleUpgrade = (typeKey: string, stat: 'attack' | 'defense' | 'speed') => {
    const current = upgrades[typeKey] ?? { attack: 0, defense: 0, speed: 0 };
    const level   = current[stat];
    if (level >= 3) return;
    const cost = STAT_COSTS[stat][level];
    const ok = spendResources({ gold: cost });
    if (ok) upgradeUnit(typeKey, stat);
  };

  const canAfford = (costs: Record<string, number>) =>
    Object.entries(costs).every(([k, v]) => ((resources as unknown) as Record<string,number>)[k] >= v);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 14px',
    fontSize: '12px',
    fontFamily: "'Cinzel', serif",
    color: active ? '#ffd700' : '#f0e8d5',
    background: active ? 'rgba(255,215,0,0.15)' : 'transparent',
    border: 'none',
    borderBottom: active ? '2px solid #ffd700' : '2px solid transparent',
    cursor: 'pointer',
    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
    transition: 'color 0.2s',
  });

  return (
    <div
      className="pointer-events-auto"
      style={{
        backgroundImage: `url('${GameUI.shopWindow}')`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        width: '400px',
        minHeight: '480px',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 20px 20px',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px', marginTop: '-8px' }}>
        <img src={GameUI.headerShop} alt="Shop" style={{ width: '220px', imageRendering: 'auto' }} />
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '12px',
          right: '16px',
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%',
          width: '26px',
          height: '26px',
          color: '#f0e8d5',
          cursor: 'pointer',
          fontSize: '14px',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ×
      </button>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,215,0,0.2)', marginBottom: '12px' }}>
        <button style={tabStyle(tab === 'upgrades')}  onClick={() => setTab('upgrades')}>Upgrades</button>
        <button style={tabStyle(tab === 'buildings')} onClick={() => setTab('buildings')}>Buildings</button>
      </div>

      {/* Resources reminder */}
      <div style={{ fontSize: '11px', color: '#ffd700', marginBottom: '10px', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
        🪙 {Math.floor(resources.gold)} gold &nbsp;|&nbsp; 💎 {Math.floor(resources.crystal)} crystal &nbsp;|&nbsp; 🪵 {Math.floor(resources.wood)} wood
      </div>

      {/* ── Upgrades tab ── */}
      {tab === 'upgrades' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}>
          {UPGRADE_TYPES.map(ut => {
            const upg = upgrades[ut.key] ?? { attack: 0, defense: 0, speed: 0 };
            return (
              <div
                key={ut.key}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,215,0,0.15)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <img src={ut.icon} alt={ut.label} style={{ width: '24px', height: '24px' }} />
                  <span style={{ color: '#ffd700', fontFamily: "'Cinzel', serif", fontSize: '13px', fontWeight: 700 }}>
                    {ut.label}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['attack', 'defense', 'speed'] as const).map(stat => {
                    const level = upg[stat];
                    const maxed = level >= 3;
                    const cost  = maxed ? 0 : STAT_COSTS[stat][level];
                    const canDo = !maxed && resources.gold >= cost;
                    return (
                      <button
                        key={stat}
                        onClick={() => handleUpgrade(ut.key, stat)}
                        disabled={!canDo}
                        style={{
                          backgroundImage: `url('${GameUI.btnUpgrade}')`,
                          backgroundSize: '100% 100%',
                          backgroundRepeat: 'no-repeat',
                          border: 'none',
                          cursor: canDo ? 'pointer' : 'not-allowed',
                          padding: '4px 8px',
                          width: '96px',
                          height: '36px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: canDo ? 1 : 0.45,
                          transition: 'opacity 0.15s, transform 0.1s',
                        }}
                        onMouseEnter={e => { if (canDo) e.currentTarget.style.opacity = '0.85'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = canDo ? '1' : '0.45'; }}
                        onMouseDown={e  => { if (canDo) e.currentTarget.style.transform = 'scale(0.97)'; }}
                        onMouseUp={e    => { e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        <span style={{ fontSize: '9px', color: '#f0e8d5', textShadow: '0 1px 2px rgba(0,0,0,0.9)', lineHeight: 1 }}>
                          {stat.charAt(0).toUpperCase() + stat.slice(1)} {level}/3
                        </span>
                        <span style={{ fontSize: '9px', color: maxed ? '#22c55e' : '#ffd700', textShadow: '0 1px 2px rgba(0,0,0,0.9)', lineHeight: 1.3 }}>
                          {maxed ? 'MAX' : `🪙${cost}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Buildings tab ── */}
      {tab === 'buildings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
          {BUILDINGS.map(b => {
            const affordable = canAfford(b.costs);
            return (
              <div
                key={b.id}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,215,0,0.15)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  opacity: affordable ? 1 : 0.6,
                }}
              >
                <span style={{ fontSize: '22px' }}>{b.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#ffd700', fontFamily: "'Cinzel', serif", fontSize: '13px', fontWeight: 700 }}>
                    {b.label}
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: '10px', marginBottom: '4px' }}>{b.desc}</div>
                  <div style={{ fontSize: '10px', color: '#f0e8d5' }}>
                    {Object.entries(b.costs).map(([k, v]) => (
                      <span key={k} style={{ marginRight: '6px' }}>
                        {k === 'wood' ? '🪵' : k === 'gold' ? '🪙' : k === 'crystal' ? '💎' : k === 'coal' ? '⛏️' : '?'}{v}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  disabled={!affordable}
                  style={{
                    backgroundImage: `url('${GameUI.btnEmpty1}')`,
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    border: 'none',
                    cursor: affordable ? 'pointer' : 'not-allowed',
                    width: '70px',
                    height: '32px',
                    color: '#f0e8d5',
                    fontFamily: "'Cinzel', serif",
                    fontSize: '11px',
                    textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                    transition: 'opacity 0.15s, transform 0.1s',
                  }}
                  onMouseEnter={e => { if (affordable) e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                  onMouseDown={e  => { if (affordable) e.currentTarget.style.transform = 'scale(0.97)'; }}
                  onMouseUp={e    => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  Build
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
