import assert from "node:assert/strict";
import { test } from "node:test";
import {
  debtExample,
  guideChapters,
  sequenceExample,
  sipExample,
} from "../src/content/planningExamples.ts";
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.01, `${a} != ${b}`);
test("worked SIP values match an independent end-month annuity formula", () => {
  for (const rate of [0, 6, 12]) {
    const r = rate / 1200,
      expected = r ? (1000 * ((1 + r) ** 120 - 1)) / r : 120000;
    const example = sipExample(rate);
    near(example.balance, expected);
    near(example.deposited, 120000);
    near(example.growth, expected - 120000);
    near(example.todayValue, expected / 1.06 ** 10);
  }
});
test("the guide compares the same budget and finish date and allows the outcome to reverse", () => {
  const at12 = debtExample(12),
    at6 = debtExample(6);
  const principal = 1000000,
    budget = 50000,
    months = 35,
    r = 0.104 / 12;
  const g = (1.12 * 0.995) ** (1 / 12) - 1;
  const emi = (principal * r) / (1 - (1 + r) ** -months);
  near(at12.invest.net, ((budget - emi) * ((1 + g) ** months - 1)) / g);
  const payoffMonth = Math.ceil(
    -Math.log(1 - (principal * r) / budget) / Math.log(1 + r),
  );
  const beforeLast =
    principal * (1 + r) ** (payoffMonth - 1) -
    (budget * ((1 + r) ** (payoffMonth - 1) - 1)) / r;
  const lastPayment = beforeLast * (1 + r),
    remaining = months - payoffMonth;
  near(
    at12.repay.net,
    (budget - lastPayment) * (1 + g) ** remaining +
      (budget * ((1 + g) ** remaining - 1)) / g,
  );
  assert.ok(at12.invest.net > at12.repay.net);
  assert.ok(at6.invest.net < at6.repay.net);
  assert.equal(at12.invest.rows.length, 35);
  assert.equal(at12.repay.rows.length, 35);
  for (const result of Object.values(at12))
    for (const row of result.rows)
      near(row.required + row.extra + row.fees + row.invested, 50000);
});
test("sequence illustration shows withdrawal timing rather than inventing extra returns", () => {
  near(sequenceExample([20, -20]), 78400);
  near(sequenceExample([-20, 20]), 74400);
  near(100000 * 1.2 * 0.8, 96000);
  assert.equal(new Set(guideChapters.map((chapter) => chapter.id)).size, 5);
});
