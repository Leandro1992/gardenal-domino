# Configuração do Supabase

## Passos para configurar o banco de dados

1. **Acesse o SQL Editor do Supabase**
   - Vá para o painel do seu projeto no Supabase
   - Navegue até "SQL Editor" no menu lateral

2. **Execute o schema SQL**
   - Abra o arquivo `schema.sql` neste diretório
   - Copie todo o conteúdo
   - Cole no SQL Editor do Supabase
   - Clique em "Run" para executar

3. **Verifique as tabelas criadas**
   - Vá para "Table Editor" no menu lateral
   - Você deve ver as seguintes tabelas:
     - `users`
     - `games`
     - `rounds`

4. **Configure as variáveis de ambiente**
   - No seu projeto, configure:
     - `SUPABASE_URL` - Encontre em Settings > API > Project URL
     - `SUPABASE_SERVICE_ROLE_KEY` - Encontre em Settings > API > service_role (secret)

## Estrutura do Banco de Dados

### Tabela `users`
- Armazena informações dos usuários
- Campos: id, email, name, role, password_hash, lisa_count, created_at, updated_at

### Tabela `games`
- Armazena informações das partidas
- Campos: id, created_by, team_a, team_b, team_a_total, team_b_total, finished, winner_team, lisa, finished_at, created_at, updated_at
- **Nota**: O campo `lisa` é um array de UUIDs (ou `null`), contendo os IDs dos jogadores que fizeram lisa (quando o time perdedor terminou com 0 pontos)

### Tabela `rounds`
- Armazena as rodadas de cada partida (tabela separada para melhor normalização)
- Campos: id, game_id, round_number, team_a_points, team_b_points, recorded_by, recorded_at

## Funções RPC

O schema inclui duas funções RPC que garantem atomicidade nas operações:

### `add_round_and_update_game`
Adiciona uma rodada e atualiza o jogo atomicamente:
- Verifica se o jogo existe e não está finalizado
- Calcula o número do round automaticamente
- Atualiza os scores
- Verifica condições de vitória e lisa (marca lisa apenas se o time perdedor tem 0 pontos)
- Retorna os dados atualizados

### `undo_last_round`
Desfaz a última rodada de um jogo:
- Remove a última rodada (maior `round_number`)
- Recalcula os scores subtraindo os pontos da rodada removida
- Reverte o status `finished` se a rodada removida era a que finalizou o jogo
- Limpa campos `winner_team`, `lisa` e `finished_at` se necessário
- Retorna os dados atualizados

## Notas Importantes

- O Service Role Key permite bypass de Row Level Security (RLS), necessário para operações server-side
- Todos os timestamps são armazenados com timezone (TIMESTAMP WITH TIME ZONE)
- Os triggers atualizam automaticamente o campo `updated_at` quando registros são modificados

