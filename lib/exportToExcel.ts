import * as XLSX from 'xlsx';

interface ExportData {
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  status: string;
  winner?: string;
  lisa: string;
  createdAt: string;
}

export function exportToExcel(games: any[], filename = 'partidas.xlsx') {
  const data: ExportData[] = games.map((game) => {
    const winner = game.finished
      ? game.winnerTeam || (game.scoreA >= 100 ? 'A' : 'B')
      : null;

    return {
      teamA: game.teamA.map((p: any) => p.name).join(' & '),
      teamB: game.teamB.map((p: any) => p.name).join(' & '),
      scoreA: game.scoreA,
      scoreB: game.scoreB,
      status: game.finished ? 'Finalizada' : 'Em Andamento',
      winner: winner ? `Time ${winner}` : '-',
      lisa: game.lisa ? 'Sim' : 'Não',
      createdAt: game.createdAt?.seconds
        ? new Date(game.createdAt.seconds * 1000).toLocaleString('pt-BR')
        : 'N/A',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: ['teamA', 'teamB', 'scoreA', 'scoreB', 'status', 'winner', 'lisa', 'createdAt'],
  });

  // Configurar largura das colunas
  worksheet['!cols'] = [
    { wch: 20 },
    { wch: 20 },
    { wch: 8 },
    { wch: 8 },
    { wch: 12 },
    { wch: 10 },
    { wch: 8 },
    { wch: 18 },
  ];

  // Configurar header com estilo (adicionar estilos básicos)
  const headerStyle = {
    font: { bold: true, color: 'FFFFFF' },
    fill: { fgColor: { rgb: 'FF0F3B75' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  // Aplicar estilo ao header
  for (let col = 0; col < 8; col++) {
    const cellRef = XLSX.utils.encode_col(col) + '1';
    if (worksheet[cellRef]) {
      worksheet[cellRef].s = headerStyle;
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Partidas');
  XLSX.writeFile(workbook, filename);
}
