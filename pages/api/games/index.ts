import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import { db } from "../../../lib/firebaseAdmin";

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

    // validate users exist
    const usersCheck = await Promise.all(unique.map((id) => db.collection("users").doc(id).get()));
    if (usersCheck.some((d) => !d.exists)) return res.status(400).json({ error: "All players must exist" });

    const game = {
      createdBy: current.id,
      createdAt: new Date(),
      teamA,
      teamB,
      rounds: [],
      teamA_total: 0,
      teamB_total: 0,
      finished: false,
    };
    const ref = await db.collection("games").add(game);
    return res.status(201).json({ id: ref.id });
  }

  if (req.method === "GET") {
    const snap = await db.collection("games").orderBy("createdAt", "desc").limit(50).get();
    const games = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json({ games });
  }

  return res.status(405).end();
}
