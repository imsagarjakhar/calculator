import { test, expect } from "./test";
const base = process.env.VITE_BASE_PATH || "/";
const api = process.env.VITE_VLOG_API_ORIGIN || "";
test("workspace opens with one-day chart, drawing tools and a usable close action", async ({
  page,
}) => {
  await page.route("https://www.tradingview-widget.com/**", (route) =>
    route.fulfill({
      body: "<!doctype html><title>Chart tools</title>",
      contentType: "text/html",
    }),
  );
  await page.goto(base + "markets/");
  await page.getByRole("button", { name: "Open chart workspace" }).click();
  const desk = page.getByRole("dialog", { name: "Your market desk." });
  await expect(desk).toBeVisible();
  const src = await desk.locator("iframe").getAttribute("src");
  const config = JSON.parse(decodeURIComponent(new URL(src!).hash.slice(1)));
  expect(config.range).toBeUndefined();
  expect(config.interval).toBe("D");
  expect(config.hide_side_toolbar).toBe(false);
  expect(config.allow_symbol_change).toBe(true);
  await expect(
    desk.getByRole("button", { name: "Log in to save watchlists" }),
  ).toBeVisible();
  expect(
    await desk.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(desk).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Open chart workspace" }),
  ).toBeFocused();
});

test("existing account saves multiple watchlists, reloads and keeps changes after a conflict", async ({
  page,
}, info) => {
  test.skip(
    !api,
    "Run this flow with the existing publishing API origin configured.",
  );
  let saved: any = { version: 1, lists: [], revision: null };
  let conflict = false;
  const sessions: string[] = [];
  await page.route("https://www.tradingview-widget.com/**", (route) =>
    route.fulfill({
      body: "<!doctype html><title>Chart</title>",
      contentType: "text/html",
    }),
  );
  await page.route(api + "/**", (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    };
    if (req.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (path === "/login")
      return route.fulfill({
        headers,
        json: {
          username: "imsagarjakhar",
          token: "test-signed-session",
          expiresAt: Date.now() + 14 * 60000,
        },
      });
    expect(path).toBe("/watchlists");
    sessions.push(req.headers().authorization);
    if (req.method() === "POST") {
      if (conflict)
        return route.fulfill({
          status: 409,
          headers,
          json: {
            error:
              "Saved watchlists changed in another tab. Reload saved lists to use the latest version.",
          },
        });
      saved = { ...req.postDataJSON(), revision: "a".repeat(40) };
    }
    return route.fulfill({ headers, json: saved });
  });
  async function login() {
    await page
      .getByRole("button", { name: "Log in to save watchlists" })
      .click();
    const login = page.getByRole("dialog", {
      name: "Publisher login",
      exact: true,
    });
    await login.getByLabel("Publisher username").fill("imsagarjakhar");
    await login
      .getByLabel("Password", { exact: true })
      .fill("test-only-password");
    await login.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(login).toBeHidden();
  }
  await page.goto(base + "markets/");
  await page.getByRole("button", { name: "Open chart workspace" }).click();
  await login();
  const desk = page.getByRole("dialog", { name: "Your market desk." });
  const listName = desk.getByLabel("New watchlist", { exact: true });
  await expect(listName).toBeEnabled();
  await listName.fill("Long-term ideas");
  await desk.getByRole("button", { name: "Create", exact: true }).click();
  await desk.getByLabel("Add a stock · exchange:ticker").fill("NASDAQ:AAPL");
  await desk.getByRole("button", { name: "Add", exact: true }).click();
  await listName.fill("India ideas");
  await desk.getByRole("button", { name: "Create", exact: true }).click();
  await desk.getByLabel("Add a stock · exchange:ticker").fill("BSE:500209");
  await desk.getByRole("button", { name: "Add", exact: true }).click();
  await desk.getByRole("button", { name: "INFY BSE", exact: true }).click();
  const selectedChart = await desk.locator("iframe").getAttribute("src");
  expect(
    JSON.parse(decodeURIComponent(new URL(selectedChart!).hash.slice(1)))
      .symbol,
  ).toBe("BSE:INFY");
  await desk
    .getByRole("button", { name: "Save watchlists", exact: true })
    .click();
  await expect(
    desk.getByText("Watchlists saved to your account.", { exact: true }),
  ).toBeVisible();
  expect(saved.lists.map((list: any) => list.name)).toEqual([
    "Long-term ideas",
    "India ideas",
  ]);
  await desk.screenshot({ path: info.outputPath("market-workspace.png") });
  await page.reload();
  await page.getByRole("button", { name: "Open chart workspace" }).click();
  await login();
  await expect(desk.getByLabel("Choose a watchlist")).toContainText(
    "India ideas",
  );
  await desk
    .getByLabel("Choose a watchlist")
    .selectOption({ label: "India ideas (1)" });
  await expect(
    desk.getByRole("button", { name: "INFY BSE", exact: true }),
  ).toBeVisible();
  conflict = true;
  await desk.getByLabel("Add a stock · exchange:ticker").fill("NSE:INFY");
  await desk.getByRole("button", { name: "Add", exact: true }).click();
  await desk
    .getByRole("button", { name: "Save watchlists", exact: true })
    .click();
  await expect(desk.getByRole("alert")).toContainText("another tab");
  await expect(
    desk.getByRole("button", { name: "INFY NSE", exact: true }),
  ).toBeVisible();
  await desk.getByRole("button", { name: "INFY NSE", exact: true }).click();
  await expect(
    desk.getByRole("link", { name: "Open NSE:INFY on TradingView" }),
  ).toBeVisible();
  expect(
    sessions.every((value) => value === "Bearer test-signed-session"),
  ).toBe(true);
  expect(
    await desk.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  ).toBe(true);
});
