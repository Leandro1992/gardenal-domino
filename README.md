# Gardenal Domino

Web app para registrar partidas e contas estatísticas dos jogos dos amigos do condomínio Garden.

Stack
- Next.js + React (TypeScript)
- Node.js
- Firestore (Firebase Admin SDK)
- Bcrypt + JWT (autenticação simples)
- Deploy: Heroku

Funcionalidades principais
- Usuários com roles: `admin` e `user`.
- Somente `admin` pode criar novos usuários.
- Troca de senha local (sem e-mail): usuário altera sua própria senha (requer senha antiga); admin pode alterar a senha de outros.
- Criação de partidas com 4 jogadores (2 duplas), registro de rodadas e finalização automática quando uma dupla atinge 100 pontos.
- Marcação `lisa` quando uma dupla termina com 0 pontos.

Configuração (variáveis de ambiente)
Defina as variáveis de ambiente:

- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY (atenção: quebre as linhas corretamente; use `\n` no Heroku)
- JWT_SECRET
- DEFAULT_ADMIN_EMAIL
- DEFAULT_ADMIN_PASSWORD
- NODE_ENV (opcional)

Instalação local
1. Clone o repositório
2. Instale dependências:
   - npm install
3. Configure as env vars (ver acima)
4. Seed do admin (opção A ou B):
   - A) Rodar o script de seed:
     - `node dist/scripts/seed-admin.js` (ou `ts-node scripts/seed-admin.ts` se usar ts-node)
   - B) Iniciar o servidor — o seed também pode ser integrado ao start caso deseje.
5. Rodar em modo dev:
   - npm run dev
6. Build / Start:
   - npm run build
   - npm run start

Endpoints principais (esboço)
- POST /api/auth/login { email, password }
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/change-password { oldPassword, newPassword }
- POST /api/admin/users { email, name, password, role } (admin)
- PUT /api/admin/users/:id/password { newPassword } (admin)
- POST /api/games { teamA: [id,id], teamB: [id,id] }
- GET /api/games
- GET /api/games/:id
- POST /api/games/:id/rounds { teamA_points, teamB_points }

Deploy para Heroku (básico)
1. Crie app no Heroku
2. Configure env vars no painel do Heroku
3. Adicione Procfile:
   web: npm start
4. Scripts no package.json:
   - "build": "next build"
   - "start": "next start -p $PORT"
5. Push para Heroku (git push heroku main)

Notas de implementação
- Simplicidade e legibilidade são prioridades. Prefira código claro ao invés de abstrações complexas.
- Não há envio de e-mail para troca de senha neste escopo.
- Variáveis de ambiente sensíveis (FIREBASE_PRIVATE_KEY) devem ser tratadas com cuidado.
