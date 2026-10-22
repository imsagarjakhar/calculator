import { test, expect } from "./test";
const base = process.env.VITE_BASE_PATH || "/";

test("site search opens the matching published blog post", async ({
  page,
  context,
}) => {
  const posts = [1, 2].map((n) => ({
    id: `0000000${n}-1111-4111-8111-111111111111`,
    title: `Workshop story ${n}`,
    summary: `Learning about money ${n}`,
    author: "imsagarjakhar",
    createdAt: "2026-10-01T10:00:00Z",
    updatedAt: "2026-10-01T10:00:00Z",
    videoUrl: "",
    body: `Workshop article ${n}`,
  }));
  const publicResponse = (url: string) => {
    const post = posts.find((p) => url.includes(p.id));
    return (
      post || {
        version: 1,
        posts: posts.map(({ body: _body, ...post }) => post),
      }
    );
  };
  await context.route(
    "https://raw.githubusercontent.com/imsagarjakhar/vlog/**",
    (route) => route.fulfill({ json: publicResponse(route.request().url()) }),
  );
  await context.route(
    "https://api.github.com/repos/imsagarjakhar/vlog/contents/**",
    (route) =>
      route.fulfill({
        json: {
          type: "file",
          encoding: "base64",
          content: Buffer.from(
            JSON.stringify(publicResponse(route.request().url())),
          ).toString("base64"),
        },
      }),
  );
  const origin = process.env.VITE_VLOG_API_ORIGIN;
  if (origin)
    await context.route(origin + "/public/**", (route) =>
      route.fulfill({
        headers: { "Access-Control-Allow-Origin": "*" },
        json: publicResponse(route.request().url()),
      }),
    );
  await page.goto(base);
  const search = page.locator(".home-header .site-search");
  await search.getByRole("searchbox").fill("Workshop story 2");
  await search
    .getByRole("link", { name: /Blog post Workshop story 2/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`post=${posts[1].id}#vlogs$`));
  await expect(
    page.getByText("Workshop article 2", { exact: true }),
  ).toBeVisible();
});

test("header search matches everyday goals, links terms and works with a keyboard", async ({
  page,
}, info) => {
  await page.goto(base);
  const search = page.locator(".home-header .site-search");
  const input = search.getByRole("searchbox", { name: "Search website" });
  await input.fill("pay my loans");
  await expect(search.locator("li a").first()).toContainText("Loan Payoff");
  await input.press("ArrowDown");
  await expect(search.locator("li a").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(input).toBeFocused();
  await expect(search.locator(".site-search-results")).not.toBeVisible();
  await input.fill("retire early");
  await expect(search.locator("li a").first()).toContainText(
    "Financial Freedom",
  );
  await input.fill("SIP");
  await page.screenshot({ path: info.outputPath("header-search.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await search.getByRole("link", { name: /Finance term SIP/ }).click();
  await expect(page).toHaveURL(/learn\/\?term=SIP#term-library$/);
  await expect(
    page.getByRole("searchbox", { name: "Find a term" }),
  ).toHaveValue("SIP");
  await expect(page.locator(".learn-term")).toHaveCount(1);
  await page
    .getByRole("searchbox", { name: "Search website" })
    .fill("xyznotfound");
  await expect(
    page.getByText("No matches yet.", { exact: false }),
  ).toBeVisible();
});

test("privacy notice follows page content and salary ignores stored drafts", async ({
  page,
}) => {
  await page.goto(base);
  expect(
    await page.evaluate(() => {
      const notice = document.querySelector(".home-data-notice")!;
      const faq = document.querySelector(".welcome-faq")!;
      return Boolean(
        faq.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }),
  ).toBe(true);
  await page.evaluate(() =>
    localStorage.setItem(
      "intimetec-salary-budget-v1",
      JSON.stringify({ salary: 99999 }),
    ),
  );
  await page.goto(`${base}salary-budget/`);
  await expect(
    page.getByLabel("Take-home salary (INR)", { exact: true }),
  ).toHaveValue("");
  await page
    .getByLabel("Take-home salary (INR)", { exact: true })
    .fill("60000");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download report", exact: true })
    .click();
  const path = await (await download).path();
  await page.reload();
  await expect(
    page.getByLabel("Take-home salary (INR)", { exact: true }),
  ).toHaveValue("");
  await page.locator('.planner-header input[type="file"]').setInputFiles(path!);
  await expect(
    page.getByLabel("Take-home salary (INR)", { exact: true }),
  ).toHaveValue("60000");
});
