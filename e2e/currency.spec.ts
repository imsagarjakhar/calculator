import { test, expect } from "./test";

const base = process.env.VITE_BASE_PATH || "/";
test("home currency follows every planner and all authored examples", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.getByLabel("Your currency", { exact: true }).selectOption("USD");
  await expect(page.locator(".planning-example")).toContainText("$50,000");
  await expect(page.locator(".planning-steps")).toContainText("$100,000");
  await expect(page.locator(".planning-guide")).not.toContainText("₹");
  // SPA navigation must update already-mounted uncontrolled planner controllers.
  await page.getByRole("link", { name: /Explore my future/ }).click();
  await expect(
    page.locator("#growthScreen .planner-currency select"),
  ).toHaveValue("USD");
  await expect(page.locator("#growthScreen .currency-code").first()).toHaveText(
    "USD",
  );
  for (const route of [
    "salary-budget",
    "loan-payoff",
    "survival",
    "custom-plan",
    "freedom",
    "bucket-plan",
  ]) {
    await page.goto(`${base}${route}/`);
    await expect(page.locator(".planner-currency select:visible")).toHaveValue(
      "USD",
    );
    const visibleText = await page.locator("main").innerText();
    // Currency choices list all supported symbols; examples and results do not.
    expect(visibleText.replace(/INR — ₹/g, "")).not.toMatch(/₹|\brupees?\b/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.locator(".planner-currency select:visible").selectOption("SAR");
  await page.goto(base);
  await expect(page.getByLabel("Your currency", { exact: true })).toHaveValue(
    "SAR",
  );
  await expect(page.locator(".planning-example")).toContainText("SAR");
  await expect(page.locator(".planning-example")).not.toContainText("₹");
  await page.reload();
  await expect(page.getByLabel("Your currency", { exact: true })).toHaveValue(
    "SAR",
  );
  expect(errors).toEqual([]);
});

test("currency choice still works when browser storage is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Disabled");
      },
    }),
  );
  await page.goto(base);
  await page.getByLabel("Your currency", { exact: true }).selectOption("EUR");
  await expect(page.locator(".planning-example")).toContainText("€50,000");
  await page.getByRole("link", { name: /Explore my future/ }).click();
  await expect(
    page.locator("#growthScreen .planner-currency select"),
  ).toHaveValue("EUR");
});
