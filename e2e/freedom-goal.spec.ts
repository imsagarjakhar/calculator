import { test, expect } from "./test";
import { readFile } from "node:fs/promises";
const base = process.env.VITE_BASE_PATH || "/";

test("freedom offers corpus percentage and monthly income with matching annual context", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}freedom/`);
  await expect(page.locator("#f-incomeMode")).toHaveValue("corpus");
  await expect(
    page.getByRole("slider", {
      name: "Annual withdrawal rate (%)",
      exact: true,
    }),
  ).toHaveValue("3");
  await page.locator("#f-corpus").fill("1200000");
  await page.locator("#f-targetAge").fill("30");
  await page.locator("#f-expectedReturn").fill("0");
  await page.locator("#f-inflation").fill("0");
  await expect(page.locator("#withdrawalPreview")).toContainText("₹3,000");
  await page.locator("#f-withdrawalRate").fill("6");
  await expect(page.locator("#withdrawalRateValue")).toHaveText("6%");
  await expect(page.locator("#withdrawalPreview")).toContainText("₹6,000");
  await page.reload();
  await expect(page.locator("#f-withdrawalRate")).toHaveValue("6");
  await page
    .getByRole("button", { name: "Enter monthly income", exact: true })
    .click();
  await expect(page.locator("#withdrawalGoal")).toBeHidden();
  await page.locator("#f-retirementExpense").fill("4000");
  await expect(page.locator("#spendingRatePreview")).toContainText(
    "4.00% of your projected corpus per year",
  );
  await page
    .getByRole("button", { name: "Use corpus percentage", exact: true })
    .click();
  await expect(page.locator("#f-withdrawalRate")).toHaveValue("6");
  await page
    .getByRole("button", { name: "Enter monthly income", exact: true })
    .click();
  await expect(page.locator("#f-retirementExpense")).toHaveValue("4000");
  await page
    .getByRole("button", { name: "Use corpus percentage", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Plan currency", exact: true })
    .selectOption("USD");
  await expect(page.locator("#withdrawalPreview")).toContainText("$6,000");
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download report", exact: true })
    .click();
  const file = await (await pending).path();
  const report = await readFile(file!, "utf8");
  expect(report).toContain("Corpus-based retirement income report");
  const snapshot = JSON.parse(
    report.match(
      /<script id="money-planner-calculation-data" type="application\/json">([\s\S]*?)<\/script>/,
    )![1],
  );
  expect(snapshot.inputs.withdrawalRate).toBe(6);
  await page.locator("#f-withdrawalRate").fill("2");
  await page.locator("#freedomImportFile").setInputFiles(file!);
  await expect(page.locator("#f-withdrawalRate")).toHaveValue("6");
  await page.getByLabel("About monthly investment", { exact: true }).click();
  await expect(page.locator("#investmentHelp")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".freedom-layout > section")
    .first()
    .screenshot({ path: info.outputPath("freedom-income-controls.png") });
  expect(errors).toEqual([]);
});
