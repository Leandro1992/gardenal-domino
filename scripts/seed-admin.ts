import { db } from "../lib/firebaseAdmin";
import { hashPassword } from "../lib/auth";

async function seedAdmin() {
  const email = process.env.DEFAULT_ADMIN_EMAIL;
  const password = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD env vars are required");
    process.exit(1);
  }

  const q = await db.collection("users").where("email", "==", email).get();
  if (!q.empty) {
    console.log("Admin already exists, skipping seed.");
    process.exit(0);
  }

  const passwordHash = await hashPassword(password);
  const doc = await db.collection("users").add({
    email,
    name: "Admin",
    role: "admin",
    passwordHash,
    createdAt: new Date(),
    updatedAt: new Date(),
    lisaCount: 0,
  });

  console.log("Admin created:", doc.id);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
