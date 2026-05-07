import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import FirebaseConnection from "../../../lib/firebaseAdmin";

type CachedUser = {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  expiresAt: number;
};

const ME_CACHE_TTL_MS = 30 * 1000;
const meCache = new Map<string, CachedUser>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const currentUser = await getCurrentUser(req);
  if (!currentUser) return res.status(401).json({ error: "Not authenticated" });
  
  try {
    const cached = meCache.get(currentUser.id);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ user: cached.user });
    }

    const db = FirebaseConnection.getInstance().db;
    const userDoc = await db.collection('users').doc(currentUser.id).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const userData = userDoc.data();
    const { passwordHash, ...safeUser } = userData as any;
    
    const user = {
      id: currentUser.id,
      email: safeUser.email,
      name: safeUser.name,
      role: safeUser.role,
    };

    meCache.set(currentUser.id, {
      user,
      expiresAt: Date.now() + ME_CACHE_TTL_MS,
    });

    res.json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
