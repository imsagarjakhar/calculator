import { test, expect } from "./test";
const base = process.env.VITE_BASE_PATH || "/";

test("the primary header connects the five destinations", async ({ page }) => {
  await page.goto(base);
  for (const [name, route] of [
    ["Invest", "growth/"],
    ["Learn Finance", "learn/"],
    ["Calculators", "all-calculators/"],
    ["Blog", "#vlogs"],
    ["Global Markets", "markets/"],
  ]) {
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    const link = nav.getByRole("link", { name, exact: true });
    await expect(link).toBeInViewport();
    await link.click();
    await expect(page).toHaveURL(
      (url) => url.pathname + url.hash === base + route,
    );
    await expect(
      page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link", { name, exact: true }),
    ).toHaveAttribute("aria-current", "page");
  }
});

test("projects deposits, withdrawals and fund depletion", { tag: "@deploy" }, async ({
  page,
}, info) => {
  await page.goto(base);
  const hero = page.getByRole("region", { name: "SIP and SWP calculator" });
  await expect(hero.getByRole("img")).toBeVisible();
  await page.screenshot({ path: info.outputPath("investment-home.png") });
  await page.getByLabel("Your currency", { exact: true }).selectOption("USD");
  await hero.getByLabel("Annual return").fill("0");
  await expect(hero.locator(".inv-balance strong")).toHaveText("$120,000");
  await hero.getByRole("button", { name: "SWP", exact: true }).click();
  await expect(hero.locator(".inv-balance strong")).toHaveText("$0");
  await expect(hero).toContainText("Funds run out in month 100");
  await expect(hero.locator(".inv-summary")).toContainText("$100,000");
  await hero.getByLabel("Monthly withdrawal").fill("0");
  await expect(hero.locator(".inv-balance strong")).toHaveText("$100,000");
  await hero.getByRole("button", { name: "SIP", exact: true }).click();
  await hero.getByLabel("Monthly investment").fill("2000");
  await expect(hero.locator(".inv-balance strong")).toHaveText("$240,000");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
