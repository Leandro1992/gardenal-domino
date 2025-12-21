import { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../../../lib/firebaseAdmin";
import { getCurrentUser } from "../../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: "Not authenticated" });

  if (req.method !== "POST") return res.status(405).end();
  const { id } = req.query;
  if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing id" });

  const { teamA_points, teamB_points } = req.body || {};
  if (typeof teamA_points !== "number" || typeof teamB_points !== "number") {
    return res.status(400).json({ error: "teamA_points and teamB_points numbers required" });
  }

  const gameRef = db.collection("games").doc(id);

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

    // check finish condition: the dupla that reaches >=100 first loses
    if (newTeamA >= 100 || newTeamB >= 100) {
      update.finished = true;
      // winner is the other team
      update.winnerTeam = newTeamA >= 100 ? "B" : "A";
      update.finishedAt = new Date();
      // lisa: if any team total equals 0 at finish
      const lisaPlayers = [];
      if (newTeamA === 0) {
        lisaPlayers.push(...game.teamA);
      }
      if (newTeamB === 0) {
        lisaPlayers.push(...game.teamB);
      }
      if (lisaPlayers.length > 0) {
        update.lisa = lisaPlayers;
      }
    }

    tx.update(gameRef, update);
  })
  .then(() => res.json({ ok: true }))
  .catch((err) => res.status(400).json({ error: err.message }));
}
