import { test, expect } from "@playwright/test";
const base = process.env.VITE_BASE_PATH || "/";
test("salary planner opens from homepage, saves a budget and projects twelve deposits", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.getByRole("link", { name: /Plan my monthly budget/ }).click();
  await expect(page).toHaveURL(/salary-budget\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "A place for every rupee",
  );
  await expect(page.getByTestId("budget-remainder")).toHaveText("₹0");
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
  await expect(page.getByTestId("budget-remainder")).toHaveText("₹10,000");
  await page.reload();
  await expect(
    page.getByLabel("Take-home salary (INR)", { exact: true }),
  ).toHaveValue("40000");
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
  await bill.getByLabel("Months until due", { exact: true }).fill("6");
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
