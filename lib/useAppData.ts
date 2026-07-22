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
  mode?: 'free' | 'championship';
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

interface DashboardModeStats {
  victories: number;
  defeats: number;
  totalGames: number;
}

interface DashboardResponse {
  activeGames: DashboardGame[];
  totalGames: number;
  activeGamesCount: number;
  userStats: DashboardStats;
  gameTotals?: {
    totalGames: number;
    totalGamesFree: number;
    totalGamesChampionship: number;
    activeGamesCount: number;
    activeGamesFree: number;
    activeGamesChampionship: number;
  };
  userStatsByMode?: {
    free: DashboardModeStats;
    championship: DashboardModeStats;
  };
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

export function useRankingLisa(gameMode: 'all' | 'free' | 'championship' = 'all') {
  const url = `/api/stats/ranking?mode=lisa&gameMode=${gameMode}`;
  return useSWR<RankingResponse>(url);
}

export function usePanelaData() {
  return useSWR<{ pairs: any[] }>(appDataKeys.panela);
}

export function useSearchGames(
  playerId?: string,
  mode?: "free" | "championship",
  startDate?: string,
  endDate?: string,
  pageSize = 20,
  cursor?: string,
  includeFinished = true,
  searchNonce?: number
) {
  const params = new URLSearchParams();
  if (playerId) params.append('playerId', playerId);
  if (mode) params.append('mode', mode);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (searchNonce) params.append('_searchNonce', searchNonce.toString());
  params.append('pageSize', pageSize.toString());
  if (cursor) params.append('cursor', cursor);
  params.append('includeFinished', includeFinished ? 'true' : 'false');

  const url = `/api/games/search?${params.toString()}`;
  return useSWR<SearchGamesResponse>(url);
}

export function useAllUsers() {
  return useSWR<UsersListResponse>('/api/users');
}
