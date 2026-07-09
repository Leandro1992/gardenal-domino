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

type SourceCollection = 'games' | 'championship';

function getTeamPlayerIds(team: any[]): string[] {
  if (!Array.isArray(team)) return [];
  return team
    .map((player) => (typeof player === 'string' ? player : player?.id))
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
}

function getCreatedAtMillis(createdAt: any): number {
  if (!createdAt) return 0;
  if (typeof createdAt.toDate === 'function') return createdAt.toDate().getTime();
  if (typeof createdAt.seconds === 'number') return createdAt.seconds * 1000;
  if (typeof createdAt._seconds === 'number') return createdAt._seconds * 1000;
  const parsed = new Date(createdAt);
  return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
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
    res.setHeader('Cache-Control', 'no-store');

    const {
      playerId,
      mode,
      startDate,
      endDate,
      pageSize = '20',
      cursor,
      includeFinished = 'true',
    } = req.query;

    const limit = Math.min(parseInt(pageSize as string) || 20, 100);
    const shouldIncludeFinished = includeFinished !== 'false';
    const targetPlayerId = typeof playerId === 'string' ? playerId : '';
    const selectedMode =
      mode === 'free' || mode === 'championship'
        ? mode
        : 'all';

    // Interpret cursor as ISO timestamp (createdAt) for merged pagination across collections
    let cursorTimestamp: admin.firestore.Timestamp | null = null;
    if (typeof cursor === 'string' && cursor.trim()) {
      const parsed = new Date(cursor as string);
      if (!isNaN(parsed.getTime())) {
        cursorTimestamp = admin.firestore.Timestamp.fromDate(parsed);
      }
    }

    // Prepare queries for collections according to selected mode
    const queries: Array<{ source: SourceCollection; query: any }> = [];
    if (selectedMode !== 'championship') {
      queries.push({
        source: 'games',
        query: db.collection('games').orderBy('createdAt', 'desc') as any,
      });
    }
    if (selectedMode !== 'free') {
      queries.push({
        source: 'championship',
        query: db.collection('championship_games').orderBy('createdAt', 'desc') as any,
      });
    }

    // Apply date filters (supports start-only, end-only, or both)
    let startTimestamp: admin.firestore.Timestamp | null = null;
    let endTimestamp: admin.firestore.Timestamp | null = null;

    if (typeof startDate === 'string' && startDate.trim()) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (!isNaN(start.getTime())) {
        startTimestamp = admin.firestore.Timestamp.fromDate(start);
      }
    }

    if (typeof endDate === 'string' && endDate.trim()) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (!isNaN(end.getTime())) {
        endTimestamp = admin.firestore.Timestamp.fromDate(end);
      }
    }

    const hasDatabaseSearchFilters = Boolean(targetPlayerId || startTimestamp || endTimestamp);
    const combined: { id: string; data: any; source: SourceCollection }[] = [];
    const userIds = new Set<string>();
    const cursorMillis = cursorTimestamp ? cursorTimestamp.toMillis() : 0;

    const pushDocs = (
      docs: Array<{ id: string; data: any }>,
      source: SourceCollection
    ) => {
      docs.forEach(({ id, data }) => {
        // Filter out finished if requested
        if (!shouldIncludeFinished && data.finished) return;

        // If playerId specified, filter by membership
        if (targetPlayerId) {
          const allPlayers = [...getTeamPlayerIds(data.teamA || []), ...getTeamPlayerIds(data.teamB || [])];
          if (!allPlayers.includes(targetPlayerId)) return;
        }

        combined.push({ id, data, source });

        // collect user ids
        getTeamPlayerIds(data.teamA || []).forEach((id) => userIds.add(id));
        getTeamPlayerIds(data.teamB || []).forEach((id) => userIds.add(id));
      });
    };

    if (hasDatabaseSearchFilters) {
      const allDocsBySource = await Promise.all(
        queries.map(async ({ source }) => {
          const collectionName = source === 'championship' ? 'championship_games' : 'games';
          let scopedQuery: any = db.collection(collectionName);
          if (!shouldIncludeFinished) scopedQuery = scopedQuery.where('finished', '==', false);
          if (startTimestamp) scopedQuery = scopedQuery.where('createdAt', '>=', startTimestamp);
          if (endTimestamp) scopedQuery = scopedQuery.where('createdAt', '<=', endTimestamp);

          try {
            const snap = await scopedQuery.get();
            return {
              source,
              docs: snap.docs.map((doc) => ({ id: doc.id, data: doc.data() })),
            };
          } catch {
            const fallbackSnap = await db.collection(collectionName).get();
            const docs = fallbackSnap.docs
              .map((doc) => ({ id: doc.id, data: doc.data() }))
              .filter(({ data }) => {
                if (!shouldIncludeFinished && data.finished) return false;
                const createdAtMillis = getCreatedAtMillis(data.createdAt);
                if (startTimestamp && createdAtMillis < startTimestamp.toMillis()) return false;
                if (endTimestamp && createdAtMillis > endTimestamp.toMillis()) return false;
                return true;
              });
            return { source, docs };
          }
        })
      );

      allDocsBySource.forEach(({ source, docs }) => pushDocs(docs, source));
    } else {
      const snapshots = await Promise.all(
        queries.map(async ({ source, query }) => {
          let scopedQuery = query;
          if (!shouldIncludeFinished) scopedQuery = scopedQuery.where('finished', '==', false);
          if (cursorTimestamp) scopedQuery = scopedQuery.where('createdAt', '<', cursorTimestamp);
          const snap = await scopedQuery.limit(limit + 1).get();
          return { source, docs: snap.docs.map((doc) => ({ id: doc.id, data: doc.data() })) };
        })
      );

      snapshots.forEach(({ source, docs }) => pushDocs(docs, source));
    }

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
          teamA: getTeamPlayerIds(d.teamA || []).map((id: string) => ({ id, name: usersMap.get(id)?.name || 'Unknown' })),
          teamB: getTeamPlayerIds(d.teamB || []).map((id: string) => ({ id, name: usersMap.get(id)?.name || 'Unknown' })),
          scoreA: d.teamA_total || d.scoreA || 0,
          scoreB: d.teamB_total || d.scoreB || 0,
          finished: d.finished || false,
          winnerTeam: d.winnerTeam,
          lisa: (d.lisa && d.lisa.length > 0) || false,
        };
      })
      .sort((a, b) => {
        const at = getCreatedAtMillis(a.createdAt);
        const bt = getCreatedAtMillis(b.createdAt);
        return bt - at;
      });

    const cursorFiltered = cursorMillis > 0
      ? normalized.filter((entry) => getCreatedAtMillis(entry.createdAt) < cursorMillis)
      : normalized;

    // Determine pagination
    const hasMore = cursorFiltered.length > limit;
    const docsToReturn = hasMore ? cursorFiltered.slice(0, limit) : cursorFiltered.slice(0);
    const nextCursor = hasMore && docsToReturn.length > 0
      ? new Date(getCreatedAtMillis(docsToReturn[docsToReturn.length - 1].createdAt)).toISOString()
      : null;

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
