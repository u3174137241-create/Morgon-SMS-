import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeUrl, computeContentHash, textSimilarity, isNearDuplicate } from "../src/core/dedup.js";

test("normalizeUrl strips tracking params", () => {
  const a = normalizeUrl("https://Example.com/post/123?utm_source=fb&utm_campaign=x&id=5");
  const b = normalizeUrl("https://example.com/post/123?id=5");
  assert.equal(a, b);
});

test("normalizeUrl strips trailing slash and is case-insensitive on host", () => {
  const a = normalizeUrl("https://EXAMPLE.com/post/123/");
  const b = normalizeUrl("https://example.com/post/123");
  assert.equal(a, b);
});

test("normalizeUrl treats differing paths as different URLs", () => {
  const a = normalizeUrl("https://example.com/post/123");
  const b = normalizeUrl("https://example.com/post/456");
  assert.notEqual(a, b);
});

test("computeContentHash is stable for identical text and differs for different text", () => {
  const h1 = computeContentHash("Behöver hjälp badrum", "Söker firma i Stockholm");
  const h2 = computeContentHash("Behöver hjälp badrum", "Söker firma i Stockholm");
  const h3 = computeContentHash("Behöver hjälp kök", "Söker firma i Uppsala");
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
});

test("computeContentHash is case/whitespace insensitive", () => {
  const h1 = computeContentHash("Behöver Hjälp Badrum", "Söker  firma");
  const h2 = computeContentHash("behöver hjälp badrum", "söker firma");
  assert.equal(h1, h2);
});

test("textSimilarity is 1 for identical text", () => {
  assert.equal(textSimilarity("Behöver hjälp med badrumsrenovering i Stockholm", "Behöver hjälp med badrumsrenovering i Stockholm"), 1);
});

test("textSimilarity is near 0 for unrelated text", () => {
  const sim = textSimilarity("Behöver hjälp med badrumsrenovering i Stockholm", "Katten sitter i trädet och sover gott");
  assert.ok(sim < 0.1, `expected low similarity, got ${sim}`);
});

test("isNearDuplicate flags syndicated/near-identical posts across sources", () => {
  const original = "Jag behöver hjälp att renovera mitt badrum i Stockholm, någon som kan rekommendera en firma?";
  const reposted = "Jag behöver hjälp att renovera mitt badrum i Stockholm. Någon som kan rekommendera en firma?!";
  assert.ok(isNearDuplicate(original, reposted));
});

test("isNearDuplicate does not flag genuinely different posts in the same category", () => {
  const a = "Behöver hjälp att renovera badrum i Stockholm, akut";
  const b = "Söker elektriker i Göteborg för att dra om säkringsskåpet";
  assert.ok(!isNearDuplicate(a, b));
});
