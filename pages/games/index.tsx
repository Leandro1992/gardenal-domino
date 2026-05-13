import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Loader2, Trophy, Plus, Award, Search, Calendar, Download } from 'lucide-react';
import Link from 'next/link';
import { useAllUsers, useSearchGames } from '@/lib/useAppData';
import { exportToExcel } from '@/lib/exportToExcel';

interface Game {
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

export default function GamesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [allFetchedGames, setAllFetchedGames] = useState<Game[]>([]);
  const [pageSize] = useState(10);

  // Fetch players list
  const { data: usersData, isLoading: usersLoading } = useAllUsers();
  const users = (usersData?.users || []).map((user) => ({
    id: user.id,
    name: user.name || user.email || 'Unknown',
  }));

  // Fetch games based on current filters
  const { data: searchData, isLoading: gamesLoading } = useSearchGames(
    selectedPlayerId || undefined,
    startDate || undefined,
    endDate || undefined,
    pageSize,
    cursor || undefined,
    true
  );

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const games = searchData?.games || [];
  const hasMore = searchData?.hasMore || false;
  const nextCursor = searchData?.nextCursor || null;

  const handleSearch = () => {
    // Reset pagination
    setCursor(null);
    setAllFetchedGames([]);
  };

  const handleClearFilters = () => {
    setSelectedPlayerId('');
    setStartDate('');
    setEndDate('');
    setCursor(null);
    setAllFetchedGames([]);
    setShowAdvanced(false);
  };

  const handleLoadMore = () => {
    if (nextCursor) {
      setCursor(nextCursor);
      setAllFetchedGames([...allFetchedGames, ...games]);
    }
  };

  const handleExportToExcel = () => {
    const allGames = cursor ? [...allFetchedGames, ...games] : games;
    const filename = `partidas-${new Date().toISOString().split('T')[0]}.xlsx`;
    exportToExcel(allGames, filename);
  };

  const formatGameDate = (createdAt: any) => {
    if (!createdAt) return 'Data nao disponivel';

    if (createdAt instanceof Date && !Number.isNaN(createdAt.getTime())) {
      return createdAt.toLocaleDateString('pt-BR');
    }

    if (typeof createdAt === 'string' || typeof createdAt === 'number') {
      const parsed = new Date(createdAt);
      if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString('pt-BR');
    }

    if (typeof createdAt === 'object') {
      if (typeof createdAt.toDate === 'function') {
        const parsed = createdAt.toDate();
        if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) {
          return parsed.toLocaleDateString('pt-BR');
        }
      }

      const seconds = createdAt.seconds ?? createdAt._seconds;
      if (typeof seconds === 'number') {
        const parsed = new Date(seconds * 1000);
        if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString('pt-BR');
      }
    }

    return 'Data nao disponivel';
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const displayedGames = cursor ? allFetchedGames.concat(games) : games;
  const isSearching = selectedPlayerId || startDate || endDate;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Partidas
          </h1>
          <p className="text-gray-600 mt-1">
            {isSearching
              ? `${displayedGames.length} partida${displayedGames.length !== 1 ? 's' : ''} encontrada${displayedGames.length !== 1 ? 's' : ''}`
              : 'Buscar e consultar partidas por jogador ou período'}
          </p>
        </div>
        <Link href="/games/new">
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Nova Partida
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Basic Filter - Player Select */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Filtros</h3>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  {showAdvanced ? 'Ocultar' : 'Mostrar'} busca avançada
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Filtrar por jogador"
                  placeholder="Todos os jogadores"
                  value={selectedPlayerId}
                  onChange={setSelectedPlayerId}
                  options={users}
                  disabled={usersLoading}
                />
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvanced && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Busca por Período (Auditoria)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Inicial
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Final
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button size="sm" onClick={handleSearch} disabled={gamesLoading || usersLoading}>
                Buscar
              </Button>

              {isSearching && (
                <>
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    Limpar Filtros
                  </Button>
                  {displayedGames.length > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleExportToExcel}
                      disabled={gamesLoading}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Exportar Excel
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Games List */}
      {gamesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : displayedGames.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isSearching ? 'Nenhuma partida encontrada' : 'Nenhuma partida para exibir'}
            </h3>
            <p className="text-gray-500 mb-6">
              {isSearching
                ? 'Nenhuma partida encontrada com os filtros aplicados'
                : 'Use os filtros acima para buscar partidas'}
            </p>
            <Link href="/games/new">
              <Button>
                <Plus className="mr-2 h-5 w-5" />
                Nova Partida
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayedGames.map((game) => {
            const winner = game.finished
              ? (game.winnerTeam ?? (game.scoreA >= 100 ? 'A' : 'B'))
              : null;

            return (
              <Link key={game.id} href={`/games/${game.id}`} legacyBehavior>
                <a>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            game.finished
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {game.finished ? 'Finalizada' : 'Em Andamento'}
                          </span>
                          {game.lisa && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Award className="h-3 w-3 mr-1" />
                              Lisa
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatGameDate(game.createdAt)}
                        </span>
                      </div>

                      {/* Scores */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {winner === 'A' && (
                              <Trophy className="h-5 w-5 text-green-600 flex-shrink-0" />
                            )}
                            <span className={`text-sm font-medium truncate ${
                              winner === 'A' ? 'text-green-700' : 'text-gray-700'
                            }`}>
                              {game.teamA.map(p => p.name).join(' & ')}
                            </span>
                          </div>
                          <span className={`text-2xl font-bold ml-4 ${
                            winner === 'A' ? 'text-green-600' : 'text-gray-900'
                          }`}>
                            {game.scoreA}
                          </span>
                        </div>

                        <div className="h-px bg-gray-200"></div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {winner === 'B' && (
                              <Trophy className="h-5 w-5 text-green-600 flex-shrink-0" />
                            )}
                            <span className={`text-sm font-medium truncate ${
                              winner === 'B' ? 'text-green-700' : 'text-gray-700'
                            }`}>
                              {game.teamB.map(p => p.name).join(' & ')}
                            </span>
                          </div>
                          <span className={`text-2xl font-bold ml-4 ${
                            winner === 'B' ? 'text-green-600' : 'text-gray-900'
                          }`}>
                            {game.scoreB}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </a>
              </Link>
            );
          })}

          {/* Pagination */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleLoadMore}
                disabled={gamesLoading}
                variant="secondary"
              >
                {gamesLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  'Carregar Mais'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
