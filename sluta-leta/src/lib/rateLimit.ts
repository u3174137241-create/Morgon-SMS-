// Databaslagrad rate limiter (delad mellan alla serverless-instanser via
// Postgres). Ersätter en tidigare in-memory Map, som bara räknade försök mot
// den instans som råkade hantera requesten och inte skyddade mot t.ex.
// brute-force spritt över flera instanser.

import { prisma } from "@/lib/db";

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const resetAt = new Date(Date.now() + windowMs);

  // Atomär upsert: om fönstret gått ut nollställs räknaren, annars ökas den.
  // INSERT ... ON CONFLICT är atomärt i Postgres, så två parallella requests
  // kan inte råka förbise varandras ökning (till skillnad från en läs-ändra-
  // skriv-sekvens i applikationskoden).
  const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimitBucket" (key, count, "resetAt")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN "RateLimitBucket"."resetAt" <= now() THEN 1 ELSE "RateLimitBucket".count + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= now() THEN ${resetAt} ELSE "RateLimitBucket"."resetAt" END
    RETURNING count, "resetAt"
  `;

  const row = rows[0];
  if (!row) return { allowed: true, retryAfterMs: 0 };

  const allowed = row.count <= limit;

  // Städa gamla buckets opportunistiskt (ingen bakgrundsprocess finns i serverless).
  if (Math.random() < 0.01) {
    prisma.$executeRaw`DELETE FROM "RateLimitBucket" WHERE "resetAt" < now() - interval '1 day'`.catch(() => {});
  }

  return { allowed, retryAfterMs: allowed ? 0 : row.resetAt.getTime() - Date.now() };
}

export function clientKeyFromRequest(req: Request, extra = ""): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return `${ip}:${extra}`;
}
