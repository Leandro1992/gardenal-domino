import * as admin from "firebase-admin";
import FirebaseConnection from "../lib/firebaseAdmin";

const db = FirebaseConnection.getInstance().db;

async function main() {
  const cutoffArg = process.env.CUTOFF_DATE || process.argv[2] || "2026-06-30";
  const confirm = process.env.CONFIRM === "1" || process.argv.includes("--confirm") || process.argv.includes("-y");

  const cutoffDate = new Date(cutoffArg);
  if (isNaN(cutoffDate.getTime())) {
    console.error("Invalid cutoff date. Use YYYY-MM-DD format, e.g. 2026-06-30");
    process.exit(1);
  }

  const cutoffTs = admin.firestore.Timestamp.fromDate(cutoffDate);

  console.log(`Cutoff: ${cutoffDate.toISOString()} - Mode: ${confirm ? "DELETE" : "DRY-RUN"}`);

  // Query by createdAt and finishedAt separately and deduplicate
  const createdQuery = await db.collection("games").where("createdAt", "<", cutoffTs).get();
  const finishedQuery = await db.collection("games").where("finishedAt", "<", cutoffTs).get();

  const ids = new Set<string>();
  createdQuery.forEach((doc) => ids.add(doc.id));
  finishedQuery.forEach((doc) => ids.add(doc.id));

  console.log(`Found ${ids.size} matching games (unique).`);

  if (ids.size === 0) {
    console.log("No games to delete.");
    process.exit(0);
  }

  if (!confirm) {
    console.log("Dry-run mode. To actually delete, re-run with `--confirm` or set `CONFIRM=1`.");
    Array.from(ids).forEach((id) => console.log(' -', id));
    process.exit(0);
  }

  const idArray = Array.from(ids);
  let deleted = 0;

  while (idArray.length > 0) {
    const chunk = idArray.splice(0, 500);
    const batch = db.batch();
    for (const id of chunk) {
      const ref = db.collection("games").doc(id);
      batch.delete(ref);
    }
    await batch.commit();
    deleted += chunk.length;
    console.log(`Deleted batch of ${chunk.length}. Total deleted: ${deleted}`);
  }

  console.log(`✅ Completed deletion. Total games deleted: ${deleted}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
