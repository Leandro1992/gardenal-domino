import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Loader2, Trophy, Medal, Flame, Frown } from 'lucide-react';

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

export default function Ranking2Page() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ranking, setRanking] = useState<PlayerStats[]>([]);
  const [search, setSearch] = useState('');
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
      const response = await fetch('/api/stats/ranking?mode=lisa-defeat-only');
      if (response.ok) {
        const data = await response.json();
        setRanking(data.ranking || []);
      }
    } catch (error) {
      console.error('Erro ao carregar Ranking 2:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRanking = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return ranking;

    return ranking.filter((player) => player.name.toLowerCase().includes(query));
  }, [ranking, search]);

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

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Ranking 2</h1>
        <p className="text-gray-600 mt-1">
          Derrotas comuns nao descontam. Apenas derrotas com lisa reduzem o score.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtro</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            label="Filtrar por nome"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Digite o nome do jogador"
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-xl font-bold text-gray-900">Classificacao</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : filteredRanking.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">
                {ranking.length === 0
                  ? 'Ainda nao ha partidas finalizadas'
                  : 'Nenhum jogador encontrado para o filtro informado'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRanking.map((player, index) => {
            const position = index + 1;
            const isCurrentUser = player.id === user.id;

            return (
              <Card
                key={player.id}
                className={`${getPositionColor(position)} ${
                  isCurrentUser ? 'ring-2 ring-primary-500' : ''
                } transition-shadow hover:shadow-md`}
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
                            Voce
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 text-sm text-gray-600">
                        <div className="flex items-center gap-4 flex-wrap">
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
                        <div className="flex items-center gap-4 flex-wrap text-gray-700">
                          <span className="whitespace-nowrap">
                            Partidas: <strong>{player.totalGames}</strong>
                          </span>
                          <span className="whitespace-nowrap text-green-700">
                            Vitorias: <strong>{player.victories}</strong>
                          </span>
                          <span className="whitespace-nowrap text-red-700">
                            Derrotas: <strong>{player.defeats}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-sm text-gray-500 mb-1">Score</div>
                      <div
                        className={`text-3xl font-bold ${
                          player.score > 0
                            ? 'text-green-600'
                            : player.score < 0
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {player.score > 0 ? '+' : ''}
                        {player.score}
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
  );
}
