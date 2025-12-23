import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import FirebaseConnection from "../../../lib/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const currentUser = await getCurrentUser(req);
  if (!currentUser) return res.status(401).json({ error: "Not authenticated" });
  
  try {
    const db = FirebaseConnection.getInstance().db;
    const userDoc = await db.collection('users').doc(currentUser.id).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const userData = userDoc.data();
    const { passwordHash, ...safeUser } = userData as any;
    
    res.json({ 
      user: {
        id: currentUser.id,
        email: safeUser.email,
        name: safeUser.name,
        role: safeUser.role
      }
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
