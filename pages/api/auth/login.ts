import { NextApiRequest, NextApiResponse } from "next";
import supabase from "../../../lib/supabase";
import { comparePassword, signToken } from "../../../lib/auth";
import cookie from "cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const { data: user, error } = await supabase
    .from("users")
    .select("id, email, name, role, password_hash")
    .eq("email", email)
    .single();

  if (error || !user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await comparePassword(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ uid: user.id, role: user.role });
  res.setHeader(
    "Set-Cookie",
    cookie.serialize("gardenal_token", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
  );

  const safeUser = { id: user.id, email: user.email, name: user.name, role: user.role };
  return res.json({ user: safeUser });
}
