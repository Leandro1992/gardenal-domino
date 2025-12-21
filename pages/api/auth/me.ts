import { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUser } from "../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  const { passwordHash, ...safe } = user as any;
  res.json({ user: safe });
}
