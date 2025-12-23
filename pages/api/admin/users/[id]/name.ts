import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../../../lib/auth";
import supabase from "../../../../../lib/supabase";

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

  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "ID do usuário é obrigatório" });
  }

  if (!name || typeof name !== "string" || name.trim().length < 3) {
    return res.status(400).json({ message: "Nome deve ter pelo menos 3 caracteres" });
  }

  try {
    // Verificar se o usuário existe
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Atualizar o nome
    const { error: updateError } = await supabase
      .from("users")
      .update({ name: name.trim() })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating user name:", updateError);
      return res.status(500).json({ error: "Internal server error" });
    }

    res.json({ message: "Nome atualizado com sucesso" });
  } catch (error) {
    console.error("Error updating user name:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
