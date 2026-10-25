import { test, expect } from "./test";
const base = process.env.VITE_BASE_PATH || "/";
test("all pages use neutral branding while the domain remains unchanged", async ({
  page,
}) => {
  // This test navigates through the whole site, including the blog view.
  test.slow();
  await page.route("https://api.github.com/**", (route) =>
    route.fulfill({
      json: {
        type: "file",
        encoding: "base64",
        content: Buffer.from('{"version":1,"posts":[]}').toString("base64"),
      },
    }),
  );
  for (const route of [
    "",
    "growth/",
    "survival/",
    "custom-plan/",
    "freedom/",
    "bucket-plan/",
    "salary-budget/",
    "loan-payoff/",
  ]) {
    await page.goto(base + route);
    const stripDomain = (text: string) =>
      text.replace(/(?:[a-z0-9-]+\.)*intimetec\.org/gi, "");
    await expect(page.locator("main").first()).toBeVisible();
    expect(stripDomain(await page.locator("body").innerText())).not.toMatch(
      /intimetec/i,
    );
    expect(stripDomain(await page.title())).not.toMatch(/intimetec/i);
    const metadata = await page
      .locator(
        'meta[name="description"],meta[property^="og:"],meta[name^="twitter:"],script[type="application/ld+json"]',
      )
      .evaluateAll((nodes) =>
        nodes
          .map((node) => node.getAttribute("content") || node.textContent)
          .join(" "),
      );
    expect(stripDomain(metadata)).not.toMatch(/intimetec/i);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://intimetec.org/" + route,
    );
  }
  await page.goto(base + "#vlogs");
  await expect(page.locator("#vlogsTitle")).toHaveText(
    "The Financial AI Planner Blog",
  );
  await expect(page.locator("#vlogs")).not.toContainText(/intimetec/i);
});

test("all calculator headers share branding, typography, colours and page spacing", async ({
  page,
}, info) => {
  let reference: unknown;
  const routes = [
    ["growth", "GROWTH PLANNER"],
    ["survival", "CORPUS SURVIVAL"],
    ["custom-plan", "CUSTOM PLAN"],
    ["freedom", "FINANCIAL FREEDOM"],
    ["bucket-plan", "RETIREMENT BUCKETS"],
    ["salary-budget", "SALARY & BUDGET"],
    ["loan-payoff", "LOAN PAYOFF"],
  ];
  for (const [route, label] of routes) {
    await page.goto(`${base}${route}/`);
    const header = page.locator(".planner-header:visible");
    await expect(header).toHaveCount(1);
    await expect(header.locator(".eyebrow")).toHaveText(
      `Financial AI Planner / ${label}`,
    );
    await expect(
      header.getByRole("button", { name: "Import report", exact: true }),
    ).toBeVisible();
    await expect(
      header.getByRole("button", { name: "Download report", exact: true }),
    ).toBeVisible();
    await expect(
      header.getByRole("button", { name: "Reset", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".planner-navigation:visible .planner-site-name"),
    ).toHaveText("Financial AI Planner");
    await expect(
      page.locator(".planner-navigation:visible .planner-site-name"),
    ).toBeVisible();
    const appearance = await header.evaluate((el) => {
      const css = (selector: string, properties: string[]) => {
        const style = getComputedStyle(el.querySelector(selector)!);
        return Object.fromEntries(
          properties.map((p) => [p, style.getPropertyValue(p)]),
        );
      };
      const main = getComputedStyle(el.closest("main")!);
      return {
        label: css(".eyebrow", [
          "color",
          "font-size",
          "font-family",
          "font-weight",
          "letter-spacing",
          "text-transform",
        ]),
        title: css("h1", [
          "color",
          "font-size",
          "font-family",
          "font-weight",
          "line-height",
        ]),
        toolbar: css(".planner-toolbar", [
          "background-image",
          "padding",
          "border-radius",
        ]),
        button: css(".primary", [
          "background-color",
          "color",
          "min-height",
          "font-size",
        ]),
        page: [main.maxWidth, main.paddingLeft, main.paddingRight],
      };
    });
    if (reference) expect(appearance).toEqual(reference);
    else reference = appearance;
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await header.screenshot({ path: info.outputPath(`${route}-header.png`) });
  }
});
