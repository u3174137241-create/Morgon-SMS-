CREATE TABLE "public"."RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RateLimitBucket_resetAt_idx" ON "public"."RateLimitBucket"("resetAt");

-- Samma lucka som i 20261203010000: tabellen behöver RLS aktiverat eftersom
-- "anon" annars skulle kunna läsa/skriva den via PostgREST. Appen själv kör
-- som rollen "slutaleta_app" som har BYPASSRLS, så detta påverkar inte
-- appens egen funktion.
ALTER TABLE "public"."RateLimitBucket" ENABLE ROW LEVEL SECURITY;
