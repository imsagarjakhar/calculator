import assert from "node:assert/strict";
import { test } from "node:test";
import {
  initialLoanPlan,
  cashFlow,
  compare,
  simulate,
} from "../src/loans/model.ts";
import { compareDecisions } from "../src/loans/decisions.ts";
import { assetIncomeYield } from "../src/loans/assets.ts";
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-4, `${a} != ${b}`);
const asset = () => ({
  id: "home",
  name: "Home rent",
  value: 3500000,
  rent: 5000,
  costs: 0,
  vacancy: 0,
  appreciation: 0,
  rentGrowth: 0,
  sellingCost: 0,
  saleTax: 0,
  linkedLoanId: "",
  rentIncluded: false,
  replacementCost: 0,
});
const plan = () => ({
  ...structuredClone(initialLoanPlan),
  fundingMode: "manual",
  repaymentBudget: 1000,
  horizon: 24,
  returns: 0,
  investmentFee: 0,
  gainsTax: 0,
  reserve: 0,
  emergency: 0,
  extra: 0,
  lumpSum: 0,
  assets: [asset()],
  loans: [
    {
      ...initialLoanPlan.loans[0],
      balance: 12000,
      rate: 0,
      months: 12,
      emi: 1000,
      fee: 0,
      lock: 0,
      taxRelief: 0,
    },
  ],
});

test("rental income funds the main paths while property value stays out of repayment cash", () => {
  const p = plan(),
    cash = cashFlow(p);
  near(cash.baseBudget, 1000);
  near(cash.additionalRent, 5000);
  near(cash.totalFunding, 6000);
  near(cash.availableExtra, 5000);
  const repay = simulate(p, "avalanche"),
    invest = simulate(p, "invest");
  assert.equal(repay.debtFree, 2);
  assert.equal(invest.debtFree, 12);
  near(repay.rows[0].debt, 6000);
  near(invest.rows[0].invested, 5000);
  near(repay.assetValue, 3500000);
  near(repay.rows[0].net, 3494000);
  near(repay.rows[0].required + repay.rows[0].extra, 6000);
  assert.equal(compare(p).errors.length, 0);
});

test("included rent is counted once and growth, vacancy and costs affect available money", () => {
  const separate = plan(),
    included = plan();
  included.repaymentBudget = 6000;
  included.assets[0].rentIncluded = true;
  for (const strategy of ["avalanche", "snowball", "invest", "split"]) {
    const a = simulate(separate, strategy),
      b = simulate(included, strategy);
    near(a.net, b.net);
    near(a.interest, b.interest);
    near(a.debt, b.debt);
  }
  const p = plan();
  p.assets[0].costs = 1000;
  p.assets[0].vacancy = 20;
  p.assets[0].rentGrowth = 12;
  p.assets[0].appreciation = 6;
  const r = simulate(p, "invest");
  near(r.rows[0].rent, 3000);
  near(r.rows[0].budget, 4000);
  near(r.rows[12].rent, 3480);
  near(r.assetValue, 3500000 * 1.06 ** 2);
});

test("rent can cover EMIs alongside a smaller declared budget without manufacturing money", () => {
  const p = plan();
  p.repaymentBudget = 500;
  p.assets[0].rent = 500;
  near(cashFlow(p).totalFunding, 1000);
  assert.equal(compare(p).errors.length, 0);
  assert.ok(compareDecisions(p).length >= 2);
  near(simulate(p, "avalanche").rows[0].required, 1000);
  p.assets[0].rent = 499;
  assert.equal(compare(p).results.length, 0);
});

test("later rental losses leave unpaid principal and running costs visible", () => {
  const p = plan();
  p.repaymentBudget = 1000;
  p.assets[0].costs = 4000;
  p.assets[0].rentGrowth = -90;
  p.loans[0].balance = 120000;
  p.loans[0].months = 120;
  const r = simulate(p, "avalanche");
  assert.ok(r.fundingGap > 0);
  assert.ok(r.arrears > 0);
  for (const row of r.rows) {
    assert.ok(
      row.required + row.extra + row.fees + row.invested - row.taxCredit <=
        Math.max(0, row.budget) + 1e-5,
    );
    for (const l of row.loans)
      near(l.closing, l.opening + l.interest - l.required - l.extra);
  }
});

test("50 multi-asset plans reconcile rent, cash, loans and net wealth for all four paths", () => {
  for (let i = 0; i < 50; i++) {
    const p = plan();
    p.repaymentBudget = 2500 + i * 10;
    p.lumpSum = 12000;
    p.cashReturn = 3;
    p.reserve = 100;
    p.emergency = 5000;
    p.returns = i % 2 ? -8 : 12;
    p.investmentFee = 0.7;
    p.gainsTax = 20;
    p.split = i % 101;
    p.loans[0] = {
      ...p.loans[0],
      balance: 60000,
      rate: 8 + (i % 15),
      emi: 0,
      months: 48,
      fee: 1,
      taxRelief: 10,
    };
    p.assets = [
      {
        ...asset(),
        vacancy: i % 20,
        costs: 200,
        appreciation: 2,
        rentGrowth: 3,
        rentIncluded: i % 2 === 0,
      },
      {
        ...asset(),
        id: "shop",
        value: 100000,
        rent: 200,
        costs: 50,
        appreciation: -2,
        rentGrowth: -3,
      },
    ];
    for (const strategy of ["avalanche", "snowball", "invest", "split"]) {
      const r = simulate(p, strategy);
      let previous = {
        net: p.lumpSum + 3600000 + p.emergency - 60000,
        spare: p.lumpSum,
        assets: 3600000,
        tax: 0,
      };
      for (const row of r.rows) {
        const tax =
          (Math.max(
            0,
            row.portfolio -
              r.rows.slice(0, row.month).reduce((s, x) => s + x.invested, 0),
          ) *
            p.gainsTax) /
          100;
        near(
          row.required + row.extra + row.fees + row.invested - row.taxCredit,
          Math.max(0, row.budget),
        );
        near(
          row.net - previous.net,
          row.budget +
            row.growth +
            (row.spareCash - previous.spare) +
            // Manual budgets do not declare additional protected monthly savings.
            (row.assetValue - previous.assets) -
            row.interest -
            row.fees +
            row.taxCredit -
            (tax - previous.tax),
        );
        previous = {
          net: row.net,
          spare: row.spareCash,
          assets: row.assetValue,
          tax,
        };
      }
      near(
        r.net,
        r.portfolio -
          r.investmentTax +
          r.spareCash +
          r.assetValue +
          p.emergency -
          r.debt -
          r.arrears,
      );
    }
  }
});

test("annual income yield distinguishes gross, net, negative income and missing valuations", () => {
  const a = asset();
  near(assetIncomeYield(a).gross, 1.7142857142857142);
  near(assetIncomeYield(a).net, 1.7142857142857142);
  a.vacancy = 10;
  a.costs = 1000;
  near(assetIncomeYield(a).gross, 1.7142857142857142);
  near(assetIncomeYield(a).net, 1.2);
  a.costs = 6000;
  assert.ok(assetIncomeYield(a).net < 0);
  a.value = 0;
  assert.deepEqual(assetIncomeYield(a), { gross: null, net: null });
});
