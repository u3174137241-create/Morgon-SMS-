-- Ta bort "SERVICE" ur ItemType — appen stödjer bara produkter nu.
ALTER TYPE "ItemType" RENAME TO "ItemType_old";
CREATE TYPE "ItemType" AS ENUM ('PRODUCT');
ALTER TABLE "Search" ALTER COLUMN "type" TYPE "ItemType" USING ("type"::text::"ItemType");
ALTER TABLE "Listing" ALTER COLUMN "type" TYPE "ItemType" USING ("type"::text::"ItemType");
DROP TYPE "ItemType_old";
