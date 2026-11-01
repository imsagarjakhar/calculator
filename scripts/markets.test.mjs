import { test } from "node:test";
import assert from "node:assert/strict";
import {
  countryByCode,
  marketCountries,
  marketPeriods,
  widgetConfig,
  hasEmbeddedMarket,
} from "../src/content/markets.ts";
test("market catalog has unique countries, symbols and valid widget defaults", () => {
  assert.equal(
    new Set(marketCountries.map((c) => c.code)).size,
    marketCountries.length,
  );
  for (const c of marketCountries) {
    assert.match(c.stock, /^[A-Z0-9_]+:[A-Z0-9_]+$/);
    assert.ok(c.indices.length > 0);
    assert.equal(widgetConfig("stocks", c).market, c.market);
    assert.equal(widgetConfig("chart", c, "invalid").range, "1D");
    assert.equal(widgetConfig("chart", c).range, "1D");
    assert.equal(widgetConfig("chart", c).hide_side_toolbar, false);
    assert.equal(widgetConfig("indices", c).dateRange, "1D");
  }
  assert.equal(countryByCode("unknown").code, "us");
  assert.equal(hasEmbeddedMarket(countryByCode("sa")), false);
  assert.equal(hasEmbeddedMarket(countryByCode("gb")), false);
  assert.equal(hasEmbeddedMarket(countryByCode("us")), true);
  assert.deepEqual(
    marketPeriods.map((p) => p.range),
    ["1D", "5D", "1M", "12M", "60M"],
  );
  assert.equal(
    widgetConfig("stocks", countryByCode("us"), undefined, "performance")
      .defaultColumn,
    "performance",
  );
});
