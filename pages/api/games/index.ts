import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import supabase from "../../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: "Not authenticated" });

  if (req.method === "POST") {
    const { teamA, teamB } = req.body || {};
    if (!Array.isArray(teamA) || !Array.isArray(teamB) || teamA.length !== 2 || teamB.length !== 2) {
      return res.status(400).json({ error: "teamA and teamB must be arrays of 2 userIds each" });
    }
    const all = [...teamA, ...teamB];
    const unique = Array.from(new Set(all));
    if (unique.length !== 4) return res.status(400).json({ error: "Players must be 4 distinct users" });

    // Validate users exist
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id")
      .in("id", unique);

    if (usersError || !users || users.length !== 4) {
      return res.status(400).json({ error: "All players must exist" });
    }

    // Create game
    const { data: newGame, error: gameError } = await supabase
      .from("games")
      .insert({
        created_by: current.id,
        team_a: teamA,
        team_b: teamB,
        team_a_total: 0,
        team_b_total: 0,
        finished: false,
      })
      .select()
      .single();

    if (gameError || !newGame) {
      console.error("Error creating game:", gameError);
      return res.status(500).json({ error: "Failed to create game" });
    }

    // Get player names for response
    const { data: playersData } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", [...teamA, ...teamB]);

    const playersMap = new Map(
      (playersData || []).map((p) => [p.id, { id: p.id, name: p.name || p.email || "Unknown" }])
    );

    return res.status(201).json({
      game: {
        id: newGame.id,
        createdBy: newGame.created_by,
        createdAt: newGame.created_at,
        teamA: teamA.map((id) => playersMap.get(id) || { id, name: "Unknown" }),
        teamB: teamB.map((id) => playersMap.get(id) || { id, name: "Unknown" }),
        scoreA: newGame.team_a_total || 0,
        scoreB: newGame.team_b_total || 0,
        finished: newGame.finished,
      },
    });
  }

  if (req.method === "GET") {
    const { data: games, error } = await supabase
      .from("games")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching games:", error);
      return res.status(500).json({ error: "Failed to fetch games" });
    }

    if (!games || games.length === 0) {
      return res.json({ games: [] });
    }

    // Get all unique user IDs from all games
    const allUserIds = new Set<string>();
    games.forEach((game: any) => {
      (game.team_a || []).forEach((id: string) => allUserIds.add(id));
      (game.team_b || []).forEach((id: string) => allUserIds.add(id));
    })

    // Fetch all users in one batch
    const { data: usersData } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", Array.from(allUserIds));

    const usersMap = new Map(
      (usersData || []).map((u) => [u.id, { id: u.id, name: u.name || u.email || "Unknown" }])
    );

    // Map games with populated player data
    const formattedGames = games.map((game: any) => ({
      id: game.id,
      createdBy: game.created_by,
      createdAt: game.created_at,
      teamA: (game.team_a || []).map((id: string) => usersMap.get(id) || { id, name: "Unknown" }),
      teamB: (game.team_b || []).map((id: string) => usersMap.get(id) || { id, name: "Unknown" }),
      scoreA: game.team_a_total || 0,
      scoreB: game.team_b_total || 0,
      finished: game.finished,
      winnerTeam: game.winner_team,
      lisa: game.lisa || [],
      finishedAt: game.finished_at,
    }));

    return res.json({ games: formattedGames });
  }

  return res.status(405).end();
}
