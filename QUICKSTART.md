# Quickstart - Gardenal Domino

## 1) Instalar
```bash
npm install
```

## 2) Configurar ambiente
Defina estas variaveis:
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY (com \n literais)
- JWT_SECRET
- DEFAULT_ADMIN_EMAIL
- DEFAULT_ADMIN_PASSWORD

## 3) Seed do admin
```bash
npm run seed-admin
```

## 4) Rodar em desenvolvimento
```bash
npm run dev
```
Acesse: http://localhost:3000

## 5) Build e execucao de producao
```bash
npm run build
npm start
```

## Fluxo rapido de validacao manual
1. Login com usuario admin.
2. Criar 3 usuarios comuns em /admin/users.
3. Criar partida com 4 jogadores em /games/new.
4. Registrar rodadas em /games/:id ate algum time atingir 100+.
5. Finalizar manualmente a partida.
6. Verificar ranking em /ranking e painel de duplas em /panela.

## Regras para validar no smoke test
- Time que chega a 100+ vence.
- Lisa somente quando perdedor termina com 0.
- Nao permitir criacao de nova partida com jogador em partida ativa.
- Nao permitir excluir rodada de partida finalizada.

## Endpoints uteis para debug
- GET /api/auth/me
- GET /api/games
- GET /api/stats/dashboard
- GET /api/stats/ranking
- GET /api/stats/panela
