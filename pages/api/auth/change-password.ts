import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser, comparePassword, hashPassword } from "../../../lib/auth";
import FirebaseConnection from "../../../lib/firebaseAdmin";

const db = FirebaseConnection.getInstance().db;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: "Not authenticated" });

  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) return res.status(400).json({ error: "oldPassword and newPassword required" });

  const userDoc = await db.collection("users").doc(current.id).get();
  const userData: any = userDoc.data();
  const ok = await comparePassword(oldPassword, userData.passwordHash);
  if (!ok) return res.status(403).json({ error: "Old password incorrect" });

  const newHash = await hashPassword(newPassword);
  await db.collection("users").doc(current.id).update({ passwordHash: newHash, updatedAt: new Date() });
  res.json({ ok: true });
}
