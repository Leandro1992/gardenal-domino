import { NextApiRequest, NextApiResponse } from "next";
import FirebaseConnection from "../../../lib/firebaseAdmin";
import { comparePassword, signToken } from "../../../lib/auth";
import cookie from "cookie";

const db = FirebaseConnection.getInstance().db;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const { email, password } = req.body || {};
  const rawEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const rawPassword = typeof password === "string" ? password : "";

  if (!rawEmail || !rawPassword) {
    return res.status(400).json({ error: "email and password required" });
  }

  const emailToSearch = rawEmail.includes("@") ? rawEmail : `${rawEmail}@gardenal.com`;

  const q = await db.collection("users").where("email", "==", emailToSearch).limit(1).get();
  if (q.empty) return res.status(401).json({ error: "Invalid credentials" });

  const doc = q.docs[0];
  const user = doc.data() as any;
  const ok = await comparePassword(rawPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ uid: doc.id, role: user.role });
  res.setHeader(
    "Set-Cookie",
    cookie.serialize("gardenal_token", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
  );

  const safeUser = { id: doc.id, email: user.email, name: user.name, role: user.role };
  return res.json({ user: safeUser });
}
