import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../../lib/auth";
import supabase from "../../../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: "Not authenticated" });

  const { id } = req.query;
  if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing id" });

  // GET - List rounds
  if (req.method === "GET") {
    // Verificar se o jogo existe
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id")
      .eq("id", id)
      .single();

    if (gameError || !game) {
      return res.status(404).json({ error: "Game not found" });
    }

    const { data: rounds, error: roundsError } = await supabase
      .from("rounds")
      .select("*")
      .eq("game_id", id)
      .order("round_number", { ascending: true });

    if (roundsError) {
      console.error("Error fetching rounds:", roundsError);
      return res.status(500).json({ error: "Failed to fetch rounds" });
    }

    // Formatar rounds para compatibilidade
    const formattedRounds = (rounds || []).map((r: any) => ({
      id: r.id,
      roundNumber: r.round_number,
      teamA_points: r.team_a_points,
      teamB_points: r.team_b_points,
      recordedAt: r.recorded_at,
      recordedBy: r.recorded_by,
    }));

    return res.json({ rounds: formattedRounds });
  }

  // DELETE - Undo last round
  if (req.method === "DELETE") {
    try {
      const { data: result, error } = await supabase.rpc("undo_last_round", {
        p_game_id: id,
      });

      if (error) {
        const errorMessage = error.message || "";
        if (errorMessage.includes("Game not found")) {
          return res.status(404).json({ error: "Game not found" });
        }
        if (errorMessage.includes("No rounds to undo")) {
          return res.status(400).json({ error: "No rounds to undo" });
        }
        console.error("Error undoing round:", error);
        return res.status(500).json({ error: "Failed to undo round" });
      }

      // Buscar dados completos da partida atualizada
      const { data: updatedGame, error: fetchError } = await supabase
        .from("games")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !updatedGame) {
        console.error("Error fetching updated game:", fetchError);
        return res.status(500).json({ error: "Failed to fetch updated game" });
      }

      res.json({
        ok: true,
        game: {
          id: updatedGame.id,
          createdBy: updatedGame.created_by,
          createdAt: updatedGame.created_at,
          teamA: updatedGame.team_a,
          teamB: updatedGame.team_b,
          scoreA: updatedGame.team_a_total,
          scoreB: updatedGame.team_b_total,
          finished: updatedGame.finished,
          winnerTeam: updatedGame.winner_team,
          lisa: Array.isArray(updatedGame.lisa) && updatedGame.lisa.length > 0 ? updatedGame.lisa : [],
          finishedAt: updatedGame.finished_at,
        },
      });
      return;
    } catch (err: any) {
      console.error("Error undoing round:", err);
      return res.status(500).json({ error: "Failed to undo round" });
    }
  }

  // POST - Add new round
  if (req.method !== "POST") return res.status(405).end();

  // Verificar se o usuário é membro da partida
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("team_a, team_b")
    .eq("id", id)
    .single();

  if (gameError || !game) {
    return res.status(404).json({ error: "Game not found" });
  }

  const teamAIds = game.team_a || [];
  const teamBIds = game.team_b || [];
  const allPlayers = [...teamAIds, ...teamBIds];

  if (!allPlayers.includes(current.id)) {
    return res.status(403).json({ error: "Apenas membros da partida podem registrar pontos" });
  }

  const { teamA_points, teamB_points } = req.body || {};
  if (typeof teamA_points !== "number" || typeof teamB_points !== "number") {
    return res.status(400).json({ error: "teamA_points and teamB_points numbers required" });
  }

  try {
    // Usar função RPC para operação atômica
    const { data: result, error } = await supabase.rpc("add_round_and_update_game", {
      p_game_id: id,
      p_team_a_points: teamA_points,
      p_team_b_points: teamB_points,
      p_recorded_by: current.id,
    });

    if (error) {
      // Verificar se é um erro conhecido
      const errorMessage = error.message || "";
      if (errorMessage.includes("Game not found")) {
        return res.status(404).json({ error: "Game not found" });
      }
      if (errorMessage.includes("Game already finished")) {
        return res.status(400).json({ error: "Game already finished" });
      }
      console.error("Error adding round:", error);
      return res.status(500).json({ error: "Failed to add round" });
    }

    // Buscar dados completos da partida atualizada
    const { data: updatedGame, error: fetchError } = await supabase
      .from("games")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !updatedGame) {
      console.error("Error fetching updated game:", fetchError);
      return res.status(500).json({ error: "Failed to fetch updated game" });
    }

    res.json({
      ok: true,
      game: {
        id: updatedGame.id,
        createdBy: updatedGame.created_by,
        createdAt: updatedGame.created_at,
        teamA: updatedGame.team_a,
        teamB: updatedGame.team_b,
        scoreA: updatedGame.team_a_total,
        scoreB: updatedGame.team_b_total,
        finished: updatedGame.finished,
        winnerTeam: updatedGame.winner_team,
        lisa: Array.isArray(updatedGame.lisa) && updatedGame.lisa.length > 0 ? updatedGame.lisa : [],
        finishedAt: updatedGame.finished_at,
      },
    });
  } catch (err: any) {
    console.error("Error adding round:", err);
    const message =
      err.message === "Game not found" || err.message === "Game already finished"
        ? err.message
        : "Failed to add round";
    return res.status(400).json({ error: message });
  }
}
