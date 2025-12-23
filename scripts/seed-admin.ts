import dotenv from 'dotenv';
dotenv.config();
import supabase from "../lib/supabase";
import { hashPassword } from "../lib/auth";

async function seedAdmin() {
  const email = process.env.DEFAULT_ADMIN_EMAIL;
  const password = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD env vars are required");
    process.exit(1);
  }

  // Verificar se admin já existe
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existingUser) {
    console.log("Admin already exists, skipping seed.");
    process.exit(0);
  }

  const passwordHash = await hashPassword(password);
  const { data: newUser, error } = await supabase
    .from("users")
    .insert({
      email,
      name: "Admin",
      role: "admin",
      password_hash: passwordHash,
      lisa_count: 0,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }

  console.log("Admin created:", newUser.id);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
