import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import FirebaseConnection from "../../../lib/firebaseAdmin";
import { getCache, setCache } from "../../../lib/serverCache";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

const db = FirebaseConnection.getInstance().db;
const DASHBOARD_CACHE_TTL_MS = 45 * 1000;
const USER_CACHE_TTL_MS = 5 * 60 * 1000;
const FREE_GAMES_COLLECTION = "games";
const CHAMPIONSHIP_GAMES_COLLECTION = "championship_games";

interface SourcedDoc {
  source: "free" | "championship";
  doc: QueryDocumentSnapshot;
}

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
  const cacheKey = "games:list:totalCount:allModes";
  const cached = getCache<number>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const [freeTotal, championshipTotal] = await Promise.all([
    getCollectionCount(FREE_GAMES_COLLECTION, "games:list:totalCount:free"),
    getCollectionCount(CHAMPIONSHIP_GAMES_COLLECTION, "games:list:totalCount:championship"),
  ]);
  const totalGames = freeTotal + championshipTotal;

  setCache(cacheKey, totalGames, DASHBOARD_CACHE_TTL_MS);
  return totalGames;
}

async function getActiveGamesCount() {
  const cacheKey = "games:list:activeCount:allModes";
  const cached = getCache<number>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const [freeActive, championshipActive] = await Promise.all([
    getCollectionCount(FREE_GAMES_COLLECTION, "games:list:activeCount:free", false),
    getCollectionCount(CHAMPIONSHIP_GAMES_COLLECTION, "games:list:activeCount:championship", false),
  ]);
  const activeGamesCount = freeActive + championshipActive;

  setCache(cacheKey, activeGamesCount, DASHBOARD_CACHE_TTL_MS);
  return activeGamesCount;
}

async function getCollectionCount(
  collectionName: string,
  cacheKey: string,
  finished?: boolean
): Promise<number> {
  const cached = getCache<number>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  let query: any = db.collection(collectionName);
  if (typeof finished === "boolean") {
    query = query.where("finished", "==", finished);
  }

  let count = 0;
  try {
    const snap = await query.count().get();
    count = snap.data().count;
  } catch {
    const fallbackSnap = await query.get();
    count = fallbackSnap.size;
  }

  setCache(cacheKey, count, DASHBOARD_CACHE_TTL_MS);
  return count;
}

function sortDocsByCreatedAtDesc(a: any, b: any) {
  return getCreatedAtScore(b.data()) - getCreatedAtScore(a.data());
}

async function getRecentActiveGames(activeLimit: number) {
  const [freeDocs, championshipDocs] = await Promise.all([
    getRecentActiveGamesByCollection(FREE_GAMES_COLLECTION, activeLimit),
    getRecentActiveGamesByCollection(CHAMPIONSHIP_GAMES_COLLECTION, activeLimit),
  ]);

  return [...freeDocs, ...championshipDocs]
    .sort((a, b) => sortDocsByCreatedAtDesc(a.doc, b.doc))
    .slice(0, activeLimit);
}

async function getRecentActiveGamesByCollection(collectionName: string, limit: number) {
  try {
    const snap = await db.collection(collectionName)
      .where("finished", "==", false)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((doc) => ({
      source: collectionName === CHAMPIONSHIP_GAMES_COLLECTION ? "championship" : "free",
      doc,
    } as SourcedDoc));
  } catch {
    const fallbackSnap = await db.collection(collectionName)
      .where("finished", "==", false)
      .get();

    return fallbackSnap.docs
      .sort(sortDocsByCreatedAtDesc)
      .slice(0, limit)
      .map((doc) => ({
        source: collectionName === CHAMPIONSHIP_GAMES_COLLECTION ? "championship" : "free",
        doc,
      } as SourcedDoc));
  }
}

async function getFinishedGamesForUser(userId: string) {
  const [freeGames, championshipGames] = await Promise.all([
    getFinishedGamesForUserInCollection(FREE_GAMES_COLLECTION, userId),
    getFinishedGamesForUserInCollection(CHAMPIONSHIP_GAMES_COLLECTION, userId),
  ]);
  return [...freeGames, ...championshipGames];
}

async function getFinishedGamesForUserInCollection(collectionName: string, userId: string) {
  try {
    const participantsSnap = await db.collection(collectionName)
      .where("finished", "==", true)
      .where("participants", "array-contains", userId)
      .get();

    if (!participantsSnap.empty) {
      return participantsSnap.docs.map((doc) => ({
        source: collectionName === CHAMPIONSHIP_GAMES_COLLECTION ? "championship" : "free",
        doc,
      } as SourcedDoc));
    }

    const [teamASnap, teamBSnap] = await Promise.all([
      db.collection(collectionName)
        .where("finished", "==", true)
        .where("teamA", "array-contains", userId)
        .get(),
      db.collection(collectionName)
        .where("finished", "==", true)
        .where("teamB", "array-contains", userId)
        .get(),
    ]);

    const docsMap = new Map<string, any>();
    teamASnap.docs.forEach((doc) => docsMap.set(doc.id, doc));
    teamBSnap.docs.forEach((doc) => docsMap.set(doc.id, doc));
    return Array.from(docsMap.values()).map((doc) => ({
      source: collectionName === CHAMPIONSHIP_GAMES_COLLECTION ? "championship" : "free",
      doc,
    } as SourcedDoc));
  } catch {
    const fullFinishedSnap = await db.collection(collectionName)
      .where("finished", "==", true)
      .get();

    return fullFinishedSnap.docs.filter((doc) => {
      const game: any = doc.data();
      return (game.teamA || []).includes(userId) || (game.teamB || []).includes(userId);
    }).map((doc) => ({
      source: collectionName === CHAMPIONSHIP_GAMES_COLLECTION ? "championship" : "free",
      doc,
    } as SourcedDoc));
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

    const [totalGames, activeGamesCount, activeGameDocs, finishedUserGames, totalGamesFree, totalGamesChampionship, activeGamesFree, activeGamesChampionship] = await Promise.all([
      getTotalGamesCount(),
      getActiveGamesCount(),
      getRecentActiveGames(activeLimit),
      getFinishedGamesForUser(currentUser.id),
      getCollectionCount(FREE_GAMES_COLLECTION, "games:list:totalCount:free"),
      getCollectionCount(CHAMPIONSHIP_GAMES_COLLECTION, "games:list:totalCount:championship"),
      getCollectionCount(FREE_GAMES_COLLECTION, "games:list:activeCount:free", false),
      getCollectionCount(CHAMPIONSHIP_GAMES_COLLECTION, "games:list:activeCount:championship", false),
    ]);

    const allUserIds = new Set<string>();
    activeGameDocs.forEach(({ doc }) => {
      const data: any = doc.data();
      (data.teamA || []).forEach((id: string) => allUserIds.add(id));
      (data.teamB || []).forEach((id: string) => allUserIds.add(id));
    });

    const usersMap = await getUsersMap(Array.from(allUserIds));

    const activeGames = activeGameDocs.map(({ doc, source }) => {
      const data: any = doc.data();
      return {
        id: doc.id,
        mode: source,
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
    let victoriesFree = 0;
    let defeatsFree = 0;
    let victoriesChampionship = 0;
    let defeatsChampionship = 0;

    finishedUserGames.forEach(({ doc, source }) => {
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
          if (source === "championship") victoriesChampionship++;
          else victoriesFree++;
          if (scoreA >= 100 && scoreB === 0) lisasApplied++;
        } else {
          defeats++;
          if (source === "championship") defeatsChampionship++;
          else defeatsFree++;
          if (scoreA === 0 && scoreB >= 100) lisasTaken++;
        }
      } else if (isInTeamB) {
        if (winnerTeam === "B") {
          victories++;
          if (source === "championship") victoriesChampionship++;
          else victoriesFree++;
          if (scoreB >= 100 && scoreA === 0) lisasApplied++;
        } else {
          defeats++;
          if (source === "championship") defeatsChampionship++;
          else defeatsFree++;
          if (scoreB === 0 && scoreA >= 100) lisasTaken++;
        }
      }
    });

    const responseBody = {
      activeGames,
      totalGames,
      activeGamesCount,
      gameTotals: {
        totalGames,
        totalGamesFree,
        totalGamesChampionship,
        activeGamesCount,
        activeGamesFree,
        activeGamesChampionship,
      },
      userStats: {
        victories,
        defeats,
        lisasApplied,
        lisasTaken,
        totalGames: victories + defeats,
      },
      userStatsByMode: {
        free: {
          victories: victoriesFree,
          defeats: defeatsFree,
          totalGames: victoriesFree + defeatsFree,
        },
        championship: {
          victories: victoriesChampionship,
          defeats: defeatsChampionship,
          totalGames: victoriesChampionship + defeatsChampionship,
        },
      },
    };

    setCache(cacheKey, responseBody, DASHBOARD_CACHE_TTL_MS);
    return res.json(responseBody);
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
