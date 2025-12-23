# Gardenal Domino

Web app para registrar partidas e contas estatísticas dos jogos dos amigos do condomínio Garden.

Stack
- Next.js + React (TypeScript)
- Node.js
- Supabase (PostgreSQL)
- shadcn/ui (componentes UI)
- Tailwind CSS (estilização)
- Bcrypt + JWT (autenticação simples)
- Deploy: Heroku

Funcionalidades principais
- Usuários com roles: `admin` e `user`.
- Somente `admin` pode criar novos usuários.
- Troca de senha local (sem e-mail): usuário altera sua própria senha (requer senha antiga); admin pode alterar a senha de outros.
- Criação de partidas com 4 jogadores (2 duplas), registro de rodadas e finalização automática quando uma dupla atinge 100 pontos.
- Marcação `lisa` quando uma dupla termina com 0 pontos (campo `lisa` é um array de UUIDs dos jogadores que fizeram lisa).
- Desfazer última rodada: permite reverter a última rodada adicionada, revertendo automaticamente o status de finalização se necessário.

Configuração (variáveis de ambiente)
Defina as variáveis de ambiente:

- SUPABASE_URL - URL do seu projeto Supabase
- SUPABASE_SERVICE_ROLE_KEY - Service Role Key do Supabase (para operações server-side)
- JWT_SECRET - Chave secreta para assinatura de tokens JWT
- DEFAULT_ADMIN_EMAIL - Email do usuário admin padrão
- DEFAULT_ADMIN_PASSWORD - Senha do usuário admin padrão
- NODE_ENV (opcional) - Ambiente de execução (development/production)

**Importante:** Antes de iniciar, execute o script SQL em `supabase/schema.sql` no SQL Editor do Supabase para criar as tabelas necessárias.

Instalação local
1. Clone o repositório
2. Instale dependências:
   - npm install
3. Configure as env vars (ver acima)
4. Seed do admin:
   - Execute o script de seed:
     - `npm run seed-admin`
   - Opcional: Para popular com dados de exemplo:
     - `npm run seed-sample`
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
- DELETE /api/games/:id/rounds (desfazer última rodada)

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
- Variáveis de ambiente sensíveis (SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET) devem ser tratadas com cuidado.
- O Supabase usa PostgreSQL, então as queries são diferentes do Firestore.
- Rounds são armazenados em uma tabela separada para melhor normalização.
- O campo `lisa` na tabela `games` é um array de UUIDs (ou `null`), contendo os IDs dos jogadores que fizeram lisa.
- Operações de adicionar rodada e desfazer rodada são atômicas através de funções RPC no Supabase.
- Interface construída com shadcn/ui para componentes consistentes e acessíveis.
