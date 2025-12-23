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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    // Buscar todos os usuários
    const usersSnap = await db.collection("users").get();
    const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

    // Buscar todas as partidas finalizadas
    const gamesSnap = await db.collection("games")
      .where("finished", "==", true)
      .get();

    // Calcular estatísticas para cada usuário
    const ranking = users.map(user => {
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
        
        if (!isInTeamA && !isInTeamB) {
          return; // Usuário não participou desta partida
        }

        // Validar que a partida tem winner definido
        const winnerTeam = game.winnerTeam;
        if (!winnerTeam || (winnerTeam !== 'A' && winnerTeam !== 'B')) {
          return; // Partida inválida
        }

        const scoreA = game.teamA_total || 0;
        const scoreB = game.teamB_total || 0;
        
        // Usuário está no Time A
        if (isInTeamA) {
          if (winnerTeam === 'A') {
            // Time A ganhou (Time B chegou a 100 primeiro)
            victories++;
            // Lisa aplicada: você manteve 0 pontos E fez adversário chegar a 100
            if (scoreA === 0 && scoreB >= 100) {
              lisasApplied++;
            }
          } else {
            // Time A perdeu (Time A chegou a 100 primeiro)
            defeats++;
            // Lisa levada: adversário manteve 0 pontos E fez você chegar a 100
            if (scoreA >= 100 && scoreB === 0) {
              lisasTaken++;
            }
          }
        } 
        // Usuário está no Time B
        else if (isInTeamB) {
          if (winnerTeam === 'B') {
            // Time B ganhou (Time A chegou a 100 primeiro)
            victories++;
            // Lisa aplicada: você manteve 0 pontos E fez adversário chegar a 100
            if (scoreB === 0 && scoreA >= 100) {
              lisasApplied++;
            }
          } else {
            // Time B perdeu (Time B chegou a 100 primeiro)
            defeats++;
            // Lisa levada: adversário manteve 0 pontos E fez você chegar a 100
            if (scoreB >= 100 && scoreA === 0) {
              lisasTaken++;
            }
          }
        }
      });

      // Calcular score: vitórias (+1) + lisas aplicadas (+2) - derrotas (-1) - lisas tomadas (-2)
      const score = victories + (lisasApplied * 2) - defeats - (lisasTaken * 2);

      return {
        id: user.id,
        name: user.name || user.email,
        victories,
        defeats,
        lisasApplied,
        lisasTaken,
        totalGames: victories + defeats,
        score
      };
    });

    // Ordenar por score (maior primeiro), depois por vitórias, depois por lisas aplicadas
    ranking.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.victories !== a.victories) return b.victories - a.victories;
      return b.lisasApplied - a.lisasApplied;
    });

    res.json({ ranking });
  } catch (error) {
    console.error("Error fetching ranking:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
