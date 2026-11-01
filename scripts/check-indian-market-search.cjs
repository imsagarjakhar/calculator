// Optional real-provider check. Run against a built preview with network access:
// node scripts/check-indian-market-search.cjs [http://127.0.0.1:4187/markets/]
// Does not log in or write watchlists. Provider availability can change.
const { chromium, expect } = require("@playwright/test");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    await page.goto(process.argv[2] || "http://127.0.0.1:4187/markets/");
    await page.getByLabel("Market country", { exact: true }).selectOption("in");
    await page.locator(".market-embed-chart iframe").scrollIntoViewIfNeeded();
    const chart = page.frameLocator(".market-embed-chart iframe");
    const region = chart.getByRole("region", { name: "Chart #1" });
    await expect(region).toContainText("Reliance Industries Limited", {
      timeout: 30000,
    });
    await expect(
      region.getByRole("button", { name: "Change interval", exact: true }),
    ).toContainText("1D");
    console.log("DEFAULT: Reliance, daily candles");
    for (const [symbol, name] of [
      ["BSE:INFY", "Infosys Limited"],
      ["BSE:RELIANCE", "Reliance Industries Limited"],
      ["NSE:INFY", "Infosys Limited"],
    ]) {
      await chart
        .getByRole("button", { name: "Symbol search", exact: true })
        .click();
      const search = chart.getByRole("searchbox", {
        name: "Symbol, ISIN, or CUSIP",
      });
      await search.fill(symbol);
      const stocks = chart.getByRole("tab", { name: "Stocks", exact: true });
      if (await stocks.isVisible()) await stocks.click();
      const result = chart
        .getByRole("dialog")
        .getByText(symbol.split(":")[1], { exact: true })
        .first();
      await result.waitFor({ timeout: 20000 });
      await result.click();
      await search.waitFor({ state: "hidden" });
      if (symbol.startsWith("NSE:")) {
        await expect(chart.locator("body")).toContainText(
          /This symbol is only available on TradingView|Infosys Limited/,
          { timeout: 20000 },
        );
        // Wait for the provider's restriction notice, rather than the previous BSE series.
        const restricted = chart.getByText(
          "This symbol is only available on TradingView.",
          { exact: false },
        );
        await restricted.waitFor({ timeout: 15000 }).catch(() => {});
        if (await restricted.isVisible()) {
          console.log(
            symbol +
              ": provider restricts embedding; direct TradingView link shown",
          );
        } else {
          await expect(region).toContainText(name);
          await expect(region).toContainText(/\d[\d,]*\.\d{2}/, {
            timeout: 20000,
          });
          console.log(symbol + ": chart prices loaded");
        }
      } else {
        await expect(region).toContainText(name, { timeout: 20000 });
        await expect(region).toContainText(/\d[\d,]*\.\d{2}/, {
          timeout: 20000,
        });
        await expect(
          region.getByRole("button", { name: "Invalid symbol", exact: true }),
        ).toHaveCount(0);
        console.log(
          symbol + ": native search selected the stock and daily prices loaded",
        );
      }
      await page.screenshot({
        path: join(tmpdir(), `indian-market-${symbol.replace(":", "-")}.png`),
      });
    }
    await page
      .getByRole("button", { name: "Open Infosys on BSE", exact: true })
      .click();
    await expect(region).toContainText("Infosys Limited", { timeout: 20000 });
    await expect(region).toContainText(/\d[\d,]*\.\d{2}/, { timeout: 20000 });
    await expect(
      chart.getByText("This symbol is only available on TradingView.", {
        exact: false,
      }),
    ).toHaveCount(0);
    console.log(
      "RECOVERY: BSE Infosys button clears the NSE notice and loads daily prices",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
