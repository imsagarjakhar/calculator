import { test, expect } from "./test";
import { categories } from "../src/calculators/catalog";

const library = (process.env.VITE_BASE_PATH || "/") + "all-calculators/";

test("each calculator has a unique address and a usable example", () => {
  const ids = new Set<string>();
  expect(categories).toHaveLength(8);
  const minimumEntries = [56, 50, 46, 47, 14, 22, 9, 49];
  categories.forEach((c, i) =>
    expect(c.tools.length, c.name).toBeGreaterThanOrEqual(minimumEntries[i]),
  );
  for (const category of categories) {
    for (const item of category.tools) {
      if (!("id" in item)) continue;
      expect(ids.has(item.id), item.id).toBe(false);
      ids.add(item.id);
      const output = Object.values(
        item.calculate(item.fields.map((f) => f.value)),
      );
      expect(output.length, item.id).toBeGreaterThan(0);
      for (const mode of item.modes ?? []) {
        const values = Object.values(
          mode.calculate(mode.fields.map((f) => f.value)),
        );
        expect(
          values.every((v) =>
            typeof v === "string" ? Boolean(v) : Number.isFinite(v),
          ),
          mode.title,
        ).toBe(true);
      }
      expect(
        output.every((v) =>
          typeof v === "string" ? Boolean(v) : Number.isFinite(v),
        ),
        item.id,
      ).toBe(true);
    }
  }
  expect(ids.size).toBeGreaterThanOrEqual(287);
  const modes = categories.flatMap(c => c.tools)
    .find(t => "id" in t && t.id === "percentage");
  if (!modes || !("modes" in modes)) throw Error("Missing percentage calculator");
  const calculate = (title: string, values: number[]) => {
    const variant = modes.modes?.find(m => m.title === title);
    if (!variant) throw Error("Missing mode " + title);
    return variant.calculate(values);
  };
  expect(calculate("Percentage change", [0, 30])["Absolute change"]).toBe(30);
  expect(() => calculate("One number as a percentage of another", [5, 0])).toThrow(/nonzero/);
  expect(() => calculate("Recover the original value", [0, -100])).toThrow(/100% decrease/);
  const cases: [string, number[], string, number][] = [
    ["gst", [118, 18], "GST embedded (₹)", 18],
    ["pm-kisan", [2], "Expected remaining (₹)", 2000],
    ["no-claim-bonus", [12000, 3, 0], "Renewal discount (₹)", 4200],
    ["business-roi", [100000, 120000, 6000, 1000], "ROI (%)", 25],
    [
      "property-appreciation",
      [100000, 10, 2],
      "Projected property value (₹)",
      121000,
    ],
    [
      "loan-debt-dashboard",
      [25000, 100000, 8, 5000, 50000, 14, 2500],
      "Weighted annual interest rate (%)",
      10,
    ],
  ];
  for (const [id, values, label, expected] of cases) {
    const entry = categories
      .flatMap((c) => c.tools)
      .find((t) => "id" in t && t.id === id);
    if (!entry || !("calculate" in entry))
      throw Error("Missing calculator " + id);
    expect(entry.calculate(values)[label], id).toBeCloseTo(expected, 6);
  }
});

test("search, edit and revisit a calculator", { tag: "@deploy" }, async ({ page }, info) => {
  await page.goto(library);
  await page.screenshot({ path: info.outputPath("library.png") });
  await page.getByLabel("Find a calculator").fill("Andhra Pradesh");
  await page
    .getByRole("link", { name: "Andhra Pradesh electricity bill", exact: true })
    .click();
  await page.getByLabel("Monthly consumption (kWh)").fill("100");
  await expect(page.locator("dd").first()).toHaveText("275");
  await page.getByLabel("Monthly consumption (kWh)").fill("");
  await expect(
    page.getByText("Enter Monthly consumption (kWh)."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset example" }).click();
  await expect(page.getByLabel("Monthly consumption (kWh)")).toHaveValue("150");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Andhra Pradesh electricity bill",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "All calculators", exact: true })
    .first()
    .click();
  await page.getByLabel("Browse by category").selectOption("Real estate");
  await expect(page.locator(".ledger-grid a")).toHaveCount(9);
});

test("SIP schedule exports and discount modes give known results", async ({
  page,
}) => {
  await page.goto(library + "#sip");
  await expect(page.locator(".ledger-table tbody tr")).toHaveCount(15);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV" }).click();
  expect((await download).suggestedFilename()).toBe("sip-schedule.csv");
  await page.goto(library + "#discount");
  await page
    .getByRole("combobox", { name: "Calculation", exact: true })
    .selectOption({ label: "Stack two discounts" });
  await expect(page.locator("dd").first()).toHaveText("1,440");
});

test("dated cash flows grow and rent receipts print locally", async ({
  page,
}) => {
  await page.goto(library + "#xirr");
  const dates = page.locator('input[type="date"]');
  const initial = await dates.count();
  await page.getByRole("button", { name: /add transaction/i }).click();
  await expect(dates).toHaveCount(initial + 1);
  await page.getByRole("button", { name: /remove last transaction/i }).click();
  await expect(dates).toHaveCount(initial);
  await page.goto(library + "#rent-receipt");
  for (const [label, value] of [
    ["Tenant", "Ada"],
    ["Landlord", "Dev"],
    ["Rental property address", "12 Lake Street"],
    ["Rental period", "November 2026"],
    ["Amount paid (₹)", "12000"],
    ["Payment date", "2026-11-01"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole("button", { name: "Generate receipt" }).click();
  await expect(page.locator(".ledger-receipt")).toContainText(
    "12,000 from Ada",
  );
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".ledger-inputs")).toBeHidden();
});
