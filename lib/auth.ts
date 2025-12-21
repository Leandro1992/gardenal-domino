import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextApiRequest } from "next";
import cookie from "cookie";
import { db } from "./firebaseAdmin";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};

export const signToken = (payload: object) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};

export const getTokenFromReq = (req: NextApiRequest) => {
  const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
  return cookies["gardenal_token"];
};

export const getCurrentUser = async (req: NextApiRequest) => {
  const token = getTokenFromReq(req);
  if (!token) return null;
  try {
    const decoded: any = verifyToken(token);
    const userSnap = await db.collection("users").doc(decoded.uid).get();
    if (!userSnap.exists) return null;
    const user = userSnap.data();
    return { id: userSnap.id, ...user };
  } catch (err) {
    return null;
  }
};
