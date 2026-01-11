import { NextApiRequest, NextApiResponse } from "next";
import FirebaseConnection from '../../../lib/firebaseAdmin';

const db = FirebaseConnection.getInstance().db;
import { getCurrentUser } from "../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: "Not authenticated" });
  const { id } = req.query;
  if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing id" });

  if (req.method === "GET") {
    const doc = await db.collection("games").doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    
    const gameData: any = doc.data();
    
    // Populate player names for teamA and teamB
    const teamAIds = gameData.teamA || [];
    const teamBIds = gameData.teamB || [];
    
    const teamAPlayers = await Promise.all(
      teamAIds.map(async (userId: string) => {
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) return { id: userId, name: "Unknown" };
        const userData = userDoc.data();
        return { id: userId, name: userData?.name || userData?.email || "Unknown" };
      })
    );
    
    const teamBPlayers = await Promise.all(
      teamBIds.map(async (userId: string) => {
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) return { id: userId, name: "Unknown" };
        const userData = userDoc.data();
        return { id: userId, name: userData?.name || userData?.email || "Unknown" };
      })
    );
    
    return res.json({ 
      id: doc.id, 
      createdBy: gameData.createdBy,
      createdAt: gameData.createdAt ? { seconds: gameData.createdAt.seconds, nanoseconds: gameData.createdAt.nanoseconds } : null,
      teamA: teamAPlayers,
      teamB: teamBPlayers,
      rounds: gameData.rounds || [],
      teamA_total: gameData.teamA_total || 0,
      teamB_total: gameData.teamB_total || 0,
      scoreA: gameData.teamA_total || 0,
      scoreB: gameData.teamB_total || 0,
      finished: gameData.finished || false,
      lisa: gameData.lisa || false,
      winnerTeam: gameData.winnerTeam || null,
      finishedAt: gameData.finishedAt ? { seconds: gameData.finishedAt.seconds, nanoseconds: gameData.finishedAt.nanoseconds } : null
    });
  }

  // DELETE - Cancelar partida (apenas admin)
  if (req.method === "DELETE") {
    if (current.role !== "admin") {
      return res.status(403).json({ error: "Apenas administradores podem cancelar partidas" });
    }

    const doc = await db.collection("games").doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Partida não encontrada" });

    await db.collection("games").doc(id).delete();
    return res.json({ message: "Partida cancelada com sucesso" });
  }

  return res.status(405).end();
}
