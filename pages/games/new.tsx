import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Loader2, Users as UsersIcon, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
}

export default function NewGamePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [teamA, setTeamA] = useState<string[]>([]);
  const [teamB, setTeamB] = useState<string[]>([]);
  const [playersInActiveGames, setPlayersInActiveGames] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchUsers();
    }
  }, [user, loading, router]);

  const fetchUsers = async () => {
    try {
      // Buscar usuários e partidas ativas em paralelo
      const [usersResponse, gamesResponse] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/games')
      ]);
      
      if (usersResponse.ok) {
        const data = await usersResponse.json();
        setUsers(data.users || []);
        
        // Adicionar automaticamente o usuário logado no Time A (se não for admin criando para outros)
        if (user && !teamA.includes(user.id)) {
          setTeamA([user.id]);
        }
      }
      
      // Identificar jogadores em partidas ativas
      if (gamesResponse.ok) {
        const gamesData = await gamesResponse.json();
        const activeGames = (gamesData.games || []).filter((g: any) => !g.finished);
        const busyPlayers = new Set<string>();
        
        activeGames.forEach((game: any) => {
          (game.teamA || []).forEach((player: any) => {
            if (typeof player === 'string') {
              busyPlayers.add(player);
            } else if (player?.id) {
              busyPlayers.add(player.id);
            }
          });
          (game.teamB || []).forEach((player: any) => {
            if (typeof player === 'string') {
              busyPlayers.add(player);
            } else if (player?.id) {
              busyPlayers.add(player.id);
            }
          });
        });
        
        setPlayersInActiveGames(busyPlayers);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePlayer = (userId: string, team: 'A' | 'B') => {
    if (team === 'A') {
      if (teamA.includes(userId)) {
        setTeamA(teamA.filter(id => id !== userId));
      } else if (teamA.length < 2) {
        // Remove da equipe B se estiver lá
        setTeamB(teamB.filter(id => id !== userId));
        setTeamA([...teamA, userId]);
      }
    } else {
      if (teamB.includes(userId)) {
        setTeamB(teamB.filter(id => id !== userId));
      } else if (teamB.length < 2) {
        // Remove da equipe A se estiver lá
        setTeamA(teamA.filter(id => id !== userId));
        setTeamB([...teamB, userId]);
      }
    }
  };

  const handleCreateGame = async () => {
    setError('');
    
    if (teamA.length !== 2 || teamB.length !== 2) {
      setError('Cada time deve ter exatamente 2 jogadores');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamA, teamB }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Tratamento de erros específicos
        if (response.status === 400) {
          if (data.error?.includes('já estão em partidas ativas')) {
            setError(`⚠️ Não foi possível criar a partida: ${data.error}`);
          } else if (data.error?.includes('Players must be 4 distinct users')) {
            setError('Os 4 jogadores devem ser pessoas diferentes');
          } else if (data.error?.includes('All players must exist')) {
            setError('Todos os jogadores selecionados devem existir no sistema');
          } else {
            setError(data.error || 'Erro de validação ao criar partida');
          }
        } else if (response.status === 401) {
          setError('Você precisa estar autenticado para criar uma partida');
        } else {
          setError(data.error || 'Erro ao criar partida. Tente novamente.');
        }
        return;
      }

      router.push(`/games/${data.game.id}`);
    } catch (err: any) {
      console.error('Erro ao criar partida:', err);
      setError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setCreating(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const canCreate = teamA.length === 2 && teamB.length === 2;
  
  // Filtrar usuários pela busca
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Nova Partida
          </h1>
          <p className="text-gray-600 mt-1">
            Selecione 4 jogadores (2 por time)
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Team A */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Time A</CardTitle>
            <span className="text-sm font-medium text-gray-500">
              {teamA.length}/2 jogadores
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {teamA.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Selecione jogadores abaixo
            </p>
          ) : (
            <div className="space-y-2">
              {teamA.map(userId => {
                const u = users.find(user => user.id === userId);
                return u ? (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                    <span className="font-medium text-gray-900">{u.name}</span>
                    <button
                      onClick={() => handleTogglePlayer(u.id, 'A')}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remover
                    </button>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team B */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Time B</CardTitle>
            <span className="text-sm font-medium text-gray-500">
              {teamB.length}/2 jogadores
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {teamB.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Selecione jogadores abaixo
            </p>
          ) : (
            <div className="space-y-2">
              {teamB.map(userId => {
                const u = users.find(user => user.id === userId);
                return u ? (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium text-gray-900">{u.name}</span>
                    <button
                      onClick={() => handleTogglePlayer(u.id, 'B')}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remover
                    </button>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Players List */}
      <Card>
        <CardHeader>
          <CardTitle>Jogadores Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              Nenhum jogador encontrado
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredUsers.map((u) => {
                const inTeamA = teamA.includes(u.id);
                const inTeamB = teamB.includes(u.id);
                const selected = inTeamA || inTeamB;
                const isInActiveGame = playersInActiveGames.has(u.id);

                return (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                      isInActiveGame
                        ? 'border-gray-300 bg-gray-100 opacity-60'
                        : selected
                        ? inTeamA
                          ? 'border-primary-300 bg-primary-50'
                          : 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className={`font-medium ${
                        isInActiveGame ? 'text-gray-500' : 'text-gray-900'
                      }`}>
                        {u.name}
                      </span>
                      {isInActiveGame && (
                        <span className="text-xs text-gray-500 mt-0.5">
                          🎮 Em partida ativa
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={inTeamA ? 'primary' : 'secondary'}
                        onClick={() => handleTogglePlayer(u.id, 'A')}
                        disabled={isInActiveGame || (teamA.length >= 2 && !inTeamA)}
                      >
                        {inTeamA ? '✓ Time A' : 'Time A'}
                      </Button>
                      <Button
                        size="sm"
                        variant={inTeamB ? 'primary' : 'secondary'}
                        onClick={() => handleTogglePlayer(u.id, 'B')}
                        disabled={isInActiveGame || (teamB.length >= 2 && !inTeamB)}
                      >
                        {inTeamB ? '✓ Time B' : 'Time B'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          fullWidth
          size="lg"
          onClick={handleCreateGame}
          disabled={!canCreate || creating}
        >
          {creating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Criando...
            </>
          ) : (
            <>
              <UsersIcon className="mr-2 h-5 w-5" />
              Criar Partida
            </>
          )}
        </Button>
        <Link href="/">
          <Button fullWidth size="lg" variant="secondary">
            Cancelar
          </Button>
        </Link>
      </div>
    </div>
  );
}
