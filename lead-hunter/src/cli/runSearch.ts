import { getDb } from "../db/db.js";
import { runSearch } from "../core/pipeline.js";

getDb();

runSearch()
  .then((result) => {
    console.log("\nSökning klar:");
    console.log(`  Queries körda:      ${result.queriesExecuted}`);
    console.log(`  Kandidater hittade: ${result.candidatesFound}`);
    console.log(`  Leads accepterade:  ${result.leadsAccepted}`);
    console.log(`  Dubbletter:         ${result.duplicates}`);
    console.log(`  Avvisade:           ${result.rejected}`);
    console.log(`  Fel:                ${result.errors}`);
    if (result.leadsAccepted === 0) {
      console.log("\n0 new qualified leads.");
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("Sökningen misslyckades:", err);
    process.exit(1);
  });
