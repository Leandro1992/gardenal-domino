import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser, hashPassword } from "../../../lib/auth";
import supabase from "../../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = (await getCurrentUser(req)) as { id: string; role?: string };
  if (!current || current.role !== "admin") return res.status(403).json({ error: "Admin only" });

  if (req.method === "POST") {
    const { email, name, password, role } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password required" });

    // Verificar se email já existe
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const passwordHash = await hashPassword(password);
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        email,
        name: name || "",
        role: role === "admin" ? "admin" : "user",
        password_hash: passwordHash,
        lisa_count: 0,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating user:", error);
      return res.status(500).json({ error: "Failed to create user" });
    }

    return res.status(201).json({ id: newUser.id });
  }

  // GET list users
  if (req.method === "GET") {
    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, name, role, lisa_count, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ error: "Failed to fetch users" });
    }

    // Mapear para formato compatível com frontend
    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      lisaCount: user.lisa_count || 0,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    return res.json({ users: formattedUsers });
  }

  return res.status(405).end();
}
