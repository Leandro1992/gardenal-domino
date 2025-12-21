import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser, hashPassword } from "../../../lib/auth";
import { db } from "../../../lib/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = await getCurrentUser(req);
  if (!current || current.role !== "admin") return res.status(403).json({ error: "Admin only" });

  if (req.method === "POST") {
    const { email, name, password, role } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password required" });

    const q = await db.collection("users").where("email", "==", email).get();
    if (!q.empty) return res.status(400).json({ error: "Email already in use" });

    const passwordHash = await hashPassword(password);
    const docRef = await db.collection("users").add({
      email,
      name: name || "",
      role: role === "admin" ? "admin" : "user",
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
      lisaCount: 0,
    });
    return res.status(201).json({ id: docRef.id });
  }

  // GET list users
  if (req.method === "GET") {
    const snap = await db.collection("users").orderBy("createdAt", "desc").get();
    const users = snap.docs.map((d) => {
      const data: any = d.data();
      delete data.passwordHash;
      return { id: d.id, ...data };
    });
    return res.json({ users });
  }

  return res.status(405).end();
}
