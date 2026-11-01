import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalStockSymbol } from "../src/markets/symbols.ts";
import { parseWatchlists } from "../src/markets/watchlists.ts";
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
    assert.equal(widgetConfig("chart", c, "invalid").range, undefined);
    assert.equal(widgetConfig("chart", c).range, undefined);
    assert.equal(widgetConfig("chart", c).interval, "D");
    assert.equal(widgetConfig("chart", c).hide_side_toolbar, false);
    assert.equal(widgetConfig("chart", c).allow_symbol_change, true);
    assert.equal(widgetConfig("chart", c).withdateranges, true);
    assert.equal(widgetConfig("indices", c).dateRange, "1D");
  }
  assert.equal(countryByCode("unknown").code, "us");
  assert.equal(countryByCode("in").stock, "BSE:RELIANCE");
  assert.equal(canonicalStockSymbol(" bse:500209 "), "BSE:INFY");
  assert.equal(canonicalStockSymbol("BSE:500325"), "BSE:RELIANCE");
  assert.equal(canonicalStockSymbol("NSE:INFY"), "NSE:INFY");
  assert.deepEqual(
    parseWatchlists({
      version: 1,
      lists: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Existing list",
          symbols: ["BSE:500209", "BSE:INFY", "BSE:500325"],
        },
      ],
    }).lists[0].symbols,
    ["BSE:INFY", "BSE:RELIANCE"],
  );
  assert.ok(
    widgetConfig("indices", countryByCode("in")).dateRanges.every(
      (range) => !/\|(1|15)$/.test(range),
    ),
  );
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
