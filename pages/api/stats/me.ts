import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import FirebaseConnection from "../../../lib/firebaseAdmin";
import { getCache, setCache } from "../../../lib/serverCache";

const db = FirebaseConnection.getInstance().db;
const USER_STATS_CACHE_TTL_MS = 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const cacheKey = `stats:me:${currentUser.id}`;
    const cached = getCache<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Busca otimizada: jogos finalizados em que o usuário participou.
    let gameDocs: any[] = [];
    try {
      const participantsSnap = await db.collection("games")
        .where("finished", "==", true)
        .where("participants", "array-contains", currentUser.id)
        .get();

      if (!participantsSnap.empty) {
        gameDocs = participantsSnap.docs;
      } else {
        const [teamASnap, teamBSnap] = await Promise.all([
          db.collection("games")
            .where("finished", "==", true)
            .where("teamA", "array-contains", currentUser.id)
            .get(),
          db.collection("games")
            .where("finished", "==", true)
            .where("teamB", "array-contains", currentUser.id)
            .get(),
        ]);

        const docsMap = new Map<string, any>();
        teamASnap.docs.forEach((doc) => docsMap.set(doc.id, doc));
        teamBSnap.docs.forEach((doc) => docsMap.set(doc.id, doc));
        gameDocs = Array.from(docsMap.values());
      }
    } catch {
      const fullFinishedSnap = await db.collection("games")
        .where("finished", "==", true)
        .get();
      gameDocs = fullFinishedSnap.docs;
    }

    let victories = 0;
    let defeats = 0;
    let lisasApplied = 0;
    let lisasTaken = 0;

    gameDocs.forEach((doc) => {
      const game: any = doc.data();
      const teamAIds = game.teamA || [];
      const teamBIds = game.teamB || [];
      
      const isInTeamA = teamAIds.includes(currentUser.id);
      const isInTeamB = teamBIds.includes(currentUser.id);
      
      if (!isInTeamA && !isInTeamB) {
        return; // Usuário não participou desta partida
      }

      // Validar que a partida tem winner definido
      const winnerTeam = game.winnerTeam;
      if (!winnerTeam || (winnerTeam !== 'A' && winnerTeam !== 'B')) {
        console.log(`Game ${doc.id} has invalid winnerTeam: ${winnerTeam}`);
        return; // Partida inválida
      }

      const scoreA = game.teamA_total || 0;
      const scoreB = game.teamB_total || 0;
      
      // Usuário está no Time A
      if (isInTeamA) {
        if (winnerTeam === 'A') {
          // Time A ganhou (Time A atingiu 100 pontos primeiro)
          victories++;
          // Lisa aplicada: Time A venceu com 100+ pontos E Time B não fez nenhum ponto
          if (scoreA >= 100 && scoreB === 0) {
            lisasApplied++;
          }
        } else {
          // Time A perdeu (Time B atingiu 100 pontos primeiro)
          defeats++;
          // Lisa tomada: Time A perdeu com 0 pontos enquanto Time B fez 100+
          if (scoreA === 0 && scoreB >= 100) {
            lisasTaken++;
          }
        }
      } 
      // Usuário está no Time B
      else if (isInTeamB) {
        if (winnerTeam === 'B') {
          // Time B ganhou (Time B atingiu 100 pontos primeiro)
          victories++;
          // Lisa aplicada: Time B venceu com 100+ pontos E Time A não fez nenhum ponto
          if (scoreB >= 100 && scoreA === 0) {
            lisasApplied++;
          }
        } else {
          // Time B perdeu (Time A atingiu 100 pontos primeiro)
          defeats++;
          // Lisa tomada: Time B perdeu com 0 pontos enquanto Time A fez 100+
          if (scoreB === 0 && scoreA >= 100) {
            lisasTaken++;
          }
        }
      }
    });

    const responseBody = {
      stats: {
        victories,
        defeats,
        lisasApplied,
        lisasTaken,
        totalGames: victories + defeats
      }
    };

    setCache(cacheKey, responseBody, USER_STATS_CACHE_TTL_MS);
    res.json(responseBody);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
