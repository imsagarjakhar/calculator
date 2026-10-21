import { test, expect } from "@playwright/test";
const base = process.env.VITE_BASE_PATH || "/";
test("all pages use neutral branding while the domain remains unchanged", async ({
  page,
}) => {
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
    "The Money Planner Vlog",
  );
  await expect(page.locator("#vlogs")).not.toContainText(/intimetec/i);
});
