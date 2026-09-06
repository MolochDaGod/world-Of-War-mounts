/**
 * Client for artifacts/api-server /api/game session routes.
 * Missing API (Vercel static with no rewrite) must not block local play.
 */
export type CommandType = 'move' | 'fight' | 'patrol' | 'lob' | 'stop';

function apiBase(): string {
  const env = (typeof import.meta !== 'undefined' && (import.meta as { env?: { VITE_API_URL?: string } }).env) || {};
  return (env.VITE_API_URL ?? '/api').replace(/\/$/, '');
}

async function api<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${apiBase()}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (!res.ok) return null;
    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function startGameSession(body: {
  playerFaction: string;
  enemyFaction: string;
  difficulty: string;
}): Promise<string | null> {
  const session = await api<{ id: string }>('/game/session', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return session?.id ?? null;
}

export async function logGameCommand(
  sessionId: string | null | undefined,
  cmd: {
    unitIds: string[];
    command: CommandType;
    targetPos?: [number, number, number];
    patrolA?: [number, number, number];
    patrolB?: [number, number, number];
  },
): Promise<void> {
  if (!sessionId) return;
  await api(`/game/session/${encodeURIComponent(sessionId)}/cmd`, {
    method: 'POST',
    body: JSON.stringify(cmd),
  });
}

export async function endGameSession(
  sessionId: string | null | undefined,
  winner: 1 | 2 | 'draw',
): Promise<void> {
  if (!sessionId) return;
  await api(`/game/session/${encodeURIComponent(sessionId)}/end`, {
    method: 'PATCH',
    body: JSON.stringify({ winner }),
  });
}
