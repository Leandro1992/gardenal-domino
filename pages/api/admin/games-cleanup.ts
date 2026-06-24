import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import FirebaseConnection from "../../../lib/firebaseAdmin";
import { clearCacheByPrefix } from "../../../lib/serverCache";

const db = FirebaseConnection.getInstance().db;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: "Not authenticated" });
  if (current.role !== "admin") return res.status(403).json({ error: "Admin only" });

  // ── DELETE ── remover partidas selecionadas ─────────────────────────────────
  if (req.method === "DELETE") {
    const { gameIds, mode } = req.body;

    if (!Array.isArray(gameIds) || gameIds.length === 0) {
      return res.status(400).json({ error: "gameIds deve ser um array não vazio" });
    }

    if (!mode || !["free", "championship"].includes(mode)) {
      return res.status(400).json({ error: "mode deve ser 'free' ou 'championship'" });
    }

    const collection = mode === "championship" ? "championship_games" : "games";

    try {
      // Firestore batch delete (máximo 500 operações por batch)
      const batch = db.batch();
      let count = 0;

      for (const gameId of gameIds) {
        if (count >= 500) break; // Limite do Firestore
        const ref = db.collection(collection).doc(gameId);
        batch.delete(ref);
        count++;
      }

      await batch.commit();

      // Invalidar caches
      clearCacheByPrefix("games:list:");
      clearCacheByPrefix("championship:games:list:");
      clearCacheByPrefix("stats:");
      clearCacheByPrefix("championship:ranking:");

      return res.json({
        deleted: count,
        mode,
        message: `${count} partida(s) do modo ${mode === "championship" ? "campeonato" : "livre"} removida(s) com sucesso`,
      });
    } catch (error: any) {
      console.error("Erro ao deletar partidas:", error);
      return res.status(500).json({ error: "Erro ao deletar partidas" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
