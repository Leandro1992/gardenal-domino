import { NextApiRequest, NextApiResponse } from "next";
import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getCurrentUser } from "../../lib/auth";
import { getCache, setCache } from "../../lib/serverCache";

const LIST_CACHE_TTL = 30 * 1000;
const URL_EXPIRES_SECONDS = 60 * 60;
const MAX_VIDEOS = 100;

let client: S3Client | null = null;

function getClient(): S3Client | null {
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return null;
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      forcePathStyle: true,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    });
  }
  return client;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: "Not authenticated" });
  if (req.method !== "GET") return res.status(405).end();

  const s3 = getClient();
  const bucket = process.env.R2_BUCKET;
  if (!s3 || !bucket) {
    return res.status(503).json({ error: "Armazenamento de vídeos não configurado" });
  }

  const prefix = process.env.R2_PREFIX ?? "clips/";
  const cacheKey = `lances:${bucket}:${prefix}`;
  const cached = getCache<any>(cacheKey);
  if (cached) return res.json(cached);

  try {
    const objects: { key: string; size: number; lastModified: string }[] = [];
    let token: string | undefined;
    do {
      const page = await s3.send(
        new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token })
      );
      for (const item of page.Contents ?? []) {
        if (item.Key && item.Key.toLowerCase().endsWith(".mp4") && item.LastModified) {
          objects.push({ key: item.Key, size: item.Size ?? 0, lastModified: item.LastModified.toISOString() });
        }
      }
      token = page.NextContinuationToken;
    } while (token);

    objects.sort((a, b) => b.lastModified.localeCompare(a.lastModified));

    const videos = await Promise.all(
      objects.slice(0, MAX_VIDEOS).map(async (object) => ({
        ...object,
        name: object.key.split("/").pop() ?? object.key,
        url: await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: object.key }), {
          expiresIn: URL_EXPIRES_SECONDS,
        }),
      }))
    );

    const result = { videos, total: objects.length };
    setCache(cacheKey, result, LIST_CACHE_TTL);
    return res.json(result);
  } catch (error) {
    console.error("Erro ao listar lances:", error);
    return res.status(502).json({ error: "Não foi possível listar os vídeos" });
  }
}