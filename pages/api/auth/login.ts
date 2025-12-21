import { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../../lib/firebaseAdmin";
import { comparePassword, signToken } from "../../../lib/auth";
import cookie from "cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const q = await db.collection("users").where("email", "==", email).limit(1).get();
  if (q.empty) return res.status(401).json({ error: "Invalid credentials" });
  const doc = q.docs[0];
  const user = doc.data() as any;
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ uid: doc.id, role: user.role });
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

  const safeUser = { id: doc.id, email: user.email, name: user.name, role: user.role };
  return res.json({ user: safeUser });
}
