# Dominó Gardenal

Web app para registrar partidas e calcular estatísticas dos jogos de dominó dos amigos do condomínio Garden.

## Stack Tecnológico
- **Next.js 13** + React (TypeScript)
- **Node.js**
- **Firestore** (Firebase Admin SDK)
- **Bcrypt + JWT** (autenticação com cookies HttpOnly)
- **Tailwind CSS 3.4** (Design System)
- **Lucide React** (Ícones)
- **Deploy**: Heroku

## Funcionalidades Principais

### Autenticação e Usuários
- ✅ Sistema de roles: `admin` e `user`
- ✅ Somente `admin` pode criar novos usuários
- ✅ Troca de senha segura (usuário precisa da senha antiga)
- ✅ Admin pode redefinir senha de qualquer usuário
- ✅ Edição de perfil (nome do usuário)
- ✅ Página de configurações pessoais

### Gerenciamento de Partidas
- ✅ Criação de partidas com 4 jogadores (2 duplas)
- ✅ Busca e filtro de jogadores ao criar partida
- ✅ Registro de rodadas com pontuação
- ✅ Finalização automática quando uma dupla atinge 100 pontos
- ✅ **Regra do Dominó**: quem chega a 100 pontos **PERDE**
- ✅ Marcação "Lisa" quando vencedor mantém 0 pontos
- ✅ Animação especial para vitórias Lisa
- ✅ Validação: jogador não pode estar em múltiplas partidas ativas
- ✅ Validação: apenas membros da partida podem adicionar rodadas
- ✅ Histórico completo de rodadas
- ✅ Exibição de nomes dos jogadores (não apenas "Time A/B")

### Filtros e Busca
- ✅ Filtro de partidas por status (todas, ativas, finalizadas)
- ✅ Busca de partidas por nome do jogador
- ✅ Filtro de partidas por data
- ✅ Filtro de jogadores ao criar partida

### Estatísticas
- ✅ Dashboard com estatísticas do usuário
- ✅ Contador de vitórias e derrotas
- ✅ Contador de lisas aplicadas e tomadas
- ✅ **Ranking Geral** com sistema de pontuação:
  - Vitória: +1 ponto
  - Lisa aplicada: +2 pontos
  - Derrota: -1 ponto
  - Lisa tomada: -2 pontos
- ✅ Ordenação por score, vitórias e lisas
- ✅ Destaque visual para top 3 (🏆 🥈 🥉)

### Interface
- ✅ **Mobile-First** (otimizado para celulares)
- ✅ Design responsivo (mobile, tablet, desktop)
- ✅ Menu lateral (desktop) e hambúrguer (mobile)
- ✅ Logo Gardenal integrada
- ✅ Loading states em todas as operações
- ✅ Feedback visual (cores, ícones, badges)
- ✅ Cards informativos e organizados

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

## Endpoints da API

### Autenticação
- `POST /api/auth/login` - Login com email e senha
- `POST /api/auth/logout` - Logout (limpa cookie)
- `GET /api/auth/me` - Dados do usuário logado
- `POST /api/auth/change-password` - Trocar senha (requer senha antiga)
- `POST /api/auth/update-profile` - Atualizar nome do usuário

### Admin (requer role admin)
- `GET /api/admin/users` - Listar todos os usuários
- `POST /api/admin/users` - Criar novo usuário
- `PUT /api/admin/users/:id/password` - Redefinir senha de usuário

### Partidas
- `GET /api/games` - Listar todas as partidas
- `POST /api/games` - Criar nova partida
- `GET /api/games/:id` - Detalhes de uma partida
- `GET /api/games/:id/rounds` - Rodadas de uma partida
- `POST /api/games/:id/rounds` - Adicionar rodada (auto-finaliza se atingir 100)
- `DELETE /api/games/:id/rounds` (desfazer última rodada)

### Estatísticas
- `GET /api/stats/me` - Estatísticas do usuário logado
- `GET /api/stats/ranking` - Ranking geral de todos os jogadores

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
