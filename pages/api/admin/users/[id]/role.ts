import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../../../lib/auth";
import FirebaseConnection from "../../../../../lib/firebaseAdmin";

const db = FirebaseConnection.getInstance().db;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = (await getCurrentUser(req)) as { id: string; role?: string };
  if (!current || current.role !== "admin") return res.status(403).json({ error: "Admin only" });
  
  const { id } = req.query;
  if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing id" });

  if (req.method === "PUT") {
    const { role } = req.body || {};
    if (!role || (role !== "admin" && role !== "user")) {
      return res.status(400).json({ error: "role must be 'admin' or 'user'" });
    }

    // Não permitir que o usuário altere seu próprio role
    if (id === current.id) {
      return res.status(400).json({ error: "Cannot change your own role" });
    }

    await db.collection("users").doc(id).update({ 
      role, 
      updatedAt: new Date() 
    });
    
    return res.json({ ok: true, role });
  }

  return res.status(405).end();
}
