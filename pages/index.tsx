import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trophy, TrendingUp, Users, Loader2, Target, Flame, Frown } from 'lucide-react';
import Link from 'next/link';

interface Game {
  id: string;
  teamA: { id: string; name: string }[];
  teamB: { id: string; name: string }[];
  scoreA: number;
  scoreB: number;
  status: 'active' | 'finished';
  finished: boolean;
  lisa: string[]; // Array de UUIDs dos jogadores que fizeram lisa, ou array vazio
  createdAt: any;
}

interface UserStats {
  victories: number;
  defeats: number;
  lisasApplied: number;
  lisasTaken: number;
  totalGames: number;
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchGames();
      fetchUserStats();
    }
  }, [user, loading, router]);

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/games');
      if (response.ok) {
        const data = await response.json();
        setGames(data.games || []);
      }
    } catch (error) {
      console.error('Erro ao carregar partidas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/stats/me');
      if (response.ok) {
        const data = await response.json();
        setUserStats(data.stats);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const activeGames = games.filter(g => !g.finished);
  const finishedGames = games.filter(g => g.finished);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Bem-vindo{user?.name ? `, ${user.name}` : ''}!
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie suas partidas de dominó
          </p>
        </div>
        <Link href="/games/new">
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Nova Partida
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                <Trophy className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">Vitórias</p>
              <p className="text-2xl font-bold text-gray-900">{userStats?.victories || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-3">
                <Target className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">Derrotas</p>
              <p className="text-2xl font-bold text-gray-900">{userStats?.defeats || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-3">
                <Flame className="h-6 w-6 text-yellow-600" />
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">Lisas Aplicadas</p>
              <p className="text-2xl font-bold text-gray-900">{userStats?.lisasApplied || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                <Frown className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">Lisas Levadas</p>
              <p className="text-2xl font-bold text-gray-900">{userStats?.lisasTaken || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-3">
                <Trophy className="h-6 w-6 text-primary-600" />
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total de Partidas</p>
              <p className="text-2xl font-bold text-gray-900">{games.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">Em Andamento</p>
              <p className="text-2xl font-bold text-gray-900">{activeGames.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Games */}
      {activeGames.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Partidas em Andamento
          </h2>
          <div className="grid gap-4">
            {activeGames.map((game) => (
              <Link key={game.id} href={`/games/${game.id}`} legacyBehavior>
                <a>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">
                              {game.teamA.map(p => p.name).join(' & ')}
                            </span>
                          </div>
                          <span className="text-2xl font-bold text-primary-600">
                            {game.scoreA}
                          </span>
                        </div>
                        
                        <div className="h-px bg-gray-200 my-2"></div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">
                              {game.teamB.map(p => p.name).join(' & ')}
                            </span>
                          </div>
                          <span className="text-2xl font-bold text-primary-600">
                            {game.scoreB}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </a>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Finished Games */}
      {finishedGames.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Partidas Recentes
            </h2>
            <Link href="/games">
              <Button variant="ghost" size="sm">
                Ver todas
              </Button>
            </Link>
          </div>
          <div className="grid gap-4">
            {finishedGames.slice(0, 5).map((game) => (
              <Link key={game.id} href={`/games/${game.id}`} legacyBehavior>
                <a>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            {game.teamA.map(p => p.name).join(' & ')}
                          </span>
                          <span className={`text-xl font-bold ${game.scoreA >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                            {game.scoreA}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            {game.teamB.map(p => p.name).join(' & ')}
                          </span>
                          <span className={`text-xl font-bold ${game.scoreB >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                            {game.scoreB}
                          </span>
                        </div>
                        {Array.isArray(game.lisa) && game.lisa.length > 0 && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Lisa
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </a>
              </Link>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      )}

      {!isLoading && games.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma partida encontrada
            </h3>
            <p className="text-gray-500 mb-6">
              Comece criando sua primeira partida de dominó
            </p>
            <Link href="/games/new">
              <Button>
                <Plus className="mr-2 h-5 w-5" />
                Criar Primeira Partida
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
