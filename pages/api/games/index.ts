import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import FirebaseConnection from "../../../lib/firebaseAdmin";
import * as admin from 'firebase-admin';

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
      createdAt: admin.firestore.Timestamp.now(),
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
    const gamesCollection = db.collection("games");
    const mine = req.query.mine === "true" || req.query.mine === "1";

    let totalGames = 0;
    let gameDocs: any[] = [];

    if (mine) {
      const [teamASnap, teamBSnap] = await Promise.all([
        gamesCollection.where("teamA", "array-contains", current.id).get(),
        gamesCollection.where("teamB", "array-contains", current.id).get(),
      ]);

      const docsMap = new Map<string, any>();
      [...teamASnap.docs, ...teamBSnap.docs].forEach((doc) => docsMap.set(doc.id, doc));

      gameDocs = Array.from(docsMap.values()).sort((a, b) => {
        const aData: any = a.data();
        const bData: any = b.data();
        const aSec = aData.createdAt?.seconds || 0;
        const bSec = bData.createdAt?.seconds || 0;
        if (bSec !== aSec) return bSec - aSec;
        const aNano = aData.createdAt?.nanoseconds || 0;
        const bNano = bData.createdAt?.nanoseconds || 0;
        return bNano - aNano;
      });

      totalGames = gameDocs.length;
    } else {
      try {
        const totalSnap = await gamesCollection.count().get();
        totalGames = totalSnap.data().count;
      } catch {
        const totalSnapFallback = await gamesCollection.get();
        totalGames = totalSnapFallback.size;
      }

      const snap = await gamesCollection.orderBy("createdAt", "desc").limit(50).get();
      gameDocs = snap.docs;
    }

    // Get all unique user IDs from selected games
    const allUserIds = new Set<string>();
    gameDocs.forEach((doc) => {
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
    const games = gameDocs.map((d) => {
      const data: any = d.data();
      return {
        id: d.id,
        createdBy: data.createdBy,
        createdAt: data.createdAt ? { seconds: data.createdAt.seconds, nanoseconds: data.createdAt.nanoseconds } : null,
        teamA: (data.teamA || []).map((id: string) => usersMap.get(id) || { id, name: "Unknown" }),
        teamB: (data.teamB || []).map((id: string) => usersMap.get(id) || { id, name: "Unknown" }),
        rounds: data.rounds || [],
        teamA_total: data.teamA_total || 0,
        teamB_total: data.teamB_total || 0,
        scoreA: data.teamA_total || 0,
        scoreB: data.teamB_total || 0,
        finished: data.finished || false,
        lisa: data.lisa || false,
        winnerTeam: data.winnerTeam || null,
        finishedAt: data.finishedAt ? { seconds: data.finishedAt.seconds, nanoseconds: data.finishedAt.nanoseconds } : null
      };
    });
    
    return res.json({ games, totalGames });
  }

  return res.status(405).end();
}
