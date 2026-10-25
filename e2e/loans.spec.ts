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
  await expect(page.locator(".loan-choice-card")).toHaveCount(3);
  await expect(page.locator(".loan-outcome-chart")).toBeVisible();
  await expect(page.locator(".loan-choice-panel select")).toHaveCount(0);
  await page.getByRole("button", { name: /Clear loans faster/ }).click();
  await expect(
    page.getByRole("button", { name: /Clear loans faster/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: info.outputPath("loan-comparison.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /Your payoff guide/ }).click();
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
  await expect(page.locator(".loan-choice-card")).toHaveCount(0);
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
test("repayment budget starts empty and ignores the saved salary plan", async ({
  page,
}) => {
  await page.addInitScript(
    (p) =>
      localStorage.setItem("intimetec-salary-budget-v1", JSON.stringify(p)),
    {
      ...initialBudget,
      salary: 80000,
      investment: 77333,
      investmentMode: "custom",
    },
  );
  await page.goto(base + "loan-payoff/");
  await expect(
    page.getByRole("checkbox", {
      name: "Use saved salary budget",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.getByTestId("loan-linked-budget")).toHaveCount(0);
  await expect(
    page.getByLabel("Monthly repayment budget", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByLabel("Monthly take-home income", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".loan-editor")).toHaveCount(0);
  await expect(page.locator(".loan-notice")).toHaveCount(0);
  await page
    .getByLabel("Monthly repayment budget", { exact: true })
    .fill("12000");
  await page.getByRole("button", { name: /Add another loan/ }).click();
  const loan = page.getByRole("group", { name: "Loan 1", exact: true });
  await loan
    .getByLabel("Loan details available", { exact: true })
    .selectOption("balance");
  await loan.getByLabel("Outstanding balance", { exact: true }).fill("120000");
  await loan.getByLabel("Annual loan interest (%)", { exact: true }).fill("0");
  await loan.getByLabel("Remaining term (months)", { exact: true }).fill("12");
  await expect(page.getByTestId("loan-declared-extra")).toHaveText("₹2,000");
  await page.reload();
  await expect(
    page.getByLabel("Monthly repayment budget", { exact: true }),
  ).toHaveValue("12000");
  await expect(page.getByTestId("loan-declared-extra")).toHaveText("₹2,000");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("intimetec-salary-budget-v1")!)
          .investment,
    ),
  ).toBe(77333);
});

test("old salary-linked amounts reset to zero while entered loans are retained", async ({
  page,
}) => {
  await page.goto(base + "loan-payoff/");
  await page
    .getByRole("button", { name: "Load example plan", exact: true })
    .click();
  const original = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("intimetec-loan-payoff-v1")!);
    p.useSalaryInvestment = true;
    p.repaymentBudget = 77333;
    localStorage.setItem("intimetec-loan-payoff-v1", JSON.stringify(p));
    return p;
  });
  await page.reload();
  await expect(
    page.getByLabel("Monthly repayment budget", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("checkbox", { name: "Use saved salary budget" }),
  ).toHaveCount(0);
  await expect(page.locator(".loan-editor")).toHaveCount(original.loans.length);
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("intimetec-loan-payoff-v1")!),
  );
  expect(stored.useSalaryInvestment).toBe(false);
  expect(stored.repaymentBudget).toBe(0);
  expect(stored.loans).toEqual(original.loans);
  await page
    .getByLabel("Monthly repayment budget", { exact: true })
    .fill("30000");
  await page.reload();
  await expect(
    page.getByLabel("Monthly repayment budget", { exact: true }),
  ).toHaveValue("30000");
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
  await expect(page.locator(".loan-choice-card")).toHaveCount(3);
});

test("three choices compare investments, faster repayment and asset sale with hover charts", async ({
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
    await loan
      .getByLabel("Loan details available", { exact: true })
      .selectOption("balance");
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
  await asset.getByLabel("Monthly earnings", { exact: true }).fill("10000");
  await asset
    .getByLabel("Monthly running costs & taxes", { exact: true })
    .fill("2000");
  await asset
    .getByLabel("Loan secured against this asset", { exact: true })
    .selectOption({ label: "Home loan" });
  await page.getByRole("button", { name: /Compare my options/ }).click();
  await expect(page.locator(".loan-choice-card")).toHaveCount(3);
  const investmentChart = page.locator(".loan-outcome-chart");
  const beforeReturnChange = await investmentChart
    .locator(".loan-outcome-readout")
    .textContent();
  await page
    .getByLabel("Expected annual return (%)", { exact: true })
    .fill("15");
  await expect(investmentChart.locator(".loan-outcome-readout")).not.toHaveText(
    beforeReturnChange!,
  );
  await page.locator(".loan-outcome-scrubber input").fill("0");
  await expect(investmentChart.locator(".loan-outcome-readout")).toContainText(
    "₹6,70,000",
  );
  await page.getByRole("button", { name: /Sell, repay \+ invest/ }).click();
  await expect(page.locator(".loan-sale-flow")).toContainText("₹4,80,000");
  await expect(page.locator(".loan-sale-flow")).toContainText("₹4,90,000");
  await expect(page.locator(".loan-sale-flow")).toContainText("₹8,000 / month");
  await page.getByRole("button", { name: "Loan balance", exact: true }).click();
  await expect(investmentChart.locator(".loan-outcome-readout")).toContainText(
    "₹0",
  );
  const chartSvg = investmentChart.locator("svg");
  await chartSvg.scrollIntoViewIfNeeded();
  const box = (await chartSvg.boundingBox())!;
  if (info.project.name === "mobile")
    await page.touchscreen.tap(
      box.x + box.width * 0.65,
      box.y + box.height * 0.5,
    );
  else
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.5);
  await expect(page.locator(".loan-outcome-tooltip")).toContainText(
    "Sell & invest",
  );
  await expect(page.locator(".loan-outcome-tooltip")).toContainText(
    "Repay faster",
  );
  await page
    .getByText("Monthly numbers · Sell, repay + invest", { exact: true })
    .click();
  await expect(
    page
      .locator(".loan-choice-details")
      .filter({
        has: page.getByText("Monthly numbers · Sell, repay + invest", {
          exact: true,
        }),
      })
      .locator("tbody tr"),
  ).toHaveCount(13);
  await page.getByText("Explore each loan’s payments", { exact: true }).click();
  await expect(page.locator(".loan-individual")).toHaveCount(2);
  await expect(
    page.locator(".loan-individual").first().getByRole("img"),
  ).toHaveAccessibleName(/Personal loan/);
  await expect(
    page.locator(".loan-individual").nth(1).getByRole("img"),
  ).toHaveAccessibleName(/Home loan/);
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

test("original loan inputs calculate EMI and remaining balance, restore reports and compare separate loans", async ({
  page,
}, info) => {
  await page.goto(base + "loan-payoff/");
  await page
    .getByLabel("Monthly repayment budget", { exact: true })
    .fill("40000");
  await page
    .getByLabel("Calculate balances as of", { exact: true })
    .fill("2026-07");
  await page.getByRole("button", { name: /Add another loan/ }).click();
  const first = page.getByRole("group", { name: "Loan 1", exact: true });
  await expect(first.getByLabel("Loan details available")).toHaveValue(
    "original",
  );
  await first.getByLabel("Loan name", { exact: true }).fill("Home loan");
  await first
    .getByLabel("Original loan amount", { exact: true })
    .fill("240000");
  await first.getByLabel("Annual loan interest (%)", { exact: true }).fill("0");
  await first.getByLabel("First EMI month", { exact: true }).fill("2025-01");
  await first
    .getByLabel("Final EMI month (loan end)", { exact: true })
    .fill("2026-12");
  await expect(first.getByTestId("loan-calculated-emi")).toHaveText("₹10,000");
  await expect(first.getByTestId("loan-calculated-months")).toHaveText("6");
  await expect(first.getByTestId("loan-calculated-balance")).toHaveText(
    "₹60,000",
  );
  await first
    .getByLabel("Final EMI month (loan end)", { exact: true })
    .fill("2027-12");
  await expect(first.getByTestId("loan-calculated-months")).toHaveText("18");
  await expect(first.getByTestId("loan-calculated-balance")).toHaveText(
    "₹1,20,000",
  );
  await first
    .getByLabel("Final EMI month (loan end)", { exact: true })
    .fill("");
  await expect(first.getByTestId("loan-calculated-emi")).toHaveText("—");
  await expect(first.getByTestId("loan-calculated-balance")).toHaveText("—");
  await first
    .getByLabel("Final EMI month (loan end)", { exact: true })
    .fill("2026-12");
  await page
    .getByLabel("Calculate balances as of", { exact: true })
    .fill("2026-08");
  await expect(first.getByTestId("loan-calculated-months")).toHaveText("5");
  await expect(first.getByTestId("loan-calculated-balance")).toHaveText(
    "₹50,000",
  );
  await first
    .getByLabel("Annual loan interest (%)", { exact: true })
    .fill("12");
  await expect(first.getByTestId("loan-calculated-emi")).not.toHaveText(
    "₹10,000",
  );
  const emiText = await first.getByTestId("loan-calculated-emi").textContent();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save JSON", exact: true }).click();
  const file = (await (await event).path())!;
  const exported = JSON.parse(await readFile(file, "utf8"));
  expect(exported.plan.loans[0].originalAmount).toBe(240000);
  expect(exported.plan.loans[0].lastEmiMonth).toBe("2026-12");
  exported.plan.loans[0].balance = 1;
  exported.plan.loans[0].emi = 1;
  exported.plan.loans[0].months = 1;
  await page.locator("#loan-file").setInputFiles({
    name: "loan.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await expect(first.getByTestId("loan-calculated-emi")).toHaveText(emiText!);
  await expect(first.getByTestId("loan-calculated-months")).toHaveText("5");
  await page.reload();
  await expect(first.getByTestId("loan-calculated-emi")).toHaveText(emiText!);
  await page.getByRole("button", { name: /Add another loan/ }).click();
  const second = page.getByRole("group", { name: "Loan 2", exact: true });
  await second
    .getByLabel("Original loan amount", { exact: true })
    .fill("120000");
  await second.getByLabel("First EMI month", { exact: true }).fill("2026-01");
  await second
    .getByLabel("Final EMI month (loan end)", { exact: true })
    .fill("2026-12");
  await expect(second.getByTestId("loan-calculated-emi")).toHaveText("₹10,000");
  await expect(second.getByTestId("loan-calculated-months")).toHaveText("5");
  await page.screenshot({
    path: info.outputPath("original-loan-inputs.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /Compare my options/ }).click();
  await expect(page.locator(".loan-individual")).toHaveCount(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("rental assets update monthly funding and the main repayment and wealth graphs without double counting", async ({
  page,
}) => {
  await page.goto(base + "loan-payoff/");
  await page
    .getByLabel("Monthly repayment budget", { exact: true })
    .fill("1000");
  await page.getByRole("button", { name: /Add another loan/ }).click();
  const loan = page.getByRole("group", { name: "Loan 1", exact: true });
  await loan
    .getByLabel("Loan details available", { exact: true })
    .selectOption("balance");
  await loan.getByLabel("Outstanding balance", { exact: true }).fill("12000");
  await loan.getByLabel("Annual loan interest (%)", { exact: true }).fill("0");
  await loan.getByLabel("Remaining term (months)", { exact: true }).fill("12");
  await page
    .getByRole("button", { name: "Add an asset to compare", exact: true })
    .click();
  const asset = page.getByRole("group", { name: "Asset 1", exact: true });
  await asset
    .getByLabel("Current asset market value", { exact: true })
    .fill("3500000");
  await expect(asset.getByTestId("asset-net-yield")).toHaveText("0.00%");
  await asset.getByLabel("Monthly earnings", { exact: true }).fill("5000");
  await expect(asset.getByTestId("asset-net-yield")).toHaveText("1.71%");
  await expect(asset.getByTestId("asset-gross-yield")).toHaveText("1.71%");
  await expect(page.getByTestId("loan-total-monthly-funding")).toHaveText(
    "₹6,000",
  );
  await expect(page.getByTestId("loan-declared-extra")).toHaveText("₹5,000");
  await expect(page.getByTestId("loan-monthly-room")).toHaveText("₹5,000");
  await page.getByRole("button", { name: /Compare my options/ }).click();
  await page.locator(".loan-outcome-scrubber input").fill("0");
  await expect(page.locator(".loan-outcome-readout")).toContainText(
    "₹34,88,000",
  );
  await page.getByText("Explore each loan’s payments", { exact: true }).click();
  await page.getByLabel("Explore Loan 1 by month", { exact: true }).fill("1");
  await expect(page.locator(".loan-individual figcaption")).toContainText(
    "₹1,000",
  );
  await expect(page.locator(".loan-individual figcaption")).toContainText(
    "₹11,000",
  );
  await expect(page.locator(".loan-individual figcaption")).toContainText(
    "Installments paid: 1 of 12",
  );
  await page.getByRole("button", { name: /Your money & loans/ }).click();
  await asset.getByRole("checkbox").check();
  await expect(page.getByTestId("loan-total-monthly-funding")).toHaveText(
    "₹1,000",
  );
  await expect(page.getByTestId("loan-declared-extra")).toHaveText("₹0");
  await page
    .getByLabel("Monthly repayment budget", { exact: true })
    .fill("6000");
  await expect(page.getByTestId("loan-total-monthly-funding")).toHaveText(
    "₹6,000",
  );
  await asset.getByRole("checkbox").uncheck();
  await asset
    .getByLabel("Monthly running costs & taxes", { exact: true })
    .fill("1000");
  await expect(page.getByTestId("loan-total-monthly-funding")).toHaveText(
    "₹10,000",
  );
  await expect(asset.getByTestId("asset-net-yield")).toHaveText("1.37%");
  await expect(asset.getByTestId("asset-gross-yield")).toHaveText("1.71%");
  await page.reload();
  await expect(page.getByTestId("loan-total-monthly-funding")).toHaveText(
    "₹10,000",
  );
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save JSON", exact: true }).click();
  const exported = JSON.parse(
    await readFile((await (await downloadEvent).path())!, "utf8"),
  );
  expect(exported.results[0].assetValue).toBe(3500000);
  expect(exported.results[0].rentReceived).toBe(4000 * exported.plan.horizon);
});
