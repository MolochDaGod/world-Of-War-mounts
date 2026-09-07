/**
 * CommandBar — right-side RTS order grid.
 *
 * Clicking an order arms the next left-click in the battlefield. Move and
 * Attack keep their M/F shortcuts; Guard and Hold are deliberately explicit
 * buttons so they do not conflict with commander ability hotkeys.
 *
 * Shortcuts:  M = Move  |  F = Fight/Attack-Move  |  P = Patrol  |  L = Lob
 *             Escape = cancel mode (return to default)
 */
import { useCommandMode, setCommandMode, CommandMode, MODE_LABEL } from '@/game/input/CommandMode';
import { useGameStore } from '@/game/store/gameStore';
import { GameIcon, type GameIconName } from './GameIcon';

interface ModeBtnProps {
  label: string;
  shortcut: string;
  mode: CommandMode;
  active: boolean;
  color: string;
  icon: GameIconName;
  disabled: boolean;
}

function ModeBtn({ label, shortcut, mode, active, color, icon, disabled }: ModeBtnProps) {
  return (
    <button
      onClick={() => setCommandMode(active ? 'default' : mode)}
      title={`${label}${shortcut ? ` [${shortcut}]` : ''} — next left-click issues this order`}
      disabled={disabled}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        minHeight: 62,
        padding: '6px 8px',
        border: `1.5px solid ${active ? color : 'rgba(255,255,255,0.2)'}`,
        borderRadius: 7,
        background: active
          ? `linear-gradient(135deg, ${color}33 0%, ${color}18 100%)`
          : 'rgba(0,0,0,0.45)',
        color: active ? color : 'rgba(255,255,255,0.72)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.12s',
        boxShadow: active ? `0 0 10px ${color}55` : 'none',
        backdropFilter: 'blur(4px)',
        opacity: disabled ? 0.42 : 1,
      }}
    >
      <GameIcon name={icon} size={19} />
      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em' }}>
        {label}
      </span>
      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.44)', minHeight: 10 }}>
        {shortcut ? `[${shortcut}]` : 'NEXT LMB'}
      </span>
    </button>
  );
}

export function CommandBar() {
  const phase = useGameStore(s => s.phase);
  const mode  = useCommandMode();
  const selectedUnitIds = useGameStore(s => s.selectedUnitIds);

  if (phase !== 'battle') return null;

  const activeLabel = MODE_LABEL[mode];

  return (
    <div data-rts-hud="1" style={{
      position: 'fixed',
      right: 18,
      bottom: 238,
      width: 174,
      display: 'flex',
      flexDirection: 'column',
      gap: 7,
      zIndex: 500,
      pointerEvents: 'none',
    }}>
      {/* Armed-order banner */}
      {mode !== 'default' && (
        <div style={{
          background: 'rgba(0,0,0,0.75)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: '6px',
          padding: '3px 14px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: '#fff',
          backdropFilter: 'blur(6px)',
          animation: 'pulse 1.5s ease-in-out infinite',
          textAlign: 'center',
        }}>
          <GameIcon name="crosshair" size={12} /> {activeLabel}
          {mode === 'patrol' ? ' — LMB point A, then B' : ' — next LMB target'}
        </div>
      )}

      <div className="hud-panel" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 6,
        padding: 10,
        pointerEvents: 'all',
      }}>
        <ModeBtn label="MOVE" icon="move" shortcut="M" mode="move" active={mode === 'move'} color="#44aaff" disabled={selectedUnitIds.length === 0} />
        <ModeBtn label="ATTACK" icon="target" shortcut="F" mode="fight" active={mode === 'fight'} color="#ff6464" disabled={selectedUnitIds.length === 0} />
        <ModeBtn label="GUARD" icon="shield" shortcut="" mode="guard" active={mode === 'guard'} color="#d9a95f" disabled={selectedUnitIds.length === 0} />
        <ModeBtn label="HOLD" icon="shieldCheck" shortcut="" mode="hold" active={mode === 'hold'} color="#7cbbff" disabled={selectedUnitIds.length === 0} />
      </div>
      <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: 8, textAlign: 'center', letterSpacing: '0.04em' }}>
        Guard / Hold: select location with next LMB
      </div>
    </div>
  );
}
