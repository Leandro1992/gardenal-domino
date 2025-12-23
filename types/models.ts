export type Role = "admin" | "user";

export interface User {
  id?: string;
  email: string;
  name?: string;
  role: Role;
  password_hash?: string;
  passwordHash?: string; // Para compatibilidade durante migração
  lisa_count?: number;
  lisaCount?: number; // Para compatibilidade durante migração
  created_at?: string | Date;
  createdAt?: string | Date; // Para compatibilidade durante migração
  updated_at?: string | Date;
  updatedAt?: string | Date; // Para compatibilidade durante migração
}

export interface Round {
  id?: string;
  game_id?: string;
  gameId?: string; // Para compatibilidade durante migração
  round_number?: number;
  roundNumber?: number; // Para compatibilidade durante migração
  team_a_points?: number;
  teamA_points: number;
  team_b_points?: number;
  teamB_points: number;
  recorded_at?: string | Date;
  recordedAt?: string | Date; // Para compatibilidade durante migração
  recorded_by?: string;
  recordedBy?: string; // Para compatibilidade durante migração
}

export interface Game {
  id?: string;
  created_by?: string;
  createdBy?: string; // Para compatibilidade durante migração
  created_at?: string | Date;
  createdAt?: string | Date; // Para compatibilidade durante migração
  team_a?: string[];
  teamA: [string, string] | string[]; // userIds
  team_b?: string[];
  teamB: [string, string] | string[]; // userIds
  rounds?: Round[];
  team_a_total?: number;
  teamA_total: number;
  team_b_total?: number;
  teamB_total: number;
  finished: boolean;
  winner_team?: "A" | "B" | null;
  winnerTeam?: "A" | "B" | null; // Para compatibilidade durante migração
  lisa?: string[]; // userIds marked as Lisa
  finished_at?: string | Date;
  finishedAt?: string | Date; // Para compatibilidade durante migração
  updated_at?: string | Date;
  updatedAt?: string | Date; // Para compatibilidade durante migração
}
