// Optional live-provider check, separate from deterministic browser tests.
const { chromium } = require("@playwright/test");
const os = require("node:os");
(async () => {
  const browser = await chromium.launch({ channel: "chromium" });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    if (process.env.MARKETS_COUNTRIES) {
      for (const market of process.env.MARKETS_COUNTRIES.split(",")) {
        // Recreate the document, as the app does when it remounts a country frame.
        await page.goto("about:blank");
        const config = {
          width: "100%",
          height: 600,
          defaultColumn: "overview",
          defaultScreen: "most_capitalized",
          market,
          showToolbar: true,
          locale: "en",
          colorTheme: "light",
        };
        await page.goto(
          "https://www.tradingview-widget.com/embed-widget/screener/?locale=en#" +
            encodeURIComponent(JSON.stringify(config)),
          { waitUntil: "domcontentloaded" },
        );
        await page
          .locator("tbody tr")
          .first()
          .waitFor({ timeout: 20000 })
          .catch(() => {});
        console.log(
          "COUNTRY",
          market,
          (await page.locator("body").innerText()).slice(0, 1150),
        );
      }
      return;
    }
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text().slice(0, 450));
    });
    page.on("requestfailed", (r) =>
      errors.push(`${r.failure()?.errorText}: ${r.url().slice(0, 140)}`),
    );
    await page.goto(
      process.env.MARKETS_CHECK_URL || "http://127.0.0.1:4186/markets/",
    );
    await page.locator(".market-embed-chart").scrollIntoViewIfNeeded();
    await page
      .frameLocator(".market-embed-stocks > iframe")
      .locator("tbody tr")
      .first()
      .waitFor({ timeout: 30000 })
      .catch(() => {});
    await page
      .waitForLoadState("networkidle", { timeout: 10000 })
      .catch(() => {});
    const chart = page
      .frames()
      .find((f) => f.url().includes("/advanced-chart/"));
    if (chart)
      await chart
        .waitForFunction(
          () => /\d{2,}\.\d{2}/.test(document.body.innerText),
          {},
          { timeout: 20000 },
        )
        .catch(() => {});
    for (const frame of page.frames()) {
      console.log(
        "FRAME",
        frame.url().slice(0, 200),
        (
          await frame
            .locator("body")
            .innerText()
            .catch(() => "")
        ).slice(0, 2600),
      );
    }
    console.log("ERRORS", [...new Set(errors)].slice(0, 20));
    await page
      .getByRole("button", { name: "Performance", exact: true })
      .click();
    const stockFrame = page.frameLocator(".market-embed-stocks > iframe");
    await stockFrame
      .locator("tbody tr")
      .first()
      .waitFor({ timeout: 20000 })
      .catch(() => {});
    console.log(
      "PERFORMANCE",
      (await stockFrame.locator("body").innerText()).slice(0, 1700),
    );
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.screenshot({
        path: `${os.tmpdir()}/markets-${width}.png`,
        fullPage: true,
      });
      console.log(
        "LAYOUT",
        width,
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
    await page.goto(new URL("./", page.url()).origin + "/", {
      waitUntil: "domcontentloaded",
    });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      console.log(
        "HOME LAYOUT",
        width,
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
