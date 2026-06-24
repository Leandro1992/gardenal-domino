import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BookOpenText, CalendarDays, Trophy, SlidersHorizontal, AlertTriangle } from 'lucide-react';

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
            Fluxo recomendado do campeonato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p><strong>1.</strong> Acesse <strong>Parâmetros</strong> e confira mínimo de jogos e limite de repetição de dupla.</p>
          <p><strong>2.</strong> Acesse <strong>Ciclos</strong> e abra o ciclo mensal atual.</p>
          <p><strong>3.</strong> Durante o mês, acompanhe o ranking mensal na tela <strong>Ranking</strong>.</p>
          <p><strong>4.</strong> No fechamento, use <strong>Ciclos &gt; Fechar ciclo</strong> para consolidar medalhas.</p>
          <p><strong>5.</strong> Se houver empate técnico (score, vitórias e derrotas iguais), defina o vencedor no desempate manual.</p>
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
