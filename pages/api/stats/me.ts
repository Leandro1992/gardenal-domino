import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import supabase from "../../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    // Buscar todas as partidas finalizadas
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("id, team_a, team_b, team_a_total, team_b_total, winner_team, lisa")
      .eq("finished", true);

    if (gamesError) {
      console.error("Error fetching games:", gamesError);
      return res.status(500).json({ error: "Failed to fetch games" });
    }

    let victories = 0;
    let defeats = 0;
    let lisasApplied = 0;
    let lisasTaken = 0;

    (games || []).forEach((game: any) => {
      const teamAIds = game.team_a || [];
      const teamBIds = game.team_b || [];
      
      const isInTeamA = teamAIds.includes(currentUser.id);
      const isInTeamB = teamBIds.includes(currentUser.id);
      
      if (!isInTeamA && !isInTeamB) {
        return; // Usuário não participou desta partida
      }

      // Validar que a partida tem winner definido
      const winnerTeam = game.winner_team;
      if (!winnerTeam || (winnerTeam !== 'A' && winnerTeam !== 'B')) {
        console.log(`Game ${game.id} has invalid winner_team: ${winnerTeam}`);
        return; // Partida inválida
      }

      const scoreA = game.team_a_total || 0;
      const scoreB = game.team_b_total || 0;
      
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
