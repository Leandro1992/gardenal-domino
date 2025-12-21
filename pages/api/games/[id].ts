import { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../../lib/firebaseAdmin";
import { getCurrentUser } from "../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: "Not authenticated" });
  const { id } = req.query;
  if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing id" });

  if (req.method === "GET") {
    const doc = await db.collection("games").doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    return res.json({ id: doc.id, ...doc.data() });
  }

  return res.status(405).end();
}
