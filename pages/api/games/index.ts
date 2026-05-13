import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import FirebaseConnection from "../../../lib/firebaseAdmin";
import * as admin from 'firebase-admin';
import { clearCacheByPrefix, getCache, setCache } from "../../../lib/serverCache";

const db = FirebaseConnection.getInstance().db;
const GAMES_CACHE_TTL_MS = 20 * 1000;
const USER_CACHE_TTL_MS = 5 * 60 * 1000;

function parsePositiveInt(value: unknown, fallback: number, max = 100): number {
  if (typeof value !== "string") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function getCreatedAtScore(gameData: any): number {
  const seconds = gameData?.createdAt?.seconds || 0;
  const nanoseconds = gameData?.createdAt?.nanoseconds || 0;
  return seconds * 1_000_000_000 + nanoseconds;
}

async function getUsersMap(userIds: string[]) {
  const usersMap = new Map<string, { id: string; name: string }>();
  const missingUserIds: string[] = [];

  userIds.forEach((id) => {
    const cachedUser = getCache<{ id: string; name: string }>(`users:item:${id}`);
    if (cachedUser) {
      usersMap.set(id, cachedUser);
      return;
    }
    missingUserIds.push(id);
  });

  if (missingUserIds.length > 0) {
    const userDocs = await Promise.all(
      missingUserIds.map((id) => db.collection("users").doc(id).get())
    );

    userDocs.forEach((doc) => {
      if (!doc.exists) return;
      const data: any = doc.data();
      const user = { id: doc.id, name: data?.name || data?.email || "Unknown" };
      usersMap.set(doc.id, user);
      setCache(`users:item:${doc.id}`, user, USER_CACHE_TTL_MS);
    });
  }

  return usersMap;
}

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

    // Verificar se algum jogador já está em partida ativa sem varrer toda a coleção.
    let activeGameDocs: any[] = [];
    try {
      const [participantsSnap, teamASnap, teamBSnap] = await Promise.all([
        db.collection("games")
          .where("finished", "==", false)
          .where("participants", "array-contains-any", unique)
          .get(),
        db.collection("games")
          .where("finished", "==", false)
          .where("teamA", "array-contains-any", unique)
          .get(),
        db.collection("games")
          .where("finished", "==", false)
          .where("teamB", "array-contains-any", unique)
          .get(),
      ]);

      const docsMap = new Map<string, any>();
      participantsSnap.docs.forEach((doc) => docsMap.set(doc.id, doc));
      teamASnap.docs.forEach((doc) => docsMap.set(doc.id, doc));
      teamBSnap.docs.forEach((doc) => docsMap.set(doc.id, doc));
      activeGameDocs = Array.from(docsMap.values());
    } catch {
      // Fallback para ambientes sem índice composto criado ainda.
      const activeGamesSnap = await db.collection("games").where("finished", "==", false).get();
      activeGameDocs = activeGamesSnap.docs;
    }

    const activePlayers = new Set<string>();
    activeGameDocs.forEach((doc) => {
      const data: any = doc.data();
      (data.participants || []).forEach((id: string) => activePlayers.add(id));
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
      participants: unique,
      rounds: [],
      teamA_total: 0,
      teamB_total: 0,
      finished: false,
    };
    const ref = await db.collection("games").add(game);

    clearCacheByPrefix("games:list:");
    clearCacheByPrefix("stats:");
    
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
    const activeOnly = req.query.activeOnly === "true" || req.query.activeOnly === "1";
    const limit = parsePositiveInt(req.query.limit, 50);
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : "";

    const cacheKey = `games:list:${current.id}:mine=${mine}:activeOnly=${activeOnly}:limit=${limit}:cursor=${cursor}`;
    const cached = getCache<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let totalGames = 0;
    let activeGamesCount = 0;
    let gameDocs: any[] = [];
    let nextCursor: string | null = null;

    if (mine) {
      const participantsSnap = await gamesCollection
        .where("participants", "array-contains", current.id)
        .get();

      if (!participantsSnap.empty) {
        gameDocs = participantsSnap.docs;
      } else {
        const [teamASnap, teamBSnap] = await Promise.all([
          gamesCollection.where("teamA", "array-contains", current.id).get(),
          gamesCollection.where("teamB", "array-contains", current.id).get(),
        ]);

        const docsMap = new Map<string, any>();
        teamASnap.docs.forEach((doc) => docsMap.set(doc.id, doc));
        teamBSnap.docs.forEach((doc) => docsMap.set(doc.id, doc));
        gameDocs = Array.from(docsMap.values());
      }

      gameDocs.sort((a, b) => getCreatedAtScore(b.data()) - getCreatedAtScore(a.data()));
      totalGames = gameDocs.length;

      if (cursor) {
        const cursorIndex = gameDocs.findIndex((doc) => doc.id === cursor);
        if (cursorIndex >= 0) {
          gameDocs = gameDocs.slice(cursorIndex + 1);
        }
      }

      gameDocs = gameDocs.slice(0, limit);
      nextCursor = gameDocs.length === limit ? gameDocs[gameDocs.length - 1]?.id || null : null;
    } else {
      const countCacheKey = "games:list:totalCount";
      const cachedTotalCount = getCache<number>(countCacheKey);
      if (cachedTotalCount !== null) {
        totalGames = cachedTotalCount;
      } else {
        try {
          const totalSnap = await gamesCollection.count().get();
          totalGames = totalSnap.data().count;
        } catch {
          const totalSnapFallback = await gamesCollection.get();
          totalGames = totalSnapFallback.size;
        }
        setCache(countCacheKey, totalGames, GAMES_CACHE_TTL_MS);
      }

      if (activeOnly) {
        const activeCountCacheKey = "games:list:activeCount";
        const cachedActiveCount = getCache<number>(activeCountCacheKey);
        if (cachedActiveCount !== null) {
          activeGamesCount = cachedActiveCount;
        } else {
          try {
            const activeCountSnap = await gamesCollection.where("finished", "==", false).count().get();
            activeGamesCount = activeCountSnap.data().count;
          } catch {
            const activeCountFallback = await gamesCollection.where("finished", "==", false).get();
            activeGamesCount = activeCountFallback.size;
          }
          setCache(activeCountCacheKey, activeGamesCount, GAMES_CACHE_TTL_MS);
        }

        let query: any = gamesCollection.where("finished", "==", false).orderBy("createdAt", "desc").limit(limit);
        if (cursor) {
          const cursorDoc = await gamesCollection.doc(cursor).get();
          if (cursorDoc.exists) {
            query = query.startAfter(cursorDoc);
          }
        }

        try {
          const snap = await query.get();
          gameDocs = snap.docs;
        } catch {
          const fallbackSnap = await gamesCollection.where("finished", "==", false).get();
          gameDocs = fallbackSnap.docs
            .sort((a, b) => getCreatedAtScore(b.data()) - getCreatedAtScore(a.data()))
            .slice(0, limit);
        }
        nextCursor = gameDocs.length === limit ? gameDocs[gameDocs.length - 1]?.id || null : null;
      } else {
        let query: any = gamesCollection.orderBy("createdAt", "desc").limit(limit);
        if (cursor) {
          const cursorDoc = await gamesCollection.doc(cursor).get();
          if (cursorDoc.exists) {
            query = query.startAfter(cursorDoc);
          }
        }

        const snap = await query.get();
        gameDocs = snap.docs;
        nextCursor = gameDocs.length === limit ? gameDocs[gameDocs.length - 1]?.id || null : null;
      }
    }

    // Get all unique user IDs from selected games
    const allUserIds = new Set<string>();
    gameDocs.forEach((doc) => {
      const data: any = doc.data();
      (data.teamA || []).forEach((id: string) => allUserIds.add(id));
      (data.teamB || []).forEach((id: string) => allUserIds.add(id));
    });
    
    const usersMap = await getUsersMap(Array.from(allUserIds));
    
    // Map games with populated player data
    const games = gameDocs.map((d) => {
      const data: any = d.data();
      return {
        id: d.id,
        createdBy: data.createdBy,
        createdAt: data.createdAt ? { seconds: data.createdAt.seconds, nanoseconds: data.createdAt.nanoseconds } : null,
        teamA: (data.teamA || []).map((id: string) => usersMap.get(id) || { id, name: "Unknown" }),
        teamB: (data.teamB || []).map((id: string) => usersMap.get(id) || { id, name: "Unknown" }),
        participants: data.participants || [...(data.teamA || []), ...(data.teamB || [])],
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

    const responseBody = { games, totalGames, activeGamesCount, nextCursor };
    setCache(cacheKey, responseBody, GAMES_CACHE_TTL_MS);
    return res.json(responseBody);
  }

  return res.status(405).end();
}
