import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser, hashPassword } from "../../../../../lib/auth";
import FirebaseConnection from "../../../../../lib/firebaseAdmin";

const db = FirebaseConnection.getInstance().db;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = (await getCurrentUser(req)) as { id: string; role?: string };
  if (!current || current.role !== "admin") return res.status(403).json({ error: "Admin only" });
  const { id } = req.query;
  if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing id" });

  if (req.method === "PUT") {
    const { newPassword } = req.body || {};
    if (!newPassword) return res.status(400).json({ error: "newPassword required" });
    const newHash = await hashPassword(newPassword);
    await db.collection("users").doc(id).update({ passwordHash: newHash, updatedAt: new Date() });
    return res.json({ ok: true });
  }

  return res.status(405).end();
}
