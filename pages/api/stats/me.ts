import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import FirebaseConnection from "../../../lib/firebaseAdmin";

const db = FirebaseConnection.getInstance().db;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    // Buscar todas as partidas finalizadas onde o usuário participou
    const gamesSnap = await db.collection("games")
      .where("finished", "==", true)
      .get();

    let victories = 0;
    let defeats = 0;
    let lisasApplied = 0;
    let lisasTaken = 0;

    gamesSnap.docs.forEach((doc) => {
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
          // Time A ganhou (atingiu 100+ primeiro)
          victories++;
          // Lisa aplicada: você atingiu 100+ E adversário ficou com 0
          if (scoreA >= 100 && scoreB === 0) {
            lisasApplied++;
          }
        } else {
          // Time A perdeu (adversário atingiu 100+ primeiro)
          defeats++;
          // Lisa levada: adversário atingiu 100+ E você ficou com 0
          if (scoreB >= 100 && scoreA === 0) {
            lisasTaken++;
          }
        }
      } 
      // Usuário está no Time B
      else if (isInTeamB) {
        if (winnerTeam === 'B') {
          // Time B ganhou (atingiu 100+ primeiro)
          victories++;
          // Lisa aplicada: você atingiu 100+ E adversário ficou com 0
          if (scoreB >= 100 && scoreA === 0) {
            lisasApplied++;
          }
        } else {
          // Time B perdeu (adversário atingiu 100+ primeiro)
          defeats++;
          // Lisa levada: adversário atingiu 100+ E você ficou com 0
          if (scoreA >= 100 && scoreB === 0) {
            lisasTaken++;
          }
        }
      }
    });

    res.json({
      stats: {
        victories,
        defeats,
        lisasApplied,
        lisasTaken,
        totalGames: victories + defeats
      }
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
