import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import FirebaseConnection from "../../../lib/firebaseAdmin";
import { getCache, setCache } from "../../../lib/serverCache";

const db = FirebaseConnection.getInstance().db;
const USERS_LIST_CACHE_TTL_MS = 5 * 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const cacheKey = "users:list:name-asc";
    const cached = getCache<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const snap = await db.collection("users").orderBy("name", "asc").get();
    const users = snap.docs.map((d) => {
      const data: any = d.data();
      return {
        id: d.id,
        name: data.name || data.email,
        email: data.email,
      };
    });

    const responseBody = { users };
    setCache(cacheKey, responseBody, USERS_LIST_CACHE_TTL_MS);
    return res.json(responseBody);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
