import FirebaseConnection from "../lib/firebaseAdmin";
import { hashPassword } from "../lib/auth";

const db = FirebaseConnection.getInstance().db;

// Lista de usuários padrão do Gardenal
const defaultUsers = [

];

async function seedAdmin() {
  const email = process.env.DEFAULT_ADMIN_EMAIL;
  const password = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD env vars are required");
    process.exit(1);
  }

  // Criar admin
  const adminQuery = await db.collection("users").where("email", "==", email).get();
  if (adminQuery.empty) {
    const passwordHash = await hashPassword(password);
    const adminDoc = await db.collection("users").add({
      email,
      name: "*****",
      role: "*****",
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
      lisaCount: 0,
    });
    console.log("✅ Admin created:", adminDoc.id);
  } else {
    console.log("ℹ️  Admin already exists, skipping.");
  }

  // Criar usuários padrão
  const defaultPassword = "********"; // Senha padrão para todos os usuários
  const defaultPasswordHash = await hashPassword(defaultPassword);
  
  console.log("\n🎯 Creating default users...");
  let created = 0;
  let skipped = 0;

  for (const user of defaultUsers) {
    const userQuery = await db.collection("users").where("email", "==", user.email).get();
    
    if (userQuery.empty) {
      await db.collection("users").add({
        email: user.email,
        name: user.name,
        role: "user",
        passwordHash: defaultPasswordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
        lisaCount: 0,
      });
      console.log(`  ✅ Created: ${user.name} (${user.email})`);
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
  console.log(`\n🔑 Default password for all users: ${defaultPassword}`);
  
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
