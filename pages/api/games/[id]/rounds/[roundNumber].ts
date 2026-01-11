import { NextApiRequest, NextApiResponse } from "next";
import FirebaseConnection from '../../../../../lib/firebaseAdmin';
import { getCurrentUser } from "../../../../../lib/auth";
import * as admin from 'firebase-admin';

const db = FirebaseConnection.getInstance().db;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: "Not authenticated" });

  const { id, roundNumber } = req.query;
  if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing game id" });
  if (!roundNumber || typeof roundNumber !== "string") return res.status(400).json({ error: "Missing round number" });

  const roundNum = parseInt(roundNumber);
  if (isNaN(roundNum) || roundNum < 1) {
    return res.status(400).json({ error: "Invalid round number" });
  }

  // DELETE - Remove round
  if (req.method === "DELETE") {
    const gameRef = db.collection("games").doc(id);

    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(gameRef);
        if (!snap.exists) throw new Error("Game not found");
        
        const game: any = snap.data();
        
        // Verificar se a partida está em andamento
        if (game.finished) {
          throw new Error("Cannot delete rounds from finished games");
        }

        const rounds = game.rounds || [];
        
        // Verificar se a rodada existe
        if (roundNum > rounds.length || roundNum < 1) {
          throw new Error("Round not found");
        }

        // Remover a rodada específica (roundNumber é 1-indexed)
        const updatedRounds = rounds.filter((_: any, index: number) => index !== roundNum - 1);
        
        // Renumerar as rodadas
        const renumberedRounds = updatedRounds.map((round: any, index: number) => ({
          ...round,
          roundNumber: index + 1
        }));

        // Recalcular totais
        let newTeamA = 0;
        let newTeamB = 0;
        renumberedRounds.forEach((round: any) => {
          newTeamA += round.teamA_points || 0;
          newTeamB += round.teamB_points || 0;
        });

        const update: any = {
          rounds: renumberedRounds,
          teamA_total: newTeamA,
          teamB_total: newTeamB,
          updatedAt: admin.firestore.Timestamp.now(),
        };

        tx.update(gameRef, update);
        return update;
      });

      res.json({ 
        message: "Round deleted successfully",
        ok: true 
      });
    } catch (err: any) {
      console.error("Error deleting round:", err);
      const message = err.message || "Failed to delete round";
      return res.status(400).json({ error: message });
    }
  } else {
    return res.status(405).end();
  }
}
