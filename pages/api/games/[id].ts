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
      ...gameData,
      teamA: teamAPlayers,
      teamB: teamBPlayers,
      scoreA: gameData.teamA_total || 0,
      scoreB: gameData.teamB_total || 0
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
