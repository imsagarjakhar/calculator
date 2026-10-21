import assert from "node:assert/strict";
import { test } from "node:test";
import {
  initialLoanPlan,
  payment,
  cashFlow,
  simulate,
  compare,
  breakEven,
  validateLoanPlan,
} from "../src/loans/model.ts";
const near = (a, b, tolerance = 1e-5) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} should equal ${b}`);
const plan = () => ({
  ...structuredClone(initialLoanPlan),
  salary: 1000000,
  expenses: 0,
  reserve: 0,
  buffer: 0,
  emergency: 0,
  extra: 1000,
  horizon: 24,
  returns: 0,
  investmentFee: 0,
  gainsTax: 0,
  loans: [
    {
      id: "a",
      name: "Loan A",
      balance: 1000,
      rate: 0,
      months: 10,
      emi: 100,
      fee: 0,
      lock: 0,
      taxRelief: 0,
    },
  ],
});
test("automatic EMI amortizes at the entered term, including zero interest", () => {
  for (const rate of [0, 3, 12, 30]) {
    const p = plan();
    p.extra = 0;
    p.horizon = 60;
    p.loans[0] = { ...p.loans[0], balance: 100000, rate, months: 36, emi: 0 };
    const r = simulate(p, "invest");
    assert.equal(r.debtFree, 36);
    assert.equal(r.debt, 0);
    let outstanding = 100000;
    for (let i = 0; i < 36; i++)
      outstanding = outstanding * (1 + rate / 1200) - payment(p.loans[0]);
    near(outstanding, 0);
  }
});
test("all strategies spend the same cash and reinvest freed EMIs even in the payoff month", () => {
  const p = plan();
  p.horizon = 12;
  const a = simulate(p, "avalanche"),
    b = simulate(p, "invest");
  assert.equal(a.debtFree, 1);
  assert.equal(b.debtFree, 10);
  near(a.rows[0].invested, 100);
  near(a.rows[1].invested, 1100);
  near(a.net, 12200);
  near(a.net, b.net);
});
test("highest rate and smallest balance route extra payments differently", () => {
  const p = plan();
  p.extra = 300;
  p.loans = [
    { ...p.loans[0], balance: 5000, rate: 24, emi: 200 },
    {
      ...p.loans[0],
      id: "b",
      name: "Loan B",
      balance: 2000,
      rate: 6,
      emi: 200,
    },
  ];
  const a = simulate(p, "avalanche"),
    s = simulate(p, "snowball");
  near(a.rows[0].loans[0].extra, 300);
  near(a.rows[0].loans[1].extra, 0);
  near(s.rows[0].loans[1].extra, 300);
  near(s.rows[0].loans[0].extra, 0);
  assert.ok(a.interest < s.interest);
});
test("prepayment fees come from cash budget; lock-ins block extra principal", () => {
  const p = plan();
  p.loans[0].fee = 10;
  const r = simulate(p, "avalanche");
  near(r.rows[0].extra, 900);
  near(r.rows[0].fees, 90);
  near(r.rows[0].invested, 10);
  p.loans[0].lock = 2;
  const locked = simulate(p, "avalanche");
  near(locked.rows[0].extra, 0);
  near(locked.rows[1].extra, 0);
  assert.ok(locked.rows[2].extra > 0);
});
test("split endpoints match the pure strategies", () => {
  const p = plan();
  p.returns = 12;
  p.split = 0;
  near(simulate(p, "split").net, simulate(p, "invest").net);
  p.split = 100;
  near(simulate(p, "split").net, simulate(p, "avalanche").net);
});
test("tax relief is an explicit cash credit and gains tax does not apply to losses", () => {
  const p = plan();
  p.loans[0] = { ...p.loans[0], rate: 12, emi: 1000, taxRelief: 30 };
  const r = simulate(p, "avalanche");
  near(r.rows[0].taxCredit, 3);
  near(
    r.rows[0].required + r.rows[0].extra + r.rows[0].fees + r.rows[0].invested,
    cashFlow(p).commitment + 3,
  );
  p.returns = -20;
  p.gainsTax = 30;
  assert.equal(simulate(p, "invest").investmentTax, 0);
  p.returns = 20;
  const positive = simulate(p, "invest");
  near(
    positive.investmentTax,
    (positive.portfolio - positive.contributed) * 0.3,
  );
});
test("break-even finds equivalent annual loan cost, with zero fees and tax", () => {
  const p = plan();
  p.loans[0] = { ...p.loans[0], balance: 12000, rate: 12, emi: 1000 };
  p.extra = 500;
  const result = breakEven(p);
  assert.equal(result.kind, "crossing");
  near(result.rates[0], (Math.pow(1.01, 12) - 1) * 100, 0.01);
  p.loans[0].lock = 360;
  assert.equal(breakEven(p).kind, "tie");
});
test("unaffordable and malformed plans are blocked rather than ranked", () => {
  const draft = { ...plan(), loans: [] };
  assert.equal(validateLoanPlan(draft).length, 0);
  assert.equal(compare(draft).results.length, 0);
  const p = plan();
  p.salary = 50;
  assert.equal(compare(p).results.length, 0);
  p.salary = 500;
  assert.equal(compare(p).results.length, 0);
  assert.ok(validateLoanPlan({ ...plan(), loans: [null] }).length);
  assert.ok(validateLoanPlan({ ...plan(), horizon: 0 }).length);
  assert.ok(validateLoanPlan({ ...plan(), returns: -100 }).length);
  assert.ok(
    validateLoanPlan({ ...plan(), loans: [...plan().loans, ...plan().loans] })
      .length,
  );
  assert.ok(validateLoanPlan(null).length);
});
test("non-amortizing loans remain visible, with growing balances", () => {
  const p = plan();
  p.loans[0] = { ...p.loans[0], balance: 100000, rate: 24, emi: 100 };
  const r = simulate(p, "invest");
  assert.equal(r.debtFree, null);
  assert.ok(r.debt > 100000);
});
test("sixty mixed scenarios reconcile every payment and portfolio balance", () => {
  for (let i = 0; i < 60; i++) {
    const p = plan();
    p.extra = 100 + i * 33;
    p.returns = i % 2 === 0 ? -10 : 15;
    p.reserve = 321;
    p.emergency = 5000;
    p.gainsTax = (i % 3) * 10;
    p.investmentFee = 0.7;
    p.split = i % 101;
    p.loans = [
      {
        ...p.loans[0],
        balance: 10000 + i * 77,
        rate: 4 + (i % 20),
        emi: 0,
        months: 18 + (i % 12),
        fee: i % 4,
        lock: i % 6,
        taxRelief: (i % 3) * 10,
      },
      {
        ...p.loans[0],
        id: "b",
        name: "Loan B",
        balance: 8000 + i * 99,
        rate: 10,
        months: 30,
        emi: 0,
        fee: 1,
      },
    ];
    for (const strategy of ["avalanche", "snowball", "invest", "split"]) {
      const r = simulate(p, strategy);
      let previous = 0;
      for (const row of r.rows) {
        near(
          row.required + row.extra + row.fees + row.invested - row.taxCredit,
          cashFlow(p).commitment,
        );
        near(row.portfolio, previous + row.growth + row.invested);
        previous = row.portfolio;
        for (const loan of row.loans)
          near(
            loan.closing,
            loan.opening + loan.interest - loan.required - loan.extra,
          );
      }
      near(
        r.net,
        r.portfolio -
          r.investmentTax +
          p.emergency +
          p.reserve * p.horizon -
          r.debt,
      );
    }
  }
});
