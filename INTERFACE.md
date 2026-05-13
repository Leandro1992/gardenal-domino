# Interface - Gardenal Domino

## Direcao de UX
- Mobile-first.
- Fluxo orientado a operacao rapida de partida.
- Feedback claro para estados de loading, erro e sucesso.

## Rotas de pagina
- /login
- /
- /games
- /games/new
- /games/[id]
- /ranking
- /panela
- /settings
- /admin/users (admin)

## Navegacao
- Mobile: menu hamburguer.
- Desktop: sidebar fixa.
- Secoes principais: Inicio, Partidas, Ranking, Panela, Configuracoes e Usuarios (admin).

## Componentes base
- Layout
- ui/Button
- ui/Input
- ui/Card
- ui/Alert
- ui/Loading
- ui/Modal
- ui/Select

## Comportamentos principais em tela
- Dashboard mostra resumo de partidas ativas e estatisticas do usuario.
- Tela de partidas suporta filtros e busca.
- Detalhe da partida permite registrar rodada, finalizar manualmente e excluir rodadas em jogo ativo.
- Ranking exibe score consolidado e ranking por lisa.
- Panela exibe pares com maior frequencia em jogos finalizados.

## Consistencia com regras de negocio
- UI deve sempre refletir que 100 pontos significa vitoria.
- Finalizacao exige acao explicita do usuario.
- Indicacao de Lisa segue vencedor 100+ e adversario 0.

## Nota de manutencao
Este documento substitui versoes antigas com regras de pontuacao divergentes.
