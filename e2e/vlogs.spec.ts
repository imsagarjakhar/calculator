import { test, expect } from "@playwright/test";
import type { Vlog } from "../src/vlogs/repository";
const app = process.env.VITE_BASE_PATH || "/";
const apiOrigin = process.env.VITE_VLOG_API_ORIGIN || "";
const raw = "https://raw.githubusercontent.com/imsagarjakhar/vlog/";
const github = "https://api.github.com/repos/imsagarjakhar/vlog/contents/";
const metadata = ({ body: _body, ...post }: Vlog) => post;
function sample(index: number): Vlog {
  return {
    id: `${String(index).padStart(8, "0")}-1111-4111-8111-111111111111`,
    title: `Money story ${index}`,
    summary: `Useful thoughts ${index}`,
    author: "imsagarjakhar",
    createdAt: `2026-10-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
    updatedAt: `2026-10-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
    body: "A thoughtful plan.\n<script>globalThis.vlogXss = 1</script>",
    videoUrl: "https://www.youtube.com/watch?v=example",
  };
}
test("publisher does not accept credentials before its API is configured", async ({
  page,
  context,
}) => {
  test.skip(
    Boolean(apiOrigin),
    "This check covers the unconfigured website build.",
  );
  await context.route(raw + "**", (route) =>
    route.fulfill({ json: { version: 1, posts: [] } }),
  );
  await page.goto(app);
  await page.getByRole("button", { name: /Login/ }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Publisher login is not connected yet",
  );
  await expect(
    page.getByRole("dialog").locator('input[type="password"]'),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Close vlog window" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("vlogs are loaded at runtime, searchable and readable without login", async ({
  page,
  context,
}, info) => {
  let posts = Array.from({ length: 7 }, (_, index) => sample(index));
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await context.route(raw + "**", (route) => {
    const url = new URL(route.request().url());
    expect(route.request().headers().authorization).toBeUndefined();
    if (url.pathname.endsWith("index.json"))
      return route.fulfill({
        // Simulate GitHub's raw CDN still serving the older, single-post feed.
        json: { version: 1, posts: posts.slice(0, 1).map(metadata) },
      });
    const post = posts.find((item) => url.pathname.endsWith(item.id + ".json"));
    return route.fulfill({ json: post });
  });
  await context.route(github + "**", (route) =>
    route.fulfill({
      json: {
        type: "file",
        encoding: "base64",
        content: Buffer.from(
          JSON.stringify({ version: 1, posts: posts.map(metadata) }),
        ).toString("base64"),
      },
    }),
  );
  await page.goto(app);
  await expect(
    page.getByRole("button", { name: "Login", exact: false }),
  ).toBeVisible();
  await expect(page.locator(".vlog-card")).toHaveCount(0);
  await page
    .locator(".vlog-choice")
    .screenshot({ path: info.outputPath("vlog-entry.png") });
  await page.getByRole("link", { name: /View all vlogs/ }).click();
  await expect(page).toHaveURL(/#vlogs$/);
  await expect(page.locator("#homeScreen")).toBeHidden();
  await expect(page.locator(".vlog-card")).toHaveCount(6);
  await expect(page.locator("#vlogs")).not.toContainText("imsagarjakhar");
  await page
    .locator("#vlogs")
    .screenshot({ path: info.outputPath("vlog-feed.png") });
  await page.getByRole("button", { name: /Show more vlogs/ }).click();
  await expect(page.locator(".vlog-card")).toHaveCount(7);
  await page.getByLabel("Find a vlog").fill("story 3");
  await expect(page.locator(".vlog-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Read vlog" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "<script>globalThis.vlogXss = 1</script>",
  );
  await expect(page.getByRole("dialog")).not.toContainText("imsagarjakhar");
  expect(
    await page.evaluate(() => (globalThis as any).vlogXss),
  ).toBeUndefined();
  await expect(
    page.getByRole("link", { name: "Watch the video" }),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await page.getByRole("button", { name: "Close vlog window" }).click();
  await page.getByLabel("Find a vlog").fill("");
  posts = [sample(8), ...posts];
  await page.getByRole("button", { name: "Refresh vlogs" }).click();
  await expect(page.locator(".vlog-card").first()).toContainText(
    "Money story 8",
  );
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.getByRole("link", { name: "← All planners", exact: true }).click();
  await expect(page.locator("#homeScreen")).toBeVisible();
  await expect(page.locator(".vlog-card")).toHaveCount(0);
  await page.goBack();
  await expect(page.locator("#vlogs")).toBeVisible();
  await page.reload();
  await expect(page.locator("#vlogs")).toBeVisible();
  await page.goForward();
  await expect(page.locator("#homeScreen")).toBeVisible();
});

test("publisher logs in, publishes, edits and removes posts without redeploying or storing credentials", async ({
  page,
  context,
}, info) => {
  test.skip(
    !apiOrigin,
    "Configure VITE_VLOG_API_ORIGIN to exercise the publishing service UI.",
  );
  let posts: Vlog[] = [];
  const password = "test-only-publisher-password-31";
  const session = "test-only-short-lived-publisher-session";
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await context.route(raw + "**", (route) => {
    const url = new URL(route.request().url());
    expect(route.request().headers().authorization).toBeUndefined();
    return route.fulfill({
      json: url.pathname.endsWith("index.json")
        ? { version: 1, posts: posts.map(metadata) }
        : posts.find((post) => url.pathname.endsWith(post.id + ".json")),
    });
  });
  await context.route(github + "**", (route) =>
    route.fulfill({
      json: {
        type: "file",
        encoding: "base64",
        content: Buffer.from(
          JSON.stringify({ version: 1, posts: posts.map(metadata) }),
        ).toString("base64"),
      },
    }),
  );
  await context.route(apiOrigin + "/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const headers = {
      "Access-Control-Allow-Origin": new URL(page.url()).origin,
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    };
    if (request.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (path === "/login") {
      expect(request.postDataJSON()).toEqual({
        username: "imsagarjakhar",
        password,
      });
      return route.fulfill({
        headers,
        json: {
          username: "imsagarjakhar",
          token: session,
          expiresAt: Date.now() + 900000,
        },
      });
    }
    expect(request.headers().authorization).toBe("Bearer " + session);
    if (request.method() === "POST" && path === "/posts") {
      const input = request.postDataJSON();
      const previous = input.original
        ? posts.find((post) => post.id === input.original.id)
        : null;
      const post = {
        ...input.draft,
        id: previous?.id || input.newId,
        author: "imsagarjakhar",
        createdAt: previous?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      posts = [post, ...posts.filter((item) => item.id !== post.id)];
      return route.fulfill({
        headers,
        json: { post, posts: posts.map(metadata) },
      });
    }
    if (request.method() === "GET")
      return route.fulfill({
        headers,
        json: posts.find((post) => path.endsWith(post.id)),
      });
    if (request.method() === "DELETE") {
      posts = posts.filter((post) => !path.endsWith(post.id));
      return route.fulfill({ headers, json: { posts: posts.map(metadata) } });
    }
    throw new Error("Unexpected request");
  });
  await page.goto(app);
  await page.getByRole("button", { name: "Login", exact: false }).click();
  await expect(
    page.getByLabel("Publisher username", { exact: true }),
  ).toHaveValue("");
  await page
    .getByLabel("Publisher username", { exact: true })
    .fill("imsagarjakhar");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Log out", exact: true }),
  ).toBeVisible();
  const storage = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }),
  );
  expect(storage).not.toContain(password);
  expect(storage).not.toContain(session);
  await page.getByRole("link", { name: /View all vlogs/ }).click();
  await page.getByRole("button", { name: "+ Add vlog", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("My first finance vlog");
  await page
    .getByLabel("Short introduction", { exact: true })
    .fill("A clear monthly investing habit.");
  await page
    .getByLabel("Content", { exact: true })
    .fill("Invest ₹20,000 with a plan.\nKeep an emergency reserve.");
  await page.screenshot({ path: info.outputPath("vlog-editor.png") });
  await page.getByRole("button", { name: "Publish vlog", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".vlog-card")).toContainText(
    "My first finance vlog",
  );
  const visitor = await context.newPage();
  await visitor.goto(new URL(app + "#vlogs", page.url()).href);
  await expect(visitor.locator(".vlog-card")).toContainText(
    "My first finance vlog",
  );
  await expect(visitor.getByRole("button", { name: /Login/ })).toBeVisible();
  await expect(
    visitor.getByRole("button", { name: "Edit", exact: true }),
  ).toHaveCount(0);
  await visitor.close();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("My updated finance vlog");
  await page
    .getByRole("button", { name: "Publish changes", exact: true })
    .click();
  await expect(page.locator(".vlog-card")).toContainText(
    "My updated finance vlog",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.locator(".vlog-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.getByRole("button", { name: /Login/ })).toBeVisible();
  expect(errors).toEqual([]);
});
