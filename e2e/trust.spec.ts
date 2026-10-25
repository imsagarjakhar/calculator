import { test, expect } from "@playwright/test";

const base = process.env.VITE_BASE_PATH || "/";
test("trust pages are readable, linked and correctly classified without JavaScript", async ({
  browser,
  request,
}) => {
  test.slow();
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: `http://127.0.0.1:${process.env.PREVIEW_PORT || "4173"}`,
  });
  try {
    const page = await context.newPage();
    await page.goto(base);
    await page
      .getByRole("navigation", { name: "Website information", exact: true })
      .getByRole("link", { name: "About", exact: true })
      .click();
    for (const route of ["about", "privacy", "methodology", "contact"]) {
      await page.goto(base + route + "/");
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator(".trust-content")).toBeVisible();
      await expect(page.locator(".trust-header")).toHaveCSS("display", "block");
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `https://intimetec.org/${route}/`,
      );
      const graph = JSON.parse(
        (await page
          .locator('script[type="application/ld+json"]')
          .textContent()) || "{}",
      )["@graph"];
      expect(
        graph.some((node: any) => node["@type"] === "WebApplication"),
      ).toBe(false);
      expect(graph.some((node: any) => node["@type"] === "CreativeWork")).toBe(
        true,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect((await request.get(base + route + "/")).status()).toBe(200);
    }
    await expect(
      page.getByRole("link", {
        name: "financeaiplanner@gmail.com",
        exact: true,
      }),
    ).toHaveAttribute("href", "mailto:financeaiplanner@gmail.com");
    await page.goto(base + "privacy/");
    await expect(page.locator(".trust-content")).toContainText("opens at zero");
    await expect(
      page.getByRole("link", { name: "My Ad Center", exact: true }),
    ).toHaveAttribute("href", "https://myadcenter.google.com/");
    await expect(page.locator(".trust-content")).toContainText(
      "third-party vendors, including Google",
    );
  } finally {
    await context.close();
  }
});

test("header search finds the privacy policy and opens a working page", async ({
  page,
}) => {
  await page.goto(base);
  await page.getByRole("searchbox", { name: "Search website" }).fill("privacy");
  await page
    .locator(".site-search-results")
    .getByRole("link")
    .filter({ hasText: "Privacy policy" })
    .click();
  await expect(page).toHaveURL(new RegExp("/privacy/$"));
  await expect(page.locator("h1")).toHaveText("Your numbers. Your control.");
  await expect(page.locator(".trust-header a[aria-current=page]")).toHaveText(
    "Privacy",
  );
});
