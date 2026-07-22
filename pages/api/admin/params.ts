import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";
import FirebaseConnection from "../../../lib/firebaseAdmin";
import * as admin from "firebase-admin";
import { clearCache, getCache, setCache } from "../../../lib/serverCache";
import { SystemParams, DEFAULT_PARAMS } from "../../../types/championship";

const db = FirebaseConnection.getInstance().db;
const PARAMS_CACHE_KEY = "params:config";
const PARAMS_CACHE_TTL = 5 * 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: "Not authenticated" });
  if (current.role !== "admin") return res.status(403).json({ error: "Apenas administradores" });

  const ref = db.collection("system_params").doc("config");

  if (req.method === "GET") {
    const cached = getCache<SystemParams>(PARAMS_CACHE_KEY);
    if (cached) return res.json({ params: cached });

    const snap = await ref.get();
    const params: SystemParams = snap.exists
      ? { ...DEFAULT_PARAMS, ...(snap.data() as SystemParams) }
      : DEFAULT_PARAMS;

    setCache(PARAMS_CACHE_KEY, params, PARAMS_CACHE_TTL);
    return res.json({ params });
  }

  if (req.method === "PUT") {
    const { minGamesForMonthlyRanking, maxPartnerRepetitionsPerMonth } = req.body || {};

    if (
      typeof minGamesForMonthlyRanking !== "number" ||
      minGamesForMonthlyRanking < 1 ||
      minGamesForMonthlyRanking > 100
    ) {
      return res.status(400).json({ error: "minGamesForMonthlyRanking deve ser entre 1 e 100" });
    }

    if (
      typeof maxPartnerRepetitionsPerMonth !== "number" ||
      maxPartnerRepetitionsPerMonth < 1 ||
      maxPartnerRepetitionsPerMonth > 50
    ) {
      return res.status(400).json({ error: "maxPartnerRepetitionsPerMonth deve ser entre 1 e 50" });
    }

    const updated: SystemParams = {
      minGamesForMonthlyRanking,
      maxPartnerRepetitionsPerMonth,
      updatedAt: admin.firestore.Timestamp.now(),
      updatedBy: current.id,
    };

    await ref.set(updated, { merge: true });
    clearCache(PARAMS_CACHE_KEY);

    return res.json({ params: updated });
  }

  return res.status(405).end();
}
