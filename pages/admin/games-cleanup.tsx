import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Loader2, Trash2, CheckSquare, Square, Calendar, Trophy, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface Game {
  id: string;
  mode: 'free' | 'championship';
  teamA: { id: string; name: string }[];
  teamB: { id: string; name: string }[];
  scoreA: number;
  scoreB: number;
  finished: boolean;
  createdAt: any;
}

export default function GamesCleanupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'free' | 'championship'>('free');
  const [deleting, setDeleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/');
    } else if (user) {
      fetchGames();
    }
  }, [user, loading, router, mode]);

  const fetchGames = async () => {
    setIsLoading(true);
    try {
      const endpoint = mode === 'championship' ? '/api/championship-games' : '/api/games';
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        const loadedGames = (data.games || []).map((g: any) => ({
          ...g,
          mode: mode,
        }));
        setGames(loadedGames);
      }
    } catch (error) {
      console.error('Erro ao carregar partidas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelect = (gameId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(gameId)) {
      newSelected.delete(gameId);
    } else {
      newSelected.add(gameId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === games.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(games.map((g) => g.id)));
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;

    setDeleting(true);
    try {
      const response = await fetch('/api/admin/games-cleanup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameIds: Array.from(selectedIds),
          mode,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao deletar partidas');
      }

      setSelectedIds(new Set());
      setShowConfirmModal(false);
      await fetchGames();
    } catch (error: any) {
      alert(error.message || 'Erro ao deletar partidas');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (createdAt: any) => {
    if (!createdAt) return 'Data não disponível';
    const seconds = createdAt.seconds ?? createdAt._seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000).toLocaleDateString('pt-BR');
    }
    return 'Data não disponível';
  };

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const allSelected = games.length > 0 && selectedIds.size === games.length;

  return (
    <>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Limpeza de Partidas</h1>
          <p className="text-gray-600 mt-1">Remover partidas antigas em lote</p>
        </div>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <strong>Atenção:</strong> A remoção de partidas é irreversível. Os rankings serão
                recalculados automaticamente após a exclusão.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Modo da Partida"
              value={mode}
              onChange={(value) => {
                setMode(value as 'free' | 'championship');
                setSelectedIds(new Set());
              }}
              options={[
                { id: 'free', name: 'Modo Livre' },
                { id: 'championship', name: 'Modo Campeonato' },
              ]}
            />
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {games.length} partida{games.length !== 1 ? 's' : ''} encontrada
                    {games.length !== 1 ? 's' : ''}
                  </CardTitle>
                  {games.length > 0 && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSelectAll}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                      >
                        {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        {allSelected ? 'Desmarcar todas' : 'Selecionar todas'}
                      </button>
                      <span className="text-sm text-gray-500">
                        {selectedIds.size} selecionada{selectedIds.size !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {games.length === 0 ? (
                  <div className="py-12 text-center">
                    <Trophy className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">Nenhuma partida encontrada</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {games.map((game) => {
                      const isSelected = selectedIds.has(game.id);
                      return (
                        <div
                          key={game.id}
                          onClick={() => handleToggleSelect(game.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex-shrink-0">
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-primary-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {game.teamA.map((p) => p.name).join(' & ')} vs{' '}
                                {game.teamB.map((p) => p.name).join(' & ')}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  game.finished
                                    ? 'bg-gray-100 text-gray-700'
                                    : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {game.finished ? 'Finalizada' : 'Em Andamento'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(game.createdAt)}
                              </span>
                              <span>Placar: {game.scoreA} x {game.scoreB}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedIds.size > 0 && (
              <div className="flex gap-3">
                <Button
                  fullWidth
                  variant="danger"
                  size="lg"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={deleting}
                >
                  <Trash2 className="mr-2 h-5 w-5" />
                  Deletar {selectedIds.size} Partida{selectedIds.size !== 1 ? 's' : ''}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Confirmação */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => !deleting && setShowConfirmModal(false)}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-semibold mb-2">Atenção: Esta ação é irreversível!</p>
                <p>
                  Você está prestes a deletar <strong>{selectedIds.size}</strong> partida
                  {selectedIds.size !== 1 ? 's' : ''} do modo{' '}
                  <strong>{mode === 'championship' ? 'Campeonato' : 'Livre'}</strong>.
                </p>
                <p className="mt-2">Os rankings serão recalculados automaticamente.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              fullWidth
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Deletando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-5 w-5" />
                  Confirmar Exclusão
                </>
              )}
            </Button>
            <Button fullWidth variant="secondary" onClick={() => setShowConfirmModal(false)} disabled={deleting}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
