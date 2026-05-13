import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import FirebaseConnection from "../../../lib/firebaseAdmin";
import { getCache, setCache } from "../../../lib/serverCache";

const db = FirebaseConnection.getInstance().db;
const DASHBOARD_CACHE_TTL_MS = 45 * 1000;
const USER_CACHE_TTL_MS = 5 * 60 * 1000;

function parsePositiveInt(value: unknown, fallback: number, max = 50): number {
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

async function getTotalGamesCount() {
  const cacheKey = "games:list:totalCount";
  const cached = getCache<number>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  let totalGames = 0;
  try {
    const totalSnap = await db.collection("games").count().get();
    totalGames = totalSnap.data().count;
  } catch {
    const totalSnapFallback = await db.collection("games").get();
    totalGames = totalSnapFallback.size;
  }

  setCache(cacheKey, totalGames, DASHBOARD_CACHE_TTL_MS);
  return totalGames;
}

async function getActiveGamesCount() {
  const cacheKey = "games:list:activeCount";
  const cached = getCache<number>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  let activeGamesCount = 0;
  try {
    const activeCountSnap = await db.collection("games").where("finished", "==", false).count().get();
    activeGamesCount = activeCountSnap.data().count;
  } catch {
    const activeCountFallback = await db.collection("games").where("finished", "==", false).get();
    activeGamesCount = activeCountFallback.size;
  }

  setCache(cacheKey, activeGamesCount, DASHBOARD_CACHE_TTL_MS);
  return activeGamesCount;
}

async function getRecentActiveGames(activeLimit: number) {
  try {
    const snap = await db.collection("games")
      .where("finished", "==", false)
      .orderBy("createdAt", "desc")
      .limit(activeLimit)
      .get();
    return snap.docs;
  } catch {
    const fallbackSnap = await db.collection("games")
      .where("finished", "==", false)
      .get();

    return fallbackSnap.docs
      .sort((a, b) => getCreatedAtScore(b.data()) - getCreatedAtScore(a.data()))
      .slice(0, activeLimit);
  }
}

async function getFinishedGamesForUser(userId: string) {
  try {
    const participantsSnap = await db.collection("games")
      .where("finished", "==", true)
      .where("participants", "array-contains", userId)
      .get();

    if (!participantsSnap.empty) {
      return participantsSnap.docs;
    }

    const [teamASnap, teamBSnap] = await Promise.all([
      db.collection("games")
        .where("finished", "==", true)
        .where("teamA", "array-contains", userId)
        .get(),
      db.collection("games")
        .where("finished", "==", true)
        .where("teamB", "array-contains", userId)
        .get(),
    ]);

    const docsMap = new Map<string, any>();
    teamASnap.docs.forEach((doc) => docsMap.set(doc.id, doc));
    teamBSnap.docs.forEach((doc) => docsMap.set(doc.id, doc));
    return Array.from(docsMap.values());
  } catch {
    const fullFinishedSnap = await db.collection("games")
      .where("finished", "==", true)
      .get();

    return fullFinishedSnap.docs.filter((doc) => {
      const game: any = doc.data();
      return (game.teamA || []).includes(userId) || (game.teamB || []).includes(userId);
    });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const activeLimit = parsePositiveInt(req.query.activeLimit, 12);
    const cacheKey = `stats:dashboard:${currentUser.id}:activeLimit=${activeLimit}`;
    const cached = getCache<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const [totalGames, activeGamesCount, activeGameDocs, finishedUserGames] = await Promise.all([
      getTotalGamesCount(),
      getActiveGamesCount(),
      getRecentActiveGames(activeLimit),
      getFinishedGamesForUser(currentUser.id),
    ]);

    const allUserIds = new Set<string>();
    activeGameDocs.forEach((doc) => {
      const data: any = doc.data();
      (data.teamA || []).forEach((id: string) => allUserIds.add(id));
      (data.teamB || []).forEach((id: string) => allUserIds.add(id));
    });

    const usersMap = await getUsersMap(Array.from(allUserIds));

    const activeGames = activeGameDocs.map((doc) => {
      const data: any = doc.data();
      return {
        id: doc.id,
        createdBy: data.createdBy,
        createdAt: data.createdAt ? { seconds: data.createdAt.seconds, nanoseconds: data.createdAt.nanoseconds } : null,
        teamA: (data.teamA || []).map((id: string) => usersMap.get(id) || { id, name: "Unknown" }),
        teamB: (data.teamB || []).map((id: string) => usersMap.get(id) || { id, name: "Unknown" }),
        rounds: data.rounds || [],
        teamA_total: data.teamA_total || 0,
        teamB_total: data.teamB_total || 0,
        scoreA: data.teamA_total || 0,
        scoreB: data.teamB_total || 0,
        finished: false,
        lisa: data.lisa || false,
        winnerTeam: data.winnerTeam || null,
        finishedAt: data.finishedAt ? { seconds: data.finishedAt.seconds, nanoseconds: data.finishedAt.nanoseconds } : null,
      };
    });

    let victories = 0;
    let defeats = 0;
    let lisasApplied = 0;
    let lisasTaken = 0;

    finishedUserGames.forEach((doc) => {
      const game: any = doc.data();
      const teamAIds = game.teamA || [];
      const teamBIds = game.teamB || [];

      const isInTeamA = teamAIds.includes(currentUser.id);
      const isInTeamB = teamBIds.includes(currentUser.id);
      if (!isInTeamA && !isInTeamB) return;

      const winnerTeam = game.winnerTeam;
      if (!winnerTeam || (winnerTeam !== "A" && winnerTeam !== "B")) return;

      const scoreA = game.teamA_total || 0;
      const scoreB = game.teamB_total || 0;

      if (isInTeamA) {
        if (winnerTeam === "A") {
          victories++;
          if (scoreA >= 100 && scoreB === 0) lisasApplied++;
        } else {
          defeats++;
          if (scoreA === 0 && scoreB >= 100) lisasTaken++;
        }
      } else if (isInTeamB) {
        if (winnerTeam === "B") {
          victories++;
          if (scoreB >= 100 && scoreA === 0) lisasApplied++;
        } else {
          defeats++;
          if (scoreB === 0 && scoreA >= 100) lisasTaken++;
        }
      }
    });

    const responseBody = {
      activeGames,
      totalGames,
      activeGamesCount,
      userStats: {
        victories,
        defeats,
        lisasApplied,
        lisasTaken,
        totalGames: victories + defeats,
      },
    };

    setCache(cacheKey, responseBody, DASHBOARD_CACHE_TTL_MS);
    return res.json(responseBody);
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
