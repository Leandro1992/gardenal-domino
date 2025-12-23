# 🎨 Identidade Visual - Gardenal Domino

## Paleta de Cores

### 🔴 Vermelho Institucional (Primária)
- **HEX**: `#E20407`
- **RGB**: `226, 4, 7`
- **Uso**: Botões primários, CTAs, alertas importantes, ações principais

### 🔵 Azul Escuro (Secundária)
- **HEX**: `#0F3B75`
- **RGB**: `15, 59, 117`
- **Uso**: Cabeçalho, menu lateral, títulos, links principais, elementos de navegação

### 🟡 Bege Claro (Background)
- **HEX**: `#FCFCFB`
- **RGB**: `252, 252, 251`
- **Uso**: Fundo geral do sistema, áreas principais

### 🟤 Bege Médio (Apoio)
- **HEX**: `#C9BAA2`
- **RGB**: `201, 186, 162`
- **Uso**: Cards, divisórias, bordas, áreas secundárias

### ⭐ Marrom Dourado (Detalhes)
- **HEX**: `#9F7F4D`
- **RGB**: `159, 127, 77`
- **Uso**: Ícones, badges, estados hover, detalhes premium

## Assets Necessários

Certifique-se de que os seguintes arquivos estão na pasta `public/`:

- ✅ `logo.png` - Logo completa (fundo transparente, ~200x60px)
- ✅ `logo-icon.png` - Ícone/símbolo (fundo transparente, ~32x32px ou maior)
- ✅ `favicon.png` - Favicon (16x16px, 32x32px)

## Aplicação no Sistema

### Tailwind Config
As cores foram configuradas no `tailwind.config.js`:
- `primary.*` - Vermelho institucional
- `secondary.*` - Azul escuro
- `accent.*` - Tons de bege e marrom

### Componentes Atualizados
- ✅ Button - Cores primárias e secundárias
- ✅ Input - Bordas e foco
- ✅ Card - Bordas e backgrounds
- ✅ Layout - Menu lateral e header
- ✅ Login - Tela de entrada

### Exemplos de Uso

```tsx
// Botão primário (vermelho)
<Button variant="primary">Criar Partida</Button>

// Botão secundário (borda bege)
<Button variant="secondary">Cancelar</Button>

// Card com borda bege
<Card>...</Card>

// Input com foco azul
<Input label="Email" />
```

## Hierarquia Visual

1. **Navegação**: Azul escuro (#0F3B75)
2. **Ações Principais**: Vermelho (#E20407)
3. **Conteúdo**: Fundo bege claro (#FCFCFB)
4. **Separadores**: Bege médio (#C9BAA2)
5. **Destaques**: Marrom dourado (#9F7F4D)

## Acessibilidade

- Contraste adequado entre texto e fundo
- Cores não são o único indicador de informação
- Estados hover e focus bem definidos
- Suporte a modo claro (padrão)

---

**Desenvolvido para o Gardenal com identidade visual harmônica** 🎨
