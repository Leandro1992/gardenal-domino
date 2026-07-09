import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../lib/auth";
import FirebaseConnection from "../../lib/firebaseAdmin";
import type { Firestore } from "firebase-admin/firestore";
import { getActiveCycle, computeCycleStats, sortAndDetectTies, getSystemParams } from "../../lib/championship";
import { getCache, setCache } from "../../lib/serverCache";
import { MEDAL_WEIGHTS, MedalType } from "../../types/championship";

const db = FirebaseConnection.getInstance().db;

const MONTHLY_CACHE_TTL = 30 * 1000;
const ANNUAL_CACHE_TTL = 2 * 60 * 1000;

async function enrichWithNames(
  stats: any[],
  db: Firestore
): Promise<any[]> {
  const userIds = stats.map((s) => s.userId);
  const docs = await Promise.all(userIds.map((id) => db.collection("users").doc(id).get()));
  const namesMap = new Map<string, string>();
  docs.forEach((doc) => {
    if (!doc.exists) return;
    const data: any = doc.data();
    namesMap.set(doc.id, data?.name || data?.email || "Unknown");
  });
  return stats.map((s) => ({ ...s, name: namesMap.get(s.userId) || s.userId }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: "Not authenticated" });

  if (req.method !== "GET") return res.status(405).end();

  const { type, year } = req.query;

  // ── GET ?type=monthly ── ranking parcial do ciclo ativo ───────────────────
  if (type === "monthly") {
    const cycle = await getActiveCycle(db);
    if (!cycle) {
      return res.json({ eligible: [], ineligible: [], cycle: null });
    }

    const cacheKey = `championship:ranking:monthly:${cycle.id}`;
    const cached = getCache<any>(cacheKey);
    if (cached) return res.json(cached);

    const params = await getSystemParams(db);
    const allStats = await computeCycleStats(db, cycle.id);

    const eligible = allStats.filter((s) => s.totalGames >= params.minGamesForMonthlyRanking);
    const ineligible = allStats.filter((s) => s.totalGames < params.minGamesForMonthlyRanking);

    const { sorted: sortedEligible } = sortAndDetectTies(eligible);
    const sortedIneligible = [...ineligible].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.victories !== a.victories) return b.victories - a.victories;
      return b.totalGames - a.totalGames;
    });

    const medalProjection = (position: number): MedalType => {
      if (position === 1) return "gold";
      if (position === 2) return "silver";
      if (position === 3) return "bronze";
      return "participation";
    };

    const enrichedEligible = await enrichWithNames(
      sortedEligible.map((s, i) => ({
        ...s,
        position: i + 1,
        projectedMedal: medalProjection(i + 1),
        projectedWeight: MEDAL_WEIGHTS[medalProjection(i + 1)],
      })),
      db as any
    );

    const enrichedIneligible = await enrichWithNames(
      sortedIneligible.map((s, i) => ({
        ...s,
        partialPosition: i + 1,
        partialScore: s.score,
        gamesNeeded: params.minGamesForMonthlyRanking - s.totalGames,
      })),
      db as any
    );

    const result = {
      eligible: enrichedEligible,
      ineligible: enrichedIneligible,
      cycle: {
        id: cycle.id,
        year: cycle.year,
        month: cycle.month,
        status: cycle.status,
        windowStart: cycle.windowStart
          ? { seconds: (cycle.windowStart as any).seconds, nanoseconds: (cycle.windowStart as any).nanoseconds }
          : null,
        windowEnd: cycle.windowEnd
          ? { seconds: (cycle.windowEnd as any).seconds, nanoseconds: (cycle.windowEnd as any).nanoseconds }
          : null,
      },
      params: { minGamesForMonthlyRanking: params.minGamesForMonthlyRanking },
    };

    setCache(cacheKey, result, MONTHLY_CACHE_TTL);
    return res.json(result);
  }

  // ── GET ?type=annual&year=YYYY ── ranking anual por medalhas ──────────────
  if (type === "annual") {
    const targetYear = typeof year === "string" ? parseInt(year, 10) : new Date().getFullYear();

    const cacheKey = `championship:ranking:annual:${targetYear}`;
    const cached = getCache<any>(cacheKey);
    if (cached) return res.json(cached);

    const snap = await db
      .collection("championship_medals")
      .where("year", "==", targetYear)
      .get();

    const playerMap = new Map<
      string,
      {
        userId: string;
        totalScore: number;
        medals: { month: number; medal: MedalType; weight: number }[];
        gold: number;
        silver: number;
        bronze: number;
        participation: number;
      }
    >();

    snap.docs.forEach((doc) => {
      const m: any = doc.data();
      if (!playerMap.has(m.userId)) {
        playerMap.set(m.userId, {
          userId: m.userId,
          totalScore: 0,
          medals: [],
          gold: 0,
          silver: 0,
          bronze: 0,
          participation: 0,
        });
      }
      const p = playerMap.get(m.userId)!;
      p.totalScore += m.weight || 0;
      p.medals.push({ month: m.month, medal: m.medal, weight: m.weight });
      if (m.medal === "gold") p.gold++;
      else if (m.medal === "silver") p.silver++;
      else if (m.medal === "bronze") p.bronze++;
      else p.participation++;
    });

    const sorted = Array.from(playerMap.values()).sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.gold !== a.gold) return b.gold - a.gold;
      if (b.silver !== a.silver) return b.silver - a.silver;
      return b.bronze - a.bronze;
    });

    const enriched = await enrichWithNames(
      sorted.map((p, i) => ({ ...p, position: i + 1 })),
      db as any
    );

    const result = { year: targetYear, players: enriched };
    setCache(cacheKey, result, ANNUAL_CACHE_TTL);
    return res.json(result);
  }

  return res.status(400).json({ error: "Parâmetro 'type' deve ser 'monthly' ou 'annual'" });
}
