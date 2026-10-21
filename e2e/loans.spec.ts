import { test, expect } from "@playwright/test";
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
  await expect(
    page.getByRole("group", { name: "Loan 1", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("loan-setup.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /Compare my options/ }).click();
  await expect(page.locator(".loan-strategy")).toHaveCount(4);
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
  await page.getByLabel("Extra monthly budget", { exact: true }).fill("999999");
  await page.getByRole("button", { name: /Compare paths/ }).click();
  await expect(page.locator(".loan-errors")).toContainText(
    "exceeds your available budget",
  );
  await expect(page.locator(".loan-strategy")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Review my inputs", exact: true })
    .click();
  await page.locator("#loan-file").setInputFiles(file);
  await expect(
    page.getByLabel("Extra monthly budget", { exact: true }),
  ).toHaveValue("10000");
  await page.reload();
  await expect(
    page.getByLabel("Extra monthly budget", { exact: true }),
  ).toHaveValue("10000");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("salary import excludes its EMI category and asks for actual loans", async ({
  page,
}) => {
  await page.addInitScript(
    (p) =>
      localStorage.setItem("intimetec-salary-budget-v1", JSON.stringify(p)),
    initialBudget,
  );
  await page.goto(base + "loan-payoff/");
  await page
    .getByRole("button", { name: "Use my salary budget", exact: true })
    .click();
  await expect(
    page.getByLabel("Monthly take-home income", { exact: true }),
  ).toHaveValue("50000");
  await expect(
    page.getByLabel("Living costs, bills & other goals", { exact: true }),
  ).toHaveValue("35000");
  await expect(
    page.getByLabel("Extra monthly budget", { exact: true }),
  ).toHaveValue("6000");
  await expect(page.locator(".loan-editor")).toHaveCount(0);
  await expect(page.locator(".loan-notice")).toContainText("counted once");
  await page.reload();
  await expect(page.locator(".loan-editor")).toHaveCount(0);
  await expect(
    page.getByLabel("Monthly take-home income", { exact: true }),
  ).toHaveValue("50000");
  await page.getByRole("button", { name: /Add another loan/ }).click();
  await page.getByLabel("Outstanding balance", { exact: true }).fill("10000");
  await page.getByRole("button", { name: /Compare my options/ }).click();
  await expect(page.locator(".loan-strategy")).toHaveCount(4);
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
  await expect(page.getByRole("status")).toContainText(
    "Browser saving unavailable",
  );
  await page.locator("#loan-file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"plan":{"salary":-1}}'),
  });
  await expect(page.locator(".loan-notice")).toContainText("Check the income");
  await expect(
    page.getByLabel("Monthly take-home income", { exact: true }),
  ).toHaveValue("80000");
  await page.getByRole("button", { name: /Compare my options/ }).click();
  await expect(page.locator(".loan-strategy")).toHaveCount(4);
});
