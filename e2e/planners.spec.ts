import { test as base, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const appBase = process.env.VITE_BASE_PATH || "/";
const appPath = (route: string) => appBase + route.replace(/^\//, "");

const load = createRequire(process.cwd() + "/package.json");
const Growth = load("./bkp/growth-engine.js");
const Survival = load("./bkp/survival-engine.js");
const Custom = load("./bkp/custom-engine.js");
const Report = load("./bkp/calculator-report.js");
const CustomReport = load("./bkp/custom-report.js");

const test = base.extend<{ consoleCheck: void }>({
  consoleCheck: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await use();
      expect(
        errors,
        "No browser runtime, React, CSP or resource errors",
      ).toEqual([]);
    },
    { auto: true },
  ],
});
async function downloadText(page: Page, selector: string) {
  const pending = page.waitForEvent("download");
  await page.locator(selector).click();
  const download = await pending;
  return {
    text: await readFile((await download.path())!, "utf8"),
    filename: download.suggestedFilename(),
  };
}
async function upload(
  page: Page,
  selector: string,
  text: string,
  name = "saved-report.html",
) {
  await page.locator(selector).setInputFiles({
    name,
    mimeType: name.endsWith(".json") ? "application/json" : "text/html",
    buffer: Buffer.from(text),
  });
}
const routes = [
  ["/growth/", "From your salary to your goal"],
  ["/survival/", "How long will your money last?"],
  ["/custom-plan/", "Your money, month by month"],
  ["/freedom/", "When could you be financially free?"],
  ["/bucket-plan/", "Three purposeful buckets."],
] as const;

test("clean routes support navigation, reloads, browser history and old bookmarks", async ({
  page,
}, info) => {
  await page.goto(appPath("/"));
  await expect(page.locator("h1:visible")).toContainText(
    "Smarter money moves.",
  );
  await page
    .getByText("Is this an AI financial planner?", { exact: true })
    .click();
  await expect(page.locator(".welcome-faq")).toContainText(
    "do not use generative AI",
  );
  await page.screenshot({
    path: info.outputPath("landing.png"),
    fullPage: false,
  });
  await page.getByRole("button", { name: "Explore my future" }).click();
  expect(new URL(page.url()).pathname).toBe(appPath("/growth/"));
  await page.reload();
  await expect(page.locator("h1:visible")).toContainText("From your salary");
  await page.locator('#plannerNav [data-screen="survival"]').click();
  expect(new URL(page.url()).pathname).toBe(appPath("/survival/"));
  await page.goBack();
  await expect(page.locator("h1:visible")).toContainText("From your salary");
  await page.goForward();
  await expect(page.locator("h1:visible")).toContainText(
    "How long will your money last?",
  );
  await page.locator('#plannerNav [data-screen="home"]').click();
  expect(new URL(page.url()).pathname).toBe(appPath("/"));
  await page.locator(".custom-choice").click();
  expect(new URL(page.url()).pathname).toBe(appPath("/custom-plan/"));
  await page.locator(".back-to-planners").click();
  expect(new URL(page.url()).pathname).toBe(appPath("/"));
  for (const name of ["custom-plan", "freedom", "bucket-plan"]) {
    await page.goto(appPath("/" + name + ".html"));
    expect(new URL(page.url()).pathname).toBe(appPath("/" + name + "/"));
    await page.reload();
    await expect(page.locator("h1:visible")).toHaveCount(1);
  }
  await page.goto(appPath("/index.html#growth"));
  await expect(page.locator("h1:visible")).toContainText("From your salary");
  expect(new URL(page.url()).pathname).toBe(appPath("/growth/"));
  expect(new URL(page.url()).hash).toBe("");
});

test("all five calculators load with consistent controls, native dates and responsive layouts", async ({
  page,
}, info) => {
  for (const [route, heading] of routes) {
    await page.goto(appPath(route));
    await expect(page.locator("h1:visible")).toContainText(heading);
    const toolbar = page.locator(".planner-toolbar:visible");
    await expect(toolbar.locator(".planner-toolbar-actions button")).toHaveText(
      ["Import report", "Download report", "Reset"],
    );
    await expect(toolbar.locator("select option")).toHaveText([
      "INR — ₹",
      "SAR — ر.س",
      "USD — $",
      "AED — د.إ",
      "EUR — €",
      "GBP — £",
    ]);
    await expect(
      page.getByText("The planner could not start", { exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      route + " stays within viewport",
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(route.replace(/\W/g, "") + ".png"),
      fullPage: false,
    });
  }
});

test("Growth matches the existing engine, persists edits, survives navigation, exports and imports", async ({
  page,
}) => {
  await page.goto(appPath("/growth/"));
  const inputs = {
    monthly: 10000,
    stepup: 5,
    years: 5,
    rate: 8,
    goal: 10000000,
    inflation: 6,
  };
  for (const [key, value] of Object.entries(inputs))
    await page.locator("#" + key).fill(String(value));
  const expected = Growth.projectPlan(inputs, [], [], {
    assets: [],
    loans: [],
  });
  await expect(page.locator("#exactValue")).toContainText(
    Math.round(expected.balance).toLocaleString("en-IN"),
  );
  await expect(page.locator("#tableBody tr")).toHaveCount(5);
  await page.locator('#plannerNav [data-screen="survival"]').click();
  await page.locator("#s-swp").fill("45000");
  await page.locator('#plannerNav [data-screen="growth"]').click();
  await expect(page.locator("#monthly")).toHaveValue("10000");
  await page.reload();
  await expect(page.locator("#monthly")).toHaveValue("10000");
  const report = await downloadText(page, "#growthReport");
  const snapshot = Report.read(report.text, "growth");
  expect(snapshot.results.netWorth).toBeCloseTo(expected.netWorth, 7);
  expect((await downloadText(page, "#exportMonthly")).filename).toMatch(
    /\.csv$/,
  );
  await page.locator("#reset").click();
  await expect(page.locator("#monthly")).toHaveValue("2000");
  await upload(page, "#growthImportFile", report.text);
  await expect(page.locator("#growthImportStatus")).toContainText(
    "Report imported",
  );
  await expect(page.locator("#monthly")).toHaveValue("10000");
  await upload(page, "#growthImportFile", "<html>Invalid report</html>");
  await expect(page.locator("#growthImportStatus")).toContainText(
    "Import not applied",
  );
  await expect(page.locator("#monthly")).toHaveValue("10000");
});

test("Survival imports an old dated plan, preserves its date, and resets through the shared header", async ({
  page,
}) => {
  const a = {
    currency: "EUR",
    corpus: 900000,
    age: 45,
    swp: 1500,
    inflation: 3,
    returns: 5,
    endAge: 49,
  };
  const start = new Date(2024, 1, 29);
  const o = Survival.projectSurvival(a, start, []);
  const html = Report.survival({
    a,
    o,
    events: [],
    needed: Survival.requiredCorpus(a, start, []),
  });
  await page.goto(appPath("/survival/"));
  await upload(page, "#survivalImportFile", html);
  await expect(page.locator("#survivalStartStatus")).toContainText(
    "29 Feb 2024",
  );
  await expect(page.locator("#s-currency")).toHaveValue("EUR");
  await page.locator("#s-swp").fill("1600");
  await page.reload();
  await expect(page.locator("#s-swp")).toHaveValue("1600");
  await expect(page.locator("#survivalStartStatus")).toContainText(
    "29 Feb 2024",
  );
  const restored = Report.read(
    (await downloadText(page, "#survivalReport")).text,
    "survival",
  );
  expect(restored.inputs.swp).toBe(1600);
  expect(restored.projectionStart).toContain("2024-02-29");
  await page.locator("#survivalResetTop").click();
  await expect(page.locator("#s-currency")).toHaveValue("INR");
  await expect(page.locator("#s-swp")).toHaveValue("50000");
  await expect(page.locator("#survivalStartStatus")).not.toContainText(
    "29 Feb 2024",
  );
});

test("Custom Plan restores browser data, updates live, records split investments and resets cleanly", async ({
  page,
}) => {
  const old = Custom.createPlan(new Date(2026, 5, 1));
  old.months = 24;
  old.monthlySip = 75000;
  old.name = "Existing plan";
  await page.goto(appPath("/"));
  await page.evaluate(
    (plan) =>
      localStorage.setItem("intimetec-custom-plan-v1", JSON.stringify(plan)),
    old,
  );
  await page.goto(appPath("/custom-plan/"));
  await expect(page.locator("#planName")).toHaveValue("Existing plan");
  await page.locator("#defaultSip").fill("30000");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("intimetec-custom-plan-v1")!)
            .monthlySip,
      ),
    )
    .toBe(30000);
  await page.locator("#transactionDate").fill("2026-06-10");
  await page.locator("#transactionAsset").fill("My stocks");
  await expect(page.locator("#transactionAsset")).toHaveAttribute(
    "type",
    "text",
  );
  await page.locator("#transactionNewCategory").fill("Stocks");
  await page.locator("#transactionNewReturn").fill("10");
  await page.locator("#transactionAmount").fill("10000");
  await page.locator("#transactionSubmit").click();
  await expect(page.locator("#transactionRows")).toContainText("My stocks");
  await page.locator("#transactionAsset").fill("Monthly SIP fund");
  await page.locator("#transactionAmount").fill("5000");
  await page.locator("#transactionSubmit").click();
  const firstSip = page.locator("#monthlyRows tr").first().locator("input");
  await expect(firstSip).toHaveValue("15000");
  await expect(firstSip).toHaveAttribute("readonly", "");
  await expect(page.locator("#monthlyRows tr").first()).toContainText(
    "Recorded",
  );
  await page.reload();
  await expect(firstSip).toHaveValue("15000");
  const saved = JSON.parse((await downloadText(page, "#exportPlan")).text);
  expect(saved.transactions).toHaveLength(2);
  expect(saved.monthlySip).toBe(30000);
  expect(
    saved.assets.find((asset: { name: string }) => asset.name === "My stocks")
      .value,
  ).toBe(0);
  const html = (await downloadText(page, "#exportReport")).text;
  expect(CustomReport.read(html).transactions).toHaveLength(2);
  page.on("dialog", (dialog) => dialog.accept());
  await page.locator('[data-action="remove-transaction"]').first().click();
  await page.locator('[data-action="remove-transaction"]').first().click();
  await expect(firstSip).toHaveValue("");
  await expect(firstSip).toHaveAttribute("placeholder", "30000");
  await expect(firstSip).not.toHaveAttribute("readonly", "");
  await page.locator("#resetPlan").click();
  await expect(page.locator("#defaultSip")).toHaveValue("20000");
  const reset = JSON.parse((await downloadText(page, "#exportPlan")).text);
  expect(reset.transactions).toEqual([]);
  expect(reset.loans).toEqual([]);
  expect(reset.overrides).toEqual([]);
  expect(reset.assets).toHaveLength(1);
  expect(reset.assets[0].value).toBe(0);
  await upload(page, "#importFile", html);
  await expect(page.locator("#importPreview")).toBeVisible();
  await page.locator("#confirmImport").click();
  await expect(page.locator("#defaultSip")).toHaveValue("30000");
  await expect(firstSip).toHaveValue("15000");
});

test("Freedom responds to returns, retains values across reloads, and explains impossible income targets", async ({
  page,
}) => {
  await page.goto(appPath("/freedom/"));
  await page.locator("#f-monthlyInvestment").fill("60000");
  await page.locator("#f-expectedReturn").fill("10");
  await page.reload();
  await expect(page.locator("#f-monthlyInvestment")).toHaveValue("60000");
  await page.locator("#f-expectedReturn").fill("3");
  await page.locator("#f-inflation").fill("6");
  await expect(page.locator("#freedomOutput")).toContainText("Not reached");
  await page.locator("#f-expectedReturn").fill("10");
  const report = (await downloadText(page, "#freedomReport")).text;
  expect(Report.read(report, "freedom").inputs.monthlyInvestment).toBe(60000);
  await page.locator("#freedomResetTop").click();
  await upload(page, "#freedomImportFile", report);
  await expect(page.locator("#f-monthlyInvestment")).toHaveValue("60000");
});

test("Buckets retain annual returns, refill inspection, playback, history and emergency withdrawals", async ({
  page,
}) => {
  await page.goto(appPath("/bucket-plan/"));
  await page.locator("#b-startMonth").fill("2026-06");
  await page
    .locator("details")
    .filter({ has: page.locator("#b-refillMonths") })
    .locator("summary")
    .click();
  await page.locator("#b-refillMonths").selectOption("24");
  await page.locator("#bucketDate").fill("2027-05");
  await page.locator("#bucketDate").blur();
  await page.locator('[data-history-open="spending"]').click();
  await expect(page.locator("#bucketHistory")).toBeVisible();
  await page.locator("#bucketHistoryYearly").click();
  await expect(page.locator("#bucketHistoryRows tr")).not.toHaveCount(0);
  await page.locator("#bucketHistoryClose").click();
  await page.locator("[data-extra-withdrawal]").click();
  await expect(page.locator("#extraWithdrawalPanel")).toBeVisible();
  await page.locator("#extraReason").fill("Medical bill");
  await page.locator("#extraAmount").fill("10000");
  await page.locator('#extraWithdrawalForm button[type="submit"]').click();
  await expect(page.locator("#extraWithdrawalSaved")).toContainText("Added");
  await expect(page.locator("#bucketEvents")).toContainText("Medical bill");
  await page.locator("#extraWithdrawalClose").click();
  await page.locator("#bucketPlay").click();
  await expect(page.locator("#bucketPlay")).toContainText("Pause");
  await page.locator("#bucketPlay").click();
  const html = (await downloadText(page, "#bucketReport")).text;
  const snapshot = Report.read(html, "buckets");
  expect(snapshot.inputs.refillMonths).toBe(24);
  expect(snapshot.events).toHaveLength(1);
  await page.locator("#bucketReset").click();
  await expect(page.locator("#bucketEvents")).not.toContainText("Medical bill");
  await upload(page, "#bucketImportFile", html);
  await expect(page.locator("#bucketEvents")).toContainText("Medical bill");
});

test("production pages enforce CSP and SRI and retain the custom domain and old URLs", async ({
  page,
  request,
}) => {
  for (const path of [
    "/index.html",
    "/custom-plan/",
    "/freedom/",
    "/bucket-plan/",
  ]) {
    const response = await request.get(appPath(path));
    expect(response.ok()).toBe(true);
    const html = await response.text();
    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain("connect-src 'none'");
    expect(html).not.toContain("'unsafe-eval'");
    expect(html).toMatch(/type="module"[^>]*integrity="sha384-/);
  }
  expect((await (await request.get(appPath("/CNAME"))).text()).trim()).toBe(
    "intimetec.org",
  );
  await page.goto(appPath("/growth/"));
  const outgoing: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(new URL(page.url()).origin))
      outgoing.push(request.url());
  });
  await page.locator("#monthly").fill("12000");
  await page.locator("#growthReport").click();
  expect(outgoing.filter((url) => !url.startsWith("blob:"))).toEqual([]);
});

test("calculators continue working when browser storage is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage unavailable", "QuotaExceededError");
    };
  });
  await page.goto(appPath("/custom-plan/"));
  await page.locator("#defaultSip").fill("25000");
  await expect(page.locator("#saveState")).toContainText(
    "Browser saving unavailable",
  );
  expect(
    JSON.parse((await downloadText(page, "#exportPlan")).text).monthlySip,
  ).toBe(25000);
});
