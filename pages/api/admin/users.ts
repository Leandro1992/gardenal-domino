import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser, hashPassword } from "../../../lib/auth";
import FirebaseConnection from "../../../lib/firebaseAdmin";
import { clearCacheByPrefix, getCache, setCache } from "../../../lib/serverCache";

const db = FirebaseConnection.getInstance().db;
const ADMIN_USERS_CACHE_TTL_MS = 60 * 1000;

// Add a type that includes the 'role' property
type User = { id: string; role: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = (await getCurrentUser(req)) as { id: string; role?: string };
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
    clearCacheByPrefix("users:list:");
    clearCacheByPrefix("users:admin:");
    clearCacheByPrefix("stats:");
    return res.status(201).json({ id: docRef.id });
  }

  // GET list users
  if (req.method === "GET") {
    const cacheKey = "users:admin:list:createdAt-desc";
    const cached = getCache<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const snap = await db.collection("users").orderBy("createdAt", "desc").get();
    const users = snap.docs.map((d) => {
      const data: any = d.data();
      delete data.passwordHash;
      return { id: d.id, ...data };
    });

    const responseBody = { users };
    setCache(cacheKey, responseBody, ADMIN_USERS_CACHE_TTL_MS);
    return res.json(responseBody);
  }

  return res.status(405).end();
}
