import assert from "node:assert/strict";
import { test } from "node:test";
import {
  originalLoanSchedule,
  resolveLoanPlan,
} from "../src/loans/origination.ts";
import {
  initialLoanPlan,
  cashFlow,
  compare,
  payment,
  validateLoanPlan,
} from "../src/loans/model.ts";
import { compareDecisions } from "../src/loans/decisions.ts";

const loan = (changes = {}) => ({
  ...initialLoanPlan.loans[0],
  inputMode: "original",
  originalAmount: 120000,
  firstEmiMonth: "2025-01",
  lastEmiMonth: "2025-12",
  rate: 0,
  ...changes,
});
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-4, `${a} != ${b}`);
const month = (index) =>
  `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;

test("inclusive EMI months, zero interest, completed loans and one-payment terms", () => {
  const first = originalLoanSchedule(loan(), "2025-01");
  assert.equal(first.emi, 10000);
  assert.equal(first.balance, 120000);
  assert.equal(first.remainingMonths, 12);
  const mid = originalLoanSchedule(loan(), "2025-07");
  assert.equal(mid.paidMonths, 6);
  assert.equal(mid.remainingMonths, 6);
  assert.equal(mid.balance, 60000);
  const final = originalLoanSchedule(loan(), "2025-12");
  assert.equal(final.remainingMonths, 1);
  assert.equal(final.balance, 10000);
  assert.equal(originalLoanSchedule(loan(), "2026-01").balance, 0);
  const single = originalLoanSchedule(
    loan({ lastEmiMonth: "2025-01", rate: 12 }),
    "2025-01",
  );
  near(single.emi, 121200);
  assert.equal(single.remainingMonths, 1);
});

test("120 dated loans match an independent month-by-month repayment ledger", () => {
  for (let i = 1; i <= 120; i++) {
    const principal = 10000 + i * 7391,
      rate = (i % 31) / 100 / 12,
      term = 12 + (i % 72),
      paid = i % term;
    const emi =
      rate === 0
        ? principal / term
        : (principal * rate * Math.pow(1 + rate, term)) /
          (Math.pow(1 + rate, term) - 1);
    let balance = principal;
    for (let k = 0; k < paid; k++) balance = balance * (1 + rate) - emi;
    const start = 2020 * 12;
    const result = originalLoanSchedule(
      loan({
        originalAmount: principal,
        rate: rate * 1200,
        firstEmiMonth: month(start),
        lastEmiMonth: month(start + term - 1),
      }),
      month(start + paid),
    );
    assert.equal(result.error, null);
    near(result.emi, emi);
    near(result.balance, balance);
    assert.equal(result.remainingMonths, term - paid);
  }
});

test("invalid, incomplete and future schedules are rejected without stale values", () => {
  for (const changes of [
    { originalAmount: 0 },
    { originalAmount: NaN },
    { rate: -1 },
    { firstEmiMonth: "" },
    { firstEmiMonth: "2025-13" },
    { lastEmiMonth: "2024-12" },
    { lastEmiMonth: "2075-01" },
  ]) {
    const result = originalLoanSchedule(loan(changes), "2025-07");
    assert.ok(result.error);
    assert.equal(result.balance, 0);
    assert.equal(result.emi, 0);
  }
  assert.match(originalLoanSchedule(loan(), "2024-12").error, /on or before/);
});

test("original inputs override stale derived values in all comparison paths and round-trip", () => {
  const raw = {
    ...structuredClone(initialLoanPlan),
    start: "2025-07",
    fundingMode: "manual",
    repaymentBudget: 12000,
    horizon: 12,
    returns: 0,
    investmentFee: 0,
    gainsTax: 0,
    loans: [loan({ balance: 999, emi: 777, months: 99 })],
  };
  assert.equal(validateLoanPlan(raw).length, 0);
  assert.equal(payment(raw.loans[0]), 10000);
  assert.equal(cashFlow(raw).emis, 10000);
  assert.equal(cashFlow(raw).extra, 2000);
  const resolved = resolveLoanPlan(raw);
  assert.equal(resolved.loans[0].balance, 60000);
  assert.equal(resolved.loans[0].months, 6);
  const result = compare(raw);
  assert.deepEqual(result.errors, []);
  assert.equal(result.results.find((r) => r.strategy === "invest").debtFree, 6);
  const decisions = compareDecisions(raw);
  assert.ok(decisions.length >= 2);
  assert.equal(decisions[0].debtFree, 6);
  const later = resolveLoanPlan({ ...raw, start: "2025-08" });
  assert.equal(later.loans[0].balance, 50000);
  assert.equal(later.loans[0].months, 5);
  assert.deepEqual(
    resolveLoanPlan(JSON.parse(JSON.stringify(resolved))),
    resolved,
  );
  assert.ok(
    validateLoanPlan({ ...raw, loans: [loan({ firstEmiMonth: "" })] }).length,
  );
});
