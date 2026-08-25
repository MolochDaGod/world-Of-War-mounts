/**
 * CommandMode — module-level singleton for the active RTS command mode.
 *
 * Modes:
 *   default — RMB issues move order (normal behaviour)
 *   move    — [M] Click ground → move selected units
 *   fight   — [F] Click ground → attack-move; click enemy → focus attack
 *   guard   — Click a friendly unit or map location → defend that location
 *   hold    — Click a map location → march there and hold it
 *   patrol  — [P] Two clicks define patrol A→B route
 *   lob     — [L] Click ground → artillery fires at that position
 *
 * React components subscribe via useCommandMode().
 */

export type CommandMode = 'default' | 'move' | 'fight' | 'guard' | 'hold' | 'patrol' | 'lob';

// ── Module-level state ────────────────────────────────────────────────────────
let _mode: CommandMode = 'default';
let _patrolAnchor: [number, number, number] | null = null;   // first patrol click
const _listeners = new Set<(m: CommandMode) => void>();

export function getCommandMode(): CommandMode { return _mode; }

export function setCommandMode(m: CommandMode): void {
  _mode = m;
  _patrolAnchor = null;          // reset two-click state on any mode change
  _listeners.forEach(fn => fn(_mode));
}

/** Returns the first patrol anchor point (set after first patrol click). */
export function getPatrolAnchor(): [number, number, number] | null { return _patrolAnchor; }

/** Set the patrol anchor (first click in patrol mode). */
export function setPatrolAnchor(p: [number, number, number]): void { _patrolAnchor = p; }

/** Clear the patrol anchor (after command is issued). */
export function clearPatrolAnchor(): void { _patrolAnchor = null; }

// ── React hook ────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';

export function useCommandMode(): CommandMode {
  const [mode, setMode] = useState<CommandMode>(_mode);
  useEffect(() => {
    const fn = (m: CommandMode) => setMode(m);
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  }, []);
  return mode;
}

/** Human-readable label for a command mode. */
export const MODE_LABEL: Record<CommandMode, string> = {
  default: '',
  move:    'MOVE',
  fight:   'ATTACK MOVE',
  guard:   'GUARD LOCATION',
  hold:    'HOLD LOCATION',
  patrol:  'PATROL',
  lob:     'LOB TARGET',
};

/** Cursor style per mode. */
export const MODE_CURSOR: Record<CommandMode, string> = {
  default: 'default',
  move:    'crosshair',
  fight:   'cell',
  guard:   'copy',
  hold:    'not-allowed',
  patrol:  'copy',
  lob:     'zoom-in',
};
