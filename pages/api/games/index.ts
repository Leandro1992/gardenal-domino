import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import FirebaseConnection from "../../../lib/firebaseAdmin";

const db = FirebaseConnection.getInstance().db;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: "Not authenticated" });

  if (req.method === "POST") {
    const { teamA, teamB } = req.body || {};
    if (!Array.isArray(teamA) || !Array.isArray(teamB) || teamA.length !== 2 || teamB.length !== 2) {
      return res.status(400).json({ error: "teamA and teamB must be arrays of 2 userIds each" });
    }
    const all = [...teamA, ...teamB];
    const unique = Array.from(new Set(all));
    if (unique.length !== 4) return res.status(400).json({ error: "Players must be 4 distinct users" });

    // validate users exist
    const usersCheck = await Promise.all(unique.map((id) => db.collection("users").doc(id).get()));
    if (usersCheck.some((d) => !d.exists)) return res.status(400).json({ error: "All players must exist" });

    // Verificar se algum jogador já está em partida ativa
    const activeGamesSnap = await db.collection("games").where("finished", "==", false).get();
    const activePlayers = new Set<string>();
    
    activeGamesSnap.docs.forEach((doc) => {
      const data: any = doc.data();
      (data.teamA || []).forEach((id: string) => activePlayers.add(id));
      (data.teamB || []).forEach((id: string) => activePlayers.add(id));
    });
    
    const playersInActiveGame = all.filter(id => activePlayers.has(id));
    if (playersInActiveGame.length > 0) {
      // Get player names for error message
      const playerDocs = await Promise.all(
        playersInActiveGame.map(id => db.collection("users").doc(id).get())
      );
      const playerNames = playerDocs.map(doc => doc.data()?.name || "Desconhecido").join(", ");
      
      return res.status(400).json({ 
        error: `Os seguintes jogadores já estão em partidas ativas: ${playerNames}` 
      });
    }

    const game = {
      createdBy: current.id,
      createdAt: new Date(),
      teamA,
      teamB,
      rounds: [],
      teamA_total: 0,
      teamB_total: 0,
      finished: false,
    };
    const ref = await db.collection("games").add(game);
    
    // Get player names for response
    const players = await Promise.all(
      [...teamA, ...teamB].map(async (id) => {
        const userDoc = await db.collection("users").doc(id).get();
        const userData = userDoc.data();
        return { id, name: userData?.name || userData?.email || "Unknown" };
      })
    );
    
    const playersMap = new Map(players.map(p => [p.id, p]));
    
    return res.status(201).json({ 
      game: {
        id: ref.id,
        ...game,
        teamA: teamA.map(id => playersMap.get(id)),
        teamB: teamB.map(id => playersMap.get(id)),
        scoreA: 0,
        scoreB: 0
      }
    });
  }

  if (req.method === "GET") {
    const snap = await db.collection("games").orderBy("createdAt", "desc").limit(50).get();
    
    // Get all unique user IDs from all games
    const allUserIds = new Set<string>();
    snap.docs.forEach((doc) => {
      const data: any = doc.data();
      (data.teamA || []).forEach((id: string) => allUserIds.add(id));
      (data.teamB || []).forEach((id: string) => allUserIds.add(id));
    });
    
    // Fetch all users in one batch
    const userDocs = await Promise.all(
      Array.from(allUserIds).map((id) => db.collection("users").doc(id).get())
    );
    
    const usersMap = new Map();
    userDocs.forEach((doc) => {
      if (doc.exists) {
        const data = doc.data();
        usersMap.set(doc.id, { id: doc.id, name: data?.name || data?.email || "Unknown" });
      }
    });
    
    // Map games with populated player data
    const games = snap.docs.map((d) => {
      const data: any = d.data();
      return {
        id: d.id,
        ...data,
        teamA: (data.teamA || []).map((id: string) => usersMap.get(id) || { id, name: "Unknown" }),
        teamB: (data.teamB || []).map((id: string) => usersMap.get(id) || { id, name: "Unknown" }),
        scoreA: data.teamA_total || 0,
        scoreB: data.teamB_total || 0
      };
    });
    
    return res.json({ games });
  }

  return res.status(405).end();
}
