import useSWR from 'swr';

export const appDataKeys = {
  dashboard: (activeLimit = 12) => `/api/stats/dashboard?activeLimit=${activeLimit}`,
  gamesActive: (limit = 100) => `/api/games?activeOnly=true&limit=${limit}`,
  rankingGeneral: '/api/stats/ranking',
  rankingLisa: '/api/stats/ranking?mode=lisa',
  panela: '/api/stats/panela',
};

interface DashboardGame {
  id: string;
  teamA: { id: string; name: string }[];
  teamB: { id: string; name: string }[];
  scoreA: number;
  scoreB: number;
  finished: boolean;
  winnerTeam?: 'A' | 'B';
  lisa: boolean;
  createdAt: any;
}

interface DashboardStats {
  victories: number;
  defeats: number;
  lisasApplied: number;
  lisasTaken: number;
  totalGames: number;
}

interface DashboardResponse {
  activeGames: DashboardGame[];
  totalGames: number;
  activeGamesCount: number;
  userStats: DashboardStats;
}

interface GamesResponse {
  games: DashboardGame[];
  totalGames: number;
  activeGamesCount: number;
  nextCursor: string | null;
}

interface RankingItem {
  id: string;
  name: string;
  victories: number;
  defeats: number;
  lisasApplied: number;
  lisasTaken: number;
  totalGames: number;
  score: number;
}

interface RankingResponse {
  ranking: RankingItem[];
  mode: 'general' | 'lisa';
}

interface SearchGamesResponse {
  games: DashboardGame[];
  nextCursor: string | null;
  hasMore: boolean;
  count: number;
}

interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
}

interface UsersListResponse {
  users: User[];
}

export function useDashboardSummary(activeLimit = 12) {
  return useSWR<DashboardResponse>(appDataKeys.dashboard(activeLimit));
}

export function useActiveGames(limit = 100) {
  return useSWR<GamesResponse>(appDataKeys.gamesActive(limit));
}

export function useRankingGeneral() {
  return useSWR<RankingResponse>(appDataKeys.rankingGeneral);
}

export function useRankingLisa() {
  return useSWR<RankingResponse>(appDataKeys.rankingLisa);
}

export function usePanelaData() {
  return useSWR<{ pairs: any[] }>(appDataKeys.panela);
}

export function useSearchGames(
  playerId?: string,
  startDate?: string,
  endDate?: string,
  pageSize = 20,
  cursor?: string,
  includeFinished = true
) {
  const params = new URLSearchParams();
  if (playerId) params.append('playerId', playerId);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  params.append('pageSize', pageSize.toString());
  if (cursor) params.append('cursor', cursor);
  params.append('includeFinished', includeFinished ? 'true' : 'false');

  const url = `/api/games/search?${params.toString()}`;
  return useSWR<SearchGamesResponse>(url);
}

export function useAllUsers() {
  return useSWR<UsersListResponse>('/api/users');
}
