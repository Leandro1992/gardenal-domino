import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { Loader2, Trophy, Plus, Filter, Award, Search, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Game {
  id: string;
  teamA: { id: string; name: string }[];
  teamB: { id: string; name: string }[];
  scoreA: number;
  scoreB: number;
  finished: boolean;
  lisa: boolean;
  createdAt: any;
}

export default function GamesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'finished'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchGames();
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

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const filteredGames = games.filter((game) => {
    // Filter by status
    if (filter === 'active' && game.finished) return false;
    if (filter === 'finished' && !game.finished) return false;
    
    // Filter by search query (player names)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const allPlayers = [...game.teamA, ...game.teamB];
      const hasMatchingPlayer = allPlayers.some(player => 
        player.name.toLowerCase().includes(query)
      );
      if (!hasMatchingPlayer) return false;
    }
    
    // Filter by date
    if (dateFilter) {
      const gameDate = new Date(game.createdAt?.seconds * 1000 || Date.now());
      const filterDate = new Date(dateFilter);
      if (gameDate.toDateString() !== filterDate.toDateString()) return false;
    }
    
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Todas as Partidas
          </h1>
          <p className="text-gray-600 mt-1">
            {filteredGames.length} partida{filteredGames.length !== 1 ? 's' : ''} encontrada{filteredGames.length !== 1 ? 's' : ''}
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
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={filter === 'all' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Todas
              </Button>
              <Button
                variant={filter === 'active' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilter('active')}
              >
                Em Andamento
              </Button>
              <Button
                variant={filter === 'finished' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilter('finished')}
              >
                Finalizadas
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome do jogador..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {(searchQuery || dateFilter) && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setDateFilter('');
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Games List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : filteredGames.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma partida encontrada
            </h3>
            <p className="text-gray-500 mb-6">
              {filter === 'all'
                ? 'Comece criando sua primeira partida'
                : filter === 'active'
                ? 'Não há partidas em andamento no momento'
                : 'Não há partidas finalizadas ainda'}
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
        <div className="grid gap-4">
          {filteredGames.map((game) => {
            // O vencedor é quem NÃO atingiu 100 pontos (adversário perdeu ao chegar a 100)
            const winner = game.finished
              ? game.scoreA >= 100
                ? 'B'  // Time A chegou a 100, então Time B venceu
                : 'A'  // Time B chegou a 100, então Time A venceu
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
                          {new Date(game.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString('pt-BR')}
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
        </div>
      )}
    </div>
  );
}
