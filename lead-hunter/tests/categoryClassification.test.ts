import { test } from "node:test";
import assert from "node:assert/strict";
import { ruleBasedClient } from "../src/ai/ruleBasedClient.js";
import type { Category, LocationConfig } from "../src/core/types.js";

const badrumCategory: Category = {
  id: "badrumsrenovering",
  name: "Badrumsrenovering",
  enabled: true,
  keywords: ["badrum", "badrumsrenovering"],
  buyerTypes: ["Badrumsfirma", "Byggfirma"],
};

const stockholm: LocationConfig = { id: "stockholm", name: "Stockholm", type: "city", enabled: true };

function analyze(title: string, snippet: string, keyword = "badrum") {
  return ruleBasedClient.analyze(
    { title, snippet, url: "https://forum.se/t/1", matchedKeyword: keyword },
    { category: badrumCategory, location: stockholm, maxLeadAgeDays: 7 }
  );
}

test('"Jag behöver renovera mitt badrum och söker en firma i Stockholm" -> strong lead (section 32 HOT example)', async () => {
  const r = await analyze("Behöver hjälp", "Jag behöver renovera mitt badrum och söker en firma i Stockholm.");
  assert.equal(r.is_lead, true);
  assert.equal(r.intent, "HIGH");
  assert.equal(r.is_spam, false);
});

test('"Min kompis renoverade sitt badrum" -> not a lead (section 32 IGNORE example)', async () => {
  const r = await analyze("Renovering", "Min kompis renoverade sitt badrum härom veckan.");
  assert.equal(r.is_lead, false);
  assert.equal(r.has_real_need, false);
});

test('"Vad kostar en badrumsrenovering?" -> weak/informational lead, not spam', async () => {
  const r = await analyze("Fråga", "Vad kostar en badrumsrenovering egentligen?");
  assert.equal(r.is_spam, false);
  assert.equal(r.intent, "LOW");
});

test('"Tips på badrumsfirmor?" -> recognized as intent phrase', async () => {
  const r = await analyze("Tips efterlyses", "Har någon tips på badrumsfirmor i området?");
  assert.equal(r.is_lead, true);
});

test("a company's own advertisement is flagged as spam, not a lead", async () => {
  const r = await analyze("Badrumsfirman AB", "Vi erbjuder badrumsrenovering till fast pris — kontakta oss idag för offert!");
  assert.equal(r.is_spam, true);
  assert.equal(r.is_lead, false);
});

test("unrelated text without the service keyword is not classified as this category's lead", async () => {
  const r = await analyze("Fråga om trädgård", "Behöver hjälp med trädgården snarast.", "badrum");
  assert.equal(r.has_real_need, false);
});

test("buyer_type and potential_categories come from the category's configured buyer types", async () => {
  const r = await analyze("Behöver badrum", "Behöver hjälp med badrum, söker firma.");
  assert.equal(r.buyer_type, "Badrumsfirma");
  assert.deepEqual(r.potential_categories, ["Badrumsfirma", "Byggfirma"]);
});

test("urgent language is detected as ACUTE urgency", async () => {
  const r = await analyze("Akut!", "Behöver akut hjälp med badrum, vattenläcka!");
  assert.equal(r.urgency, "ACUTE");
});
