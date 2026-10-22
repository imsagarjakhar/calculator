import { test as base } from "@playwright/test";
export { expect, type Page } from "@playwright/test";

// Most calculator tests do not exercise the blog. Never contact the live
// publishing service from those tests; blog-specific routes override this.
export const test = base.extend({
  context: async ({ context }, use) => {
    const origin = process.env.VITE_VLOG_API_ORIGIN;
    if (origin) {
      await context.route(origin + "/public/posts", (route) =>
        route.fulfill({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          json: { version: 1, posts: [] },
        }),
      );
    }
    await use(context);
  },
});
