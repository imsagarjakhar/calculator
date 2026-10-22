import assert from "node:assert/strict";
import { test } from "node:test";
import {
  initialBudget,
  emptyBudget,
  calculateBudget,
  monthlyReserve,
  monthlyGoalSaving,
  projectSavings,
  requiredAnnualStepUp,
  upgradeBudget,
  validBudget,
} from "../src/budget/model.ts";
const plan = () => structuredClone(initialBudget);
test("new budgets start with zero money and valid planning assumptions", () => {
  const p = emptyBudget("USD");
  assert.ok(validBudget(p));
  for (const key of [
    "salary",
    "otherIncome",
    "investment",
    "emergencySaved",
    "emergencyMonthly",
    "goalAmount",
    "goalSaved",
    "buffer",
  ])
    assert.equal(p[key], 0);
  assert.ok(p.expenses.every((e) => e.planned === 0 && e.actual === null));
  assert.ok(
    p.bills.every((b) => b.amount === 0 && b.reserved === 0 && b.months > 0),
  );
  assert.equal(p.currency, "USD");
  assert.equal(p.annualReturn, 12);
  assert.equal(calculateBudget(p).remainder, 0);
  assert.equal(calculateBudget(p).end.corpus, 0);
  p.expenses[0].planned = 100;
  assert.equal(initialBudget.expenses[0].planned, 12000);
});
test("goal contributions reach the target with existing savings and month-end growth", () => {
  assert.equal(monthlyGoalSaving(1000000, 5000, 40, 0), 24875);
  for (const annual of [12, -20, 0.00000001]) {
    const monthly = monthlyGoalSaving(1000000, 5000, 40, annual);
    let balance = 5000;
    const rate = Math.pow(1 + annual / 100, 1 / 12) - 1;
    for (let month = 0; month < 40; month++)
      balance = balance * (1 + rate) + monthly;
    assert.ok(Math.abs(balance - 1000000) < 0.001);
    if (annual === 12) assert.ok(monthly < 24875);
    if (annual < 0) assert.ok(monthly > 24875);
  }
  assert.equal(monthlyGoalSaving(100000, 100000, 12, 12), 0);
  assert.equal(monthlyGoalSaving(0, 0, 12, 12), 0);
  const p = plan();
  p.goalAmount = 1000000;
  p.goalSaved = 5000;
  p.goalMonths = 40;
  p.goalAnnualReturn = 12;
  assert.equal(
    calculateBudget(p).goal,
    monthlyGoalSaving(1000000, 5000, 40, 12),
  );
  assert.equal(
    calculateBudget(p).end.corpus,
    calculateBudget(plan()).end.corpus,
  );
  delete p.goalAnnualReturn;
  assert.ok(validBudget(p));
  p.annualReturn = 0;
  assert.equal(calculateBudget(p).goal, 24875);
  p.goalMonths = 600;
  assert.ok(validBudget(p));
  p.goalMonths = 601;
  assert.equal(validBudget(p), false);
  p.goalMonths = 40;
  for (const invalid of [-100, 101, Infinity, "12", null]) {
    p.goalAnnualReturn = invalid;
    assert.equal(validBudget(p), false);
  }
});
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
  assert.equal(calculateBudget(p).remainder, -4000);
  assert.equal(calculateBudget(p).monthlyInvestment, 0);
});
test("bill and goal contributions use remaining amount and actual months to deadline", () => {
  assert.equal(monthlyReserve(36000, 6000, 6), 5000);
  assert.equal(monthlyReserve(1000, 2000, 6), 0);
  const p = plan();
  p.goalAmount = 60000;
  p.goalSaved = 12000;
  p.goalMonths = 6;
  p.annualReturn = 0;
  assert.equal(calculateBudget(p).goal, 8000);
  assert.equal(calculateBudget(p).remainder, 0);
  assert.equal(calculateBudget(p).monthlyInvestment, 6000);
});
test("twelve month-end contributions earn no return on the final deposit", () => {
  const p = plan();
  p.investment = 1000;
  p.investmentMode = "custom";
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

test("available money is invested once and goal changes do not add an expense", () => {
  const p = plan();
  p.salary = 60000;
  let r = calculateBudget(p);
  assert.equal(r.available, 16000);
  assert.equal(r.monthlyInvestment, 16000);
  assert.equal(r.future, 20000);
  assert.equal(r.allocated, 60000);
  p.goalAmount = 1000000;
  p.goalSaved = 5000;
  p.goalMonths = 40;
  r = calculateBudget(p);
  assert.equal(r.allocated, 60000);
  assert.equal(r.remainder, 0);
  assert.ok(r.goalExtraMonthly > 4500 && r.goalExtraMonthly < 4600);
  assert.ok(r.goalGap > 0);
  assert.ok(r.goalStepUpNeeded > 0 && r.goalStepUpNeeded < 100);
  p.goalStepUp = Math.ceil(r.goalStepUpNeeded * 10) / 10;
  r = calculateBudget(p);
  assert.equal(r.goalGap, 0);
  assert.equal(r.monthlyInvestment, 16000);
  assert.equal(r.allocated, 60000);
  p.investmentMode = "custom";
  p.investment = 10000;
  assert.equal(calculateBudget(p).remainder, 6000);
  const old = { ...p, annualReturn: 100, goalPlannerVersion: undefined };
  assert.equal(upgradeBudget(old).annualReturn, 12);
  assert.equal(upgradeBudget(old).goalSaved, 5000);
  assert.equal(upgradeBudget(old).goalMonths, 40);
  assert.equal(upgradeBudget(old).investment, 10000);
  assert.equal(upgradeBudget(p).annualReturn, p.annualReturn);
});

test("growth uses month-end deposits, annual step-ups and valid edge cases", () => {
  const rows = projectSavings(1000, 5000, 13, 0, 10);
  assert.equal(rows[0].corpus, 5000);
  assert.equal(rows[12].corpus, 17000);
  assert.equal(rows[13].contribution, 1100);
  assert.equal(rows[13].corpus, 18100);
  assert.equal(rows[13].gain, 0);
  assert.equal(requiredAnnualStepUp(10000, 1000, 0, 12, 0), 0);
  assert.equal(requiredAnnualStepUp(20000, 1000, 0, 12, 0), null);
  assert.equal(requiredAnnualStepUp(20000, 0, 0, 40, 12), null);
  assert.equal(requiredAnnualStepUp(1e9, 1, 0, 24, 0), null);
  const step = requiredAnnualStepUp(30000, 1000, 0, 24, 0);
  assert.ok(Math.abs(step - 50) < 1e-7);
  const negative = projectSavings(1000, 5000, 40, -20);
  assert.ok(negative.at(-1).gain < 0);
  assert.equal(projectSavings(0, 0, 600, -99).at(-1).corpus, 0);
  assert.equal(
    projectSavings(0, 100000, 12, 12).at(-1).corpus.toFixed(2),
    "112000.00",
  );
  const p = plan();
  for (const bad of [-1, 101, NaN, "10", null])
    assert.equal(validBudget({ ...p, goalStepUp: bad }), false);
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

test("bill frequency preserves older plans and validates payment intervals", () => {
  const p = plan();
  delete p.bills[0].intervalMonths;
  assert.ok(validBudget(p));
  assert.equal(calculateBudget(p).bills, 3000);
  for (const interval of [0, 1, 3, 12]) {
    p.bills[0].intervalMonths = interval;
    assert.ok(validBudget(p));
  }
  for (const interval of [-1, 13, 1.5, "3", null]) {
    p.bills[0].intervalMonths = interval;
    assert.equal(validBudget(p), false);
  }
});
