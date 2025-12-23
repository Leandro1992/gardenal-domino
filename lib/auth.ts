import type { NextApiRequest } from "next";
import crypto from "crypto";
import cookie from "cookie";

// Minimal user type used by callers
export type CurrentUser = { id: string; role?: string };

// Verify and decode JWT token from cookie
export async function getCurrentUser(req: NextApiRequest): Promise<CurrentUser | null> {
  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.gardenal_token;
    
    if (!token) {
      console.log("No token found in cookies");
      return null;
    }

    // Verify token signature
    const [body, sig] = token.split(".");
    if (!body || !sig) {
      console.log("Invalid token format");
      return null;
    }

    const secret = process.env.JWT_SECRET || "change-me";
    const expectedSig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
    
    if (sig !== expectedSig) {
      console.log("Invalid token signature");
      return null;
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    
    if (!payload.uid) {
      console.log("Invalid token payload - missing uid");
      return null;
    }

    return { id: payload.uid, role: payload.role };
  } catch (error) {
    console.log("Error verifying token:", error);
    return null;
  }
}

// Simple async hash; replace with stronger hashing in production
export async function hashPassword(password: string): Promise<string> {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// New: compare plaintext with stored hash
export async function comparePassword(password: string, storedHash: string): Promise<boolean> {
  const candidate = await hashPassword(password);
  return candidate === storedHash;
}

// Minimal token signer (HMAC-SHA256 over base64url payload)
export function signToken(payload: Record<string, unknown>): string {
  const secret = process.env.JWT_SECRET || "change-me";
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}
