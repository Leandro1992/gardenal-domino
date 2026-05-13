import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Plus, Trophy, TrendingUp, Loader2, Target, Flame, Frown } from 'lucide-react';
import Link from 'next/link';
import { useDashboardSummary } from '@/lib/useAppData';

interface Game {
  id: string;
  teamA: { id: string; name: string }[];
  teamB: { id: string; name: string }[];
  scoreA: number;
  scoreB: number;
  status: 'active' | 'finished';
  finished: boolean;
  winnerTeam?: 'A' | 'B';
  lisa: boolean;
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
  const { data, isLoading } = useDashboardSummary(12);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const activeGames = data?.activeGames || [];
  const totalGamesCount = typeof data?.totalGames === 'number' ? data.totalGames : activeGames.length;
  const activeGamesCount = typeof data?.activeGamesCount === 'number' ? data.activeGamesCount : activeGames.length;
  const userStats: UserStats | null = data?.userStats || null;

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
              <p className="text-sm font-medium text-gray-500 mb-1">Lisas Sofridas</p>
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
              <p className="text-2xl font-bold text-gray-900">{totalGamesCount}</p>
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
              <p className="text-2xl font-bold text-gray-900">{activeGamesCount}</p>
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

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      )}

      {!isLoading && activeGames.length === 0 && (
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
