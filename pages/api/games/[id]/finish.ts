import { NextApiRequest, NextApiResponse } from "next";
import FirebaseConnection from '../../../../lib/firebaseAdmin';
import * as admin from 'firebase-admin';
import { getCurrentUser } from "../../../../lib/auth";

const db = FirebaseConnection.getInstance().db;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: "Not authenticated" });

  const { id } = req.query;
  if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing id" });

  if (req.method !== "POST") return res.status(405).end();

  const gameRef = db.collection("games").doc(id);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(gameRef);
      if (!snap.exists) throw new Error("Game not found");
      
      const game: any = snap.data();
      if (game.finished) throw new Error("Game already finished");

      const teamA_total = game.teamA_total || 0;
      const teamB_total = game.teamB_total || 0;

      // Validar que pelo menos um time atingiu 100 pontos
      if (teamA_total < 100 && teamB_total < 100) {
        throw new Error("Nenhum time atingiu 100 pontos ainda");
      }

      // Determinar vencedor: o time que ATINGIU 100 pontos primeiro
      let winnerTeam: "A" | "B";
      if (teamA_total >= 100 && teamB_total >= 100) {
        // Ambos passaram de 100 (caso raro), quem tem MAIS pontos vence
        winnerTeam = teamA_total > teamB_total ? "A" : "B";
      } else {
        // Regra normal: quem chegou a 100 vence
        winnerTeam = teamA_total >= 100 ? "A" : "B";
      }

      // Detectar lisa: time PERDEDOR manteve 0 pontos enquanto vencedor atingiu 100+
      const lisaPlayers = [];
      if (winnerTeam === "A" && teamB_total === 0) {
        // Time A venceu e Time B (perdedor) ficou com 0 - Lisa aplicada pelo Time A
        lisaPlayers.push(...game.teamA);
      } else if (winnerTeam === "B" && teamA_total === 0) {
        // Time B venceu e Time A (perdedor) ficou com 0 - Lisa aplicada pelo Time B
        lisaPlayers.push(...game.teamB);
      }

      const update: any = {
        finished: true,
        winnerTeam,
        finishedAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      };

      if (lisaPlayers.length > 0) {
        update.lisa = lisaPlayers;
      }

      tx.update(gameRef, update);
      return { ...update, lisa: lisaPlayers.length > 0 };
    })
    .then((result) => {
      res.json({ 
        ok: true, 
        finished: true,
        winnerTeam: result.winnerTeam,
        lisa: result.lisa
      });
    });
  } catch (err: any) {
    console.error("Error finishing game:", err);
    const message = err.message || "Failed to finish game";
    return res.status(400).json({ error: message });
  }
}
