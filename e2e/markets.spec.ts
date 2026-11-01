import { test, expect } from "./test";
const base = process.env.VITE_BASE_PATH || "/";
test("market country, performance and chart ranges configure isolated widgets", async ({
  page,
}) => {
  await page.route("https://www.tradingview-widget.com/**", (route) =>
    route.fulfill({
      body: "<!doctype html><title>Provider frame</title>",
      contentType: "text/html",
    }),
  );
  await page.goto(base + "markets/");
  const country = page.getByLabel("Market country", { exact: true });
  await expect(country).toHaveValue("us");
  await expect(page.locator(".market-delay")).toContainText("may be delayed");
  function config(kind: string) {
    return page
      .locator(`.market-embed-${kind} iframe`)
      .getAttribute("src")
      .then((src) =>
        JSON.parse(
          decodeURIComponent(new URL(src!, "http://localhost").hash.slice(1)),
        ),
      );
  }
  expect((await config("stocks")).market).toBe("us");
  await country.selectOption("in");
  await expect(
    page.getByRole("heading", { name: "Stocks in India" }),
  ).toBeVisible();
  expect((await config("stocks")).market).toBe("india");
  expect((await config("indices")).symbols[0][1]).toContain("BSE:SENSEX");
  await page.getByRole("button", { name: "Performance", exact: true }).click();
  expect((await config("stocks")).defaultColumn).toBe("performance");
  await page.getByRole("button", { name: "5 years", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "5 years", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect((await config("chart")).range).toBe("60M");
  await country.selectOption("sa");
  await expect(page.locator(".market-country-fallback")).toContainText(
    "This market opens on TradingView.",
  );
  await expect(page.locator(".market-embed iframe")).toHaveCount(0);
  await country.selectOption("us");
  const frames = page.locator(".market-embed iframe");
  await expect(frames).toHaveCount(3);
  for (const frame of await frames.all()) {
    const sandbox = await frame.getAttribute("sandbox");
    expect(sandbox).toContain("allow-scripts");
    const src = await frame.getAttribute("src");
    expect(new URL(src!).origin).toBe("https://www.tradingview-widget.com");
    expect(sandbox).toContain("allow-same-origin");
    await expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("unreachable provider leaves page controls and recovery guidance usable", async ({
  page,
}) => {
  await page.route("https://www.tradingview-widget.com/**", (route) =>
    route.abort(),
  );
  await page.goto(base + "markets/");
  await page.getByText("What if a chart is blank?", { exact: true }).click();
  await expect(
    page.getByText("No example or estimated prices are substituted.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByLabel("Market country", { exact: true }).selectOption("ca");
  await expect(
    page.getByRole("heading", { name: "Stocks in Canada" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reload market data" }),
  ).toBeVisible();
});
test("home links reach markets and keep the currency converter accessible", async ({
  page,
}) => {
  await page.goto(base);
  await expect(page.locator(".markets-choice")).toHaveAttribute(
    "href",
    base + "markets/",
  );
  await expect(page.locator(".currency-choice")).toHaveAttribute(
    "href",
    base + "currency-converter/",
  );
  const menu = page.getByRole("button", { name: "Open navigation" });
  if (await menu.isVisible()) await menu.click();
  await expect(
    page.locator(".home-nav").getByRole("link", { name: "Global markets" }),
  ).toHaveAttribute("href", base + "markets/");
  await expect(
    page.locator(".home-nav").getByRole("link", { name: "Convert currency" }),
  ).toHaveAttribute("href", base + "currency-converter/");
});
