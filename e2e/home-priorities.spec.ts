import { test, expect } from "./test";
const base = process.env.VITE_BASE_PATH || "/";
test("homepage leads with original learning resources and everyday tools before planners", async ({
  page,
}) => {
  await page.goto(base);
  const discovery = page.locator(".discovery-directory .tool-card");
  expect(
    await discovery.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    ),
  ).toEqual(
    ["learn", "guides", "markets", "currency-converter", "#vlogs"].map(
      (route) => (route.startsWith("#") ? route : `${base}${route}/`),
    ),
  );
  await expect(page.locator(".tool-planners-grid .tool-card")).toHaveCount(7);
  await expect(page.locator(".salary-choice")).not.toHaveClass(/tool-feature/);
  await expect(page.locator(".loan-choice")).not.toHaveClass(/tool-feature/);
  await expect(page.locator(".discovery-directory .tool-feature")).toHaveCount(
    2,
  );
  expect(
    await page
      .locator("#explore")
      .evaluate(
        (el) =>
          !!(
            el.compareDocumentPosition(document.getElementById("planners")!) &
            Node.DOCUMENT_POSITION_FOLLOWING
          ),
      ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const screenshots = page.locator(".discovery-directory");
  await expect(screenshots).toBeVisible();
  await page.getByRole("link", { name: "Start with an example" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Five money questions. Worked through.",
  );
});
