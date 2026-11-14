-- Lägger till sessionVersion så att en lösenordsåterställning kan logga ut
-- alla aktiva sessioner (t.ex. en stulen cookie) utan att behöva rotera
-- SESSION_SECRET globalt.
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
