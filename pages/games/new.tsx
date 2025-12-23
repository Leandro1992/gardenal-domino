import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Loader2, Users as UsersIcon, ArrowLeft } from 'lucide-react';
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
  
  const [teamA, setTeamA] = useState<string[]>([]);
  const [teamB, setTeamB] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchUsers();
    }
  }, [user, loading, router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao criar partida');
      }

      const data = await response.json();
      router.push(`/games/${data.game.id}`);
    } catch (err: any) {
      setError(err.message);
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
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => {
                const inTeamA = teamA.includes(u.id);
                const inTeamB = teamB.includes(u.id);
                const selected = inTeamA || inTeamB;

                return (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                      selected
                        ? inTeamA
                          ? 'border-primary-300 bg-primary-50'
                          : 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <span className="font-medium text-gray-900">{u.name}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={inTeamA ? 'primary' : 'secondary'}
                        onClick={() => handleTogglePlayer(u.id, 'A')}
                        disabled={teamA.length >= 2 && !inTeamA}
                      >
                        {inTeamA ? '✓ Time A' : 'Time A'}
                      </Button>
                      <Button
                        size="sm"
                        variant={inTeamB ? 'primary' : 'secondary'}
                        onClick={() => handleTogglePlayer(u.id, 'B')}
                        disabled={teamB.length >= 2 && !inTeamB}
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
