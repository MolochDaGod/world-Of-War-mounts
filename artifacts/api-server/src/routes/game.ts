/**
 * /api/game — REST endpoints for Race Wars game session management.
 *
 * POST   /api/game/session          — start a new session
 * GET    /api/game/session          — list all sessions
 * GET    /api/game/session/:id      — get session by id
 * POST   /api/game/session/:id/cmd  — log a unit command
 * PATCH  /api/game/session/:id/end  — mark session as ended
 * DELETE /api/game/session/:id      — delete session
 */
import { Router } from "express";
import {
  createSession,
  getSession,
  listSessions,
  logCommand,
  endSession,
  deleteSession,
  type CommandType,
} from "../lib/gameSession.js";

const router = Router();

// ── POST /api/game/session — start ────────────────────────────────────────────
router.post("/session", (req, res) => {
  const { playerFaction, enemyFaction, difficulty } = req.body ?? {};
  if (!playerFaction || !enemyFaction) {
    res.status(400).json({ error: "playerFaction and enemyFaction are required" });
    return;
  }
  const session = createSession(
    String(playerFaction),
    String(enemyFaction),
    String(difficulty ?? "normal"),
  );
  res.status(201).json(session);
});

// ── GET /api/game/session — list ──────────────────────────────────────────────
router.get("/session", (_req, res) => {
  res.json(listSessions());
});

// ── GET /api/game/session/:id — get ──────────────────────────────────────────
router.get("/session/:id", (req, res) => {
  const session = getSession(req.params.id);
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(session);
});

// ── POST /api/game/session/:id/cmd — log command ─────────────────────────────
router.post("/session/:id/cmd", (req, res) => {
  const { unitIds, command, targetPos, patrolA, patrolB } = req.body ?? {};
  if (!unitIds || !command) {
    res.status(400).json({ error: "unitIds and command are required" });
    return;
  }
  const entry = logCommand(req.params.id, {
    unitIds:   Array.isArray(unitIds) ? unitIds : [String(unitIds)],
    command:   command as CommandType,
    targetPos,
    patrolA,
    patrolB,
  });
  if (!entry) { res.status(404).json({ error: "Session not found" }); return; }
  res.status(201).json(entry);
});

// ── PATCH /api/game/session/:id/end — finish ──────────────────────────────────
router.patch("/session/:id/end", (req, res) => {
  const { winner } = req.body ?? {};
  if (winner !== 1 && winner !== 2 && winner !== "draw") {
    res.status(400).json({ error: "winner must be 1, 2, or 'draw'" });
    return;
  }
  const session = endSession(req.params.id, winner as 1 | 2 | "draw");
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(session);
});

// ── DELETE /api/game/session/:id ──────────────────────────────────────────────
router.delete("/session/:id", (req, res) => {
  const ok = deleteSession(req.params.id);
  if (!ok) { res.status(404).json({ error: "Session not found" }); return; }
  res.status(204).send();
});

export default router;
