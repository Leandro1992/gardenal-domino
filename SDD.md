# SDD - Gardenal Domino

## 1. Objetivo
Este Software Design Document define a arquitetura, regras de negocio, operacao e diretrizes de evolucao do Gardenal Domino.

Objetivos do sistema:
- Registrar partidas de domino entre amigos do condominio.
- Garantir integridade das regras de pontuacao.
- Expor estatisticas confiaveis para usuarios e ranking.
- Permitir manutencao e evolucao com baixo risco de regressao.

## 2. Escopo
Inclui:
- Frontend web responsivo (Next.js + React).
- Backend API Routes no mesmo projeto Next.js.
- Persistencia em Firestore via Firebase Admin SDK.
- Autenticacao por token assinado em cookie HttpOnly.
- Rotinas de administracao de usuarios e partidas.

Nao inclui:
- App mobile nativo.
- Integracoes externas alem do Firebase.
- Filas assicronas dedicadas.

## 3. Contexto de Arquitetura
Stack principal:
- Next.js 13 (Pages Router) com TypeScript.
- React 18 no frontend.
- API Routes para backend (Node.js runtime do Next).
- Firestore como banco principal.
- Tailwind CSS para UI.

Topologia logica:
- Camada UI: pages e components.
- Camada API: pages/api.
- Camada de acesso e utilitarios: lib.
- Modelo de tipos: types/models.ts.

## 4. Estrutura do Projeto
Diretorios de interesse:
- pages/: paginas e endpoints.
- pages/api/: autenticacao, usuarios, jogos, estatisticas.
- components/: layout e biblioteca basica de UI.
- lib/: autenticacao, firebase, cache em memoria, hooks.
- types/: contratos de dominio.
- scripts/: seed de admin.

Arquivos criticos:
- lib/auth.ts
- lib/firebaseAdmin.ts
- pages/api/games/index.ts
- pages/api/games/[id]/rounds.ts
- pages/api/games/[id]/finish.ts
- pages/api/games/[id]/rounds/[roundNumber].ts
- pages/api/stats/dashboard.ts
- types/models.ts

## 5. Modelo de Dominio
### 5.1 User
Campos principais:
- email: string
- name?: string
- role: admin | user
- passwordHash: string
- lisaCount?: number
- createdAt?, updatedAt?: Timestamp

### 5.2 Game
Campos principais:
- createdBy: userId
- createdAt?: Timestamp
- teamA: [userId, userId]
- teamB: [userId, userId]
- participants?: string[]
- rounds?: Round[]
- teamA_total: number
- teamB_total: number
- finished: boolean
- winnerTeam?: A | B | null
- lisa?: string[]
- finishedAt?: Timestamp

### 5.3 Round
Campos principais:
- roundNumber: number
- teamA_points: number
- teamB_points: number
- recordedAt: Timestamp
- recordedBy: userId

## 6. Regras de Negocio Criticas
1. Regra central do domino neste projeto: quem chega a 100 pontos ganha.
2. Finalizacao de partida e manual (nao ocorre automaticamente ao adicionar rodada).
3. Uma partida exige exatamente 4 jogadores distintos (2 por time).
4. Jogador nao pode participar de mais de uma partida ativa.
5. Lisa existe quando o time vencedor atinge 100+ e o perdedor termina com 0.
6. A lista lisa[] guarda IDs dos jogadores do time vencedor (quem aplicou a lisa).
7. Nao pode adicionar rodada em jogo finalizado.
8. Nao pode remover rodada de jogo finalizado.
9. Ao remover rodada, renumerar rodadas e recalcular totais.

## 7. Fluxos Principais
### 7.1 Autenticacao
- Login em /api/auth/login.
- Se email nao tem @, pode ser completado com @gardenal.com (comportamento previsto no projeto).
- Token custom assinado e salvo em cookie gardenal_token HttpOnly.
- Rotas protegidas usam getCurrentUser(req).

### 7.2 Criar partida
- Endpoint: POST /api/games.
- Valida arrays teamA/teamB com 2 jogadores cada.
- Valida 4 jogadores distintos e existencia de usuarios.
- Verifica conflitos com partidas ativas.
- Persiste jogo com totais zerados e finished=false.

### 7.3 Adicionar rodada
- Endpoint: POST /api/games/[id]/rounds.
- Usa transacao Firestore.
- Soma pontos ao acumulado.
- Insere rodada com roundNumber incremental.
- Nao finaliza automaticamente.

### 7.4 Finalizar partida
- Endpoint: POST /api/games/[id]/finish.
- Exige ao menos um time com 100+.
- Define winnerTeam.
- Marca lisa quando perdedor ficou com 0.
- Marca finished=true e finishedAt.

### 7.5 Excluir rodada
- Endpoint: DELETE /api/games/[id]/rounds/[roundNumber].
- Somente com jogo em andamento.
- Remove rodada por indice.
- Renumera rounds e recalcula teamA_total/teamB_total.

### 7.6 Dashboard
- Endpoint: GET /api/stats/dashboard.
- Retorna partidas ativas recentes, totais globais e estatisticas do usuario.
- Estatisticas incluem: victories, defeats, lisasApplied, lisasTaken.

## 8. Persistencia e Integracao
### 8.1 Firestore
- Acesso central via singleton FirebaseConnection.getInstance().db.
- Credenciais por arquivo lib/credenciais.json ou variaveis FIREBASE_*.
- FIREBASE_PRIVATE_KEY deve converter \n para quebra de linha real.

### 8.2 Cache em memoria de servidor
- Usado em listas de jogos, contagens e dashboard.
- Prefixos relevantes: games:list:, stats:, users:item:.
- Sempre invalidar cache apos mutacoes em jogos/estatisticas.

## 9. Seguranca
- Cookie HttpOnly para token de sessao.
- Assinatura HMAC-SHA256 sobre payload base64url.
- Hash de senha atual: SHA-256 (simples).

Risco conhecido:
- SHA-256 sem salt/work factor nao e ideal para senha.

Recomendacao de evolucao:
- Migrar para bcrypt/argon2 com estrategia de migracao gradual por login.

## 10. Contratos de API
Principais rotas:
- Auth: /api/auth/login, /api/auth/logout, /api/auth/me, /api/auth/change-password, /api/auth/update-profile
- Admin: /api/admin/users, /api/admin/users/:id/name, /api/admin/users/:id/password, /api/admin/users/:id/role
- Games: /api/games, /api/games/:id, /api/games/:id/rounds, /api/games/:id/finish, /api/games/:id/rounds/:roundNumber
- Stats: /api/stats/dashboard, /api/stats/me, /api/stats/panela, /api/stats/ranking

## 11. Operacao e Deploy
Ambiente:
- Variaveis obrigatorias: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, JWT_SECRET, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD.

Comandos:
- Desenvolvimento: npm run dev
- Build: npm run build
- Producao: npm start
- Seed admin: npm run seed-admin

Deploy:
- Preparado para Heroku com Procfile e heroku-postbuild.

## 12. Qualidade e Testes
Estado atual observado:
- Nao ha suite automatizada de testes versionada no projeto.

Baseline recomendado para manutencao:
1. Validacao manual dos fluxos de jogo (criar, rodadas, finalizar, excluir rodada).
2. Checklist de regressao de autenticacao e autorizacao admin.
3. Testes de API para regras criticas:
   - 100 pontos ganha.
   - bloqueio de jogador em jogo ativo.
   - lisa aplicada/tomada.
   - bloqueio de mutacao em jogo finalizado.

## 13. Observabilidade e Suporte
- Logs de erro em endpoints ja existentes via console.error.
- Recomendado adicionar:
  - Correlation ID por request.
  - Padrao de logs estruturados.
  - Metricas de latencia por endpoint critico.

## 14. Decisoes Arquiteturais e Trade-offs
1. Monolito Next.js simplifica desenvolvimento e deploy.
2. Firestore favorece rapidez de evolucao e baixa operacao.
3. Transacoes garantem consistencia em mutacoes de pontuacao.
4. Cache em memoria melhora resposta, mas nao e distribuido (atencao em multiplas instancias).

## 15. Backlog Tecnico Priorizado
1. Seguranca de senha: migrar hash para bcrypt/argon2.
2. Cobertura automatizada de regras de dominio.
3. Endurecer validacoes de schema de request (ex.: zod).
4. Instrumentacao de observabilidade.
5. Revisao de indices Firestore para consultas com filtros combinados.

## 16. Regra de PR
Regra unica de processo para este projeto:
- Toda abertura de PR deve conter detalhamento claro das alteracoes realizadas.
