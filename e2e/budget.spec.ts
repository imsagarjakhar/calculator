import { test, expect, type Page } from "./test";
import { initialBudget } from "../src/budget/model";
const base = process.env.VITE_BASE_PATH || "/";
async function importBudget(page: Page, plan: unknown) {
  await page.locator('.planner-header input[type="file"]').setInputFiles({
    name: "budget.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ plan })),
  });
}
async function reopenWithReport(page: Page) {
  const download = page.waitForEvent("download");
  await page
    .locator(".planner-header")
    .getByRole("button", { name: "Download report", exact: true })
    .click();
  const path = await (await download).path();
  await page.reload();
  await expect(
    page.getByLabel("Take-home salary (INR)", { exact: true }),
  ).toHaveValue("");
  await page.locator('.planner-header input[type="file"]').setInputFiles(path!);
}

test("fresh budget starts at zero and waits for income before warning", async ({
  page,
}) => {
  await page.goto(`${base}salary-budget/`);
  await expect(
    page.getByLabel("Take-home salary (INR)", { exact: true }),
  ).toHaveValue("");
  const p = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("intimetec-salary-budget-v1")!),
  );
  expect(p).toBeNull();
  await expect(
    page.getByText("START WITH YOUR INCOME", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Rent / home", { exact: true }).fill("1000");
  await page.waitForTimeout(800);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByLabel("Take-home salary (INR)", { exact: true }).fill("500");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByLabel("Take-home salary (INR)", { exact: true }).fill("2000");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Take-home salary (INR)", { exact: true }),
  ).toHaveValue("");
  await expect(page.getByLabel("Rent / home", { exact: true })).toHaveValue("");
  const snapshot = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("intimetec-salary-budget-v1")!),
  );
  expect(snapshot.salary).toBe(2000);
  page.once("dialog", (d) => d.accept());
  await page
    .locator(".planner-header")
    .getByRole("button", { name: "Reset", exact: true })
    .click();
  await expect(
    page.getByLabel("Take-home salary (INR)", { exact: true }),
  ).toHaveValue("");
  await expect(page.getByLabel("Rent / home", { exact: true })).toHaveValue("");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("older plans retain goal inputs and start the new forecast at 12 percent", async ({
  page,
}) => {
  const legacy = {
    ...initialBudget,
    goalPlannerVersion: undefined,
    annualReturn: 100,
    goalAnnualReturn: 100,
    investment: 20000,
    goalAmount: 1000000,
    goalSaved: 5000,
    goalMonths: 40,
  };
  await page.goto(`${base}salary-budget/`);
  await importBudget(page, legacy);
  await expect(
    page.getByLabel("Expected annual return (%)", { exact: true }),
  ).toHaveValue("12");
  await expect(page.getByLabel("Goal amount", { exact: true })).toHaveValue(
    "1000000",
  );
  await expect(
    page.getByLabel("Already saved for goal", { exact: true }),
  ).toHaveValue("5000");
  await expect(
    page.getByLabel("Years to reach goal", { exact: true }),
  ).toHaveValue("3");
  await expect(
    page.getByLabel("Additional months", { exact: true }),
  ).toHaveValue("4");
  await expect(page.getByTestId("automatic-monthly-investment")).toHaveText(
    "₹6,000",
  );
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("checkbox", { name: "Invest the full available amount" })
    .uncheck();
  await expect(
    page.getByLabel("Monthly investment", { exact: true }),
  ).toHaveValue("20000");
});

test("available money forecasts a goal once and previews an affordable starting step-up", async ({
  page,
}, info) => {
  await page.goto(`${base}salary-budget/`);
  await page
    .getByRole("button", { name: "Load example plan", exact: true })
    .click();
  await page
    .getByLabel("Take-home salary (INR)", { exact: true })
    .fill("60000");
  const available = page.getByTestId("available-to-invest");
  await expect(available).toHaveText("₹16,000");
  await expect(
    page.getByLabel("Expected annual return (%)", { exact: true }),
  ).toHaveValue("12");
  await page.getByLabel("Goal amount", { exact: true }).fill("1000000");
  await page.getByLabel("Already saved for goal", { exact: true }).fill("5000");
  await page.getByLabel("Years to reach goal", { exact: true }).fill("3");
  await page.getByLabel("Additional months", { exact: true }).fill("4");
  const result = page.getByTestId("goal-projected-balance");
  const verdict = page.getByTestId("goal-verdict");
  await expect(verdict).toContainText("Add ₹4,521 more each month");
  await expect(verdict).toContainText("Total: ₹20,521/month");
  await expect(page.getByTestId("budget-remainder")).toHaveText("₹0");
  const withReturn = await result.textContent();
  await page
    .getByLabel("Expected annual return (%)", { exact: true })
    .fill("0");
  await expect(result).toHaveText("₹6,45,000");
  await page.getByRole("button", { name: /One-year outlook/ }).click();
  await page
    .getByLabel("Expected annual return (%)", { exact: true })
    .fill("12");
  await page.getByRole("button", { name: /Monthly plan/ }).click();
  await expect(result).toHaveText(withReturn!);
  await page
    .getByRole("button", { name: "Preview this annual step-up" })
    .click();
  await expect(verdict).toContainText("You’re on track for your goal");
  await expect(available).toHaveText("₹16,000");
  await expect(page.getByTestId("budget-remainder")).toHaveText("₹0");
  const withStepUp = await result.textContent();
  await page.getByLabel("Explore projection month", { exact: true }).fill("12");
  await expect(page.locator(".budget-growth-chart figcaption")).toContainText(
    "Month 12",
  );
  await reopenWithReport(page);
  await expect(result).toHaveText(withStepUp!);
  await expect(
    page.getByLabel("Years to reach goal", { exact: true }),
  ).toHaveValue("3");
  await expect(
    page.getByLabel("Additional months", { exact: true }),
  ).toHaveValue("4");
  await page
    .locator("#budget-growth")
    .screenshot({ path: info.outputPath("goal-return.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("checkbox", { name: "Invest the full available amount" })
    .uncheck();
  await page.getByLabel("Monthly investment", { exact: true }).fill("10000");
  await expect(page.getByTestId("budget-remainder")).toHaveText("₹6,000");
  await page
    .getByRole("checkbox", { name: "Invest the full available amount" })
    .check();
  await page.getByLabel("Rent / home", { exact: true }).fill("13000");
  await expect(available).toHaveText("₹15,000");
});

test("emergency target follows essential costs and bills while existing savings stay entered", async ({
  page,
}) => {
  await page.goto(`${base}salary-budget/`);
  await page
    .getByRole("button", { name: "Load example plan", exact: true })
    .click();
  await page
    .getByLabel("Other monthly income (INR)", { exact: true })
    .fill("100000");
  const saved = page.getByLabel("Emergency savings today", { exact: true });
  const target = page.getByTestId("emergency-fund-target");
  await expect(target).toHaveText("₹1,68,000");
  await page.getByLabel("Rent / home", { exact: true }).fill("14000");
  await expect(target).toHaveText("₹1,80,000");
  await expect(saved).toHaveValue("25000");
  await page
    .getByRole("group", { name: "Upcoming bill 1", exact: true })
    .getByLabel("Next Payment after (Months)", { exact: true })
    .fill("6");
  await expect(target).toHaveText("₹1,98,000");
  await page
    .getByLabel("Months of essentials to cover", { exact: true })
    .fill("3");
  await expect(target).toHaveText("₹99,000");
  await saved.fill("50000");
  await expect(target).toHaveText("₹99,000");
  await expect(page.getByTestId("emergency-fund-gap")).toContainText("₹49,000");
  await page.getByLabel("Dining & enjoyment", { exact: true }).fill("8000");
  await expect(target).toHaveText("₹99,000");
});

test("month inputs can be cleared and replaced without changing the plan mid-edit", async ({
  page,
}) => {
  await page.goto(`${base}salary-budget/`);
  await page
    .getByRole("button", { name: "Load example plan", exact: true })
    .click();
  const bill = page.getByRole("group", {
    name: "Upcoming bill 1",
    exact: true,
  });
  const months = bill.getByLabel("Next Payment after (Months)", {
    exact: true,
  });
  await months.focus();
  await months.press("ControlOrMeta+A");
  await months.press("Backspace");
  await expect(months).toHaveValue("");
  await expect(bill.locator(".budget-bill-total strong")).toHaveText("₹3,000");
  await months.press("Tab");
  await expect(months).toHaveValue("12");
  await page
    .getByLabel("Other monthly income (INR)", { exact: true })
    .fill("100000");
  await months.fill("");
  await months.pressSequentially("3");
  await expect(months).toHaveValue("3");
  await expect(bill.locator(".budget-bill-total strong")).toHaveText("₹12,000");
  await months.press("Backspace");
  await expect(months).toHaveValue("");
  await months.pressSequentially("12");
  await months.press("Tab");
  await expect(months).toHaveValue("12");
  await months.fill("0");
  await expect(bill.locator(".budget-bill-total strong")).toHaveText("₹3,000");
  await months.press("Tab");
  await expect(months).toHaveValue("1");
  const emergencyMonths = page.getByLabel("Months of essentials to cover", {
    exact: true,
  });
  await emergencyMonths.fill("");
  await expect(emergencyMonths).toHaveValue("");
  await emergencyMonths.fill("6");
  await emergencyMonths.press("Tab");
  await expect(emergencyMonths).toHaveValue("6");
});
test("recurring bills reserve for the next payment and retain frequency", async ({
  page,
}, info) => {
  await page.goto(`${base}salary-budget/`);
  await page
    .getByRole("button", { name: "Load example plan", exact: true })
    .click();
  await page
    .getByLabel("Other monthly income (INR)", { exact: true })
    .fill("100000");
  const bill = page.getByRole("group", {
    name: "Upcoming bill 1",
    exact: true,
  });
  await bill.getByLabel("Bill name", { exact: true }).fill("Gym fees");
  await bill.getByLabel("Bill amount", { exact: true }).fill("6000");
  await bill.getByLabel("Payment frequency", { exact: true }).selectOption("3");
  await expect(
    bill.getByLabel("Next Payment after (Months)", { exact: true }),
  ).toHaveValue("3");
  await expect(bill.locator(".budget-bill-total strong")).toHaveText("₹2,000");
  await bill
    .getByLabel("Next Payment after (Months)", { exact: true })
    .fill("1");
  await bill.getByLabel("Already reserved", { exact: true }).fill("1000");
  await expect(bill.locator(".budget-bill-total strong")).toHaveText("₹5,000");
  await expect(bill).toContainText("After the next payment: ₹2,000 per month");
  await reopenWithReport(page);
  await expect(
    bill.getByLabel("Payment frequency", { exact: true }),
  ).toHaveValue("3");
  await expect(
    bill.getByLabel("Next Payment after (Months)", { exact: true }),
  ).toHaveValue("1");
  await bill.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("recurring-bill.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await bill.getByLabel("Payment frequency", { exact: true }).selectOption("1");
  await expect(
    bill.getByLabel("Next Payment after (Months)", { exact: true }),
  ).toHaveValue("1");
  await bill
    .getByLabel("Payment frequency", { exact: true })
    .selectOption("12");
  await expect(
    bill.getByLabel("Next Payment after (Months)", { exact: true }),
  ).toHaveValue("12");
  await bill.getByLabel("Payment frequency", { exact: true }).selectOption("0");
  await expect(bill).toContainText("A one-time bill");
});
test("expense total warns once when spending crosses the salary limit", async ({
  page,
}, info) => {
  const plan = {
    ...initialBudget,
    otherIncome: 100000,
    expenses: initialBudget.expenses.map((expense) => ({
      ...expense,
      planned: 0,
    })),
  };
  await page.goto(`${base}salary-budget/`);
  await importBudget(page, plan);
  const total = page.getByTestId("budget-expense-total");
  const rent = page.getByLabel("Rent / home", { exact: true });
  const dialog = page.getByRole("dialog", {
    name: "Expenses exceed your salary",
  });
  await expect(total).toHaveText("₹0");
  await rent.fill("60000");
  await expect(total).toHaveText("₹60,000");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("₹10,000");
  await page.screenshot({ path: info.outputPath("expense-warning.png") });
  expect(
    await dialog.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return (
        bounds.left >= 0 &&
        bounds.right <= innerWidth &&
        bounds.top >= 0 &&
        bounds.bottom <= innerHeight
      );
    }),
  ).toBe(true);
  await dialog.getByRole("button", { name: "Review expenses" }).click();
  await rent.fill("65000");
  await page.waitForTimeout(800);
  await expect(dialog).not.toBeVisible();
  await rent.fill("50000");
  await expect(total).toHaveText("₹50,000");
  await expect(page.locator(".budget-expense-total")).not.toHaveClass(
    /is-over/,
  );
  await rent.fill("51000");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("combobox", { name: "Plan currency", exact: true })
    .selectOption("USD");
  await expect(total).toContainText("$51,000");
  await total.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("expense-total.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("salary planner opens from homepage, saves a budget and projects twelve deposits", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.getByRole("link", { name: /Plan my monthly budget/ }).click();
  await expect(page).toHaveURL(/salary-budget\/$/);
  await page
    .getByRole("button", { name: "Load example plan", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "A place for every rupee",
  );
  await expect(page.getByTestId("budget-remainder")).toHaveText("₹0");
  for (const [currency, name] of [
    ["USD", "dollar"],
    ["SAR", "Saudi riyal"],
    ["AED", "UAE dirham"],
    ["EUR", "euro"],
    ["GBP", "pound"],
    ["INR", "rupee"],
  ]) {
    await page
      .getByRole("combobox", { name: "Plan currency", exact: true })
      .selectOption(currency);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      `A place for every ${name}. A plan for what’s next.`,
    );
  }
  await page.screenshot({
    path: info.outputPath("salary-budget.png"),
    fullPage: true,
  });
  await page
    .getByLabel("Take-home salary (INR)", { exact: true })
    .fill("40000");
  await expect(
    page.getByText("MONTHLY SHORTFALL", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("budget-remainder")).toHaveText("₹4,000");
  await page
    .getByRole("dialog", { name: "Your monthly plan has a shortfall" })
    .getByRole("button", { name: "Review my plan" })
    .click();
  await reopenWithReport(page);
  await expect(
    page.getByLabel("Take-home salary (INR)", { exact: true }),
  ).toHaveValue("40000");
  await page
    .getByRole("dialog", { name: "Your monthly plan has a shortfall" })
    .getByRole("button", { name: "Review my plan" })
    .click();
  await page.getByRole("button", { name: /One-year outlook/ }).click();
  await page.getByLabel("Monthly investment", { exact: true }).fill("1000");
  await page
    .getByLabel("Expected annual return (%)", { exact: true })
    .fill("0");
  await expect(page.getByTestId("year-invested")).toHaveText("₹12,000");
  await expect(page.getByTestId("year-corpus")).toHaveText("₹12,000");
  await page
    .getByLabel("Expected annual return (%)", { exact: true })
    .fill("-20");
  await expect(page.getByTestId("year-gain")).toContainText("-");
  await page
    .getByText("See the month-by-month numbers", { exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(12);
  await page.screenshot({
    path: info.outputPath("salary-outlook.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /Spending check-in/ }).click();
  await page.getByLabel("Actual Rent / home", { exact: true }).fill("13000");
  await expect(page.getByText(/1 of 10 categories recorded/)).toBeVisible();
  await page.getByLabel("Actual Groceries", { exact: true }).fill("0");
  await expect(page.getByText(/2 of 10 categories recorded/)).toBeVisible();
  await page.screenshot({
    path: info.outputPath("salary-actual.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /Monthly plan/ }).click();
  await page.getByRole("button", { name: /Add an upcoming bill/ }).click();
  const bill = page.getByRole("group", { name: "Upcoming bill 2" });
  await bill.getByLabel("Bill name", { exact: true }).fill("School fees");
  await bill.getByLabel("Bill amount", { exact: true }).fill("36000");
  await bill.getByLabel("Already reserved", { exact: true }).fill("6000");
  await bill
    .getByLabel("Next Payment after (Months)", { exact: true })
    .fill("6");
  await expect(bill).toContainText("₹5,000");
  await page
    .getByRole("button", { name: "Remove bill 2", exact: true })
    .click();
  await expect(bill).toHaveCount(0);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save JSON" }).click();
  expect((await download).suggestedFilename()).toBe(
    "money-planner-monthly-budget.json",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("bill due time explains a whole-plan shortfall and resets after it is fixed", async ({
  page,
}, info) => {
  await page.goto(`${base}salary-budget/`);
  await page
    .getByRole("button", { name: "Load example plan", exact: true })
    .click();
  const bill = page.getByRole("group", {
    name: "Upcoming bill 1",
    exact: true,
  });
  const months = bill.getByLabel("Next Payment after (Months)", {
    exact: true,
  });
  await months.fill("2");
  const dialog = page.getByRole("dialog", {
    name: "Your monthly plan has a shortfall",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("₹59,000");
  await expect(dialog).toContainText("₹9,000");
  await expect(dialog).toContainText(
    "₹36,000 still needed ÷ 2 months = ₹18,000 per month",
  );
  await expect(dialog).toContainText("Use the actual due time");
  await page.screenshot({ path: info.outputPath("bill-shortfall.png") });
  await dialog.getByRole("button", { name: "Review my plan" }).click();
  await months.fill("1");
  await page.waitForTimeout(800);
  await expect(dialog).not.toBeVisible();
  await months.fill("12");
  await expect(page.getByTestId("budget-remainder")).toHaveText("₹0");
  await months.fill("2");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByLabel("Other monthly income (INR)", { exact: true })
    .fill("9000");
  await expect(page.getByTestId("budget-remainder")).toHaveText("₹0");
  await expect(dialog).not.toBeVisible();
});
