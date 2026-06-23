/**
 * Utilitários centrais do Modo Campeonato.
 * Inclui: janela diária, gerenciamento de ciclos e distribuição de medalhas.
 */

import * as admin from "firebase-admin";
import type { Firestore } from "firebase-admin/firestore";
import {
  ChampionshipCycle,
  SystemParams,
  DEFAULT_PARAMS,
  PlayerCycleStats,
  ChampionshipMedal,
  MedalType,
  MEDAL_WEIGHTS,
} from "../types/championship";
import { getCache, setCache } from "./serverCache";

// ─── Janela Diária ────────────────────────────────────────────────────────────

function padTwo(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`;
}

function subDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() - days);
  return d;
}

/**
 * Retorna o identificador da janela diária (YYYY-MM-DD).
 * Janela corre das 18h do dia D até 17h59 do dia D+1.
 */
export function getDayWindow(date: Date = new Date()): string {
  const hours = date.getHours();
  const windowDate = hours < 18 ? subDays(date, 1) : date;
  return formatDate(windowDate);
}

/**
 * Retorna o mês/ano do ciclo para uma data/hora.
 * Usa a mesma lógica 18h→18h para evitar contaminação em virada de mês.
 */
export function getCycleMonthKey(date: Date = new Date()): { year: number; month: number } {
  const windowKey = getDayWindow(date);
  const parts = windowKey.split("-");
  return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) };
}

function getCycleWindowStart(year: number, month: number): Date {
  return new Date(year, month - 1, 1, 18, 0, 0, 0);
}

function getCycleWindowEnd(year: number, month: number): Date {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return getCycleWindowStart(nextYear, nextMonth);
}

// ─── Gerenciamento de Ciclos ──────────────────────────────────────────────────

const ACTIVE_CYCLE_CACHE_TTL = 60 * 1000; // 1 min

/**
 * Retorna o ciclo atualmente aberto (status == "open").
 * Retorna null se não houver nenhum.
 */
export async function getActiveCycle(db: Firestore): Promise<(ChampionshipCycle & { id: string }) | null> {
  const cached = getCache<ChampionshipCycle & { id: string }>("championship:cycle:active");
  if (cached) return cached;

  const snap = await db.collection("championship_cycles")
    .where("status", "==", "open")
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  const cycle = { id: doc.id, ...(doc.data() as ChampionshipCycle) };
  setCache("championship:cycle:active", cycle, ACTIVE_CYCLE_CACHE_TTL);
  return cycle;
}

/**
 * Abre um novo ciclo para o mês/ano corrente (baseado na janela 18h).
 * Usa transaction para evitar dois ciclos abertos simultaneamente.
 */
export async function openCycle(
  db: Firestore,
  adminId: string
): Promise<ChampionshipCycle & { id: string }> {
  const cyclesRef = db.collection("championship_cycles");

  return await db.runTransaction(async (tx) => {
    const openSnap = await tx.get(cyclesRef.where("status", "==", "open").limit(1));
    if (!openSnap.empty) {
      throw new Error("Já existe um ciclo aberto. Feche-o antes de abrir um novo.");
    }

    const { year, month } = getCycleMonthKey();
    const windowStart = getCycleWindowStart(year, month);
    const windowEnd = getCycleWindowEnd(year, month);

    const newCycle: ChampionshipCycle = {
      year,
      month,
      windowStart: admin.firestore.Timestamp.fromDate(windowStart),
      windowEnd: admin.firestore.Timestamp.fromDate(windowEnd),
      status: "open",
    };

    const ref = cyclesRef.doc();
    tx.set(ref, newCycle);
    return { id: ref.id, ...newCycle };
  });
}

// ─── Parâmetros do Sistema ────────────────────────────────────────────────────

export async function getSystemParams(db: Firestore): Promise<SystemParams> {
  const cached = getCache<SystemParams>("params:config");
  if (cached) return cached;

  const snap = await db.collection("system_params").doc("config").get();
  const params: SystemParams = snap.exists
    ? { ...DEFAULT_PARAMS, ...(snap.data() as SystemParams) }
    : DEFAULT_PARAMS;

  setCache("params:config", params, 5 * 60 * 1000);
  return params;
}

// ─── Estatísticas de jogadores no ciclo ───────────────────────────────────────

/**
 * Computa as estatísticas de todos os jogadores a partir das partidas finalizadas do ciclo.
 */
export async function computeCycleStats(db: Firestore, cycleId: string): Promise<PlayerCycleStats[]> {
  let docs: any[];
  try {
    const snap = await db
      .collection("championship_games")
      .where("cycleId", "==", cycleId)
      .where("finished", "==", true)
      .get();
    docs = snap.docs;
  } catch {
    const snap = await db
      .collection("championship_games")
      .where("cycleId", "==", cycleId)
      .get();
    docs = snap.docs.filter((d) => d.data().finished === true);
  }

  const statsMap = new Map<string, PlayerCycleStats>();

  function getOrCreate(userId: string): PlayerCycleStats {
    if (!statsMap.has(userId)) {
      statsMap.set(userId, {
        userId,
        score: 0,
        victories: 0,
        defeats: 0,
        lisasApplied: 0,
        lisasTaken: 0,
        totalGames: 0,
      });
    }
    return statsMap.get(userId)!;
  }

  docs.forEach((doc) => {
    const game: any = doc.data();
    const teamA: string[] = game.teamA || [];
    const teamB: string[] = game.teamB || [];
    const winnerTeam: "A" | "B" | null = game.winnerTeam || null;
    const lisa: string[] = game.lisa || [];

    const allPlayers = [...teamA, ...teamB];
    allPlayers.forEach((uid) => {
      const s = getOrCreate(uid);
      s.totalGames++;
    });

    if (winnerTeam === "A") {
      teamA.forEach((uid) => { const s = getOrCreate(uid); s.victories++; s.score++; });
      teamB.forEach((uid) => { const s = getOrCreate(uid); s.defeats++; s.score--; });
    } else if (winnerTeam === "B") {
      teamB.forEach((uid) => { const s = getOrCreate(uid); s.victories++; s.score++; });
      teamA.forEach((uid) => { const s = getOrCreate(uid); s.defeats++; s.score--; });
    }

    // Lisa: jogadores do time vencedor que aplicaram (+2), perdedores que levaram (-2)
    if (lisa.length > 0) {
      const loserTeam = winnerTeam === "A" ? teamB : teamA;
      lisa.forEach((uid) => {
        const s = getOrCreate(uid);
        s.lisasApplied++;
        s.score += 2;
      });
      loserTeam.forEach((uid) => {
        const s = getOrCreate(uid);
        s.lisasTaken++;
        s.score -= 2;
      });
    }
  });

  return Array.from(statsMap.values());
}

// ─── Desempate e Ordenação ────────────────────────────────────────────────────

/**
 * Ordena jogadores pelo critério: score DESC → victories DESC → defeats ASC.
 * Retorna também se há empate irresolvível (mesmo score + victories + defeats).
 */
export function sortAndDetectTies(
  players: PlayerCycleStats[]
): { sorted: PlayerCycleStats[]; tieAt?: { position: number; tied: [string, string] } } {
  const sorted = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.victories !== a.victories) return b.victories - a.victories;
    return a.defeats - b.defeats;
  });

  // Detectar empate nas primeiras 3 posições elegíveis (as que recebem medalhas de posição)
  for (let i = 0; i < Math.min(sorted.length - 1, 3); i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (
      a.score === b.score &&
      a.victories === b.victories &&
      a.defeats === b.defeats
    ) {
      return {
        sorted,
        tieAt: { position: i + 1, tied: [a.userId, b.userId] },
      };
    }
  }

  return { sorted };
}

// ─── Distribuição de Medalhas ─────────────────────────────────────────────────

interface MedalAssignment {
  userId: string;
  medal: MedalType;
  weight: number;
  position: number;
  stats: PlayerCycleStats;
}

/**
 * Determina as medalhas para um conjunto de jogadores elegíveis já ordenados.
 */
export function assignMedals(
  sorted: PlayerCycleStats[],
  cycleId: string,
  year: number,
  month: number
): Omit<ChampionshipMedal, "id">[] {
  const medals: Omit<ChampionshipMedal, "id">[] = [];

  sorted.forEach((stats, index) => {
    const position = index + 1;
    let medal: MedalType;

    if (position === 1) medal = "gold";
    else if (position === 2) medal = "silver";
    else if (position === 3) medal = "bronze";
    else medal = "participation";

    medals.push({
      cycleId,
      userId: stats.userId,
      year,
      month,
      medal,
      weight: MEDAL_WEIGHTS[medal],
      score: stats.score,
      victories: stats.victories,
      defeats: stats.defeats,
      lisasApplied: stats.lisasApplied,
      lisasTaken: stats.lisasTaken,
      totalGames: stats.totalGames,
      position,
    });
  });

  return medals;
}
