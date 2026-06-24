import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../lib/auth";
import FirebaseConnection from "../../lib/firebaseAdmin";
import * as admin from "firebase-admin";
import {
  getDayWindow,
  getCycleMonthKey,
  getActiveCycle,
  getSystemParams,
} from "../../lib/championship";
import { clearCacheByPrefix, getCache, setCache } from "../../lib/serverCache";

const db = FirebaseConnection.getInstance().db;
const GAME_CACHE_TTL = 20 * 1000;
const USER_CACHE_TTL = 5 * 60 * 1000;

async function getUsersMap(userIds: string[]) {
  const map = new Map<string, { id: string; name: string }>();
  const missing: string[] = [];

  userIds.forEach((id) => {
    const cached = getCache<{ id: string; name: string }>(`users:item:${id}`);
    if (cached) { map.set(id, cached); return; }
    missing.push(id);
  });

  if (missing.length > 0) {
    const docs = await Promise.all(missing.map((id) => db.collection("users").doc(id).get()));
    docs.forEach((doc) => {
      if (!doc.exists) return;
      const data: any = doc.data();
      const user = { id: doc.id, name: data?.name || data?.email || "Unknown" };
      map.set(doc.id, user);
      setCache(`users:item:${doc.id}`, user, USER_CACHE_TTL);
    });
  }

  return map;
}

function serializeGame(docId: string, data: any, usersMap: Map<string, { id: string; name: string }>) {
  return {
    id: docId,
    mode: "championship",
    createdBy: data.createdBy,
    createdAt: data.createdAt ? { seconds: data.createdAt.seconds, nanoseconds: data.createdAt.nanoseconds } : null,
    dayWindow: data.dayWindow,
    cycleId: data.cycleId,
    teamA: (data.teamA || []).map((id: string) => usersMap.get(id) || { id, name: "Unknown" }),
    teamB: (data.teamB || []).map((id: string) => usersMap.get(id) || { id, name: "Unknown" }),
    participants: data.participants || [],
    rounds: data.rounds || [],
    teamA_total: data.teamA_total || 0,
    teamB_total: data.teamB_total || 0,
    // Compatibilidade com frontend: `scoreA`/`scoreB` usados na UI
    scoreA: data.teamA_total || 0,
    scoreB: data.teamB_total || 0,
    finished: data.finished || false,
    winnerTeam: data.winnerTeam || null,
    // Expor `lisa` como booleano para compatibilidade com frontend (que espera boolean)
    lisa: Array.isArray(data.lisa) ? (data.lisa.length > 0) : Boolean(data.lisa),
    lisaPlayers: data.lisa || [],
    finishedAt: data.finishedAt ? { seconds: data.finishedAt.seconds, nanoseconds: data.finishedAt.nanoseconds } : null,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: "Not authenticated" });

  const { id, action, roundNumber } = req.query;

  // ── GET sem id ── listar partidas do ciclo ativo ──────────────────────────
  if (req.method === "GET" && !id) {
    const cycle = await getActiveCycle(db);
    if (!cycle) return res.json({ games: [], cycle: null });

    const cacheKey = `championship:games:list:${cycle.id}`;
    const cached = getCache<any>(cacheKey);
    if (cached) return res.json(cached);

    let snap;
    try {
      snap = await db
        .collection("championship_games")
        .where("cycleId", "==", cycle.id)
        .orderBy("createdAt", "desc")
        .get();
    } catch {
      // Fallback sem ordenação caso o índice composto não exista ainda
      const raw = await db
        .collection("championship_games")
        .where("cycleId", "==", cycle.id)
        .get();
      const sorted = raw.docs.sort((a, b) => {
        const aT = (a.data().createdAt?.seconds || 0);
        const bT = (b.data().createdAt?.seconds || 0);
        return bT - aT;
      });
      snap = { docs: sorted } as any;
    }

    const allIds = new Set<string>();
    snap.docs.forEach((d) => {
      const data: any = d.data();
      [...(data.teamA || []), ...(data.teamB || [])].forEach((uid: string) => allIds.add(uid));
    });

    const usersMap = await getUsersMap(Array.from(allIds));
    const games = snap.docs.map((d) => serializeGame(d.id, d.data(), usersMap));
    const result = { games, cycle: { id: cycle.id, year: cycle.year, month: cycle.month, status: cycle.status } };
    setCache(cacheKey, result, GAME_CACHE_TTL);
    return res.json(result);
  }

  // ── POST sem id ── criar partida de campeonato ───────────────────────────
  if (req.method === "POST" && !id) {
    const { teamA, teamB } = req.body || {};

    if (!Array.isArray(teamA) || !Array.isArray(teamB) || teamA.length !== 2 || teamB.length !== 2) {
      return res.status(400).json({ error: "teamA e teamB devem ser arrays de 2 userIds" });
    }

    const all = [...teamA, ...teamB];
    const unique = Array.from(new Set(all));
    if (unique.length !== 4) return res.status(400).json({ error: "Os 4 jogadores devem ser distintos" });

    // Validar que todos existem
    const userDocs = await Promise.all(unique.map((id) => db.collection("users").doc(id).get()));
    if (userDocs.some((d) => !d.exists)) {
      return res.status(400).json({ error: "Todos os jogadores devem estar cadastrados" });
    }

    // Verificar ciclo ativo
    const cycle = await getActiveCycle(db);
    if (!cycle) {
      return res.status(400).json({ error: "Não há ciclo de campeonato aberto. Solicite ao administrador." });
    }

    // Verificar jogadores já em partida ativa de campeonato
    const activeSnap = await db
      .collection("championship_games")
      .where("finished", "==", false)
      .where("cycleId", "==", cycle.id)
      .get();

    const activePlayers = new Set<string>();
    activeSnap.docs.forEach((doc) => {
      const data: any = doc.data();
      [...(data.participants || []), ...(data.teamA || []), ...(data.teamB || [])].forEach((uid) =>
        activePlayers.add(uid)
      );
    });

    const inActive = all.filter((uid) => activePlayers.has(uid));
    if (inActive.length > 0) {
      const names = await Promise.all(
        inActive.map(async (uid) => {
          const d = await db.collection("users").doc(uid).get();
          return (d.data() as any)?.name || "Desconhecido";
        })
      );
      return res.status(400).json({
        error: `Os seguintes jogadores já estão em partida ativa: ${names.join(", ")}`,
      });
    }

    // Validar rotação de parceiros
    const params = await getSystemParams(db);
    let monthGamesDocs: any[];
    try {
      const snap = await db
        .collection("championship_games")
        .where("cycleId", "==", cycle.id)
        .where("finished", "==", true)
        .get();
      monthGamesDocs = snap.docs;
    } catch {
      const snap = await db
        .collection("championship_games")
        .where("cycleId", "==", cycle.id)
        .get();
      monthGamesDocs = snap.docs.filter((d) => d.data().finished === true);
    }

    const pairCount = new Map<string, number>();
    monthGamesDocs.forEach((doc) => {
      const data: any = doc.data();
      const pairs: [string, string][] = [
        [data.teamA[0], data.teamA[1]],
        [data.teamB[0], data.teamB[1]],
      ];
      pairs.forEach(([p1, p2]) => {
        const key = [p1, p2].sort().join("|");
        pairCount.set(key, (pairCount.get(key) || 0) + 1);
      });
    });

    const newPairs: [string, string][] = [
      [teamA[0], teamA[1]],
      [teamB[0], teamB[1]],
    ];
    for (const [p1, p2] of newPairs) {
      const key = [p1, p2].sort().join("|");
      const count = pairCount.get(key) || 0;
      if (count >= params.maxPartnerRepetitionsPerMonth) {
        const d1 = await db.collection("users").doc(p1).get();
        const d2 = await db.collection("users").doc(p2).get();
        const n1 = (d1.data() as any)?.name || p1;
        const n2 = (d2.data() as any)?.name || p2;
        return res.status(400).json({
          error: `A dupla ${n1} + ${n2} já jogou ${count} vez(es) juntos neste ciclo (máximo: ${params.maxPartnerRepetitionsPerMonth}).`,
        });
      }
    }

    const dayWindow = getDayWindow();
    const game = {
      createdBy: current.id,
      createdAt: admin.firestore.Timestamp.now(),
      dayWindow,
      cycleId: cycle.id,
      teamA,
      teamB,
      participants: unique,
      rounds: [],
      teamA_total: 0,
      teamB_total: 0,
      finished: false,
    };

    const ref = await db.collection("championship_games").add(game);
    clearCacheByPrefix(`championship:games:list:`);

    const usersMap = await getUsersMap(unique);
    return res.status(201).json({
      game: {
        id: ref.id,
        mode: "championship",
        ...game,
        teamA: teamA.map((uid: string) => usersMap.get(uid)),
        teamB: teamB.map((uid: string) => usersMap.get(uid)),
      },
    });
  }

  // ── GET com id ── buscar partida ─────────────────────────────────────────
  if (req.method === "GET" && typeof id === "string" && !action) {
    const doc = await db.collection("championship_games").doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Partida não encontrada" });

    const data: any = doc.data();
    const allIds = [...(data.teamA || []), ...(data.teamB || [])];
    const usersMap = await getUsersMap(allIds);
    return res.json(serializeGame(doc.id, data, usersMap));
  }

  // ── DELETE com id ── cancelar partida (apenas admin) ─────────────────────
  if (req.method === "DELETE" && typeof id === "string" && !roundNumber) {
    if (current.role !== "admin") {
      return res.status(403).json({ error: "Apenas administradores podem cancelar partidas" });
    }

    const ref = db.collection("championship_games").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Partida não encontrada" });

    await ref.delete();
    clearCacheByPrefix("championship:games:list:");
    clearCacheByPrefix("championship:ranking:");
    return res.json({ ok: true, message: "Partida de campeonato cancelada com sucesso" });
  }

  // ── POST com id + action=rounds ── adicionar rodada ──────────────────────
  if (req.method === "POST" && typeof id === "string" && action === "rounds") {
    const { teamA_points, teamB_points } = req.body || {};
    if (typeof teamA_points !== "number" || typeof teamB_points !== "number") {
      return res.status(400).json({ error: "teamA_points e teamB_points são obrigatórios" });
    }

    const gameRef = db.collection("championship_games").doc(id);

    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(gameRef);
        if (!snap.exists) throw new Error("Partida não encontrada");
        const game: any = snap.data();
        if (game.finished) throw new Error("Partida já finalizada");

        const newTeamA = (game.teamA_total || 0) + teamA_points;
        const newTeamB = (game.teamB_total || 0) + teamB_points;
        const roundNumber = (game.rounds?.length || 0) + 1;

        const round = {
          roundNumber,
          teamA_points,
          teamB_points,
          recordedAt: admin.firestore.Timestamp.now(),
          recordedBy: current.id,
        };

        tx.update(gameRef, {
          rounds: [...(game.rounds || []), round],
          teamA_total: newTeamA,
          teamB_total: newTeamB,
          updatedAt: admin.firestore.Timestamp.now(),
        });
      });

      clearCacheByPrefix("championship:games:list:");
      const snap = await gameRef.get();
      const data: any = snap.data();
      const allIds = [...(data.teamA || []), ...(data.teamB || [])];
      const usersMap = await getUsersMap(allIds);
      const serialized = serializeGame(snap.id, data, usersMap);
      return res.json({ ok: true, game: serialized });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Erro ao adicionar rodada" });
    }
  }

  // ── DELETE com id + roundNumber ── remover rodada ─────────────────────────
  if (req.method === "DELETE" && typeof id === "string" && typeof roundNumber === "string") {
    const rNum = parseInt(roundNumber, 10);
    if (isNaN(rNum) || rNum < 1) return res.status(400).json({ error: "roundNumber inválido" });

    const gameRef = db.collection("championship_games").doc(id);

    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(gameRef);
        if (!snap.exists) throw new Error("Partida não encontrada");
        const game: any = snap.data();
        if (game.finished) throw new Error("Não é possível remover rodadas de partida finalizada");

        const rounds = game.rounds || [];
        if (rNum > rounds.length) throw new Error("Rodada não encontrada");

        const updated = rounds
          .filter((_: any, i: number) => i !== rNum - 1)
          .map((r: any, i: number) => ({ ...r, roundNumber: i + 1 }));

        let totalA = 0;
        let totalB = 0;
        updated.forEach((r: any) => { totalA += r.teamA_points || 0; totalB += r.teamB_points || 0; });

        tx.update(gameRef, {
          rounds: updated,
          teamA_total: totalA,
          teamB_total: totalB,
          updatedAt: admin.firestore.Timestamp.now(),
        });
      });

      clearCacheByPrefix("championship:games:list:");
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Erro ao remover rodada" });
    }
  }

  // ── POST com id + action=finish ── finalizar partida ─────────────────────
  if (req.method === "POST" && typeof id === "string" && action === "finish") {
    const gameRef = db.collection("championship_games").doc(id);

    try {
      const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(gameRef);
        if (!snap.exists) throw new Error("Partida não encontrada");
        const game: any = snap.data();
        if (game.finished) throw new Error("Partida já finalizada");

        const tA = Number(game.teamA_total || 0);
        const tB = Number(game.teamB_total || 0);

        if (tA < 100 && tB < 100) throw new Error("Nenhum time atingiu 100 pontos ainda");

        let winnerTeam: "A" | "B";
        if (tA >= 100 && tB >= 100) {
          if (tA !== tB) {
            winnerTeam = tA > tB ? "A" : "B";
          } else {
            // Desempate por ultima rodada: quem marcou mais na última rodada vence
            const lastRound = (game.rounds || []).slice(-1)[0];
            if (lastRound) {
              winnerTeam = (lastRound.teamA_points || 0) > (lastRound.teamB_points || 0) ? "A" : "B";
            } else {
              winnerTeam = "A"; // fallback deterministico
            }
          }
        } else {
          winnerTeam = tA >= 100 ? "A" : "B";
        }

        const lisaPlayers: string[] = [];
        if (winnerTeam === "A" && tB === 0) lisaPlayers.push(...(game.teamA || []));
        else if (winnerTeam === "B" && tA === 0) lisaPlayers.push(...(game.teamB || []));

        const update: any = {
          finished: true,
          winnerTeam,
          finishedAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        };
        if (lisaPlayers.length > 0) update.lisa = lisaPlayers;

        tx.update(gameRef, update);
        return { winnerTeam, lisa: lisaPlayers };
      });

      clearCacheByPrefix("championship:games:list:");
      clearCacheByPrefix("championship:ranking:");

      // Normalizar retorno: `lisa` como booleano e `lisaPlayers` com lista real
      const isLisa = Array.isArray(result.lisa) ? result.lisa.length > 0 : Boolean(result.lisa);
      return res.json({ ok: true, winnerTeam: result.winnerTeam, lisa: isLisa, lisaPlayers: result.lisa || [] });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Erro ao finalizar partida" });
    }
  }

  return res.status(405).end();
}
