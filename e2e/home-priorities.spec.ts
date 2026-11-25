import { test, expect } from "./test";
const base = process.env.VITE_BASE_PATH || "/";
test("homepage groups planner and resource links into six topics below the investment hero", async ({
  page,
}) => {
  await page.goto(base);
  const grid = page.getByRole("region", { name: "Explore money" });
  await expect(grid.getByRole("heading", { level: 3 })).toHaveText([
    "Investment",
    "Retirement",
    "Learning & Blog",
    "Calculators & Currency Converter",
    "Loan Repayment",
    "Salary Planning",
  ]);
  const links = grid.getByRole("link");
  await expect(links).toHaveCount(14);
  expect(
    await links.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("href")),
    ),
  ).toEqual(
    [
      "growth/",
      "markets/",
      "freedom/",
      "bucket-plan/",
      "survival/",
      "learn/",
      "guides/",
      "#vlogs",
      "all-calculators/",
      "currency-converter/",
      "loan-payoff/",
      "all-calculators/#home-loan-emi",
      "salary-budget/",
      "custom-plan/",
    ].map((route) => base + route),
  );
  await expect(page.locator(".investment-hero + #explore")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await grid.getByRole("link", { name: "Worked examples" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Five money questions. Worked through.",
  );
});
