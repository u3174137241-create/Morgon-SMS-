import crypto from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "sl_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dagar

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET saknas eller är för kort — sätt en riktig hemlighet i miljövariablerna.");
  }
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: string, sessionVersion: number): string {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${sessionVersion}.${expires}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifySessionToken(
  token: string | undefined | null
): { userId: string; sessionVersion: number } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userId, sessionVersionStr, expiresStr, sig] = parts;
  if (!userId || !sessionVersionStr || !expiresStr || !sig) return null;
  const payload = `${userId}.${sessionVersionStr}.${expiresStr}`;
  const expectedSig = sign(payload);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  const expires = Number(expiresStr);
  const sessionVersion = Number(sessionVersionStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return null;
  if (!Number.isFinite(sessionVersion)) return null;
  return { userId, sessionVersion };
}

export async function setSessionCookie(userId: string, sessionVersion: number) {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(userId, sessionVersion), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<{ userId: string; sessionVersion: number } | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export { SESSION_COOKIE };
