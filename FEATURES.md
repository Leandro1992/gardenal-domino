# Features - Gardenal Domino

## Visao geral
Aplicacao fullstack para gestao de partidas de domino com autenticacao, administracao de usuarios e analiticos de desempenho.

## Dominio (regras implementadas)
- Vence o time que atinge 100 pontos primeiro.
- Finalizacao da partida e manual.
- Lisa ocorre quando vencedor tem 100+ e perdedor termina com 0.
- Partida com 4 jogadores distintos, 2 por time.
- Jogador nao pode iniciar nova partida se ja estiver em partida ativa.

## Modulos funcionais

### 1) Autenticacao
- Login por email/senha.
- Token assinado em cookie HttpOnly.
- Logout com expiracao de cookie.
- Endpoint de sessao atual (me).

### 2) Perfil e conta
- Atualizacao de nome do usuario autenticado.
- Troca de senha com senha antiga obrigatoria.

### 3) Administracao (admin)
- Criar usuarios.
- Listar usuarios.
- Alterar nome de usuario.
- Redefinir senha.
- Alterar role (nao permite auto-alteracao do proprio role).

### 4) Jogos
- Criar partida.
- Listar partidas (com opcoes de pagina, filtros de escopo e cursor).
- Buscar partidas por jogador/data.
- Obter detalhe da partida.
- Adicionar rodada.
- Excluir rodada de jogo em andamento.
- Finalizar partida manualmente.
- Cancelar partida (admin).

### 5) Estatisticas
- Dashboard consolidado com partidas ativas e resumo do usuario.
- Estatisticas pessoais (vitorias, derrotas, lisas).
- Ranking geral e ranking modo lisa.
- Ranking de duplas (panela).

### 6) Interface
- Layout responsivo mobile-first.
- Navegacao com sidebar desktop e menu mobile.
- Paginas principais: dashboard, partidas, ranking, panela, settings e admin/users.

## Seguranca e dados
- Protecao de rotas por autenticacao no backend.
- Controle de acesso admin em endpoints administrativos.
- Firestore com transacoes em operacoes criticas (rodadas/finalizacao).
- Cache em memoria para reduzir carga em consultas recorrentes.

## Limitacoes conhecidas da implementacao atual
- Hash de senha atual usa SHA-256 (sem work factor de bcrypt/argon2).
- Endpoint de adicionar rodada nao valida no backend se usuario participa da partida.
- Endpoint de busca de jogos nao aplica cursor na query atual (cursor recebido, mas nao consumido).

## Proximas evolucoes recomendadas
- Migracao de hash para bcrypt/argon2 com estrategia progressiva.
- Testes automatizados para regras criticas de dominio.
- Correcoes de autorizacao e paginacao nas APIs citadas em limitacoes.
- Observabilidade (logs estruturados, correlation id e metricas).
