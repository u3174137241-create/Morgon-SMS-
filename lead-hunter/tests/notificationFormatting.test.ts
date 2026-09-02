import { test } from "node:test";
import assert from "node:assert/strict";
import { formatLeadNotification, formatDigest } from "../src/notify/formatter.js";
import type { Lead } from "../src/core/types.js";

function baseLead(overrides: Partial<Lead> = {}): Lead {
  const now = new Date().toISOString();
  return {
    id: "lead_1",
    source: "duckduckgo-web-search",
    sourceUrl: "https://forum.se/thread/123",
    sourceTitle: "Behöver hjälp med badrum",
    contentSummary: "Behöver renovera badrum i Stockholm, söker firma.",
    contentHash: "abc123",
    service: "Badrumsrenovering",
    category: "badrumsrenovering",
    location: "Stockholm",
    publishedAt: now,
    discoveredAt: now,
    ageDays: 2,
    dateConfidence: "CONFIRMED",
    intentScore: 30,
    freshnessScore: 18,
    clarityScore: 14,
    geographyScore: 10,
    specificityScore: 9,
    commercialScore: 8,
    sourceScore: 3,
    leadScore: 92,
    classification: "HOT",
    confidence: 0.9,
    estimatedValue: "HIGH",
    urgency: "SOON",
    buyerType: "Badrumsfirma",
    potentialCategories: ["Badrumsfirma", "Byggfirma"],
    whyThisIsALead: "Personen uttrycker ett konkret behov och söker aktivt en firma.",
    status: "NEW",
    duplicateOf: null,
    firstSeenAt: now,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("HOT lead notification includes score, location, and source link", () => {
  const msg = formatLeadNotification(baseLead());
  assert.match(msg, /Score: 92\/100/);
  assert.match(msg, /Stockholm/);
  assert.match(msg, /https:\/\/forum\.se\/thread\/123/);
  assert.match(msg, /HETT LEAD/);
});

test("WARM lead notification uses the WARM label, not the HOT label", () => {
  const msg = formatLeadNotification(baseLead({ classification: "WARM", leadScore: 80 }));
  assert.match(msg, /VARMT LEAD/);
  assert.doesNotMatch(msg, /HETT LEAD/);
});

test("notification flags uncertain publish dates instead of asserting freshness", () => {
  const msg = formatLeadNotification(baseLead({ dateConfidence: "UNCERTAIN", ageDays: null }));
  assert.match(msg, /osäkert/);
});

test("notification stays short (Telegram-friendly)", () => {
  const msg = formatLeadNotification(baseLead());
  assert.ok(msg.length < 1000, `expected a short message, got ${msg.length} chars`);
});

test("digest reports 0 leads honestly instead of inventing data", () => {
  const msg = formatDigest(0, 0, 0);
  assert.match(msg, /0 nya kvalificerade leads/);
});

test("digest summarizes hot and warm counts together", () => {
  const msg = formatDigest(2, 1, 5);
  assert.match(msg, /2 heta/);
  assert.match(msg, /1 varma/);
  assert.match(msg, /5/);
});
