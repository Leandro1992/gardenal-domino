import { FirestoreTimestamp } from "../lib/firebaseAdmin";

export type Role = "admin" | "user";

export interface User {
  email: string;
  name?: string;
  role: Role;
  passwordHash: string;
  lisaCount?: number;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export interface Round {
  roundNumber: number;
  teamA_points: number;
  teamB_points: number;
  recordedAt: FirestoreTimestamp;
  recordedBy: string; // userId
}

export interface Game {
  createdBy: string;
  createdAt?: FirestoreTimestamp;
  teamA: [string, string]; // userIds
  teamB: [string, string];
  rounds?: Round[];
  teamA_total: number;
  teamB_total: number;
  finished: boolean;
  winnerTeam?: "A" | "B" | null;
  lisa?: string[]; // userIds marked as Lisa
  finishedAt?: FirestoreTimestamp;
}
