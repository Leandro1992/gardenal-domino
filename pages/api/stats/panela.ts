import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import FirebaseConnection from "../../../lib/firebaseAdmin";
import { getCache, setCache } from "../../../lib/serverCache";

const db = FirebaseConnection.getInstance().db;
const PANELA_CACHE_TTL_MS = 90 * 1000;

interface User {
  id: string;
  name?: string;
  email: string;
}

interface PairStat {
  pairKey: string;
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  gamesTogether: number;
}

function buildPairKey(a: string, b: string): [string, string, string] {
  const [first, second] = [a, b].sort();
  return [first, second, `${first}__${second}`];
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
    const cacheKey = "stats:panela";
    const cached = getCache<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const [usersSnap, gamesSnap] = await Promise.all([
      db.collection("users").get(),
      db.collection("games").where("finished", "==", true).get(),
    ]);

    const users = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as User));
    const userNameById = new Map<string, string>(
      users.map((user) => [user.id, user.name || user.email])
    );

    const pairCount = new Map<string, { player1Id: string; player2Id: string; gamesTogether: number }>();

    gamesSnap.docs.forEach((doc) => {
      const game: any = doc.data();
      const teamAIds = Array.isArray(game.teamA)
        ? Array.from(new Set(game.teamA as string[]))
        : [];
      const teamBIds = Array.isArray(game.teamB)
        ? Array.from(new Set(game.teamB as string[]))
        : [];

      const addTeamPair = (teamIds: string[]) => {
        if (teamIds.length !== 2) return;

        const [player1Id, player2Id, pairKey] = buildPairKey(teamIds[0], teamIds[1]);
        const current = pairCount.get(pairKey);

        if (current) {
          current.gamesTogether += 1;
          return;
        }

        pairCount.set(pairKey, {
          player1Id,
          player2Id,
          gamesTogether: 1,
        });
      };

      addTeamPair(teamAIds);
      addTeamPair(teamBIds);
    });

    const pairs: PairStat[] = Array.from(pairCount.entries())
      .map(([pairKey, value]) => ({
        pairKey,
        player1Id: value.player1Id,
        player1Name: userNameById.get(value.player1Id) || value.player1Id,
        player2Id: value.player2Id,
        player2Name: userNameById.get(value.player2Id) || value.player2Id,
        gamesTogether: value.gamesTogether,
      }))
      .sort((a, b) => {
        if (b.gamesTogether !== a.gamesTogether) return b.gamesTogether - a.gamesTogether;
        const pairNameA = `${a.player1Name} ${a.player2Name}`.toLowerCase();
        const pairNameB = `${b.player1Name} ${b.player2Name}`.toLowerCase();
        return pairNameA.localeCompare(pairNameB);
      });

    const responseBody = { pairs };
    setCache(cacheKey, responseBody, PANELA_CACHE_TTL_MS);
    return res.json(responseBody);
  } catch (error) {
    console.error("Error fetching pair frequency:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
