import { FirestoreTimestamp } from "../lib/firebaseAdmin";
import { Round } from "./models";

export type MedalType = "gold" | "silver" | "bronze" | "participation";
export type CycleStatus = "open" | "closed";

export interface ChampionshipGame {
  id?: string;
  createdBy: string;
  createdAt?: FirestoreTimestamp;
  dayWindow: string; // "YYYY-MM-DD" — janela 18h→18h
  cycleId: string;
  teamA: [string, string]; // userIds
  teamB: [string, string];
  participants: string[];
  rounds: Round[];
  teamA_total: number;
  teamB_total: number;
  finished: boolean;
  winnerTeam?: "A" | "B" | null;
  lisa?: string[]; // userIds do time vencedor quando adversário termina com 0
  finishedAt?: FirestoreTimestamp;
}

export interface TiebreakResolution {
  position: number;
  winnerId: string;
  resolvedBy: string;
  resolvedAt: FirestoreTimestamp;
}

export interface ChampionshipCycle {
  id?: string;
  year: number;
  month: number;
  windowStart: FirestoreTimestamp;
  windowEnd: FirestoreTimestamp; // previsão: 18h do dia 01 do mês seguinte
  status: CycleStatus;
  closedAt?: FirestoreTimestamp;
  closedBy?: string; // userId do admin
  tiebreakResolutions?: TiebreakResolution[];
}

export interface ChampionshipMedal {
  id?: string;
  cycleId: string;
  userId: string;
  year: number;
  month: number;
  medal: MedalType;
  weight: number; // gold=4, silver=3, bronze=2, participation=1
  score: number;
  victories: number;
  defeats: number;
  lisasApplied: number;
  lisasTaken: number;
  totalGames: number;
  position: number;
}

export interface SystemParams {
  minGamesForMonthlyRanking: number; // default 8
  maxPartnerRepetitionsPerMonth: number; // default 2
  updatedAt?: FirestoreTimestamp;
  updatedBy?: string;
}

export interface PlayerCycleStats {
  userId: string;
  score: number;
  victories: number;
  defeats: number;
  lisasApplied: number;
  lisasTaken: number;
  totalGames: number;
}

export const MEDAL_WEIGHTS: Record<MedalType, number> = {
  gold: 4,
  silver: 3,
  bronze: 2,
  participation: 1,
};

export const DEFAULT_PARAMS: SystemParams = {
  minGamesForMonthlyRanking: 8,
  maxPartnerRepetitionsPerMonth: 2,
};
