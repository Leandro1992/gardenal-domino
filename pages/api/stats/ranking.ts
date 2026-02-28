import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import FirebaseConnection from "../../../lib/firebaseAdmin";

const db = FirebaseConnection.getInstance().db;

interface User {
  id: string;
  name?: string;
  email: string;
  role: string;
}

type RankingMode = "general" | "lisa";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const mode: RankingMode = req.query.mode === "lisa" ? "lisa" : "general";

    const usersSnap = await db.collection("users").get();
    const users = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as User));

    const gamesSnap = await db.collection("games").where("finished", "==", true).get();

    const ranking = users.map((user) => {
      let victories = 0;
      let defeats = 0;
      let lisasApplied = 0;
      let lisasTaken = 0;

      gamesSnap.docs.forEach((doc) => {
        const game: any = doc.data();
        const teamAIds = game.teamA || [];
        const teamBIds = game.teamB || [];

        const isInTeamA = teamAIds.includes(user.id);
        const isInTeamB = teamBIds.includes(user.id);
        if (!isInTeamA && !isInTeamB) return;

        const winnerTeam = game.winnerTeam;
        if (!winnerTeam || (winnerTeam !== "A" && winnerTeam !== "B")) return;

        const scoreA = game.teamA_total || 0;
        const scoreB = game.teamB_total || 0;
        const hasLisa = Array.isArray(game.lisa) ? game.lisa.length > 0 : Boolean(game.lisa);

        // No ranking de lisa, considerar apenas jogos com lisa
        if (mode === "lisa" && !hasLisa) return;

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

      const score = victories + lisasApplied * 2 - defeats - lisasTaken * 2;

      return {
        id: user.id,
        name: user.name || user.email,
        victories,
        defeats,
        lisasApplied,
        lisasTaken,
        totalGames: victories + defeats,
        score,
      };
    });

    if (mode === "lisa") {
      ranking.sort((a, b) => {
        if (b.lisasApplied !== a.lisasApplied) return b.lisasApplied - a.lisasApplied;
        if (a.lisasTaken !== b.lisasTaken) return a.lisasTaken - b.lisasTaken;
        if (b.victories !== a.victories) return b.victories - a.victories;
        return b.score - a.score;
      });
    } else {
      ranking.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.victories !== a.victories) return b.victories - a.victories;
        return b.lisasApplied - a.lisasApplied;
      });
    }

    const rankingWithGames = ranking.filter((player) => player.totalGames > 0);

    return res.json({ ranking: rankingWithGames, mode });
  } catch (error) {
    console.error("Error fetching ranking:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
