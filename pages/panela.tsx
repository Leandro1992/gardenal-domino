import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Loader2, Users } from 'lucide-react';
import { usePanelaData } from '@/lib/useAppData';

export default function PanelaPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { data, isLoading } = usePanelaData();
  const [search, setSearch] = useState('');

  if (!loading && !user) {
    router.push('/login');
    return null;
  }

  const pairs = data?.pairs || [];
  const filteredPairs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return pairs;

    return pairs.filter((pair) => {
      const pairName = `${pair.player1Name} ${pair.player2Name}`.toLowerCase();
      return pairName.includes(query);
    });
  }, [pairs, search]);

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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Panela</h1>
        <p className="text-gray-600 mt-1">
          Frequência de duplas que jogaram juntas em partidas finalizadas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            label="Filtrar por nome"
            placeholder="Digite parte do nome de um jogador"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Duplas Mais Frequentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : filteredPairs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              {pairs.length === 0
                ? 'Ainda não há duplas suficientes para análise.'
                : 'Nenhuma dupla encontrada para o filtro informado.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Dupla</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Frequência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPairs.map((pair, index) => (
                    <tr key={pair.pairKey} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">{index + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {pair.player1Name} + {pair.player2Name}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {pair.gamesTogether}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
