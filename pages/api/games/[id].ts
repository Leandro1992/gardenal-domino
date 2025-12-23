import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import supabase from "../../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: "Not authenticated" });
  const { id } = req.query;
  if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing id" });

  if (req.method === "GET") {
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("*")
      .eq("id", id)
      .single();

    if (gameError || !game) {
      return res.status(404).json({ error: "Not found" });
    }

    // Get rounds for this game
    const { data: rounds } = await supabase
      .from("rounds")
      .select("*")
      .eq("game_id", id)
      .order("round_number", { ascending: true });

    // Populate player names for teamA and teamB
    const teamAIds = game.team_a || [];
    const teamBIds = game.team_b || [];
    const allPlayerIds = [...teamAIds, ...teamBIds];

    const { data: playersData } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", allPlayerIds);

    const playersMap = new Map(
      (playersData || []).map((p) => [p.id, { id: p.id, name: p.name || p.email || "Unknown" }])
    );

    const teamAPlayers = teamAIds.map((userId: string) => playersMap.get(userId) || { id: userId, name: "Unknown" });
    const teamBPlayers = teamBIds.map((userId: string) => playersMap.get(userId) || { id: userId, name: "Unknown" });

    // Format rounds for compatibility
    const formattedRounds = (rounds || []).map((r: any) => ({
      id: r.id,
      roundNumber: r.round_number,
      teamA_points: r.team_a_points,
      teamB_points: r.team_b_points,
      recordedAt: r.recorded_at,
      recordedBy: r.recorded_by,
    }));

    return res.json({
      id: game.id,
      createdBy: game.created_by,
      createdAt: game.created_at,
      teamA: teamAPlayers,
      teamB: teamBPlayers,
      rounds: formattedRounds,
      scoreA: game.team_a_total || 0,
      scoreB: game.team_b_total || 0,
      finished: game.finished,
      winnerTeam: game.winner_team,
      lisa: game.lisa || [],
      finishedAt: game.finished_at,
    });
  }

  return res.status(405).end();
}
