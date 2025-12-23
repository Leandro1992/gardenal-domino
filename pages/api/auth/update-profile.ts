import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import FirebaseConnection from "../../../lib/firebaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { name } = req.body;
  
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "Nome é obrigatório" });
  }

  if (name.trim().length < 3) {
    return res.status(400).json({ error: "Nome deve ter pelo menos 3 caracteres" });
  }

  try {
    const db = FirebaseConnection.getInstance().db;
    await db.collection('users').doc(currentUser.id).update({
      name: name.trim(),
      updatedAt: new Date()
    });

    res.json({ success: true, message: "Nome atualizado com sucesso" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Erro ao atualizar perfil" });
  }
}
