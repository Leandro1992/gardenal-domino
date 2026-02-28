import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Loader2, Trophy, Medal, Target, Flame, Frown, TrendingUp } from 'lucide-react';

interface PlayerStats {
  id: string;
  name: string;
  victories: number;
  defeats: number;
  lisasApplied: number;
  lisasTaken: number;
  totalGames: number;
  score: number;
}

export default function RankingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ranking, setRanking] = useState<PlayerStats[]>([]);
  const [lisaRanking, setLisaRanking] = useState<PlayerStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchRanking();
    }
  }, [user, loading, router]);

  const fetchRanking = async () => {
    try {
      const [generalResponse, lisaResponse] = await Promise.all([
        fetch('/api/stats/ranking'),
        fetch('/api/stats/ranking?mode=lisa'),
      ]);

      if (generalResponse.ok) {
        const data = await generalResponse.json();
        setRanking(data.ranking || []);
      }

      if (lisaResponse.ok) {
        const data = await lisaResponse.json();
        setLisaRanking(data.ranking || []);
      }
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return null;
    }
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-yellow-50 border-yellow-200';
      case 2:
        return 'bg-gray-50 border-gray-200';
      case 3:
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Ranking Geral
        </h1>
        <p className="text-gray-600 mt-1">
          Classificação de todos os jogadores
        </p>
      </div>

      {/* Legenda do Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Como funciona o Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-green-600" />
              <span>Vitória: <strong>+1</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-yellow-600" />
              <span>Lisa Aplicada: <strong>+2</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-red-600" />
              <span>Derrota: <strong>-1</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Frown className="h-4 w-4 text-purple-600" />
              <span>Lisa Tomada: <strong>-2</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ranking */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Ranking Geral */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900">Ranking Geral</h2>
            {ranking.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Trophy className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">Ainda não há partidas finalizadas</p>
                </CardContent>
              </Card>
            ) : (
              ranking.map((player, index) => {
                const position = index + 1;
                const isCurrentUser = player.id === user.id;
                return (
                  <Card
                    key={`general-${player.id}`}
                    className={`${getPositionColor(position)} ${isCurrentUser ? 'ring-2 ring-primary-500' : ''} transition-shadow hover:shadow-md`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
                          {getMedalIcon(position) || (
                            <div className="text-2xl font-bold text-gray-600">{position}</div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">{player.name}</h3>
                            {isCurrentUser && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                                Você
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 overflow-x-auto pb-1">
                            <span className="whitespace-nowrap flex items-center gap-1">
                              <Flame className="h-3 w-3 text-yellow-600" />
                              <strong className="text-yellow-700">{player.lisasApplied}</strong>
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="whitespace-nowrap flex items-center gap-1">
                              <Frown className="h-3 w-3 text-purple-600" />
                              <strong className="text-purple-700">{player.lisasTaken}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="text-sm text-gray-500 mb-1">Score</div>
                          <div className={`text-3xl font-bold ${
                            player.score > 0 
                              ? 'text-green-600' 
                              : player.score < 0 
                              ? 'text-red-600' 
                              : 'text-gray-600'
                          }`}>
                            {player.score > 0 ? '+' : ''}{player.score}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Ranking de Lisas */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900">Ranking de Lisas</h2>
            {lisaRanking.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Flame className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">Ainda não há partidas com lisa</p>
                </CardContent>
              </Card>
            ) : (
              lisaRanking.map((player, index) => {
                const position = index + 1;
                const isCurrentUser = player.id === user.id;
                const lisaScore = player.lisasApplied - player.lisasTaken;

                return (
                  <Card
                    key={`lisa-${player.id}`}
                    className={`${getPositionColor(position)} ${isCurrentUser ? 'ring-2 ring-primary-500' : ''} transition-shadow hover:shadow-md`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
                          {getMedalIcon(position) || (
                            <div className="text-2xl font-bold text-gray-600">{position}</div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">{player.name}</h3>
                            {isCurrentUser && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                                Você
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 overflow-x-auto pb-1">
                            <span className="whitespace-nowrap flex items-center gap-1">
                              <Flame className="h-3 w-3 text-yellow-600" />
                              <strong className="text-yellow-700">{player.lisasApplied}</strong>
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="whitespace-nowrap flex items-center gap-1">
                              <Frown className="h-3 w-3 text-purple-600" />
                              <strong className="text-purple-700">{player.lisasTaken}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="text-sm text-gray-500 mb-1">Saldo Lisa</div>
                          <div className={`text-3xl font-bold ${
                            lisaScore > 0 
                              ? 'text-green-600' 
                              : lisaScore < 0 
                              ? 'text-red-600' 
                              : 'text-gray-600'
                          }`}>
                            {lisaScore > 0 ? '+' : ''}{lisaScore}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
