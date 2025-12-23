-- Schema para migração do Firestore para Supabase
-- Execute este script no SQL Editor do Supabase

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  password_hash TEXT NOT NULL,
  lisa_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice único para email (já criado pelo UNIQUE, mas explícito para performance)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Tabela de jogos
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  team_a UUID[] NOT NULL CHECK (array_length(team_a, 1) = 2),
  team_b UUID[] NOT NULL CHECK (array_length(team_b, 1) = 2),
  team_a_total INTEGER DEFAULT 0,
  team_b_total INTEGER DEFAULT 0,
  finished BOOLEAN DEFAULT FALSE,
  winner_team TEXT CHECK (winner_team IN ('A', 'B')) DEFAULT NULL,
  lisa UUID[] DEFAULT ARRAY[]::UUID[],
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para games
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_finished ON games(finished);
CREATE INDEX IF NOT EXISTS idx_games_created_by ON games(created_by);

-- Tabela de rodadas
CREATE TABLE IF NOT EXISTS rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  team_a_points INTEGER NOT NULL,
  team_b_points INTEGER NOT NULL,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para rounds
CREATE INDEX IF NOT EXISTS idx_rounds_game_id ON rounds(game_id);
CREATE INDEX IF NOT EXISTS idx_rounds_game_id_round_number ON rounds(game_id, round_number);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para adicionar round e atualizar game de forma atômica
CREATE OR REPLACE FUNCTION add_round_and_update_game(
  p_game_id UUID,
  p_team_a_points INTEGER,
  p_team_b_points INTEGER,
  p_recorded_by UUID
)
RETURNS JSON AS $$
DECLARE
  v_game RECORD;
  v_round_number INTEGER;
  v_new_team_a INTEGER;
  v_new_team_b INTEGER;
  v_finished BOOLEAN := FALSE;
  v_winner_team TEXT := NULL;
  v_lisa UUID[] := ARRAY[]::UUID[];
  v_round_id UUID;
BEGIN
  -- Buscar o jogo
  SELECT * INTO v_game FROM games WHERE id = p_game_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;
  
  IF v_game.finished THEN
    RAISE EXCEPTION 'Game already finished';
  END IF;
  
  -- Calcular número do round
  SELECT COALESCE(MAX(round_number), 0) + 1 INTO v_round_number
  FROM rounds
  WHERE game_id = p_game_id;
  
  -- Calcular novos totais
  v_new_team_a := v_game.team_a_total + p_team_a_points;
  v_new_team_b := v_game.team_b_total + p_team_b_points;
  
  -- Verificar condição de vitória
  IF v_new_team_a >= 100 OR v_new_team_b >= 100 THEN
    v_finished := TRUE;
    v_winner_team := CASE WHEN v_new_team_a >= 100 THEN 'B' ELSE 'A' END;
    
    -- Verificar lisa: só é lisa se o time PERDEDOR (que não chegou a 100) tem exatamente 0 pontos
    IF v_new_team_a >= 100 AND v_new_team_b = 0 THEN
      -- Time A chegou a 100, Time B perdeu com 0 pontos = Lisa para Time B
      v_lisa := v_game.team_b;
    ELSIF v_new_team_b >= 100 AND v_new_team_a = 0 THEN
      -- Time B chegou a 100, Time A perdeu com 0 pontos = Lisa para Time A
      v_lisa := v_game.team_a;
    END IF;
  END IF;
  
  -- Inserir round
  INSERT INTO rounds (game_id, round_number, team_a_points, team_b_points, recorded_by)
  VALUES (p_game_id, v_round_number, p_team_a_points, p_team_b_points, p_recorded_by)
  RETURNING id INTO v_round_id;
  
  -- Atualizar game
  UPDATE games
  SET
    team_a_total = v_new_team_a,
    team_b_total = v_new_team_b,
    finished = v_finished,
    winner_team = v_winner_team,
    lisa = CASE WHEN array_length(v_lisa, 1) > 0 THEN v_lisa ELSE NULL END,
    finished_at = CASE WHEN v_finished THEN NOW() ELSE finished_at END
  WHERE id = p_game_id;
  
  -- Retornar dados atualizados
  RETURN json_build_object(
    'ok', TRUE,
    'round_id', v_round_id,
    'round_number', v_round_number,
    'team_a_total', v_new_team_a,
    'team_b_total', v_new_team_b,
    'finished', v_finished,
    'winner_team', v_winner_team,
    'lisa', v_lisa
  );
END;
$$ LANGUAGE plpgsql;

-- Função para desfazer a última rodada e atualizar game
CREATE OR REPLACE FUNCTION undo_last_round(p_game_id UUID)
RETURNS JSON AS $$
DECLARE
  v_game RECORD;
  v_last_round RECORD;
  v_new_team_a INTEGER;
  v_new_team_b INTEGER;
  v_remaining_rounds INTEGER;
BEGIN
  -- Buscar o jogo
  SELECT * INTO v_game FROM games WHERE id = p_game_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;
  
  -- Buscar a última rodada (maior round_number)
  SELECT * INTO v_last_round
  FROM rounds
  WHERE game_id = p_game_id
  ORDER BY round_number DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No rounds to undo';
  END IF;
  
  -- Calcular novos totais (subtrair os pontos da última rodada)
  v_new_team_a := v_game.team_a_total - v_last_round.team_a_points;
  v_new_team_b := v_game.team_b_total - v_last_round.team_b_points;
  
  -- Verificar quantas rodadas restam
  SELECT COUNT(*) INTO v_remaining_rounds
  FROM rounds
  WHERE game_id = p_game_id;
  
  -- Deletar a última rodada
  DELETE FROM rounds
  WHERE id = v_last_round.id;
  
  -- Atualizar game: recalcular scores e status
  UPDATE games
  SET
    team_a_total = v_new_team_a,
    team_b_total = v_new_team_b,
    -- Se havia apenas 1 rodada e a partida estava finalizada, reverter status
    finished = CASE 
      WHEN v_remaining_rounds = 1 AND v_game.finished THEN FALSE
      WHEN v_new_team_a < 100 AND v_new_team_b < 100 THEN FALSE
      ELSE v_game.finished
    END,
    winner_team = CASE 
      WHEN v_new_team_a < 100 AND v_new_team_b < 100 THEN NULL
      ELSE v_game.winner_team
    END,
    lisa = CASE 
      WHEN v_new_team_a < 100 AND v_new_team_b < 100 THEN NULL
      ELSE v_game.lisa
    END,
    finished_at = CASE 
      WHEN v_new_team_a < 100 AND v_new_team_b < 100 THEN NULL
      ELSE v_game.finished_at
    END
  WHERE id = p_game_id;
  
  -- Retornar dados atualizados
  RETURN json_build_object(
    'ok', TRUE,
    'team_a_total', v_new_team_a,
    'team_b_total', v_new_team_b,
    'finished', CASE 
      WHEN v_remaining_rounds = 1 AND v_game.finished THEN FALSE
      WHEN v_new_team_a < 100 AND v_new_team_b < 100 THEN FALSE
      ELSE v_game.finished
    END
  );
END;
$$ LANGUAGE plpgsql;

