import { test, expect } from "./test";
import { readFile } from "node:fs/promises";
import { initialBudget } from "../src/budget/model";
const base = process.env.VITE_BASE_PATH || "/";
test("loan planner compares fair paths, provides a guide and restores exported plans", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.route("https://api.github.com/**", (r) =>
    r.fulfill({
      json: {
        type: "file",
        encoding: "base64",
        content: Buffer.from('{"version":1,"posts":[]}').toString("base64"),
      },
    }),
  );
  await page.goto(base);
  await page.getByRole("link", { name: /Compare my loan options/ }).click();
  await expect(page).toHaveURL(/loan-payoff\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Pay it down",
  );
  await page
    .getByRole("button", { name: "Load example plan", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Loan 1", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("loan-setup.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /Compare my options/ }).click();
  await expect(page.locator(".loan-strategy")).toHaveCount(4);
  await page
    .getByText("Explore four salary-funded investment alternatives", {
      exact: true,
    })
    .click();
  await expect(page.locator(".loan-insight")).toContainText(
    "projected net position",
  );
  await expect(
    page.getByText("Approximate investment break-even", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("loan-comparison.png"),
    fullPage: true,
  });
  await page.locator(".loan-strategy").nth(2).click();
  await expect(page.locator(".loan-strategy").nth(2)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: /Build my monthly guide/ }).click();
  await expect(page.getByLabel("Choose the path for your guide")).toHaveValue(
    "invest",
  );
  await page
    .getByLabel("Choose the path for your guide")
    .selectOption("avalanche");
  await expect(page.locator(".loan-schedule > details")).toHaveCount(12);
  await page.locator(".loan-schedule summary").first().click();
  await expect(page.locator(".loan-schedule table").first()).toContainText(
    "Personal loan",
  );
  await page.screenshot({
    path: info.outputPath("loan-guide.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Show next 12 months", exact: true })
    .click();
  await expect(page.locator(".loan-schedule > details")).toHaveCount(24);
  await page.getByRole("button", { name: /Your money & loans/ }).click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save JSON" }).click();
  const download = await downloadEvent;
  const file = (await download.path())!;
  const exported = JSON.parse(await readFile(file, "utf8"));
  expect(exported.plan.loans).toHaveLength(2);
  await page.getByLabel("Monthly repayment budget", { exact: true }).fill("1");
  await page.getByRole("button", { name: /Compare paths/ }).click();
  await expect(page.locator(".loan-errors")).toContainText(
    "does not cover all required EMIs",
  );
  await expect(page.locator(".loan-strategy")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Review my inputs", exact: true })
    .click();
  await page.locator("#loan-file").setInputFiles(file);
  await expect(
    page.getByLabel("Monthly repayment budget", { exact: true }),
  ).toHaveValue("25000");
  await page.reload();
  await expect(
    page.getByLabel("Monthly repayment budget", { exact: true }),
  ).toHaveValue("25000");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("salary checkbox uses exactly the saved investment amount without extra fields", async ({
  page,
}) => {
  await page.addInitScript(
    (p) =>
      localStorage.setItem("intimetec-salary-budget-v1", JSON.stringify(p)),
    {
      ...initialBudget,
      goalAmount: 1000000,
      goalMonths: 40,
      investment: 20000,
      investmentMode: "custom",
      salary: 80000,
    },
  );
  await page.goto(base + "loan-payoff/");
  await page
    .getByLabel("Protected emergency savings", { exact: true })
    .fill("75000");
  await page
    .getByLabel("Spare savings available now", { exact: true })
    .fill("10000");
  await page
    .getByRole("checkbox", { name: "Use saved salary budget", exact: true })
    .check();
  await expect(page.getByTestId("loan-linked-budget")).toHaveText("₹20,000");
  await expect(
    page.getByLabel("Protected emergency savings", { exact: true }),
  ).toHaveValue("75000");
  await expect(
    page.getByLabel("Spare savings available now", { exact: true }),
  ).toHaveValue("10000");
  await expect(
    page.getByLabel("Monthly repayment budget", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Monthly take-home income", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".loan-editor")).toHaveCount(0);
  await expect(page.locator(".loan-notice")).toContainText(
    "included, not added again",
  );
  await page.reload();
  await expect(page.locator(".loan-editor")).toHaveCount(0);
  await expect(page.getByTestId("loan-linked-budget")).toHaveText("₹20,000");
  await page.getByRole("button", { name: /Add another loan/ }).click();
  await page.getByLabel("Outstanding balance", { exact: true }).fill("10000");
  await page.getByRole("button", { name: /Compare my options/ }).click();
  await expect(page.locator(".loan-strategy")).toHaveCount(4);
});

test("manual total and salary toggle preserve entered loans and count EMIs once", async ({
  page,
}) => {
  await page.addInitScript(
    (plan) =>
      localStorage.setItem("intimetec-salary-budget-v1", JSON.stringify(plan)),
    { ...initialBudget, salary: 80000 },
  );
  await page.goto(base + "loan-payoff/");
  await page
    .getByLabel("Monthly repayment budget", { exact: true })
    .fill("12000");
  await page.getByRole("button", { name: /Add another loan/ }).click();
  const loan = page.getByRole("group", { name: "Loan 1", exact: true });
  await loan.getByLabel("Outstanding balance", { exact: true }).fill("120000");
  await loan.getByLabel("Annual loan interest (%)", { exact: true }).fill("0");
  await loan.getByLabel("Remaining term (months)", { exact: true }).fill("12");
  await expect(page.getByTestId("loan-declared-extra")).toHaveText("₹2,000");
  await page
    .getByRole("checkbox", { name: "Use saved salary budget", exact: true })
    .check();
  await expect(
    loan.getByLabel("Outstanding balance", { exact: true }),
  ).toHaveValue("120000");
  await expect(page.getByTestId("loan-linked-budget")).toHaveText("₹36,000");
  await expect(page.getByTestId("loan-declared-extra")).toHaveText("₹26,000");
  await page
    .getByRole("checkbox", { name: "Use saved salary budget", exact: true })
    .uncheck();
  await expect(
    page.getByLabel("Monthly repayment budget", { exact: true }),
  ).toHaveValue("36000");
  await page
    .getByLabel("Monthly repayment budget", { exact: true })
    .fill("15000");
  await expect(page.getByTestId("loan-declared-extra")).toHaveText("₹5,000");
  const salary = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("intimetec-salary-budget-v1")!),
  );
  expect(salary.salary).toBe(80000);
});
test("loan planner works with storage unavailable and rejects malformed imports", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage disabled");
      },
    }),
  );
  await page.goto(base + "loan-payoff/");
  await page
    .getByRole("button", { name: "Load example plan", exact: true })
    .click();
  await expect(page.locator(".budget-save[role=status]")).toContainText(
    "Browser saving unavailable",
  );
  await page.locator("#loan-file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"plan":{"salary":-1}}'),
  });
  await expect(page.locator(".loan-notice")).toContainText("Check the income");
  await expect(
    page.getByLabel("Monthly repayment budget", { exact: true }),
  ).toHaveValue("25000");
  await page.getByRole("button", { name: /Compare my options/ }).click();
  await expect(page.locator(".loan-strategy")).toHaveCount(4);
});

test("individual loans, spare savings and a rental sale have separate visual comparisons", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "loan-payoff/");
  await expect(page.locator(".loan-editor")).toHaveCount(0);
  await page
    .getByLabel("Monthly repayment budget", { exact: true })
    .fill("20000");
  for (const [index, name, balance, rate, months] of [
    [1, "Personal loan", "300000", "14", "48"],
    [2, "Home loan", "180000", "9", "60"],
  ] as const) {
    await page.getByRole("button", { name: /Add another loan/ }).click();
    const loan = page.getByRole("group", {
      name: `Loan ${index}`,
      exact: true,
    });
    await loan.getByLabel("Loan name", { exact: true }).fill(name);
    await loan.getByLabel("Outstanding balance", { exact: true }).fill(balance);
    await loan
      .getByLabel("Annual loan interest (%)", { exact: true })
      .fill(rate);
    await loan
      .getByLabel("Remaining term (months)", { exact: true })
      .fill(months);
  }
  await page
    .getByLabel("Spare savings available now", { exact: true })
    .fill("50000");
  await page
    .getByLabel("Protected emergency savings", { exact: true })
    .fill("100000");
  await page
    .getByRole("button", { name: "Add an asset to compare", exact: true })
    .click();
  const asset = page.getByRole("group", { name: "Asset 1", exact: true });
  await asset.getByLabel("Asset name", { exact: true }).fill("Shop");
  await asset
    .getByLabel("Current asset market value", { exact: true })
    .fill("1000000");
  await asset.getByLabel("Gross monthly rent", { exact: true }).fill("10000");
  await asset
    .getByLabel("Monthly running costs & rental taxes", { exact: true })
    .fill("2000");
  await asset
    .getByLabel("Loan secured against this asset", { exact: true })
    .selectOption({ label: "Home loan" });
  await page.getByRole("button", { name: /Compare my options/ }).click();
  await expect(page.locator(".loan-individual")).toHaveCount(2);
  await expect(
    page.locator(".loan-individual").first().getByRole("img"),
  ).toHaveAccessibleName("Personal loan");
  await expect(
    page.locator(".loan-individual").nth(1).getByRole("img"),
  ).toHaveAccessibleName("Home loan");
  const investmentChart = page.locator(
    ".loan-invest-or-repay .loan-decision-chart",
  );
  await expect(investmentChart).toBeVisible();
  const beforeReturnChange = await investmentChart
    .locator("figcaption")
    .textContent();
  await page
    .getByLabel("Expected annual investment return (%)", { exact: true })
    .fill("15");
  await expect(investmentChart.locator("figcaption")).not.toHaveText(
    beforeReturnChange!,
  );
  await page
    .getByLabel("Explore repayment versus investing month", { exact: true })
    .fill("0");
  await expect(investmentChart.locator("figcaption")).toContainText(
    "-₹3,80,000",
  );
  await page
    .getByText("Optional: use spare savings or compare an asset sale", {
      exact: true,
    })
    .click();
  await expect(page.locator(".loan-rate-ranking li").first()).toContainText(
    "Personal loan",
  );
  await expect(
    page.locator(".loan-advanced-scenarios .loan-decision-chart"),
  ).toHaveCount(2);
  await page
    .getByLabel("Compare repayment scenario", { exact: true })
    .selectOption("savings");
  await expect(page.locator(".loan-decision-note")).toContainText(
    "₹50,000 applied to principal",
  );
  await page
    .getByLabel("Compare repayment scenario", { exact: true })
    .selectOption({ label: "Sell Shop" });
  await expect(page.locator(".loan-decision-note").last()).toContainText(
    "₹7,90,000",
  );
  await expect(page.locator(".loan-decision-note").last()).toContainText(
    "₹8,000 per month",
  );
  await page.getByLabel("Explore debt month", { exact: true }).fill("0");
  await expect(
    page
      .locator(".loan-advanced-scenarios .loan-decision-chart")
      .first()
      .locator("figcaption"),
  ).toContainText("₹0");
  await page
    .getByText("View scenario’s monthly numbers", { exact: true })
    .click();
  await expect(page.locator(".loan-decision-schedule tbody tr")).toHaveCount(
    13,
  );
  await page
    .locator(".loan-decision-lab")
    .screenshot({ path: info.outputPath("loan-decisions.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save JSON", exact: true }).click();
  const file = await (await pending).path();
  const exported = JSON.parse(await readFile(file!, "utf8"));
  expect(exported.plan.assets[0].name).toBe("Shop");
  expect(exported.plan.emergency).toBe(100000);
  await page.reload();
  await expect(
    page.getByLabel("Spare savings available now", { exact: true }),
  ).toHaveValue("50000");
  await expect(
    page.getByLabel("Current asset market value", { exact: true }),
  ).toHaveValue("1000000");
  expect(errors).toEqual([]);
});
