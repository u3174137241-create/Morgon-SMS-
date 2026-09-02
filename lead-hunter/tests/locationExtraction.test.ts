import { test } from "node:test";
import assert from "node:assert/strict";
import { ruleBasedClient } from "../src/ai/ruleBasedClient.js";
import type { Category, LocationConfig } from "../src/core/types.js";

const category: Category = {
  id: "elektriker",
  name: "Elektriker",
  enabled: true,
  keywords: ["elektriker"],
  buyerTypes: ["Elfirma"],
};

const stockholm: LocationConfig = { id: "stockholm", name: "Stockholm", type: "city", enabled: true };
const sverige: LocationConfig = { id: "sverige", name: "Sverige", type: "country", enabled: true };

test("location name mentioned in the text is extracted with high geography confidence", async () => {
  const r = await ruleBasedClient.analyze(
    { title: "Söker elektriker", snippet: "Söker elektriker i Stockholm snarast.", url: "https://x.se/1", matchedKeyword: "elektriker" },
    { category, location: stockholm, maxLeadAgeDays: 7 }
  );
  assert.equal(r.location, "Stockholm");
  assert.ok(r.geography_confidence >= 0.8, `expected high confidence, got ${r.geography_confidence}`);
});

test("location not mentioned in the text yields lower geography confidence", async () => {
  const r = await ruleBasedClient.analyze(
    { title: "Söker elektriker", snippet: "Söker elektriker snarast, ingen ort nämnd.", url: "https://x.se/2", matchedKeyword: "elektriker" },
    { category, location: stockholm, maxLeadAgeDays: 7 }
  );
  assert.ok(r.geography_confidence < 0.8);
});

test("nationwide (country-level) location is never claimed as an exact match", async () => {
  const r = await ruleBasedClient.analyze(
    { title: "Söker elektriker", snippet: "Söker elektriker någonstans i landet.", url: "https://x.se/3", matchedKeyword: "elektriker" },
    { category, location: sverige, maxLeadAgeDays: 7 }
  );
  assert.equal(r.location, null);
});

test("a different city's name in the text is still attributed correctly", async () => {
  const goteborg: LocationConfig = { id: "goteborg", name: "Göteborg", type: "city", enabled: true };
  const r = await ruleBasedClient.analyze(
    { title: "Söker elektriker", snippet: "Söker elektriker i Göteborg.", url: "https://x.se/4", matchedKeyword: "elektriker" },
    { category, location: goteborg, maxLeadAgeDays: 7 }
  );
  assert.equal(r.location, "Göteborg");
});
