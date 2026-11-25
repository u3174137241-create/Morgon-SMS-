CREATE TYPE "public"."SubscriptionSource" AS ENUM ('STRIPE', 'APPLE');

ALTER TABLE "public"."Subscription" ADD COLUMN "source" "public"."SubscriptionSource" NOT NULL DEFAULT 'STRIPE';
