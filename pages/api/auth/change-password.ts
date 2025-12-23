import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser, comparePassword, hashPassword } from "../../../lib/auth";
import supabase from "../../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: "Not authenticated" });

  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) return res.status(400).json({ error: "oldPassword and newPassword required" });

  const { data: user, error: fetchError } = await supabase
    .from("users")
    .select("password_hash")
    .eq("id", current.id)
    .single();

  if (fetchError || !user) {
    return res.status(404).json({ error: "User not found" });
  }

  const ok = await comparePassword(oldPassword, user.password_hash);
  if (!ok) return res.status(403).json({ error: "Old password incorrect" });

  const newHash = await hashPassword(newPassword);
  const { error: updateError } = await supabase
    .from("users")
    .update({ password_hash: newHash })
    .eq("id", current.id);

  if (updateError) {
    console.error("Error updating password:", updateError);
    return res.status(500).json({ error: "Failed to update password" });
  }

  res.json({ ok: true });
}
