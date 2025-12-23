import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../../../lib/auth";
import FirebaseConnection from "../../../../../lib/firebaseAdmin";

const db = FirebaseConnection.getInstance().db;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const currentUser = await getCurrentUser(req);
  if (!currentUser || currentUser.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { id } = req.query;
  const { name } = req.body;

  if (!name || typeof name !== "string" || name.trim().length < 3) {
    return res.status(400).json({ message: "Nome deve ter pelo menos 3 caracteres" });
  }

  try {
    const userRef = db.collection("users").doc(id as string);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    await userRef.update({
      name: name.trim()
    });

    res.json({ message: "Nome atualizado com sucesso" });
  } catch (error) {
    console.error("Error updating user name:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
