import { test } from "node:test";
import assert from "node:assert/strict";
import { extractJson, normalizeAiAnalysis } from "../src/ai/jsonValidation.js";
import type { Category, LocationConfig } from "../src/core/types.js";

const category: Category = { id: "badrum", name: "Badrumsrenovering", enabled: true, keywords: ["badrum"], buyerTypes: ["Badrumsfirma"] };
const location: LocationConfig = { id: "stockholm", name: "Stockholm", type: "city", enabled: true };

test("extractJson parses a plain JSON object", () => {
  const json = extractJson('{"is_lead": true, "intent": "HIGH"}');
  assert.deepEqual(json, { is_lead: true, intent: "HIGH" });
});

test("extractJson strips markdown code fences", () => {
  const json = extractJson('```json\n{"is_lead": true}\n```');
  assert.deepEqual(json, { is_lead: true });
});

test("extractJson recovers JSON embedded in surrounding prose", () => {
  const json = extractJson('Here is the analysis:\n{"is_lead": false}\nHope that helps!');
  assert.deepEqual(json, { is_lead: false });
});

test("extractJson returns null for unparseable text", () => {
  assert.equal(extractJson("this is not json at all"), null);
});

test("normalizeAiAnalysis fills in safe defaults for a mostly-empty object", () => {
  const result = normalizeAiAnalysis({}, { category, location });
  assert.equal(result.is_lead, false);
  assert.equal(result.intent, "NONE");
  assert.equal(result.urgency, "UNKNOWN");
  assert.equal(result.estimated_value, "MEDIUM");
  assert.equal(result.category, category.id);
  assert.equal(result.buyer_type, "Badrumsfirma");
  assert.equal(result.confidence, 0.5);
});

test("normalizeAiAnalysis rejects an invalid enum value and substitutes a safe default", () => {
  const result = normalizeAiAnalysis({ intent: "SUPER_HIGH", urgency: "YESTERDAY" }, { category, location });
  assert.equal(result.intent, "NONE");
  assert.equal(result.urgency, "UNKNOWN");
});

test("normalizeAiAnalysis clamps out-of-range numeric fields into [0,1]", () => {
  const result = normalizeAiAnalysis({ confidence: 5, clarity: -3 }, { category, location });
  assert.equal(result.confidence, 1);
  assert.equal(result.clarity, 0);
});

test("normalizeAiAnalysis preserves valid, well-formed input unchanged", () => {
  const raw = {
    is_lead: true,
    is_spam: false,
    has_real_need: true,
    is_information_only: false,
    category: "badrum",
    service: "Badrumsrenovering",
    location: "Stockholm",
    intent: "HIGH",
    summary: "test",
    urgency: "ACUTE",
    estimated_value: "VERY_HIGH",
    value_reasoning: "big job",
    confidence: 0.95,
    buyer_type: "Badrumsfirma",
    potential_categories: ["Badrumsfirma"],
    why_this_is_a_lead: "explicit need stated",
    clarity: 0.9,
    commercial_value: 0.9,
    geography_confidence: 0.9,
  };
  const result = normalizeAiAnalysis(raw, { category, location });
  assert.deepEqual(result, raw);
});

test("normalizeAiAnalysis never throws on null/garbage input", () => {
  assert.doesNotThrow(() => normalizeAiAnalysis(null, { category, location }));
  assert.doesNotThrow(() => normalizeAiAnalysis("garbage", { category, location }));
  assert.doesNotThrow(() => normalizeAiAnalysis(42, { category, location }));
});
