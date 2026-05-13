---
name: release-checklist
description: "Gerar checklist reutilizavel de release pre-deploy para o Gardenal Domino com validacoes tecnicas, funcionais e operacionais."
argument-hint: "Informe ambiente alvo, escopo da release, riscos conhecidos e janela de deploy."
---
Gere um checklist de release antes de deploy para o Gardenal Domino.

Contexto informado:
{{input}}

Requisitos do checklist:
1. Organizar em fases: pre-release, pre-deploy, deploy, pos-deploy, rollback.
2. Priorizar riscos funcionais e regressao em jogos, stats e autenticacao.
3. Incluir validacoes tecnicas objetivas e verificaveis.
4. Incluir validacoes de dados/cache, contratos de API e variaveis de ambiente.
5. Incluir criterio de go/no-go.
6. Incluir plano de rollback com gatilhos claros.
7. Usar formato de checklist com caixas [ ] e linguagem direta.

Regras de dominio obrigatorias a validar:
- Quem atinge 100 pontos ganha.
- Finalizacao de partida e manual.
- Bloqueio de jogador em mais de uma partida ativa.
- Lisa somente quando vencedor 100+ e perdedor 0.

Formato de saida:
- Titulo da release.
- Checklist por fase.
- Secao final com responsaveis e status go/no-go.
