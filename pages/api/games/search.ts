import { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '@/lib/auth';
import FirebaseConnection from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

const db = FirebaseConnection.getInstance().db;

interface GameData {
  id: string;
  teamA: { id: string; name: string }[];
  teamB: { id: string; name: string }[];
  scoreA: number;
  scoreB: number;
  finished: boolean;
  winnerTeam?: 'A' | 'B';
  lisa: boolean;
  createdAt: any;
}

async function getUsersMap(userIds: string[]) {
  const usersMap = new Map<string, { id: string; name: string }>();
  const uniqueIds = Array.from(new Set(userIds));

  const userDocs = await Promise.all(
    uniqueIds.map((id) => db.collection('users').doc(id).get())
  );

  userDocs.forEach((doc) => {
    if (!doc.exists) return;
    const data: any = doc.data();
    const user = { id: doc.id, name: data?.name || data?.email || 'Unknown' };
    usersMap.set(doc.id, user);
  });

  return usersMap;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: 'Not authenticated' });

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      playerId,
      startDate,
      endDate,
      pageSize = '20',
      cursor,
      includeFinished = 'true',
    } = req.query;

    const limit = Math.min(parseInt(pageSize as string) || 20, 100);
    const shouldIncludeFinished = includeFinished !== 'false';

    // Base query: ordem por data (mais recente primeiro)
    let baseQuery: any = db.collection('games').orderBy('createdAt', 'desc');

    // Aplicar filtros de data se fornecidos
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      const startTimestamp = admin.firestore.Timestamp.fromDate(start);
      const endTimestamp = admin.firestore.Timestamp.fromDate(end);

      baseQuery = baseQuery
        .where('createdAt', '>=', startTimestamp)
        .where('createdAt', '<=', endTimestamp);
    } else if (playerId) {
      // Se apenas playerId, aplicar sem range de data
      // Para performance, buscar player em teamA e teamB separadamente, então combinar
    }

    // Buscar games (um pouco mais que limit para ter o cursor next)
    let snapshot = await baseQuery.limit(limit + 1).get();
    const games: GameData[] = [];
    let nextCursor: string | null = null;

    // Se temos mais docs que o limit, o último não é incluído (será usado como cursor)
    const hasMore = snapshot.docs.length > limit;
    const docsToProcess = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

    // Buscar user data e processar games
    const userIds = new Set<string>();
    const gamesByPlayerId = new Map<string, any>();

    docsToProcess.forEach((doc) => {
      const data: any = doc.data();
      
      // Filtrar por finished status se necessário
      if (!shouldIncludeFinished && data.finished) {
        return;
      }

      // Se playerId foi especificado, filtrar por ele
      if (playerId) {
        const allPlayers = [...(data.teamA || []), ...(data.teamB || [])];
        if (!allPlayers.includes(playerId)) {
          return;
        }
      }

      gamesByPlayerId.set(doc.id, { id: doc.id, ...data });

      // Coletar user IDs
      (data.teamA || []).forEach((id: string) => userIds.add(id));
      (data.teamB || []).forEach((id: string) => userIds.add(id));
    });

    // Buscar mapa de usuários
    const usersMap = await getUsersMap(Array.from(userIds));

    // Montar resposta formatada
    gamesByPlayerId.forEach((data, gameId) => {
      const teamA = (data.teamA || []).map((id: string) => ({
        id,
        name: usersMap.get(id)?.name || 'Unknown',
      }));
      const teamB = (data.teamB || []).map((id: string) => ({
        id,
        name: usersMap.get(id)?.name || 'Unknown',
      }));

      games.push({
        id: gameId,
        teamA,
        teamB,
        scoreA: data.teamA_total || 0,
        scoreB: data.teamB_total || 0,
        finished: data.finished || false,
        winnerTeam: data.winnerTeam,
        lisa: (data.lisa && data.lisa.length > 0) || false,
        createdAt: data.createdAt,
      });
    });

    // Gerar next cursor
    if (hasMore && snapshot.docs.length > limit) {
      const lastDoc = snapshot.docs[limit];
      nextCursor = lastDoc.id;
    }

    return res.status(200).json({
      games,
      nextCursor,
      hasMore,
      count: games.length,
    });
  } catch (error: any) {
    console.error('Error searching games:', error);
    return res.status(500).json({ error: 'Failed to search games' });
  }
}
