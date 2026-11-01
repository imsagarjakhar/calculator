import { test, expect } from "./test";
const base = process.env.VITE_BASE_PATH || "/";
const api = "https://api.frankfurter.dev/v2/rate/**";

test("currency conversion stays local, swaps rates, and handles zero and invalid amounts", async ({
  page,
}) => {
  const urls: string[] = [];
  await page.route(api, async (route) => {
    urls.push(route.request().url());
    const [from, to] = new URL(route.request().url()).pathname
      .split("/")
      .slice(-2);
    await route.fulfill({
      json: {
        date: "2026-11-01",
        base: from,
        quote: to,
        rate: from === "SAR" ? 25 : 0.04,
      },
    });
  });
  await page.goto(base + "currency-converter/");
  const output = page.locator("output");
  await expect(output).toContainText("25,000.00");
  await expect(page.locator("time")).toHaveAttribute("datetime", "2026-11-01");
  const amount = page.getByLabel("Amount", { exact: true });
  await amount.fill("250");
  await expect(output).toContainText("6,250.00");
  expect(urls).toHaveLength(1);
  expect(urls[0]).toBe("https://api.frankfurter.dev/v2/rate/SAR/INR");
  await page.getByRole("button", { name: "Swap currencies" }).click();
  await expect(output).toContainText("SAR");
  await expect(output).toContainText("10.00");
  await amount.fill("0");
  await expect(output).toContainText("0.00");
  await amount.fill("-1");
  await expect(output).toHaveText("—");
  await expect(amount).toHaveAttribute("aria-invalid", "true");
  await amount.fill("");
  await expect(output).toHaveText("—");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("failed refresh clears the previous result and can be retried", async ({
  page,
}) => {
  let fail = false;
  await page.route(api, async (route) => {
    if (fail) return route.fulfill({ status: 503, body: "Unavailable" });
    await route.fulfill({
      json: { date: "2026-11-01", base: "SAR", quote: "INR", rate: 25 },
    });
  });
  await page.goto(base + "currency-converter/");
  await expect(page.locator("output")).toContainText("25,000.00");
  fail = true;
  await page.getByRole("button", { name: "Refresh rate" }).click();
  await expect(page.getByRole("alert")).toContainText("couldn’t fetch");
  await expect(page.locator("output")).toHaveText("—");
  fail = false;
  await page.getByRole("button", { name: "Refresh rate" }).click();
  await expect(page.locator("output")).toContainText("25,000.00");
});

test("same currency works without a rate and ignores a delayed old pair", async ({
  page,
}) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(api, async (route) => {
    await held;
    await route
      .fulfill({
        json: { date: "2026-11-01", base: "SAR", quote: "INR", rate: 25 },
      })
      .catch(() => {});
  });
  await page.goto(base + "currency-converter/");
  await page.getByLabel("To currency", { exact: true }).selectOption("SAR");
  await expect(page.locator("output")).toContainText("1,000.00");
  await expect(page.locator("output")).toContainText("SAR");
  release();
  await expect(page.locator("time")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Refresh rate" }),
  ).toBeDisabled();
});

test("converter is discoverable through the header, directory and footer", async ({
  page,
}) => {
  await page.goto(base);
  const menu = page.getByRole("button", { name: "Open navigation" });
  if (await menu.isVisible()) await menu.click();
  await expect(
    page.locator(".home-nav").getByRole("link", { name: "Convert currency" }),
  ).toHaveAttribute("href", base + "currency-converter/");
  await expect(
    page
      .locator(".tool-directory")
      .getByRole("link", { name: /Currency converter/ }),
  ).toHaveAttribute("href", base + "currency-converter/");
  await expect(
    page
      .locator(".site-footer")
      .getByRole("link", { name: "Currency converter", exact: true }),
  ).toHaveAttribute("href", base + "currency-converter/");
});
