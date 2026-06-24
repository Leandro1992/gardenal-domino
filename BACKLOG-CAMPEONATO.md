BACKLOG - MODO CAMPEONATO
Documento de requisitos e backlog tecnico para implementacao do Modo Campeonato.
Produzido pelo PM Tech em 23/06/2026. Aguarda refinamento pelo Tech Lead.


==============================================================================
RESUMO EXECUTIVO
==============================================================================

O produto atual possui um Modo Livre funcional com score, ranking geral, lisa e panela.
A evolucao introduz um Modo Campeonato totalmente desacoplado, com colecoes Firestore
proprias, janela temporal diaria (18h-18h), politica de rotacao de parceiros, ranking
mensal parcial, distribuicao manual de medalhas pelo admin e ranking anual ponderado.

Decisoes de arquitetura:
- Modo Campeonato usa colecoes Firestore exclusivas, zero acoplamento com games (modo livre).
- Fechamento de ciclo mensal e sempre manual pelo admin (sem cron, sem automacao).
- Parametros configuraveis via painel admin (minimo de jogos, limite de repeticao de parceiros).


==============================================================================
ARQUITETURA DE DADOS - COLECOES NOVAS (CAMPEONATO)
==============================================================================

Nenhuma colecao existente (games, users) e alterada. Tudo abaixo e criacao nova.

COLECAO: championship_games
  id: string (Firestore doc id)
  createdBy: string (userId)
  createdAt: Timestamp
  dayWindow: string (ex: 2026-06-23, janela 18h-18h)
  cycleId: string (referencia ao championship_cycles)
  teamA: array de 2 userIds
  teamB: array de 2 userIds
  participants: array de 4 userIds
  rounds: array de Round (mesmo tipo do modo livre)
  teamA_total: number
  teamB_total: number
  finished: boolean
  winnerTeam: A ou B ou null
  lisa: array de userIds do time vencedor quando adversario termina com 0
  finishedAt: Timestamp (opcional)

COLECAO: championship_cycles
  id: string
  year: number (ex: 2026)
  month: number (ex: 6 para junho)
  windowStart: Timestamp (18h do dia 01 do mes)
  windowEnd: Timestamp (18h do dia 01 do mes seguinte, previsao)
  status: "open" ou "closed"
  closedAt: Timestamp (opcional)
  closedBy: string userId do admin (opcional)
  tiebreakResolutions: array de objetos com position, winnerId, resolvedBy, resolvedAt

COLECAO: championship_medals
  id: string
  cycleId: string
  userId: string
  year: number
  month: number
  medal: "gold" ou "silver" ou "bronze" ou "participation"
  weight: number (gold=4, silver=3, bronze=2, participation=1)
  score: number
  victories: number
  defeats: number
  lisasApplied: number
  lisasTaken: number
  totalGames: number
  position: number

COLECAO: system_params (documento unico com id "config")
  minGamesForMonthlyRanking: number (default 8)
  maxPartnerRepetitionsPerMonth: number (default 2)
  updatedAt: Timestamp
  updatedBy: string userId


==============================================================================
REGRAS DE DOMINIO - CAMPEONATO
==============================================================================

JANELA DIARIA (18h ate 18h)
- Qualquer partida criada entre 18h00 do dia D e 17h59 do dia D+1 pertence a janela D.
- Calculo: se hora atual menor que 18h, window = D-1; se hora atual maior ou igual a 18h, window = D.
- Exemplo: jogo criado as 03h do dia 24/06 tem dayWindow = "2026-06-23".
- Finalidade: evitar que jogos noturnos em virada de mes sejam contados no mes errado e que a
  contagem de repeticao de parceiros seja zerada erroneamente na virada do dia 01.

CICLO MENSAL
- Um ciclo representa o periodo de 18h/01/mes ate 17h59/01/mes+1.
- Apenas um ciclo pode estar com status "open" por vez.
- O admin abre e fecha ciclos manualmente via interface.
- Partidas criadas apos o fechamento manual pertencem ao proximo ciclo.

POLITICA DE ROTACAO DE PARCEIROS
- Cada jogador so pode jogar com o mesmo parceiro ate maxPartnerRepetitionsPerMonth vezes no ciclo.
- Contagem baseada no cycleId da partida (nao no mes calendario).
- Bloqueio ocorre na criacao da partida com erro 400 e mensagem descritiva.

ELEGIBILIDADE PARA RANKING MENSAL
- Jogador e elegivel se totalGames maior ou igual a minGamesForMonthlyRanking no ciclo corrente.
- Ranking parcial exibe elegíveis em destaque e nao-elegiveis separados com jogos faltantes.

SCORE MENSAL (igual ao modo livre)
  Vitoria: +1
  Derrota: -1
  Lisa aplicada: +2
  Lisa tomada: -2

DESEMPATE (em ordem de aplicacao)
  1. Score total (maior vence)
  2. Numero de vitorias (maior vence)
  3. Numero de derrotas (menor vence)
  4. Empate persistente: admin resolve manualmente via interface

DISTRIBUICAO DE MEDALHAS (no fechamento manual do ciclo)
  1o lugar elegivel: Ouro (peso 4)
  2o lugar elegivel: Prata (peso 3)
  3o lugar elegivel: Bronze (peso 2)
  Demais elegiveis (4o em diante): Participacao (peso 1)
  Observacao: top 3 NAO recebe medalha de participacao, apenas a medalha de posicao.

RANKING ANUAL
  pontuacao_anual = soma de (medalhas x peso) de todos os ciclos fechados do ano.
  Disponivel como ranking parcial durante o ano.


==============================================================================
BACKLOG PRIORIZADO
==============================================================================

----------------------------------------------------------------------
FASE 1 - FUNDACAO (bloqueante para tudo)
----------------------------------------------------------------------

ITEM 1 - Utilitario de Janela Diaria
Problema: Sem normalizacao, jogos noturnos cruzam meia-noite e contaminam a contagem
mensal e a validacao de rotacao de parceiros.
Resultado esperado: Funcao pura getDayWindow(date) que retorna a chave correta da janela.
Escopo tecnico:
  - Criar lib/championship/dayWindow.ts
  - Logica: se hora menor que 18h retorna format(subDays(date, 1)), senao retorna format(date)
  - Cobrir edge case de virada de mes e ano
Risco: Baixo (funcao pura, testavel de forma isolada)
Esforco: P
Dependencia: Nenhuma

----------------------------------------------------------------------

ITEM 2 - Tipos e Interfaces do Campeonato
Problema: Sem tipagem, o desenvolvimento sera inconsistente e propenso a erros.
Resultado esperado: Interfaces TypeScript para todas as entidades do campeonato.
Escopo tecnico:
  - Criar types/championship.ts com ChampionshipGame, ChampionshipCycle,
    ChampionshipMedal, SystemParams, MedalType, CycleStatus
  - Reusar Round e FirestoreTimestamp do modelo existente
Risco: Baixo
Esforco: P
Dependencia: Nenhuma

----------------------------------------------------------------------

ITEM 3 - API de Parametros do Sistema (Admin)
Problema: minGamesForMonthlyRanking e maxPartnerRepetitionsPerMonth seriam hardcoded.
Resultado esperado: Admin gerencia parametros via /admin/params. Valores persistidos em
system_params/config.
Escopo tecnico:
  - GET /api/admin/params: retorna config atual
  - PUT /api/admin/params: valida e persiste (somente admin)
  - pages/admin/params.tsx: formulario com dois campos numericos, descricao e botao salvar
  - Cache params:config com TTL 5min, invalidado no PUT
Risco: Baixo
Esforco: P
Dependencia: Item 2

----------------------------------------------------------------------
FASE 2 - PARTIDAS DO CAMPEONATO
----------------------------------------------------------------------

ITEM 4 - Gerenciamento de Ciclos (Admin)
Problema: Nao existe controle de qual ciclo mensal esta ativo.
Resultado esperado: Admin abre e fecha ciclos manualmente. Sistema valida que ha apenas
um ciclo aberto por vez.
Escopo tecnico:
  - GET /api/admin/championship/cycles: lista todos os ciclos
  - POST /api/admin/championship/cycles: abre novo ciclo (valida que nao ha outro aberto)
  - lib/championship/cycleManager.ts com funcoes getActiveCycle(db) e openCycle(db, adminId)
  - Usar Firestore transaction para evitar dois ciclos abertos simultaneamente
Risco: Medio (operacoes criticas)
Esforco: M
Dependencia: Item 2

----------------------------------------------------------------------

ITEM 5 - Criacao de Partida no Modo Campeonato
Problema: Nao existe endpoint nem UI para criar partidas de campeonato.
Resultado esperado: POST /api/championship/games cria partida na colecao championship_games
com dayWindow, cycleId e todas as validacoes.
Escopo tecnico:
  - Nova rota: pages/api/championship/games/index.ts
  - Validacoes: 4 jogadores distintos, todos existem, nenhum em partida ativa de campeonato
  - dayWindow calculado via getDayWindow(now)
  - cycleId obtido via getActiveCycle(), lanca erro se nenhum ciclo aberto
  - Cache invalidado com prefixo championship:games:*
Risco: Medio
Esforco: M
Dependencia: Itens 1, 2, 4

----------------------------------------------------------------------

ITEM 6 - Validacao de Rotacao de Parceiros
Problema: Sem validacao, jogadores podem repetir a mesma dupla ilimitadamente.
Resultado esperado: API bloqueia criacao se algum par ja atingiu maxPartnerRepetitionsPerMonth
no ciclo atual.
Escopo tecnico:
  - Dentro do POST /api/championship/games:
    - Buscar partidas finalizadas do cycleId com os jogadores envolvidos
    - Contar ocorrencias de cada par (player1, player2) na mesma equipe
    - Comparar com params.maxPartnerRepetitionsPerMonth
  - Indice Firestore necessario: cycleId ASC + finished ASC
Risco: Medio (requer indice composto no Firestore)
Esforco: M
Dependencia: Itens 3, 5

----------------------------------------------------------------------

ITEM 7 - Rodadas e Finalizacao no Campeonato
Problema: As APIs de rodada e finalizacao existentes sao exclusivas do modo livre.
Resultado esperado: Endpoints espelhados para o campeonato reutilizando a logica de
dominio existente.
Escopo tecnico:
  - POST /api/championship/games/[id]/rounds: adicionar rodada (mesma logica de transacao)
  - DELETE /api/championship/games/[id]/rounds/[roundNumber]: remover rodada
  - POST /api/championship/games/[id]/finish: finalizar (mesmo dominio, maior ou igual a
    100 vence, lisa se adversario termina com 0)
  - Validar que cycleId do jogo aponta para ciclo com status open
Risco: Baixo (logica de dominio ja testada, apenas adaptacao de endpoints)
Esforco: M
Dependencia: Item 5

----------------------------------------------------------------------
FASE 3 - FECHAMENTO DE CICLO E MEDALHAS
----------------------------------------------------------------------

ITEM 8 - Algoritmo de Fechamento e Distribuicao de Medalhas
Problema: Nao existe mecanismo para consolidar o ranking mensal e distribuir medalhas.
Resultado esperado: Ao fechar um ciclo, sistema calcula ranking final, aplica desempate
automatico e distribui medalhas em championship_medals.
Escopo tecnico:
  POST /api/admin/championship/cycles/[id]/close:
    1. Verificar status == "open"
    2. Buscar todos championship_games com cycleId e finished == true
    3. Calcular por jogador: score, victories, defeats, lisasApplied, lisasTaken, totalGames
    4. Filtrar elegiveis: totalGames maior ou igual a params.minGamesForMonthlyRanking
    5. Ordenar: score DESC, victories DESC, defeats ASC
    6. Detectar empates irresolviveis: retornar 409 com status tiebreak_required,
       position e array tied com os dois userIds empatados
    7. Se sem empates: distribuir medalhas e persistir em championship_medals
    8. Setar ciclo status closed, closedAt, closedBy
  - Usar Firestore batch write para atomicidade
Risco: ALTO (risco calculado e aceito). Erro afeta ranking anual de forma irreversivel.
       Validar com dados reais em staging antes do primeiro uso em producao.
Esforco: G
Dependencia: Itens 3, 4, 6, 7

----------------------------------------------------------------------

ITEM 9 - Desempate Manual pelo Admin
Problema: Empate completo (score + vitorias + derrotas iguais) nao pode ser resolvido
automaticamente.
Resultado esperado: Admin visualiza jogadores empatados, define o vencedor e confirma
o fechamento.
Escopo tecnico:
  - PUT /api/admin/championship/cycles/[id]/tiebreak
    body: { position: number, winnerId: string }
    persiste em cycle.tiebreakResolutions[]
  - UI: modal com os dois jogadores empatados, estatisticas completas do ciclo
    e botao "Definir vencedor"
  - Apos resolver todos os empates, admin tenta fechar novamente
Risco: Medio (aresta rara mas critica para integridade do ranking)
Esforco: M
Dependencia: Item 8

----------------------------------------------------------------------
FASE 4 - RANKINGS
----------------------------------------------------------------------

ITEM 10 - API de Ranking Mensal Parcial
Problema: Nao existe endpoint para o ranking em tempo real do ciclo ativo.
Resultado esperado: GET /api/championship/ranking/monthly retorna ranking parcial
separando elegiveis de nao-elegiveis.
Escopo tecnico:
  - Buscar championship_games do ciclo ativo com finished == true
  - Calcular stats por jogador
  - Retornar eligible[] ordenado por score/vitorias/derrotas com projectedMedal
  - Retornar ineligible[] com gamesNeeded
  - Incluir metadados do ciclo: windowStart, windowEnd, status
  - Cache 30 segundos
Risco: Medio (custo de leitura Firestore proporcional ao volume de partidas)
Esforco: M
Dependencia: Item 4

----------------------------------------------------------------------

ITEM 11 - API de Ranking Anual
Problema: Nao existe endpoint para ranking anual por medalhas.
Resultado esperado: GET /api/championship/ranking/annual?year=YYYY retorna jogadores
ordenados por pontuacao anual ponderada com breakdown mensal.
Escopo tecnico:
  - Buscar championship_medals onde year == queryYear
  - Agregar por userId: somar pesos, contar medalhas por tipo, listar meses com detalhe
  - Enriquecer com nome do jogador via colecao users
  - Retornar players[] ordenados por totalScore DESC
Risco: Baixo
Esforco: P
Dependencia: Item 8

----------------------------------------------------------------------

ITEM 12 - UI: Ranking Mensal Campeonato
Problema: Nao existe tela para o ranking parcial do campeonato.
Resultado esperado: Aba Mensal na pagina /ranking com elegiveis em destaque e
nao-elegiveis com jogos faltantes.
Escopo tecnico:
  - Adicionar tabs em pages/ranking.tsx: "Geral" (existente), "Mensal", "Anual"
  - Card de elegivel: posicao, nome, score, totalGames, medalha projetada com icone colorido
  - Card de nao-elegivel: nome, totalGames, badge "faltam X jogos"
  - Header: periodo do ciclo e status aberto ou fechado
Risco: Baixo
Esforco: M
Dependencia: Item 10

----------------------------------------------------------------------

ITEM 13 - UI: Ranking Anual Campeonato
Problema: Nao existe tela para o ranking anual por medalhas.
Resultado esperado: Aba Anual em /ranking com placar de medalhas por jogador e
breakdown mensal.
Escopo tecnico:
  - Tab Anual em pages/ranking.tsx
  - Card: posicao, nome, pontuacao anual, contagem por tipo de medalha
  - Linha de detalhe: icone de medalha por mes (jan a dez)
  - Seletor de ano com default no ano corrente
Risco: Baixo
Esforco: M
Dependencia: Item 11

----------------------------------------------------------------------
FASE 5 - ADMINISTRACAO E OPERACAO
----------------------------------------------------------------------

ITEM 14 - UI Admin: Gestao de Ciclos
Problema: Admin nao tem interface para abrir e fechar ciclos nem visualizar historico.
Resultado esperado: Pagina /admin/cycles com lista de ciclos, controles de abertura e
fechamento e preview do ranking antes de fechar.
Escopo tecnico:
  - pages/admin/cycles.tsx
  - Lista de ciclos: status, contagem de partidas, contagem de elegiveis
  - Botao "Abrir novo ciclo" bloqueado se ja existe ciclo aberto
  - Botao "Fechar ciclo" com modal de preview do ranking final e alertas de empate pendentes
  - Formulario de tiebreak embutido no modal quando necessario
  - Apos fechamento: exibe medalhas distribuidas
Risco: Medio (UI acessa operacoes irreversiveis)
Esforco: M
Dependencia: Itens 8, 9

----------------------------------------------------------------------

ITEM 15 - Admin: Limpeza de Jogos do Modo Livre
Problema: Admin precisa poder zerar o historico do modo livre sem afetar dados do campeonato.
Resultado esperado: Botao na area admin que exibe contagem de jogos e confirma exclusao em batch.
Escopo tecnico:
  - DELETE /api/admin/games/free: deleta em batch docs da colecao games, retorna { deleted: number }
  - UI: botao destrutivo com double-confirm
    Mensagem: "Voce esta prestes a apagar X jogos do modo livre. Esta acao e irreversivel."
  - Invalidar todos os caches apos limpeza
  - NAO toca em championship_games
Risco: ALTO (acao irreversivel, exige double-confirm explicito)
Esforco: P
Dependencia: Nenhuma (completamente independente)


==============================================================================
SUMARIO DO ROADMAP
==============================================================================

FASE 1 (Fundacao):       Item 1, Item 2, Item 3
FASE 2 (Partidas):       Item 4, Item 5, Item 6, Item 7
FASE 3 (Ciclos):         Item 8, Item 9
FASE 4 (Rankings):       Item 10 e Item 11 em paralelo, depois Item 12 e Item 13 em paralelo
FASE 5 (Admin/Ops):      Item 14 apos Item 8, Item 15 pode ser feito a qualquer momento

Tabela de prioridades:
  Item | Descricao                         | Esforco | Risco  | Depende de
  1    | Utilitario janela diaria          | P       | Baixo  | -
  2    | Tipos do campeonato               | P       | Baixo  | -
  3    | Parametros do sistema admin       | P       | Baixo  | 2
  4    | Gerenciamento de ciclos           | M       | Medio  | 2
  5    | Criacao de partida campeonato     | M       | Medio  | 1, 2, 4
  6    | Validacao rotacao de parceiros    | M       | Medio  | 3, 5
  7    | Rodadas e finalizacao campeonato  | M       | Baixo  | 5
  8    | Fechamento e distribuicao medalhas| G       | ALTO   | 3, 4, 6, 7
  9    | Desempate manual admin            | M       | Medio  | 8
  10   | API ranking mensal parcial        | M       | Medio  | 4
  11   | API ranking anual                 | P       | Baixo  | 8
  12   | UI ranking mensal                 | M       | Baixo  | 10
  13   | UI ranking anual                  | M       | Baixo  | 11
  14   | UI admin gestao de ciclos         | M       | Medio  | 8, 9
  15   | Admin limpeza modo livre          | P       | ALTO   | -


==============================================================================
NOTAS PARA O TECH LEAD
==============================================================================

1. Item 8 e o mais critico: uma medalha errada e irreversivel. Recomendo validar com
   dados reais em staging antes do primeiro fechamento em producao.

2. Firestore indexes necessarios para a colecao championship_games:
   - cycleId ASC + finished ASC
   - cycleId ASC + participants ARRAY_CONTAINS + finished ASC
   Criar via Firebase Console antes do deploy da Fase 2.

3. Item 5 depende de Item 4: e necessario ter ao menos um ciclo aberto para criar
   partidas de campeonato. A abertura do primeiro ciclo deve ser parte do onboarding
   do admin apos o deploy.

4. Reutilizacao de componentes: Modal, Card e Button ja existem em components/ui/.
   O padrao de tabs pode ser adicionado como components/ui/Tabs.tsx.

5. Cache: usar novos prefixos no serverCache.ts existente:
   championship:games:*
   championship:ranking:monthly
   championship:ranking:annual:YYYY
   params:config

6. Criar diretorio lib/championship/ dedicado para isolar toda a logica:
   dayWindow.ts
   cycleManager.ts
   medalDistributor.ts
   rotationValidator.ts

7. Fechamento e 100% manual: nenhum cron ou job automatico. O admin e responsavel
   por fechar o ciclo ao final de cada mes.


==============================================================================
STATUS DE IMPLEMENTACAO - branch feature/modo-campeonato
==============================================================================

FASE 1 - FUNDACAO (CONCLUIDO)
  types/championship.ts            - interfaces TypeScript completas
  lib/championship.ts              - dayWindow, cycleManager, medalDistributor (arquivo unico)
  pages/api/admin/params.ts        - GET/PUT system_params
  pages/admin/params.tsx           - UI de parametros

FASE 2 - PARTIDAS (CONCLUIDO)
  pages/api/admin/championship.ts  - ciclos: ?action=cycles|close|tiebreak
  pages/api/championship-games.ts  - CRUD completo: lista, cria, get, rounds, finish
  Validacao de rotacao de parceiros embutida no POST de criacao

FASE 3 - MEDALHAS (CONCLUIDO)
  Fechamento e distribuicao em pages/api/admin/championship.ts action=close
  Desempate manual em action=tiebreak

FASE 4 - RANKINGS (CONCLUIDO)
  pages/api/championship-ranking.ts - ?type=monthly e ?type=annual
  pages/ranking.tsx                  - tabs Geral / Mensal / Anual adicionadas

FASE 5 - ADMIN E OPS (CONCLUIDO)
  pages/admin/cycles.tsx                   - gestao de ciclos com modal de fechamento
  pages/api/admin/championship-cleanup.ts  - limpeza de jogos do modo livre

NAVEGACAO
  components/Layout.tsx - links Ciclos e Parametros adicionados para admins

PENDENCIAS TECNICAS
  - Criar indexes compostos no Firestore: cycleId+finished, cycleId+participants+finished
  - UI dedicada para criar partidas de campeonato (atualmente apenas via API)
  - Adicionar botao de limpeza do modo livre na pagina admin (API ja esta disponivel)