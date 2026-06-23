import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import FirebaseConnection from "../../../lib/firebaseAdmin";
import { clearCacheByPrefix } from "../../../lib/serverCache";

const db = FirebaseConnection.getInstance().db;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: "Not authenticated" });
  if (current.role !== "admin") return res.status(403).json({ error: "Apenas administradores" });

  // GET → contar jogos do modo livre
  if (req.method === "GET") {
    try {
      const countSnap = await db.collection("games").count().get();
      return res.json({ count: countSnap.data().count });
    } catch {
      const snap = await db.collection("games").get();
      return res.json({ count: snap.size });
    }
  }

  // DELETE → apagar todos os jogos do modo livre em batch
  if (req.method === "DELETE") {
    let deleted = 0;
    let hasMore = true;

    while (hasMore) {
      const snap = await db.collection("games").limit(400).get();
      if (snap.empty) { hasMore = false; break; }

      const batch = db.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deleted += snap.docs.length;

      if (snap.docs.length < 400) hasMore = false;
    }

    clearCacheByPrefix("games:list:");
    clearCacheByPrefix("stats:");

    return res.json({ ok: true, deleted });
  }

  return res.status(405).end();
}
