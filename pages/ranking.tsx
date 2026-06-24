import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Loader2, Trophy, Medal, Target, Flame, Frown, TrendingUp, Star, Calendar } from 'lucide-react';
import { useRankingGeneral, useRankingLisa } from '@/lib/useAppData';

type Tab = 'general' | 'monthly' | 'annual';

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

interface EligiblePlayer {
  userId: string;
  name: string;
  position: number;
  score: number;
  victories: number;
  defeats: number;
  totalGames: number;
  projectedMedal: string;
  projectedWeight: number;
}

interface IneligiblePlayer {
  userId: string;
  name: string;
  totalGames: number;
  gamesNeeded: number;
}

interface MonthlyCycle {
  id: string;
  year: number;
  month: number;
  status: string;
}

interface AnnualPlayer {
  userId: string;
  name: string;
  position: number;
  totalScore: number;
  gold: number;
  silver: number;
  bronze: number;
  participation: number;
  medals: { month: number; medal: string; weight: number }[];
}

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const MEDAL_COLORS: Record<string, string> = {
  gold: 'text-yellow-500',
  silver: 'text-gray-400',
  bronze: 'text-amber-600',
  participation: 'text-blue-400',
};

const MEDAL_LABELS: Record<string, string> = {
  gold: '🥇',
  silver: '🥈',
  bronze: '🥉',
  participation: '🎖️',
};

export default function RankingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('monthly');

  // General ranking
  const { data: generalData, isLoading: isGeneralLoading } = useRankingGeneral();
  const { data: lisaData, isLoading: isLisaLoading } = useRankingLisa();

  // Monthly championship ranking
  const [monthlyData, setMonthlyData] = useState<{
    eligible: EligiblePlayer[];
    ineligible: IneligiblePlayer[];
    cycle: MonthlyCycle | null;
    params: { minGamesForMonthlyRanking: number };
  } | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // Annual championship ranking
  const [annualData, setAnnualData] = useState<{ year: number; players: AnnualPlayer[] } | null>(null);
  const [annualLoading, setAnnualLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (activeTab === 'monthly' && !monthlyData && !monthlyLoading) {
      setMonthlyLoading(true);
      fetch('/api/championship-ranking?type=monthly')
        .then((r) => r.json())
        .then((d) => setMonthlyData(d))
        .finally(() => setMonthlyLoading(false));
    }
  }, [activeTab, monthlyData, monthlyLoading]);

  useEffect(() => {
    if (activeTab === 'annual') {
      setAnnualLoading(true);
      fetch(`/api/championship-ranking?type=annual&year=${selectedYear}`)
        .then((r) => r.json())
        .then((d) => setAnnualData(d))
        .finally(() => setAnnualLoading(false));
    }
  }, [activeTab, selectedYear]);

  const ranking = (generalData?.ranking || []) as PlayerStats[];
  const lisaRanking = (lisaData?.ranking || []) as PlayerStats[];
  const isLoading = isGeneralLoading || isLisaLoading;

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 1: return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2: return <Medal className="h-6 w-6 text-gray-400" />;
      case 3: return <Medal className="h-6 w-6 text-amber-600" />;
      default: return null;
    }
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1: return 'bg-yellow-50 border-yellow-200';
      case 2: return 'bg-gray-50 border-gray-200';
      case 3: return 'bg-amber-50 border-amber-200';
      default: return 'bg-white border-gray-200';
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'monthly', label: 'Mensal (Campeonato)' },
    { id: 'annual', label: 'Anual (Campeonato)' },
    { id: 'general', label: 'Geral (Modo Livre)' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Ranking</h1>
        <p className="text-gray-600 mt-1">Classificação dos jogadores</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab: Geral ─────────────────────────────────────────────────────── */}
      {activeTab === 'general' && (
        <>
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
                                Vitórias: <strong>{player.victories}</strong>
                              </span>
                              <span className="whitespace-nowrap text-red-700">
                                Derrotas: <strong>{player.defeats}</strong>
                              </span>
                            </div>
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
                                Vitórias: <strong>{player.victories}</strong>
                              </span>
                              <span className="whitespace-nowrap text-red-700">
                                Derrotas: <strong>{player.defeats}</strong>
                              </span>
                            </div>
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
        </>
      )}

      {/* ── Tab: Mensal ────────────────────────────────────────────────────── */}
      {activeTab === 'monthly' && (
        <div className="space-y-4">
          {monthlyLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : !monthlyData?.cycle ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">Nenhum ciclo de campeonato ativo.</p>
                <p className="text-sm text-gray-400 mt-1">Solicite ao administrador abrir um novo ciclo.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Cabeçalho do ciclo */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="font-semibold text-gray-900">
                        Ciclo: {MONTH_NAMES[(monthlyData.cycle.month || 1) - 1]} {monthlyData.cycle.year}
                      </p>
                      <p className="text-xs text-gray-500">
                        Mínimo de {monthlyData.params?.minGamesForMonthlyRanking} jogos para ser elegível
                        {' · '}Status: {monthlyData.cycle.status === 'open' ? 'Em andamento' : 'Encerrado'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Jogadores elegíveis */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">
                  Ranking parcial — Elegíveis ({monthlyData.eligible.length})
                </h2>
                {monthlyData.eligible.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-500">
                      Nenhum jogador atingiu o mínimo de jogos ainda.
                    </CardContent>
                  </Card>
                ) : (
                  monthlyData.eligible.map((p) => (
                    <Card
                      key={p.userId}
                      className={`mb-2 ${getPositionColor(p.position)} ${p.userId === user.id ? 'ring-2 ring-primary-500' : ''}`}
                    >
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                            {getMedalIcon(p.position) || <span className="text-xl font-bold text-gray-500">{p.position}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{p.name}</span>
                              {p.userId === user.id && (
                                <span className="text-xs bg-primary-100 text-primary-800 px-1.5 py-0.5 rounded">Você</span>
                              )}
                              <span className="text-lg ml-1">{MEDAL_LABELS[p.projectedMedal]}</span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {p.totalGames} jogos · {p.victories}V / {p.defeats}D
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs text-gray-400">Score</div>
                            <div className={`text-2xl font-bold ${p.score > 0 ? 'text-green-600' : p.score < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                              {p.score > 0 ? '+' : ''}{p.score}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Jogadores não-elegíveis */}
              {monthlyData.ineligible.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-500 mb-3">
                    Não elegíveis ainda ({monthlyData.ineligible.length})
                  </h2>
                  {monthlyData.ineligible.map((p) => (
                    <Card key={p.userId} className="mb-2 opacity-70">
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-700">{p.name}</span>
                            <span className="text-sm text-gray-500 ml-2">{p.totalGames} jogos</span>
                          </div>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            Faltam {p.gamesNeeded} jogo{p.gamesNeeded !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab: Anual ─────────────────────────────────────────────────────── */}
      {activeTab === 'annual' && (
        <div className="space-y-4">
          {/* Seletor de ano */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Ano:</span>
            {[new Date().getFullYear(), new Date().getFullYear() - 1].map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedYear === y
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          {annualLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : !annualData || annualData.players.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Star className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">Nenhuma medalha distribuída em {selectedYear} ainda.</p>
              </CardContent>
            </Card>
          ) : (
            annualData.players.map((p) => (
              <Card
                key={p.userId}
                className={`${getPositionColor(p.position)} ${p.userId === user.id ? 'ring-2 ring-primary-500' : ''}`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                      {getMedalIcon(p.position) || <span className="text-xl font-bold text-gray-500">{p.position}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{p.name}</span>
                        {p.userId === user.id && (
                          <span className="text-xs bg-primary-100 text-primary-800 px-1.5 py-0.5 rounded">Você</span>
                        )}
                      </div>
                      {/* Breakdown de medalhas por mês */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Array.from({ length: 12 }, (_, i) => {
                          const month = i + 1;
                          const medal = p.medals?.find((m) => m.month === month);
                          return medal ? (
                            <span
                              key={month}
                              title={`${MONTH_NAMES[i]}: ${medal.medal}`}
                              className="text-base"
                            >
                              {MEDAL_LABELS[medal.medal]}
                            </span>
                          ) : (
                            <span key={month} className="text-base opacity-20">·</span>
                          );
                        })}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        🥇 {p.gold} · 🥈 {p.silver} · 🥉 {p.bronze} · 🎖️ {p.participation}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-gray-400">Pontuação</div>
                      <div className="text-2xl font-bold text-primary-600">{p.totalScore}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
