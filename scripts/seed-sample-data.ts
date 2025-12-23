import dotenv from 'dotenv';
dotenv.config();
import supabase from "../lib/supabase";
import { hashPassword } from "../lib/auth";

async function seedSampleData() {
  console.log("🌱 Iniciando seed de dados de exemplo...\n");

  // Criar usuários de exemplo
  const sampleUsers = [
    { email: "joao@example.com", name: "João Silva", role: "user" as const },
    { email: "maria@example.com", name: "Maria Santos", role: "user" as const },
    { email: "pedro@example.com", name: "Pedro Oliveira", role: "user" as const },
    { email: "ana@example.com", name: "Ana Costa", role: "user" as const },
    { email: "carlos@example.com", name: "Carlos Pereira", role: "user" as const },
    { email: "julia@example.com", name: "Julia Ferreira", role: "user" as const },
  ];

  const userIds: string[] = [];

  console.log("👥 Criando usuários...");
  for (const userData of sampleUsers) {
    // Verificar se usuário já existe
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", userData.email)
      .single();

    if (existingUser) {
      console.log(`  ✓ Usuário ${userData.name} já existe, pulando...`);
      userIds.push(existingUser.id);
      continue;
    }

    const passwordHash = await hashPassword("senha123"); // Senha padrão para todos
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        email: userData.email,
        name: userData.name,
        role: userData.role,
        password_hash: passwordHash,
        lisa_count: 0,
      })
      .select("id")
      .single();

    if (error) {
      console.error(`  ✗ Erro ao criar usuário ${userData.name}:`, error.message);
      continue;
    }

    console.log(`  ✓ Usuário criado: ${userData.name} (${newUser.id})`);
    userIds.push(newUser.id);
  }

  if (userIds.length < 4) {
    console.error("\n❌ É necessário pelo menos 4 usuários para criar partidas.");
    process.exit(1);
  }

  console.log(`\n✅ ${userIds.length} usuários prontos para uso\n`);

  // Criar partidas de exemplo
  console.log("🎮 Criando partidas...\n");

  // Partida 1: Em andamento
  console.log("📝 Criando partida 1 (em andamento)...");
  const { data: game1, error: game1Error } = await supabase
    .from("games")
    .insert({
      created_by: userIds[0],
      team_a: [userIds[0], userIds[1]],
      team_b: [userIds[2], userIds[3]],
      team_a_total: 45,
      team_b_total: 30,
      finished: false,
    })
    .select("id")
    .single();

  if (game1Error) {
    console.error("  ✗ Erro ao criar partida 1:", game1Error.message);
  } else {
    console.log(`  ✓ Partida 1 criada: ${game1.id}`);
    
    // Adicionar rounds para a partida 1
    const rounds1 = [
      { team_a_points: 15, team_b_points: 10 },
      { team_a_points: 20, team_b_points: 12 },
      { team_a_points: 10, team_b_points: 8 },
    ];

    for (let i = 0; i < rounds1.length; i++) {
      const round = rounds1[i];
      const { error: roundError } = await supabase.rpc("add_round_and_update_game", {
        p_game_id: game1.id,
        p_team_a_points: round.team_a_points,
        p_team_b_points: round.team_b_points,
        p_recorded_by: userIds[0],
      });

      if (roundError) {
        console.error(`    ✗ Erro ao adicionar round ${i + 1}:`, roundError.message);
      } else {
        console.log(`    ✓ Round ${i + 1} adicionado`);
      }
    }
  }

  // Partida 2: Finalizada (Time A venceu)
  console.log("\n📝 Criando partida 2 (finalizada - Time A venceu)...");
  const { data: game2, error: game2Error } = await supabase
    .from("games")
    .insert({
      created_by: userIds[1],
      team_a: [userIds[0], userIds[1]],
      team_b: [userIds[2], userIds[3]],
      team_a_total: 0,
      team_b_total: 0,
      finished: false,
    })
    .select("id")
    .single();

  if (game2Error) {
    console.error("  ✗ Erro ao criar partida 2:", game2Error.message);
  } else {
    console.log(`  ✓ Partida 2 criada: ${game2.id}`);
    
    // Adicionar rounds até finalizar (Time B chega a 100 primeiro, então Time A vence)
    const rounds2 = [
      { team_a_points: 20, team_b_points: 25 },
      { team_a_points: 15, team_b_points: 30 },
      { team_a_points: 10, team_b_points: 25 },
      { team_a_points: 5, team_b_points: 20 }, // Time B chega a 100, Time A vence
    ];

    for (let i = 0; i < rounds2.length; i++) {
      const round = rounds2[i];
      const { error: roundError } = await supabase.rpc("add_round_and_update_game", {
        p_game_id: game2.id,
        p_team_a_points: round.team_a_points,
        p_team_b_points: round.team_b_points,
        p_recorded_by: userIds[1],
      });

      if (roundError) {
        console.error(`    ✗ Erro ao adicionar round ${i + 1}:`, roundError.message);
      } else {
        console.log(`    ✓ Round ${i + 1} adicionado`);
      }
    }
  }

  // Partida 3: Finalizada com Lisa (Time A termina com 0 pontos)
  console.log("\n📝 Criando partida 3 (finalizada com Lisa)...");
  const { data: game3, error: game3Error } = await supabase
    .from("games")
    .insert({
      created_by: userIds[2],
      team_a: [userIds[4], userIds[5]],
      team_b: [userIds[0], userIds[1]],
      team_a_total: 0,
      team_b_total: 0,
      finished: false,
    })
    .select("id")
    .single();

  if (game3Error) {
    console.error("  ✗ Erro ao criar partida 3:", game3Error.message);
  } else {
    console.log(`  ✓ Partida 3 criada: ${game3.id}`);
    
    // Adicionar rounds até finalizar com Lisa (Time A termina com 0)
    const rounds3 = [
      { team_a_points: 0, team_b_points: 30 },
      { team_a_points: 0, team_b_points: 35 },
      { team_a_points: 0, team_b_points: 35 }, // Time B chega a 100, Time A tem 0 (Lisa!)
    ];

    for (let i = 0; i < rounds3.length; i++) {
      const round = rounds3[i];
      const { error: roundError } = await supabase.rpc("add_round_and_update_game", {
        p_game_id: game3.id,
        p_team_a_points: round.team_a_points,
        p_team_b_points: round.team_b_points,
        p_recorded_by: userIds[2],
      });

      if (roundError) {
        console.error(`    ✗ Erro ao adicionar round ${i + 1}:`, roundError.message);
      } else {
        console.log(`    ✓ Round ${i + 1} adicionado`);
      }
    }
  }

  // Partida 4: Em andamento (mais recente)
  console.log("\n📝 Criando partida 4 (em andamento)...");
  const { data: game4, error: game4Error } = await supabase
    .from("games")
    .insert({
      created_by: userIds[3],
      team_a: [userIds[2], userIds[3]],
      team_b: [userIds[4], userIds[5]],
      team_a_total: 0,
      team_b_total: 0,
      finished: false,
    })
    .select("id")
    .single();

  if (game4Error) {
    console.error("  ✗ Erro ao criar partida 4:", game4Error.message);
  } else {
    console.log(`  ✓ Partida 4 criada: ${game4.id}`);
    
    // Adicionar alguns rounds
    const rounds4 = [
      { team_a_points: 12, team_b_points: 18 },
      { team_a_points: 15, team_b_points: 10 },
    ];

    for (let i = 0; i < rounds4.length; i++) {
      const round = rounds4[i];
      const { error: roundError } = await supabase.rpc("add_round_and_update_game", {
        p_game_id: game4.id,
        p_team_a_points: round.team_a_points,
        p_team_b_points: round.team_b_points,
        p_recorded_by: userIds[3],
      });

      if (roundError) {
        console.error(`    ✗ Erro ao adicionar round ${i + 1}:`, roundError.message);
      } else {
        console.log(`    ✓ Round ${i + 1} adicionado`);
      }
    }
  }

  console.log("\n✅ Seed de dados de exemplo concluído!");
  console.log("\n📋 Resumo:");
  console.log(`   - ${userIds.length} usuários criados/verificados`);
  console.log("   - 4 partidas criadas");
  console.log("   - Rounds adicionados às partidas");
  console.log("\n🔑 Senha padrão para todos os usuários: senha123");
  console.log("\n💡 Você pode fazer login com qualquer um dos emails criados.");
  
  process.exit(0);
}

seedSampleData().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

