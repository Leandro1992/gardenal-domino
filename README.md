# Dominó Gardenal

Web app para registrar partidas e calcular estatísticas dos jogos de dominó dos amigos do condomínio Garden.

## Stack Tecnológico
- **Next.js 13** + React (TypeScript)
- **Node.js**
- **Firestore** (Firebase Admin SDK)
- **SHA-256 + token assinado custom em cookie HttpOnly** (autenticação)
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
- ✅ Finalização **manual** da partida (com confirmação)
- ✅ **Regra do Dominó**: quem chega a 100 pontos **GANHA**
- ✅ Marcação "Lisa" quando o time vencedor mantém o adversário com 0 pontos
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
- `POST /api/games/:id/rounds` - Adicionar rodada
- `POST /api/games/:id/finish` - Finalizar partida (manual)

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
- Variáveis de ambiente sensíveis (FIREBASE_PRIVATE_KEY) devem ser tratadas com cuidado.
