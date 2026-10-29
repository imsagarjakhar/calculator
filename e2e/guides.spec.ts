import { test, expect } from "./test";
const base = process.env.VITE_BASE_PATH || "/";
test("worked guides expose readable original examples without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(
      `http://127.0.0.1:${process.env.PREVIEW_PORT || "4173"}${base}guides/`,
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Five money questions. Worked through.",
    );
    await expect(page.locator("article.worked-chapter")).toHaveCount(5);
    await expect(page.locator(".worked-guide-hero")).toHaveCSS("display", "block");
    await expect(page.locator("#repay-or-invest table")).toContainText("6%");
    await expect(page.locator("#repay-or-invest table")).toContainText("12%");
    await expect(page.locator(".worked-editorial")).toContainText(
      "AI assistance",
    );
    await expect(page.locator(".worked-editorial")).toContainText(
      "do not claim an independent",
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://intimetec.org/guides/",
    );
  } finally {
    await context.close();
  }
});
test("guide examples respond to currency and return assumptions and remain readable on phones", async ({
  page,
}) => {
  await page.goto(base + "guides/");
  const figures = page.locator("#repay-or-invest .worked-metrics");
  const before = await figures.innerText();
  await page
    .getByLabel("Worked loan investment return", { exact: true })
    .selectOption("6");
  await expect(figures).not.toHaveText(before);
  await expect(figures).toContainText("Faster repayment ahead by");
  await page.getByLabel("Guide currency", { exact: true }).selectOption("USD");
  await expect(page.locator("#monthly-budget")).toContainText("$50,000");
  await expect(figures).not.toContainText("₹");
  await expect(
    page.getByRole("navigation", { name: "Worked examples" }).getByRole("link"),
  ).toHaveCount(5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
