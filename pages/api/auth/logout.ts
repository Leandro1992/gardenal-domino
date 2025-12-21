import { NextApiRequest, NextApiResponse } from "next";
import cookie from "cookie";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader(
    "Set-Cookie",
    cookie.serialize("gardenal_token", "", {
      httpOnly: true,
      path: "/",
      maxAge: -1,
    })
  );
  res.json({ ok: true });
}
