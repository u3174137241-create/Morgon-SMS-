import { test } from "node:test";
import assert from "node:assert/strict";
import { computeScore, classify } from "../src/core/scoring.js";
import type { AiAnalysisResult, FreshnessResult } from "../src/core/types.js";

function baseAi(overrides: Partial<AiAnalysisResult> = {}): AiAnalysisResult {
  return {
    is_lead: true,
    is_spam: false,
    has_real_need: true,
    is_information_only: false,
    category: "badrumsrenovering",
    service: "Badrumsrenovering",
    location: "Stockholm",
    intent: "HIGH",
    summary: "Behöver badrumsrenovering",
    urgency: "SOON",
    estimated_value: "HIGH",
    value_reasoning: "test",
    confidence: 0.9,
    buyer_type: "Badrumsfirma",
    potential_categories: ["Badrumsfirma"],
    why_this_is_a_lead: "test",
    clarity: 0.9,
    commercial_value: 0.8,
    geography_confidence: 0.9,
    ...overrides,
  };
}

function freshFreshness(ageDays: number, dateConfidence: FreshnessResult["dateConfidence"] = "CONFIRMED"): FreshnessResult {
  return { publishedAt: new Date().toISOString(), ageDays, dateConfidence };
}

test("classify() thresholds match spec section 10", () => {
  assert.equal(classify(100), "HOT");
  assert.equal(classify(90), "HOT");
  assert.equal(classify(89), "WARM");
  assert.equal(classify(75), "WARM");
  assert.equal(classify(74), "WARM_POTENTIAL");
  assert.equal(classify(60), "WARM_POTENTIAL");
  assert.equal(classify(59), "COLD");
  assert.equal(classify(40), "COLD");
  assert.equal(classify(39), "IGNORE");
  assert.equal(classify(0), "IGNORE");
});

test("strong, fresh, specific lead scores HOT/WARM territory", () => {
  const score = computeScore(baseAi(), freshFreshness(0), 7, "MEDIUM");
  assert.ok(score.total >= 75, `expected >=75, got ${score.total}`);
  assert.equal(score.intentScore, 30);
});

test("spam candidates are pinned to zero intent score", () => {
  const score = computeScore(baseAi({ is_spam: true, has_real_need: false }), freshFreshness(0), 7, "MEDIUM");
  assert.equal(score.intentScore, 0);
});

test("no real need caps intent contribution even without spam", () => {
  const withNeed = computeScore(baseAi({ has_real_need: true }), freshFreshness(0), 7, "MEDIUM");
  const withoutNeed = computeScore(baseAi({ has_real_need: false }), freshFreshness(0), 7, "MEDIUM");
  assert.ok(withoutNeed.intentScore < withNeed.intentScore);
});

test("leads older than max age get zero freshness score", () => {
  const score = computeScore(baseAi(), freshFreshness(10), 7, "MEDIUM");
  assert.equal(score.freshnessScore, 0);
});

test("uncertain dates are capped well below a confirmed same-age lead", () => {
  const confirmed = computeScore(baseAi(), freshFreshness(2, "CONFIRMED"), 7, "MEDIUM");
  const uncertain = computeScore(baseAi(), { publishedAt: null, ageDays: null, dateConfidence: "UNCERTAIN" }, 7, "MEDIUM");
  assert.ok(uncertain.freshnessScore < confirmed.freshnessScore);
});

test("source quality contributes 0-5 points monotonically", () => {
  const high = computeScore(baseAi(), freshFreshness(0), 7, "HIGH");
  const low = computeScore(baseAi(), freshFreshness(0), 7, "LOW");
  assert.ok(high.sourceScore > low.sourceScore);
  assert.equal(high.sourceScore, 5);
  assert.equal(low.sourceScore, 1);
});

test("total score is always clamped to [0, 100]", () => {
  const score = computeScore(baseAi(), freshFreshness(0), 7, "HIGH");
  assert.ok(score.total <= 100 && score.total >= 0);
});

test("weak, low-intent, no-service-match lead lands in IGNORE/COLD territory", () => {
  const score = computeScore(
    baseAi({ intent: "NONE", has_real_need: false, clarity: 0.1, geography_confidence: 0.1, commercial_value: 0.1, estimated_value: "LOW" }),
    freshFreshness(6),
    7,
    "LOW"
  );
  assert.ok(score.total < 40, `expected <40, got ${score.total}`);
  assert.equal(score.classification, "IGNORE");
});
