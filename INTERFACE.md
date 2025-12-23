# Interface do Gardenal Domino

## 📱 Design Mobile-First

A interface foi desenvolvida com foco em dispositivos móveis, garantindo uma experiência otimizada em smartphones e tablets, com suporte total para desktop.

## 🎨 Design System

- **Tailwind CSS**: Framework CSS utility-first para estilização responsiva
- **shadcn/ui**: Componentes UI acessíveis e customizáveis baseados em Radix UI
- **Lucide React**: Ícones modernos e consistentes
- **Cores primárias**: Azul (#0ea5e9) como cor principal
- **Componentes**: Sistema de componentes reutilizáveis baseado em shadcn/ui

## 📄 Páginas Implementadas

### 1. Login (`/login`)
- Tela de autenticação com email e senha
- Validação de formulário
- Feedback de erros
- Design responsivo e acessível

### 2. Dashboard (`/`)
- Visão geral das partidas
- Cards de estatísticas (Total, Em Andamento, Finalizadas)
- Lista de partidas ativas
- Histórico de partidas recentes
- Acesso rápido para criar nova partida

### 3. Nova Partida (`/games/new`)
- Seleção de 4 jogadores (2 por time)
- Interface intuitiva para formação de times
- Validação automática (2 jogadores por time)
- Feedback visual da seleção

### 4. Detalhes da Partida (`/games/[id]`)
- Placar em tempo real
- Botões "Bateu!" em cada card de time para adicionar rodadas
- Input para pontos do time que "bateu" (adversário recebe 0 automaticamente)
- Histórico completo de todas as rodadas (ordem reversa: mais recente primeiro)
- Botão para desfazer última rodada (apenas na última rodada do histórico)
- Indicador de vitória (quando finalizada)
- Badge especial para vitória "Lisa" (quando time perdedor tem 0 pontos)
- Animação especial quando uma partida termina em lisa

### 5. Todas as Partidas (`/games`)
- Lista completa de todas as partidas
- Filtros: Todas, Em Andamento, Finalizadas
- Cards com informações resumidas
- Indicadores visuais de status

### 6. Gestão de Usuários (`/admin/users`) *Apenas Admin*
- Criação de novos usuários
- Lista de todos os usuários
- Redefinição de senha
- Identificação visual de tipo de conta

### 7. Configurações (`/settings`)
- Informações do perfil
- Alteração de senha
- Informações da aplicação

## 🎯 Recursos de UX

### Responsividade
- **Mobile (< 640px)**: Menu hambúrguer, layout vertical
- **Tablet (640px - 1024px)**: Layout adaptado
- **Desktop (> 1024px)**: Sidebar fixa, layout horizontal

### Navegação
- **Mobile**: Menu hambúrguer no topo
- **Desktop**: Sidebar persistente à esquerda
- Breadcrumbs visuais com botões de voltar
- Links contextuais entre páginas

### Feedback Visual
- Loading states com spinners
- Mensagens de sucesso/erro
- Badges de status
- Cores semânticas (verde = sucesso, vermelho = erro, etc.)

### Componentes Reutilizáveis (shadcn/ui)

#### Button
```tsx
<Button variant="default" size="sm">
  Texto do Botão
</Button>
```
Variantes: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
Tamanhos: `sm`, `md`, `lg`, `icon`

#### InputWithLabel
```tsx
<InputWithLabel
  label="Email"
  type="email"
  error="Mensagem de erro"
  placeholder="Placeholder"
/>
```

#### Card
```tsx
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>
    Conteúdo
  </CardContent>
</Card>
```

#### Toast (Notificações)
```tsx
import { useToast } from "@/hooks/use-toast"

const { toast } = useToast()

toast({
  title: "Sucesso!",
  description: "Operação realizada com sucesso",
})
```

Todos os componentes seguem o padrão shadcn/ui e podem ser customizados através de classes Tailwind.

## 🔐 Controle de Acesso

- Páginas protegidas com redirecionamento automático
- Verificação de autenticação em todas as rotas
- Páginas exclusivas para admin:
  - `/admin/users`

## 📊 Estados da Aplicação

### Loading
- Skeleton screens
- Spinners durante requisições
- Estados vazios com CTAs

### Erros
- Mensagens contextuais
- Cores de destaque
- Instruções claras

### Sucesso
- Feedback positivo
- Redirecionamentos automáticos
- Mensagens temporárias

## 🎮 Fluxo de Uso

### Usuário Comum
1. Login
2. Visualizar dashboard
3. Ver partidas existentes
4. Criar nova partida (se tiver permissão)
5. Registrar rodadas
6. Alterar senha em configurações

### Administrador
1. Todos os recursos do usuário comum
2. Criar/gerenciar usuários
3. Redefinir senhas de outros usuários
4. Acesso completo ao sistema

## 🌐 API Integration

Todas as páginas estão integradas com as APIs documentadas no README principal:

- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Dados do usuário
- `POST /api/auth/change-password` - Trocar senha
- `POST /api/admin/users` - Criar usuário (admin)
- `PUT /api/admin/users/:id/password` - Alterar senha (admin)
- `POST /api/games` - Criar partida
- `GET /api/games` - Listar partidas
- `GET /api/games/:id` - Detalhes da partida
- `POST /api/games/:id/rounds` - Adicionar rodada
- `DELETE /api/games/:id/rounds` - Desfazer última rodada
- `GET /api/games/:id/rounds` - Listar rodadas

## 🚀 Próximos Passos (Melhorias Futuras)

- [ ] Estatísticas de jogadores
- [ ] Gráficos de desempenho
- [ ] Sistema de notificações
- [ ] Modo escuro
- [ ] PWA (Progressive Web App)
- [ ] Exportação de dados
- [ ] Filtros avançados
- [ ] Busca de partidas

## 💡 Tecnologias Utilizadas

- **Next.js 13**: Framework React
- **TypeScript**: Tipagem estática
- **Tailwind CSS**: Estilização
- **Lucide React**: Ícones
- **clsx + tailwind-merge**: Utilitários CSS
