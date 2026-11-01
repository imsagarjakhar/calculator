import { test } from "node:test";
import assert from "node:assert/strict";
import { parseExchangeRate } from "../src/runtime/exchangeRates.ts";
test("provider response must match the requested pair and have a positive finite rate", () => {
  const valid = { base: "SAR", quote: "INR", date: "2026-11-01", rate: 25.363 };
  assert.equal(parseExchangeRate(valid, "SAR", "INR").rate * 100, 2536.3);
  for (const bad of [
    null,
    { ...valid, rate: 0 },
    { ...valid, rate: -1 },
    { ...valid, rate: Infinity },
    { ...valid, rate: "25" },
    { ...valid, base: "USD" },
    { ...valid, quote: "EUR" },
    { ...valid, date: "unknown" },
  ]) {
    assert.throws(() => parseExchangeRate(bad, "SAR", "INR"));
  }
});
