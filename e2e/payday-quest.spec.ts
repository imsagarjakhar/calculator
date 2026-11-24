import { test, expect } from "./test";
const base = process.env.VITE_BASE_PATH || "/";

test("play a month, see the reserve cover a bill and replay", async ({
  page,
}, info) => {
  await page.goto(base);
  const game = page.getByRole("region", { name: "Payday Quest game" });
  await expect(game.locator("canvas")).toBeVisible();
  await page.screenshot({ path: info.outputPath("payday-home.png") });
  await game.getByRole("button", { name: "Start Payday Quest" }).click();
  for (const [index, label] of [
    "Save 35 coins",
    "Dinner out · 30 coins",
    "Repair now · 35 coins",
    "Rest at home · free",
    "Share a ride · 20 coins",
  ].entries()) {
    await game.getByRole("button", { name: label, exact: true }).click();
    if (index === 4)
      await expect(game).toContainText("drew 20 coins from your reserve");
    await game
      .getByRole("button", {
        name: index === 4 ? "See my habits" : "Next stop",
      })
      .click();
  }
  await expect(game).toContainText(
    "You finished with 15 coins and 6 memories.",
  );
  await game.getByText("See my five decisions").click();
  await expect(game.locator("li")).toHaveCount(5);
  await game.getByRole("button", { name: "Play again" }).click();
  await expect(game).toContainText("Decision 1 of 5");
  await expect(game.locator(".quest-balances")).toContainText("Wallet 100");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("a different path changes the habit reflection", async ({ page }) => {
  await page.goto(base);
  await page
    .getByRole("button", { name: "Play Payday Quest", exact: true })
    .click();
  const game = page.getByRole("region", { name: "Payday Quest game" });
  for (const [i, label] of [
    "Keep it in my wallet",
    "Meet for a walk · free",
    "Borrow a bike · free",
    "Short shift · earn 10",
    "Plan a video call · free",
  ].entries()) {
    await game.getByRole("button", { name: label, exact: true }).click();
    await game
      .getByRole("button", { name: i === 4 ? "See my habits" : "Next stop" })
      .click();
  }
  await expect(game.getByRole("heading")).toHaveText(
    "You keep your options open.",
  );
  await expect(game).toContainText("110 coins and 2 memories");
});
