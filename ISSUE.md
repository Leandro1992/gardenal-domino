# Sistema de controle de partidas de dominó (Gardenal Domino)

Descrição
---
Desenvolver uma aplicação web para cadastro e registro de partidas de dominó entre amigos do condomínio Garden. A aplicação deve ser construída com Next.js + React (Node.js), usar Firestore (Firebase) como banco de dados e ser hospedada no Heroku.

Resumo dos requisitos
- Usuários com roles: `admin` e `user`. Só `admin` pode cadastrar novos usuários.
- Login com senha (hash com bcrypt) e sessão via JWT em cookie HttpOnly.
- Troca de senha simples: usuário troca sua própria senha (precisa da antiga); `admin` pode alterar senha de qualquer usuário sem precisar da senha antiga.
- Usuários comuns podem criar partidas (4 jogadores — 2 duplas), registrar rodadas e visualizar partidas anteriores.
- Partida: múltiplas rodadas; pontuação cumulativa por dupla; a dupla que somar 100 pontos primeiro perde. Se uma dupla terminar com 0 pontos, os jogadores dessa dupla recebem marcação "Lisa".
- Ao criar partida, só é possível selecionar jogadores já cadastrados; UI deve permitir selecionar duplas.
- Priorizar simplicidade e legibilidade do código.
- Deve existir um admin default na primeira inicialização (credenciais via variáveis de ambiente).

Critérios de aceite
- Autenticação básica funcionando (login/logout/me).
- Admin default criado no primeiro start (ou via script).
- Admin pode criar usuários e alterar senha de outros.
- Usuário pode trocar sua própria senha (exigindo senha antiga).
- Usuário cria partida somente com usuários existentes; ao registrar rodadas a lógica termina a partida quando uma dupla atinge >=100; marcação "Lisa" quando uma dupla termina com 0.
- Deploy documentado para Heroku e variáveis de ambiente documentadas.

Tarefas (checklist) — com estimativas (horas)
---
- [ ] Projeto base Next.js + TypeScript, estrutura de pastas e configuração inicial — 2h
- [ ] Integração com Firebase Admin SDK (Firestore) e lib de inicialização — 1h
- [ ] Sistema de autenticação (bcrypt, JWT em cookie HttpOnly) + endpoints de auth (`/api/auth/*`) — 3h
- [ ] Endpoints admin para criar usuários e alterar senha (`/api/admin/users`) — 2h
- [ ] Endpoints de jogos (`/api/games`, `/api/games/:id`, `/api/games/:id/rounds`) com lógica de pontuação e marcação de `lisa` — 4h
- [ ] Middleware/Helpers de autorização (verificar admin/owner) — 1h
- [ ] Seed script para criar admin default usando env vars — 1h
- [ ] Páginas básicas (login, lista de jogos, criar jogo, jogo detalhe, admin users) — 6h
- [ ] README, instruções de deploy no Heroku e configuração das env vars — 1h
- [ ] Testes manuais e ajustes (fluxos: criar usuário/admin, criar jogo, registrar rodada, marcar lisa) — 2h

Estimativa total: 23h

Observações e variáveis de ambiente
---
Variáveis necessárias:
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY (atenção aos \n)
- JWT_SECRET
- DEFAULT_ADMIN_EMAIL
- DEFAULT_ADMIN_PASSWORD
- NODE_ENV (opcional)

Deploy no Heroku:
- Criar app no Heroku, setar env vars acima.
- Procfile: `web: npm start`
- scripts: `build` e `start` no package.json

Como começar (rápido)
- Configurar Firebase service account e as variáveis de ambiente.
- Rodar `npm install`, `npm run dev`.
- Rodar `node scripts/seed-admin.js` (ou iniciar o servidor se o seed for executado em inicialização) para criar admin default.
