-- PushSubscription och ExpoPushToken saknade Row Level Security, vilket i
-- kombination med Supabases standardrättigheter för "anon" gjorde att vem som
-- helst med den publika anon-nyckeln kunde läsa, ändra eller radera alla
-- användares pushtokens via PostgREST. Appen själv kör som rollen
-- "slutaleta_app" som har BYPASSRLS (satt i en tidigare migration), så detta
-- påverkar inte appens egen funktion.
ALTER TABLE "public"."PushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ExpoPushToken" ENABLE ROW LEVEL SECURITY;

-- Samma lucka fanns på Prisms interna migrationstabell.
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
