import * as admin from "firebase-admin";
import FirebaseConnection from "../lib/firebaseAdmin";
import { hashPassword } from "../lib/auth";

const db = FirebaseConnection.getInstance().db;

type DefaultUser = {
  email: string;
  name: string;
};

// Lista de usuários padrão do Gardenal
const defaultUsers: DefaultUser[] = [
  // ...preencher manualmente quando necessário...
];

const normalizeEmail = (value: string) => {
  const email = value.trim().toLowerCase();
  return email.includes("@") ? email : `${email}@gardenal.com`;
};

async function seedAdmin() {
  const emailRaw = process.env.DEFAULT_ADMIN_EMAIL;
  const password = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!emailRaw || !password) {
    console.error("DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD env vars are required");
    process.exit(1);
  }

  const email = normalizeEmail(emailRaw);
  const now = admin.firestore.Timestamp.now();

  // Criar admin
  const adminQuery = await db.collection("users").where("email", "==", email).limit(1).get();
  if (adminQuery.empty) {
    const passwordHash = await hashPassword(password);
    const adminDoc = await db.collection("users").add({
      email,
      name: "Administrador",
      role: "admin",
      passwordHash,
      createdAt: now,
      updatedAt: now,
      lisaCount: 0,
    });
    console.log("✅ Admin created:", adminDoc.id);
  } else {
    console.log("ℹ️  Admin already exists, skipping.");
  }

  // Criar usuários padrão
  const defaultPassword = process.env.DEFAULT_USER_PASSWORD || "123456";
  const defaultPasswordHash = await hashPassword(defaultPassword);

  console.log("\n🎯 Creating default users...");
  let created = 0;
  let skipped = 0;

  for (const user of defaultUsers) {
    const normalizedEmail = normalizeEmail(user.email);
    const userQuery = await db.collection("users").where("email", "==", normalizedEmail).limit(1).get();

    if (userQuery.empty) {
      await db.collection("users").add({
        email: normalizedEmail,
        name: user.name.trim(),
        role: "user",
        passwordHash: defaultPasswordHash,
        createdAt: now,
        updatedAt: now,
        lisaCount: 0,
      });
      console.log(`  ✅ Created: ${user.name} (${normalizedEmail})`);
      created++;
    } else {
      console.log(`  ⏭️  Skipped: ${user.name} (already exists)`);
      skipped++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  - Users created: ${created}`);
  console.log(`  - Users skipped: ${skipped}`);
  console.log(`  - Total users: ${defaultUsers.length}`);

  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
