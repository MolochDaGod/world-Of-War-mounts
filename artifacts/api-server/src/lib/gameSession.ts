/**
 * gameSession — in-memory game session store.
 *
 * Holds the authoritative session record for each active game.
 * Cleared when the session ends or the server restarts.
 */

export type CommandType = 'move' | 'fight' | 'patrol' | 'lob' | 'stop';

export interface UnitCommand {
  sessionId:  string;
  unitIds:    string[];
  command:    CommandType;
  targetPos?: [number, number, number];
  patrolA?:   [number, number, number];
  patrolB?:   [number, number, number];
  issuedAt:   number;
}

export interface GameSession {
  id:         string;
  playerFaction: string;
  enemyFaction:  string;
  difficulty:    string;
  startedAt:     number;
  endedAt?:      number;
  winner?:       1 | 2 | 'draw';
  commandLog:    UnitCommand[];
  lastPing:      number;
}

const sessions = new Map<string, GameSession>();

let _counter = 0;
function newId(): string {
  return `gs_${Date.now()}_${++_counter}`;
}

// ── CRUD helpers ──────────────────────────────────────────────────────────────

export function createSession(
  playerFaction: string,
  enemyFaction:  string,
  difficulty:    string,
): GameSession {
  const session: GameSession = {
    id: newId(),
    playerFaction,
    enemyFaction,
    difficulty,
    startedAt: Date.now(),
    commandLog: [],
    lastPing: Date.now(),
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): GameSession | undefined {
  return sessions.get(id);
}

export function listSessions(): GameSession[] {
  return [...sessions.values()].sort((a, b) => b.startedAt - a.startedAt);
}

export function logCommand(
  sessionId: string,
  cmd: Omit<UnitCommand, 'sessionId' | 'issuedAt'>,
): UnitCommand | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  const entry: UnitCommand = { ...cmd, sessionId, issuedAt: Date.now() };
  session.commandLog.push(entry);
  session.lastPing = Date.now();
  // Cap log at 2 000 entries to avoid unbounded growth
  if (session.commandLog.length > 2000) session.commandLog.shift();
  return entry;
}

export function endSession(
  id: string,
  winner: 1 | 2 | 'draw',
): GameSession | null {
  const session = sessions.get(id);
  if (!session) return null;
  session.endedAt = Date.now();
  session.winner  = winner;
  return session;
}

export function deleteSession(id: string): boolean {
  return sessions.delete(id);
}

// Prune sessions idle for more than 2 hours
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, s] of sessions) {
    if (s.lastPing < cutoff) sessions.delete(id);
  }
}, 10 * 60 * 1000);
