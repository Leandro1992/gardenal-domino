import { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '@/lib/auth';
import FirebaseConnection from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';

const db = FirebaseConnection.getInstance().db;

interface GameData {
  id: string;
  mode?: 'free' | 'championship';
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

    // Interpret cursor as ISO timestamp (createdAt) for merged pagination across collections
    let cursorTimestamp: admin.firestore.Timestamp | null = null;
    if (typeof cursor === 'string' && cursor.trim()) {
      const parsed = new Date(cursor as string);
      if (!isNaN(parsed.getTime())) {
        cursorTimestamp = admin.firestore.Timestamp.fromDate(parsed);
      }
    }

    // Prepare queries for both collections
    let gamesQuery = db.collection('games').orderBy('createdAt', 'desc') as any;
    let champQuery = db.collection('championship_games').orderBy('createdAt', 'desc') as any;

    // Apply date range filters if provided
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      const startTimestamp = admin.firestore.Timestamp.fromDate(start);
      const endTimestamp = admin.firestore.Timestamp.fromDate(end);

      gamesQuery = gamesQuery.where('createdAt', '>=', startTimestamp).where('createdAt', '<=', endTimestamp);
      champQuery = champQuery.where('createdAt', '>=', startTimestamp).where('createdAt', '<=', endTimestamp);
    }

    // Apply cursor (createdAt < cursor) to both queries when provided
    if (cursorTimestamp) {
      gamesQuery = gamesQuery.where('createdAt', '<', cursorTimestamp);
      champQuery = champQuery.where('createdAt', '<', cursorTimestamp);
    }

    // Fetch snapshots (limit+1 from each collection to detect more results after merge)
    const [gamesSnap, champSnap] = await Promise.all([
      gamesQuery.limit(limit + 1).get(),
      champQuery.limit(limit + 1).get(),
    ]);

    const combined: { id: string; data: any; source: 'games' | 'championship' }[] = [];
    const userIds = new Set<string>();

    const pushDocs = (snap: FirebaseFirestore.QuerySnapshot, source: 'games' | 'championship') => {
      snap.forEach((doc) => {
        const data: any = doc.data();

        // Filter out finished if requested
        if (!shouldIncludeFinished && data.finished) return;

        // If playerId specified, filter by membership
        if (playerId) {
          const allPlayers = [...(data.teamA || []), ...(data.teamB || [])].map((p: any) => (typeof p === 'object' ? p : p));
          if (!allPlayers.includes(playerId)) return;
        }

        combined.push({ id: doc.id, data, source });

        // collect user ids
        (data.teamA || []).forEach((id: string) => userIds.add(id));
        (data.teamB || []).forEach((id: string) => userIds.add(id));
      });
    };

    pushDocs(gamesSnap, 'games');
    pushDocs(champSnap, 'championship');

    // Fetch users map
    const usersMap = await getUsersMap(Array.from(userIds));

    // Normalize entries and sort by createdAt desc
    const normalized = combined
      .map((entry) => {
        const d = entry.data;
        return {
          id: entry.id,
          source: entry.source,
          rawId: entry.id,
          createdAt: d.createdAt,
          mode: entry.source === 'championship' ? 'championship' : (d.mode || 'free'),
          teamA: (d.teamA || []).map((id: string) => ({ id, name: usersMap.get(id)?.name || 'Unknown' })),
          teamB: (d.teamB || []).map((id: string) => ({ id, name: usersMap.get(id)?.name || 'Unknown' })),
          scoreA: d.teamA_total || d.scoreA || 0,
          scoreB: d.teamB_total || d.scoreB || 0,
          finished: d.finished || false,
          winnerTeam: d.winnerTeam,
          lisa: (d.lisa && d.lisa.length > 0) || false,
        };
      })
      .sort((a, b) => {
        const at = a.createdAt && typeof a.createdAt.toDate === 'function' ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds || 0) * 1000;
        const bt = b.createdAt && typeof b.createdAt.toDate === 'function' ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds || 0) * 1000;
        return bt - at;
      });

    // Determine pagination
    const hasMore = normalized.length > limit;
    const docsToReturn = hasMore ? normalized.slice(0, limit) : normalized.slice(0);
    const getMillis = (ts: any) => {
      if (!ts) return 0;
      if (typeof ts.toDate === 'function') return ts.toDate().getTime();
      if (ts.seconds) return ts.seconds * 1000;
      if (ts._seconds) return ts._seconds * 1000;
      const parsed = new Date(ts);
      if (!isNaN(parsed.getTime())) return parsed.getTime();
      return 0;
    };
    const nextCursor = hasMore && docsToReturn.length > 0 ? new Date(getMillis(docsToReturn[docsToReturn.length - 1].createdAt)).toISOString() : null;

    const games: GameData[] = docsToReturn.map((g) => ({
      id: g.id,
      mode: g.mode as any,
      teamA: g.teamA,
      teamB: g.teamB,
      scoreA: g.scoreA,
      scoreB: g.scoreB,
      finished: g.finished,
      winnerTeam: g.winnerTeam,
      lisa: g.lisa,
      createdAt: g.createdAt,
    }));

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
