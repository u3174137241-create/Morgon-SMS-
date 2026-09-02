import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFreshness } from "../src/core/freshness.js";

const NOW = new Date("2026-09-02T00:00:00.000Z");

test("ISO date hint (e.g. from an RSS feed) is CONFIRMED", () => {
  const r = computeFreshness({ publishedHint: "2026-08-31T10:00:00.000Z", url: "https://x.se/a", title: "", snippet: "" }, NOW);
  assert.equal(r.dateConfidence, "CONFIRMED");
  assert.equal(r.ageDays, 2);
});

test("relative Swedish phrase '2 dagar sedan' is ESTIMATED", () => {
  const r = computeFreshness({ url: "https://x.se/a", title: "Post", snippet: "Publicerat 2 dagar sedan" }, NOW);
  assert.equal(r.dateConfidence, "ESTIMATED");
  assert.equal(r.ageDays, 2);
});

test("'igår' resolves to 1 day old", () => {
  const r = computeFreshness({ url: "https://x.se/a", title: "Post", snippet: "Skrivet igår" }, NOW);
  assert.equal(r.ageDays, 1);
});

test("'idag' resolves to 0 days old", () => {
  const r = computeFreshness({ url: "https://x.se/a", title: "Post", snippet: "Postat idag" }, NOW);
  assert.equal(r.ageDays, 0);
});

test("date embedded in URL path is detected", () => {
  const r = computeFreshness({ url: "https://forum.se/2026/08/25/behover-hjalp", title: "t", snippet: "s" }, NOW);
  assert.equal(r.dateConfidence, "CONFIRMED");
  assert.equal(r.ageDays, 8);
});

test("no date signal at all is marked DATE_UNCERTAIN, not silently fresh", () => {
  const r = computeFreshness({ url: "https://forum.se/thread/123", title: "Behöver hjälp", snippet: "Ingen datumangivelse här" }, NOW);
  assert.equal(r.dateConfidence, "UNCERTAIN");
  assert.equal(r.publishedAt, null);
  assert.equal(r.ageDays, null);
});

test("implausible future date is rejected in favor of other signals", () => {
  const r = computeFreshness({ publishedHint: "2099-01-01", url: "https://x.se/a", title: "t", snippet: "s" }, NOW);
  assert.notEqual(r.publishedAt, new Date("2099-01-01").toISOString());
});

test("implausibly old date (before 2015) is rejected", () => {
  const r = computeFreshness({ publishedHint: "2005-01-01", url: "https://x.se/a", title: "t", snippet: "s" }, NOW);
  assert.notEqual(r.dateConfidence, "CONFIRMED");
});
