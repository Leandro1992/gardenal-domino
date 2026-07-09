import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BookOpenText, CalendarDays, Trophy, SlidersHorizontal, AlertTriangle, Flag } from 'lucide-react';

export default function AdminManualPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== 'admin') return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manual do Administrador</h1>
        <p className="text-gray-600 mt-1">Guia operacional do modo campeonato e rotinas de administração</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpenText className="h-5 w-5" />
            Modo campeonato (resumo rapido)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <p><strong>Objetivo:</strong> disputar o ciclo mensal com ranking parcial e medalhas no fechamento.</p>
          <p><strong>Pontuacao:</strong> vitoria +1, derrota -1, lisa aplicada +2, lisa tomada -2.</p>
          <p><strong>Fechamento:</strong> manual, gera medalhas dos elegiveis (ouro 4, prata 3, bronze 2, participacao 1).</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Limitacoes e regras do modo campeonato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p><strong>1.</strong> Somente <strong>1 ciclo aberto</strong> por vez.</p>
          <p><strong>2.</strong> Jogador nao pode estar em mais de uma partida ativa.</p>
          <p><strong>3.</strong> Repeticao de dupla no ciclo respeita o limite configurado.</p>
          <p><strong>4.</strong> Ranking mensal exige minimo de jogos para elegibilidade.</p>
          <p><strong>5.</strong> Fechamento do ciclo e irreversivel e pode exigir desempate manual.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Parâmetros do sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <p><strong>Mínimo de jogos para ranking mensal:</strong> define elegibilidade para receber medalhas no ciclo.</p>
          <p><strong>Máximo de jogos com mesmo parceiro:</strong> limita repetições de dupla no ciclo para forçar rotação.</p>
          <p>Qualquer alteração vale para novas validações do campeonato.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Gestão de ciclos (abertura e fechamento)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <p>Abra apenas <strong>um ciclo por vez</strong>.</p>
          <p>Ao fechar ciclo, o sistema calcula ranking final dos elegíveis e distribui medalhas:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>1º Ouro (peso 4)</li>
            <li>2º Prata (peso 3)</li>
            <li>3º Bronze (peso 2)</li>
            <li>Demais elegíveis Participação (peso 1)</li>
          </ul>
          <p>Fechamento é manual e irreversível.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leitura dos rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <p><strong>Mensal:</strong> mostra elegíveis e não elegíveis no ciclo atual.</p>
          <p><strong>Anual:</strong> consolida pontuação por medalhas ponderadas.</p>
          <p><strong>Geral:</strong> mantém o ranking histórico do modo livre.</p>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            Cuidados operacionais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-amber-800">
          <p>Feche o ciclo somente após conferência do ranking parcial.</p>
          <p>A limpeza de jogos do modo livre é irreversível e não afeta o modo campeonato.</p>
          <p>Mantenha os índices do Firestore criados para evitar lentidão e erros de consulta.</p>
        </CardContent>
      </Card>
    </div>
  );
}
