# 🚀 Guia de Início Rápido - Interface

## Iniciando o Projeto

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
Certifique-se de que as variáveis de ambiente estão configuradas (veja README.md principal).

### 3. Rodar em Desenvolvimento
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`

### 4. Build para Produção
```bash
npm run build
npm start
```

## 🎨 Interface Implementada

### Design System
- **Tailwind CSS** para estilização responsiva
- **shadcn/ui** para componentes UI acessíveis e consistentes
- **Lucide React** para ícones consistentes
- Paleta de cores azul (#0ea5e9) como cor primária
- Componentes reutilizáveis em `components/ui/`

### Páginas Criadas

#### Públicas
- `/login` - Tela de autenticação

#### Protegidas (Requer Login)
- `/` - Dashboard principal
- `/games` - Lista de todas as partidas
- `/games/new` - Criar nova partida
- `/games/[id]` - Detalhes e gerenciamento da partida
- `/settings` - Configurações do usuário e troca de senha

#### Admin (Requer Role Admin)
- `/admin/users` - Gestão de usuários

## 📱 Mobile-First

A interface foi desenvolvida priorizando dispositivos móveis:

### Breakpoints
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md/lg)
- **Desktop**: > 1024px (lg+)

### Recursos Mobile
- Menu hambúrguer responsivo
- Touch-friendly (botões grandes)
- Layouts verticais otimizados
- Navegação por gestos

### Recursos Desktop
- Sidebar fixa
- Layouts em grid
- Maior densidade de informação
- Atalhos de teclado

## 🎯 Principais Funcionalidades

### Para Todos os Usuários
1. **Login/Logout** - Autenticação segura
2. **Dashboard** - Visão geral das partidas
3. **Criar Partida** - Selecionar 4 jogadores (2 por time)
4. **Registrar Rodadas** - Adicionar pontos durante o jogo
5. **Ver Histórico** - Todas as partidas e seus detalhes
6. **Trocar Senha** - Alterar senha pessoal

### Para Administradores
7. **Criar Usuários** - Adicionar novos jogadores
8. **Gerenciar Senhas** - Redefinir senha de qualquer usuário
9. **Ver Todos os Usuários** - Lista completa

## 🎮 Fluxo de Uso Típico

### Criar e Jogar uma Partida
1. Login no sistema
2. Click em "Nova Partida"
3. Selecionar 2 jogadores para Time A
4. Selecionar 2 jogadores para Time B
5. Click em "Criar Partida"
6. Adicionar rodadas clicando em "Bateu!" no card do time que fez pontos
7. Inserir os pontos do time que "bateu" (o adversário recebe 0 automaticamente)
8. Sistema finaliza automaticamente quando um time atinge 100 pontos
9. Marca "Lisa" se o time perdedor terminou com exatamente 0 pontos
10. É possível desfazer a última rodada clicando no botão de desfazer no histórico

### Administração
1. Login como admin
2. Navegar para "Usuários"
3. Click em "Novo Usuário"
4. Preencher dados (nome, email, senha, tipo)
5. Usuário criado e pronto para usar

## 🔑 Credenciais Padrão

Após rodar o seed do admin:
- **Email**: Valor de `DEFAULT_ADMIN_EMAIL` (env var)
- **Senha**: Valor de `DEFAULT_ADMIN_PASSWORD` (env var)

## 📦 Estrutura de Componentes

```
components/
├── Layout.tsx              # Layout principal com sidebar/menu
└── ui/
    ├── button.tsx          # Botões (shadcn/ui)
    ├── input.tsx           # Campos de formulário (shadcn/ui)
    ├── input-with-label.tsx # Wrapper para Input com label
    ├── card.tsx            # Cards (shadcn/ui)
    ├── dialog.tsx          # Modais (shadcn/ui)
    ├── dropdown-menu.tsx   # Menus dropdown (shadcn/ui)
    ├── form.tsx            # Formulários (shadcn/ui)
    ├── table.tsx           # Tabelas (shadcn/ui)
    ├── select.tsx          # Selects (shadcn/ui)
    ├── toast.tsx           # Notificações toast (shadcn/ui)
    ├── toaster.tsx         # Provider de toasts
    ├── tabs.tsx            # Abas (shadcn/ui)
    └── label.tsx           # Labels (shadcn/ui)
```

## 🎨 Customização

### Cores
Edite `tailwind.config.js` para alterar as cores primárias:
```js
colors: {
  primary: {
    // Suas cores aqui
  }
}
```

### Componentes
Todos os componentes em `components/ui/` podem ser customizados.

### Estilos Globais
Edite `styles/globals.css` para alterar estilos base.

## 🐛 Troubleshooting

### Página em branco após login
- Verifique se as APIs estão funcionando
- Cheque o console do navegador
- Confirme variáveis de ambiente

### Erro ao criar partida
- Verifique se há usuários cadastrados
- Confirme que selecionou 4 jogadores (2 por time)

### Build com warnings CSS
- Warnings do Tailwind (@apply, @tailwind) são normais
- Não afetam o funcionamento

## 📝 Próximos Passos

Após a interface estar funcionando:
1. Testar em diferentes dispositivos
2. Criar usuários de teste
3. Jogar algumas partidas de teste
4. Revisar e ajustar conforme necessário

## 🆘 Suporte

Consulte:
- `README.md` - Documentação principal
- `INTERFACE.md` - Documentação detalhada da interface
- `ISSUE.md` - Problemas conhecidos

---

**Desenvolvido com foco em simplicidade e usabilidade mobile-first** 📱
