import assert from "node:assert/strict";
import { test } from "node:test";
import {
  initialBudget,
  calculateBudget,
  monthlyReserve,
  validBudget,
} from "../src/budget/model.ts";
const plan = () => structuredClone(initialBudget);
test("salary is allocated once across spending, reserves, saving and buffer", () => {
  const r = calculateBudget(plan());
  assert.equal(r.income, 50000);
  assert.equal(r.needs, 25000);
  assert.equal(r.wants, 10000);
  assert.equal(r.bills, 3000);
  assert.equal(r.future, 10000);
  assert.equal(r.allocated, 50000);
  assert.equal(r.remainder, 0);
  const p = plan();
  p.salary = 40000;
  assert.equal(calculateBudget(p).remainder, -10000);
});
test("bill and goal contributions use remaining amount and actual months to deadline", () => {
  assert.equal(monthlyReserve(36000, 6000, 6), 5000);
  assert.equal(monthlyReserve(1000, 2000, 6), 0);
  const p = plan();
  p.goalAmount = 60000;
  p.goalSaved = 12000;
  p.goalMonths = 6;
  assert.equal(calculateBudget(p).goal, 8000);
  assert.equal(calculateBudget(p).remainder, -8000);
});
test("twelve month-end contributions earn no return on the final deposit", () => {
  const p = plan();
  p.investment = 1000;
  p.annualReturn = 0;
  let r = calculateBudget(p);
  assert.equal(r.end.corpus, 12000);
  assert.equal(r.end.gain, 0);
  p.annualReturn = 12;
  r = calculateBudget(p);
  const expected = Array.from(
    { length: 12 },
    (_, i) => 1000 * Math.pow(1.12, i / 12),
  ).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(r.end.corpus - expected) < 1e-8);
  assert.equal(r.projection[0].growth, 0);
  assert.equal(r.projection[0].corpus, 1000);
  p.annualReturn = -20;
  r = calculateBudget(p);
  assert.ok(r.end.corpus < 12000 && r.end.gain < 0);
  p.investment = 0;
  assert.equal(calculateBudget(p).end.corpus, 0);
});
test("emergency savings and recorded actual spending stay separate from the plan", () => {
  const p = plan();
  let r = calculateBudget(p);
  assert.equal(r.emergencyTarget, 168000);
  assert.equal(r.emergencyGap, 143000);
  assert.equal(r.emergencyTime, 36);
  p.emergencyMonthly = 0;
  assert.equal(calculateBudget(p).emergencyTime, null);
  p.emergencySaved = 200000;
  assert.equal(calculateBudget(p).emergencyTime, 0);
  p.expenses[0].actual = 13000;
  p.expenses[1].actual = 0;
  r = calculateBudget(p);
  assert.equal(r.actual, 13000);
  assert.equal(r.recordedCount, 2);
  assert.equal(r.recordedPlan, 17000);
  assert.equal(r.needs, 25000);
});
test("stored plans are validated before use", () => {
  assert.ok(validBudget(plan()));
  for (const change of [
    { salary: -1 },
    { salary: Infinity },
    { goalMonths: 0 },
    { annualReturn: -100 },
    { currency: "INVALID" },
    { bills: [{ id: "x", name: "Bill", amount: 100, reserved: 0, months: 0 }] },
  ]) {
    assert.equal(validBudget({ ...plan(), ...change }), false);
  }
  assert.equal(validBudget(null), false);
  assert.equal(validBudget({ ...plan(), expenses: [null] }), false);
  assert.equal(validBudget({ ...plan(), bills: [null] }), false);
});
