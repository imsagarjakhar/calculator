import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const base = process.env.VITE_BASE_PATH || "/";
for (const item of [
  {
    route: "salary-budget",
    kind: "budget",
    label: "Take-home salary (USD)",
    restoredLabel: "Take-home salary (INR)",
    initial: "50000",
  },
  {
    route: "loan-payoff",
    kind: "loan",
    label: "Monthly take-home income",
    restoredLabel: "Monthly take-home income",
    initial: "80000",
  },
]) {
  test(`${item.kind} shared header controls and hidden-data HTML report round trip`, async ({
    page,
    context,
  }, info) => {
    await page.goto(`${base}${item.route}/`);
    const header = page.locator(".planner-header");
    await expect(header.getByRole("heading", { level: 1 })).toBeVisible();
    await header
      .getByRole("combobox", { name: "Plan currency", exact: true })
      .selectOption("USD");
    await expect(page.getByLabel(item.label, { exact: true })).toHaveValue(
      item.initial,
    );
    await page.getByLabel(item.label, { exact: true }).fill("65000");
    await page.reload();
    await expect(
      header.getByRole("combobox", { name: "Plan currency", exact: true }),
    ).toHaveValue("USD");
    const downloaded = page.waitForEvent("download");
    await header
      .getByRole("button", { name: "Download report", exact: true })
      .click();
    const file = await (await downloaded).path();
    const html = await readFile(file!, "utf8");
    expect(html).toContain('type="application/json"');
    const report = await context.newPage();
    await report.setContent(html);
    await expect(report.locator("#money-planner-restore-data")).toBeHidden();
    expect(await report.locator("body").innerText()).not.toContain('"schema"');
    await report.close();
    await page.getByLabel(item.label, { exact: true }).fill("99000");
    await page.locator(`#${item.kind}-file`).setInputFiles(file!);
    await expect(page.getByLabel(item.label, { exact: true })).toHaveValue(
      "65000",
    );
    await expect(
      page.getByRole("status").filter({ hasText: "was restored" }),
    ).toBeVisible();
    page.once("dialog", (d) => d.dismiss());
    await header.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.getByLabel(item.label, { exact: true })).toHaveValue(
      "65000",
    );
    page.once("dialog", (d) => d.accept());
    await header.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(
      header.getByRole("combobox", { name: "Plan currency", exact: true }),
    ).toHaveValue("INR");
    await expect(
      page.getByLabel(item.restoredLabel, { exact: true }),
    ).toHaveValue(item.initial);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`${item.kind}-header.png`),
      fullPage: false,
    });
  });
}
