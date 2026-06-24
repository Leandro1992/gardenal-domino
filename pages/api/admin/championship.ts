import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import FirebaseConnection from "../../../lib/firebaseAdmin";
import * as admin from "firebase-admin";
import {
  openCycle,
  getActiveCycle,
  computeCycleStats,
  sortAndDetectTies,
  assignMedals,
  getSystemParams,
} from "../../../lib/championship";
import { clearCacheByPrefix, clearCache } from "../../../lib/serverCache";
import { TiebreakResolution } from "../../../types/championship";

const db = FirebaseConnection.getInstance().db;

function serializeTimestamp(ts: any) {
  if (!ts) return null;
  return { seconds: ts.seconds, nanoseconds: ts.nanoseconds };
}

function serializeCycle(id: string, data: any) {
  return {
    id,
    ...data,
    windowStart: serializeTimestamp(data.windowStart),
    windowEnd: serializeTimestamp(data.windowEnd),
    closedAt: serializeTimestamp(data.closedAt),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: "Not authenticated" });
  if (current.role !== "admin") return res.status(403).json({ error: "Apenas administradores" });

  const { action, id } = req.query;

  // ── GET ?action=cycles ── listar ciclos ──────────────────────────────────
  if (req.method === "GET" && action === "cycles") {
    let snap: any;
    try {
      snap = await db
        .collection("championship_cycles")
        .orderBy("year", "desc")
        .orderBy("month", "desc")
        .get();
    } catch {
      // Fallback sem ordenação enquanto o índice composto não é criado no Firestore
      snap = await db.collection("championship_cycles").get();
      snap = {
        docs: snap.docs.sort((a: any, b: any) => {
          const ad = a.data(); const bd = b.data();
          if (bd.year !== ad.year) return bd.year - ad.year;
          return bd.month - ad.month;
        }),
      };
    }

    const cycles = snap.docs.map((doc: any) => serializeCycle(doc.id, doc.data()));
    return res.json({ cycles });
  }

  // ── POST ?action=cycles ── abrir novo ciclo ───────────────────────────────
  if (req.method === "POST" && action === "cycles") {
    try {
      const cycle = await openCycle(db, current.id);
      clearCache("championship:cycle:active");
      clearCacheByPrefix("championship:ranking:");
      return res.status(201).json({ cycle });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Erro ao abrir ciclo" });
    }
  }

  // ── POST ?action=close&id={cycleId} ── fechar ciclo + distribuir medalhas ─
  if (req.method === "POST" && action === "close" && typeof id === "string") {
    const cycleRef = db.collection("championship_cycles").doc(id);
    const cycleSnap = await cycleRef.get();

    if (!cycleSnap.exists) return res.status(404).json({ error: "Ciclo não encontrado" });
    const cycleData: any = cycleSnap.data();
    if (cycleData.status !== "open") return res.status(400).json({ error: "Ciclo já está fechado" });

    const params = await getSystemParams(db);
    const allStats = await computeCycleStats(db, id);

    // Filtrar elegíveis
    const eligible = allStats.filter((s) => s.totalGames >= params.minGamesForMonthlyRanking);

    // Aplicar tiebreak resolutions do ciclo (se houver)
    const resolutions: TiebreakResolution[] = cycleData.tiebreakResolutions || [];

    // Reordenar levando em conta os desempates já resolvidos
    const { sorted, tieAt } = sortAndDetectTies(eligible);

    // Verificar se empate na posição já foi resolvido manualmente
    if (tieAt) {
      const resolved = resolutions.find((r) => r.position === tieAt.position);
      if (!resolved) {
        return res.status(409).json({
          status: "tiebreak_required",
          position: tieAt.position,
          tied: tieAt.tied,
          message: `Empate na posição ${tieAt.position}. Resolva o desempate antes de fechar o ciclo.`,
        });
      }
      // Reordenar com o desempate resolvido
      const winnerIdx = sorted.findIndex((s) => s.userId === resolved.winnerId);
      if (winnerIdx > 0) {
        const [winner] = sorted.splice(winnerIdx, 1);
        sorted.splice(tieAt.position - 1, 0, winner);
      }
    }

    const medals = assignMedals(sorted, id, cycleData.year, cycleData.month);

    // Batch: persistir medalhas + fechar ciclo
    const batch = db.batch();

    medals.forEach((medal) => {
      const ref = db.collection("championship_medals").doc();
      batch.set(ref, medal);
    });

    batch.update(cycleRef, {
      status: "closed",
      closedAt: admin.firestore.Timestamp.now(),
      closedBy: current.id,
    });

    await batch.commit();

    clearCache("championship:cycle:active");
    clearCacheByPrefix("championship:ranking:");

    return res.json({ ok: true, medalsDistributed: medals.length, medals });
  }

  // ── PUT ?action=tiebreak&id={cycleId} ── registrar desempate ─────────────
  if (req.method === "PUT" && action === "tiebreak" && typeof id === "string") {
    const { position, winnerId } = req.body || {};

    if (typeof position !== "number" || typeof winnerId !== "string") {
      return res.status(400).json({ error: "position (number) e winnerId (string) são obrigatórios" });
    }

    const cycleRef = db.collection("championship_cycles").doc(id);
    const cycleSnap = await cycleRef.get();
    if (!cycleSnap.exists) return res.status(404).json({ error: "Ciclo não encontrado" });
    const cycleData: any = cycleSnap.data();
    if (cycleData.status !== "open") return res.status(400).json({ error: "Ciclo já fechado" });

    const resolution: TiebreakResolution = {
      position,
      winnerId,
      resolvedBy: current.id,
      resolvedAt: admin.firestore.Timestamp.now(),
    };

    const existing: TiebreakResolution[] = cycleData.tiebreakResolutions || [];
    const updated = [...existing.filter((r) => r.position !== position), resolution];

    await cycleRef.update({ tiebreakResolutions: updated });

    return res.json({ ok: true, resolution });
  }

  return res.status(405).end();
}
