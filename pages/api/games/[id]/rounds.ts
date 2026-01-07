import { NextApiRequest, NextApiResponse } from "next";
import FirebaseConnection from '../../../../lib/firebaseAdmin';

const db = FirebaseConnection.getInstance().db;
import { getCurrentUser } from "../../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: "Not authenticated" });

  const { id } = req.query;
  if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing id" });

  const gameRef = db.collection("games").doc(id);

  // GET - List rounds
  if (req.method === "GET") {
    const snap = await gameRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Game not found" });
    const game: any = snap.data();
    return res.json({ rounds: game.rounds || [] });
  }

  // POST - Add new round
  if (req.method !== "POST") return res.status(405).end();

  const { teamA_points, teamB_points } = req.body || {};
  if (typeof teamA_points !== "number" || typeof teamB_points !== "number") {
    return res.status(400).json({ error: "teamA_points and teamB_points numbers required" });
  }

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(gameRef);
    if (!snap.exists) throw new Error("Game not found");
    const game: any = snap.data();
    if (game.finished) throw new Error("Game already finished");

    const newTeamA = (game.teamA_total || 0) + teamA_points;
    const newTeamB = (game.teamB_total || 0) + teamB_points;
    const roundNumber = (game.rounds?.length || 0) + 1;
    const round = {
      roundNumber,
      teamA_points,
      teamB_points,
      recordedAt: new Date(),
      recordedBy: current.id,
    };

    const update: any = {
      rounds: [...(game.rounds || []), round],
      teamA_total: newTeamA,
      teamB_total: newTeamB,
      updatedAt: new Date(),
    };

    // check finish condition: the team that reaches >=100 first WINS
    if (newTeamA >= 100 || newTeamB >= 100) {
      update.finished = true;
      // winner is the team that reached 100+ points first
      update.winnerTeam = newTeamA >= 100 ? "A" : "B";
      update.finishedAt = new Date();
      // lisa: if the winner team reached 100+ and the loser team has 0 points
      const lisaPlayers = [];
      if (newTeamA >= 100 && newTeamB === 0) {
        // Team A won reaching 100+ and Team B has 0 (lisa applied by Team A)
        lisaPlayers.push(...game.teamA);
      }
      if (newTeamB >= 100 && newTeamA === 0) {
        // Team B won reaching 100+ and Team A has 0 (lisa applied by Team B)
        lisaPlayers.push(...game.teamB);
      }
      if (lisaPlayers.length > 0) {
        update.lisa = lisaPlayers;
      }
    }

    tx.update(gameRef, update);
    return update;
  })
  .then(async (updatedData) => {
    // Buscar dados completos da partida atualizada
    const snap = await gameRef.get();
    const gameData = snap.data();
    res.json({ 
      ok: true, 
      game: {
        ...gameData,
        id: snap.id,
        lisa: Array.isArray(updatedData.lisa) && updatedData.lisa.length > 0,
        finished: updatedData.finished || false
      }
    });
  })
  .catch((err) => {
    console.error("Error adding round:", err);
    const message = err.message === "Game not found" || err.message === "Game already finished" 
      ? err.message 
      : "Failed to add round";
    return res.status(400).json({ error: message });
  });
}
