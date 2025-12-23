import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/button';
import { InputWithLabel } from '@/components/ui/input-with-label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Trophy, Award, Undo2 } from 'lucide-react';
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
  lisa: string[]; // Array de UUIDs dos jogadores que fizeram lisa, ou array vazio
  rounds: Round[];
  createdAt: any;
}

export default function GameDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddRoundTeamA, setShowAddRoundTeamA] = useState(false);
  const [showAddRoundTeamB, setShowAddRoundTeamB] = useState(false);
  const [opponentPoints, setOpponentPoints] = useState('');
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

  const handleAddRound = async (e: React.FormEvent, teamThatBatted: 'A' | 'B') => {
    e.preventDefault();
    setError('');

    const pointsNum = opponentPoints === '' ? 0 : parseInt(opponentPoints);

    if (opponentPoints === '') {
      setError('Digite sua pontuação');
      return;
    }

    if (isNaN(pointsNum)) {
      setError('Digite um valor numérico válido');
      return;
    }

    if (pointsNum < 0) {
      setError('Os pontos não podem ser negativos');
      return;
    }

    // Se Time A bateu, Time A recebe os pontos informados e Time B recebe 0
    // Se Time B bateu, Time B recebe os pontos informados e Time A recebe 0
    const teamA_points = teamThatBatted === 'A' ? pointsNum : 0;
    const teamB_points = teamThatBatted === 'B' ? pointsNum : 0;

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
      
      setOpponentPoints('');
      setShowAddRoundTeamA(false);
      setShowAddRoundTeamB(false);
      
      // Se a partida terminou em lisa, mostra animação
      // lisa é um array de UUIDs, só mostra se tiver elementos
      if (responseData.game?.finished && Array.isArray(responseData.game?.lisa) && responseData.game.lisa.length > 0) {
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

  const handleCancelRound = () => {
    setShowAddRoundTeamA(false);
    setShowAddRoundTeamB(false);
    setOpponentPoints('');
    setError('');
  };

  const handleUndoLastRound = async () => {
    if (!game || !game.rounds || game.rounds.length === 0) {
      return;
    }

    if (!confirm('Tem certeza que deseja desfazer a última rodada?')) {
      return;
    }

    setAdding(true);
    setError('');
    try {
      const response = await fetch(`/api/games/${id}/rounds`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao desfazer rodada');
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

  const winner = game.finished
    ? game.scoreA >= 100
      ? 'A'
      : 'B'
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
              {Array.isArray(game.lisa) && game.lisa.length > 0 && (
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Time A</h3>
              <div className="space-y-1 mb-4">
                {game.teamA.map((player) => (
                  <p key={player.id} className="text-sm text-gray-600">
                    {player.name}
                  </p>
                ))}
              </div>
              <div className="text-5xl font-bold text-primary-600">
                {game.scoreA}
              </div>
              {winner === 'A' && (
                <div className="mt-3">
                  <Trophy className="h-8 w-8 text-green-600 mx-auto" />
                </div>
              )}
              {!game.finished && (
                <div className="mt-4">
                  {!showAddRoundTeamA ? (
                    <Button
                      className="w-full"
                      onClick={() => {
                        setShowAddRoundTeamA(true);
                        setShowAddRoundTeamB(false);
                        setError('');
                      }}
                    >
                      Bateu!
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <InputWithLabel
                        label="Sua pontuação (Time A)"
                        type="number"
                        min="0"
                        value={opponentPoints}
                        onChange={(e) => setOpponentPoints(e.target.value)}
                        placeholder="0"
                        autoFocus
                      />
                      {error && (
                        <p className="text-sm text-red-600">{error}</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          size="sm"
                          onClick={(e) => handleAddRound(e, 'A')}
                          disabled={adding}
                        >
                          {adding ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            'Salvar'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelRound}
                          disabled={adding}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={winner === 'B' ? 'ring-2 ring-green-500' : ''}>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Time B</h3>
              <div className="space-y-1 mb-4">
                {game.teamB.map((player) => (
                  <p key={player.id} className="text-sm text-gray-600">
                    {player.name}
                  </p>
                ))}
              </div>
              <div className="text-5xl font-bold text-primary-600">
                {game.scoreB}
              </div>
              {winner === 'B' && (
                <div className="mt-3">
                  <Trophy className="h-8 w-8 text-green-600 mx-auto" />
                </div>
              )}
              {!game.finished && (
                <div className="mt-4">
                  {!showAddRoundTeamB ? (
                    <Button
                      className="w-full"
                      onClick={() => {
                        setShowAddRoundTeamB(true);
                        setShowAddRoundTeamA(false);
                        setError('');
                      }}
                    >
                      Bateu!
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <InputWithLabel
                        label="Sua pontuação (Time B)"
                        type="number"
                        min="0"
                        value={opponentPoints}
                        onChange={(e) => setOpponentPoints(e.target.value)}
                        placeholder="0"
                        autoFocus
                      />
                      {error && (
                        <p className="text-sm text-red-600">{error}</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          size="sm"
                          onClick={(e) => handleAddRound(e, 'B')}
                          disabled={adding}
                        >
                          {adding ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            'Salvar'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelRound}
                          disabled={adding}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Histórico de Rodadas */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Rodadas</CardTitle>
        </CardHeader>
        <CardContent>
          {game.rounds && game.rounds.length > 0 ? (
            <div className="space-y-3">
              {[...game.rounds].reverse().map((round, index) => {
                const roundNumber = game.rounds.length - index;
                const isLastRound = index === 0; // Primeiro item do array invertido é a última rodada
                return (
                  <div
                    key={round.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-500 w-16">
                        Rodada {roundNumber}
                      </span>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Time A</p>
                          <p className="text-lg font-bold text-gray-900">
                            {round.teamA_points}
                          </p>
                        </div>
                        <span className="text-gray-400">×</span>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Time B</p>
                          <p className="text-lg font-bold text-gray-900">
                            {round.teamB_points}
                          </p>
                        </div>
                      </div>
                    </div>
                    {isLastRound && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleUndoLastRound}
                        disabled={adding}
                        className="h-7 px-2 text-xs"
                        title="Desfazer última rodada"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
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
