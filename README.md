# Gardenal Domino

Aplicacao web para registrar partidas de domino, acompanhar estatisticas e ranking entre amigos do condominio.

## Stack
- Next.js 13 (Pages Router) + React 18 + TypeScript
- API Routes (Node.js via Next.js)
- Firestore (Firebase Admin SDK)
- Tailwind CSS 3.4
- Autenticacao com token assinado (HMAC SHA-256) em cookie HttpOnly

## Regras de negocio criticas
- Quem atinge 100 pontos primeiro vence.
- Finalizacao da partida e manual (endpoint especifico de finish).
- Partida exige exatamente 4 jogadores distintos (2 por time).
- Jogador nao pode estar em mais de uma partida ativa.
- Lisa: vencedor com 100+ e time perdedor com 0.

## Funcionalidades atuais

### Autenticacao e usuarios
- Login/logout com cookie HttpOnly.
- Auto-complete de email no login para @gardenal.com quando necessario.
- Perfil: atualizacao de nome.
- Troca de senha do proprio usuario.
- Admin: criar usuarios, editar nome, redefinir senha e alterar role.

### Partidas
- Criacao de partidas com validacao de jogadores ativos.
- Registro de rodadas com transacao no Firestore.
- Finalizacao manual com validacao de 100+ pontos.
- Exclusao de rodada em jogo ativo com renumeracao e recalculo de totais.
- Cancelamento de partida por admin (DELETE /api/games/:id).

### Estatisticas
- Dashboard resumido (/api/stats/dashboard).
- Estatisticas do usuario (/api/stats/me).
- Ranking geral e modo lisa (/api/stats/ranking?mode=general|lisa).
- Ranking de duplas/panela (/api/stats/panela).

### Interface
- Mobile-first, menu hamburguer no mobile e sidebar no desktop.
- Paginas: login, dashboard, partidas, nova partida, detalhe da partida, ranking, panela, settings e admin/users.

## APIs

### Auth
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/change-password
- PUT /api/auth/update-profile

### Admin
- GET /api/admin/users
- POST /api/admin/users
- PUT /api/admin/users/:id/name
- PUT /api/admin/users/:id/password
- PUT /api/admin/users/:id/role

### Users
- GET /api/users

### Games
- GET /api/games
- POST /api/games
- GET /api/games/:id
- DELETE /api/games/:id (admin)
- GET /api/games/:id/rounds
- POST /api/games/:id/rounds
- DELETE /api/games/:id/rounds/:roundNumber
- POST /api/games/:id/finish
- GET /api/games/search

### Stats
- GET /api/stats/dashboard
- GET /api/stats/me
- GET /api/stats/ranking
- GET /api/stats/panela

## Setup local

### 1) Instalar dependencias
```bash
npm install
```

### 2) Configurar variaveis de ambiente
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY (com \n literais)
- JWT_SECRET
- DEFAULT_ADMIN_EMAIL
- DEFAULT_ADMIN_PASSWORD

### 3) Seed de admin
```bash
npm run seed-admin
```

### 4) Subir aplicacao
```bash
npm run dev
```

Build/producao:
```bash
npm run build
npm start
```

## Observacoes tecnicas importantes
- Hash de senha atual: SHA-256 (nao bcrypt).
- Cache em memoria de servidor em rotas de listagem/estatisticas.
- Mutacoes relevantes invalidam cache por prefixo (games:list:, stats:, users:*).

## Limitacoes conhecidas (revisao atual)
- POST /api/games/:id/rounds nao valida no backend se o usuario autenticado participa da partida.
- GET /api/games/search recebe cursor, mas nao aplica paginacao por cursor na query atual.

## Documentacao complementar
- SDD.md: arquitetura e desenho tecnico.
- FEATURES.md: matriz de funcionalidades e gaps conhecidos.
- QUICKSTART.md: guia rapido de operacao local.
- DEPLOY.md: procedimento de deploy Heroku.
