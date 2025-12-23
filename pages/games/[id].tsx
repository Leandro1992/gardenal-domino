import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Loader2, ArrowLeft, Plus, Trophy, Award } from 'lucide-react';
import Link from 'next/link';

interface Player {
  id: string;
  name: string;
}

interface Round {
  id: string;
  teamA_points: number;
  teamB_points: number;
  createdAt: any;
}

interface Game {
  id: string;
  teamA: Player[];
  teamB: Player[];
  scoreA: number;
  scoreB: number;
  finished: boolean;
  lisa: boolean;
  rounds: Round[];
  createdAt: any;
}

export default function GameDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddRound, setShowAddRound] = useState(false);
  const [pointsA, setPointsA] = useState('');
  const [pointsB, setPointsB] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [showLisaAnimation, setShowLisaAnimation] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user && id) {
      fetchGame();
    }
  }, [user, loading, id, router]);

  const fetchGame = async () => {
    try {
      const response = await fetch(`/api/games/${id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Game data received:', data);
        setGame(data); // A API retorna o objeto diretamente, não encapsulado em 'game'
        
        // Fetch rounds
        const roundsResponse = await fetch(`/api/games/${id}/rounds`);
        if (roundsResponse.ok) {
          const roundsData = await roundsResponse.json();
          console.log('Rounds data received:', roundsData);
          setGame(prev => prev ? { ...prev, rounds: roundsData.rounds || [] } : null);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar partida:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRound = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Considera valores vazios como zero
    const teamA_points = pointsA === '' ? 0 : parseInt(pointsA);
    const teamB_points = pointsB === '' ? 0 : parseInt(pointsB);

    // Valida se pelo menos um campo foi preenchido
    if (pointsA === '' && pointsB === '') {
      setError('Pelo menos um time deve ter pontuação');
      return;
    }

    if (isNaN(teamA_points) || isNaN(teamB_points)) {
      setError('Digite valores numéricos válidos');
      return;
    }

    if (teamA_points < 0 || teamB_points < 0) {
      setError('Os pontos não podem ser negativos');
      return;
    }

    setAdding(true);
    try {
      const response = await fetch(`/api/games/${id}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamA_points, teamB_points }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao adicionar rodada');
      }

      const responseData = await response.json();
      
      setPointsA('');
      setPointsB('');
      setShowAddRound(false);
      
      // Se a partida terminou em lisa, mostra animação
      if (responseData.game?.finished && responseData.game?.lisa) {
        setShowLisaAnimation(true);
        setTimeout(() => setShowLisaAnimation(false), 5000);
      }
      
      await fetchGame();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  if (loading || !user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Partida não encontrada</p>
            <Link href="/">
              <Button className="mt-4">Voltar</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // O vencedor é quem NÃO atingiu 100 pontos (adversário perdeu ao chegar a 100)
  const winner = game.finished
    ? game.scoreA >= 100
      ? 'B'  // Time A chegou a 100, então Time B venceu
      : 'A'  // Time B chegou a 100, então Time A venceu
    : null;

  return (
    <>
      {/* Animação de Lisa */}
      {showLisaAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 animate-fade-in">
          <div className="text-center animate-bounce">
            <div className="mb-6">
              <Image 
                src="/ivo.jpeg" 
                alt="Lisa!" 
                width={300} 
                height={300}
                className="mx-auto rounded-full shadow-2xl"
                priority
              />
            </div>
            <h2 className="text-6xl font-bold text-white mb-4 animate-pulse">
              LISAAAA! 🎉
            </h2>
            <p className="text-2xl text-white">
              Vitória Impecável!
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {game.finished ? 'Partida Finalizada' : 'Partida em Andamento'}
          </h1>
          <p className="text-gray-600 mt-1">
            {new Date(game.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      {game.finished && (
        <div className="rounded-lg bg-green-50 border-2 border-green-200 p-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">
                Time {winner} Venceu!
              </p>
              {game.lisa && (
                <p className="text-sm text-green-700 flex items-center gap-1 mt-1">
                  <Award className="h-4 w-4" />
                  Vitória Lisa (adversário com 0 pontos)
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Placar */}
      <div className="grid grid-cols-2 gap-4">
        <Card className={winner === 'A' ? 'ring-2 ring-green-500' : ''}>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {game.teamA.map(p => p.name).join(' & ')}
              </h3>
              <div className="text-5xl font-bold text-primary-600">
                {game.scoreA}
              </div>
              {winner === 'A' && (
                <div className="mt-3">
                  <Trophy className="h-8 w-8 text-green-600 mx-auto" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={winner === 'B' ? 'ring-2 ring-green-500' : ''}>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {game.teamB.map(p => p.name).join(' & ')}
              </h3>
              <div className="text-5xl font-bold text-primary-600">
                {game.scoreB}
              </div>
              {winner === 'B' && (
                <div className="mt-3">
                  <Trophy className="h-8 w-8 text-green-600 mx-auto" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {!game.finished && (
        <>
          {!showAddRound ? (
            <Button fullWidth size="lg" onClick={() => setShowAddRound(true)}>
              <Plus className="mr-2 h-5 w-5" />
              Adicionar Rodada
            </Button>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Nova Rodada</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddRound} className="space-y-4">
                  {error && (
                    <div className="rounded-lg bg-red-50 p-4">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  <Input
                    label={`Pontos ${game.teamA.map(p => p.name).join(' & ')}`}
                    type="number"
                    min="0"
                    value={pointsA}
                    onChange={(e) => setPointsA(e.target.value)}
                    placeholder="0"
                  />

                  <Input
                    label={`Pontos ${game.teamB.map(p => p.name).join(' & ')}`}
                    type="number"
                    min="0"
                    value={pointsB}
                    onChange={(e) => setPointsB(e.target.value)}
                    placeholder="0"
                  />

                  <div className="flex gap-3">
                    <Button type="submit" fullWidth disabled={adding}>
                      {adding ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar Rodada'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      fullWidth
                      onClick={() => {
                        setShowAddRound(false);
                        setError('');
                        setPointsA('');
                        setPointsB('');
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Histórico de Rodadas */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Rodadas</CardTitle>
        </CardHeader>
        <CardContent>
          {game.rounds && game.rounds.length > 0 ? (
            <div className="space-y-3">
              {game.rounds.map((round, index) => (
                <div
                  key={round.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-500 w-16">
                      Rodada {index + 1}
                    </span>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">
                          {game.teamA.map(p => p.name).join(' & ')}
                        </p>
                        <p className="text-lg font-bold text-gray-900">
                          {round.teamA_points}
                        </p>
                      </div>
                      <span className="text-gray-400">×</span>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">
                          {game.teamB.map(p => p.name).join(' & ')}
                        </p>
                        <p className="text-lg font-bold text-gray-900">
                          {round.teamB_points}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-6">
              Nenhuma rodada registrada ainda
            </p>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  );
}
