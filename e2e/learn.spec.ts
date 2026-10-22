import { test, expect } from "./test";
const base = process.env.VITE_BASE_PATH || "/";
test("finance guide teaches with currency-aware visuals, search, quizzes and keyboard controls", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page
    .getByRole("link", {
      name: "New to SIP or SWP? Learn the basics →",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/learn\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Made simple",
  );
  await page
    .getByRole("combobox", { name: "Example currency", exact: true })
    .selectOption("USD");
  await page
    .getByRole("slider", { name: "Assumed annual return", exact: true })
    .fill("0");
  await page
    .getByRole("slider", { name: "Years to explore", exact: true })
    .fill("1");
  await expect(page.getByTestId("lesson-value")).toHaveText("$12,000");
  await page
    .getByRole("button", {
      name: "No, the investment can lose value",
      exact: true,
    })
    .click();
  await expect(page.locator(".learn-feedback")).toContainText("You’ve got it");
  await page
    .getByRole("slider", { name: "Explore example month", exact: true })
    .fill("0");
  await page
    .getByRole("button", { name: "Play the story", exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .getByRole("slider", { name: "Explore example month", exact: true })
        .inputValue(),
    )
    .not.toBe("0");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  for (const name of ["SWP", "Return", "Inflation", "EMI"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.locator(".learn-chart")).toBeVisible();
  }
  await page
    .getByRole("slider", { name: "Years to explore", exact: true })
    .focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("slider", { name: "Years to explore", exact: true }),
  ).toHaveValue("4");
  await page
    .getByRole("searchbox", { name: "Find a term", exact: true })
    .fill("systematic");
  await expect(page.locator(".learn-term")).toHaveCount(2);
  await page
    .locator(".learn-term")
    .first()
    .getByText("Show me an example", { exact: true })
    .click();
  await expect(page.locator(".learn-term").first()).toContainText("$1,000");
  await page
    .getByRole("searchbox", { name: "Find a term", exact: true })
    .fill("zzzz");
  await expect(
    page.getByRole("heading", {
      name: "That word isn’t here yet.",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Show all terms", exact: true })
    .click();
  await page.getByRole("button", { name: "Loans", exact: true }).click();
  await expect(page.locator(".learn-term")).toHaveCount(9);
  await page.getByRole("button", { name: "All terms", exact: true }).click();
  expect(await page.locator(".learn-term").count()).toBeGreaterThanOrEqual(40);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".learn-playground")
    .screenshot({ path: info.outputPath("finance-learning.png") });
  expect(errors).toEqual([]);
});
test("finance glossary remains readable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(base + "learn/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Money words",
  );
  await expect(
    page.getByRole("heading", { name: "SIP", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".learn-sources a").first()).toHaveAttribute(
    "href",
    /investor.gov/,
  );
  expect(
    await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute("content"),
  ).toContain("default-src 'none'");
  await context.close();
});
