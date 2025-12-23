import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser, hashPassword } from "../../../../../lib/auth";
import supabase from "../../../../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = (await getCurrentUser(req)) as { id: string; role?: string };
  if (!current || current.role !== "admin") return res.status(403).json({ error: "Admin only" });
  const { id } = req.query;
  if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing id" });

  if (req.method === "PUT") {
    const { newPassword } = req.body || {};
    if (!newPassword) return res.status(400).json({ error: "newPassword required" });
    
    const newHash = await hashPassword(newPassword);
    const { error } = await supabase
      .from("users")
      .update({ password_hash: newHash })
      .eq("id", id);

    if (error) {
      console.error("Error updating password:", error);
      return res.status(500).json({ error: "Failed to update password" });
    }

    return res.json({ ok: true });
  }

  return res.status(405).end();
}
