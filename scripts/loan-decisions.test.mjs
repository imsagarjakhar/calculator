import assert from "node:assert/strict";
import { test } from "node:test";
import {
  initialLoanPlan,
  cashFlow,
  validateLoanPlan,
  withRepaymentBudget,
} from "../src/loans/model.ts";
import {
  compareDecisions,
  netRent,
  decisionScenario,
} from "../src/loans/decisions.ts";
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
const plan = () => ({
  ...structuredClone(initialLoanPlan),
  fundingMode: "manual",
  salary: 0,
  expenses: 0,
  reserve: 0,
  buffer: 0,
  extra: 1000,
  emergency: 3000,
  lumpSum: 4000,
  cashReturn: 0,
  horizon: 12,
  assets: [],
  loans: [
    {
      ...initialLoanPlan.loans[0],
      id: "loan",
      name: "Loan",
      balance: 10000,
      rate: 12,
      emi: 1000,
      months: 12,
      fee: 0,
      lock: 0,
    },
  ],
});
const asset = () => ({
  id: "shop",
  name: "Shop",
  value: 20000,
  rent: 200,
  costs: 50,
  vacancy: 10,
  appreciation: 0,
  rentGrowth: 0,
  sellingCost: 5,
  saleTax: 500,
  linkedLoanId: "",
  rentIncluded: false,
  replacementCost: 0,
});
test("older plans preserve the existing total when reduced to one repayment input", () => {
  const old = structuredClone(initialLoanPlan);
  const before = cashFlow(old);
  const migrated = withRepaymentBudget(old);
  near(migrated.repaymentBudget, before.commitment);
  near(cashFlow(migrated).extra, before.extra);
  assert.equal(migrated.fundingMode, "manual");
  assert.deepEqual(migrated.loans, old.loans);
  const fixed = {
    ...migrated,
    repaymentBudget: 25000,
    useSalaryInvestment: true,
  };
  near(withRepaymentBudget(fixed).repaymentBudget, 25000);
  assert.equal(withRepaymentBudget(fixed).useSalaryInvestment, true);
  assert.ok(validateLoanPlan({ ...fixed, useSalaryInvestment: "yes" }).length);
});
test("manual totals include EMIs once and salary capacity updates after loans", () => {
  const p = plan();
  near(cashFlow(p).commitment, 2000);
  p.repaymentBudget = 2500;
  near(cashFlow(p).extra, 1500);
  near(cashFlow(p).commitment, 2500);
  p.repaymentBudget = 500;
  assert.ok(cashFlow(p).capacity < 0);
  assert.equal(compareDecisions(p).length, 0);
  p.fundingMode = "salary";
  p.salary = 10000;
  p.expenses = 3000;
  p.reserve = 500;
  p.buffer = 500;
  p.useAvailable = true;
  near(cashFlow(p).extra, 5000);
  near(cashFlow(p).commitment, 6000);
});
test("using savings starts with the same wealth and reduces first-month interest", () => {
  const p = plan();
  const [base, monthly, savings] = compareDecisions(p);
  near(base.rows[0].net, monthly.rows[0].net);
  near(base.rows[0].net, savings.rows[0].net);
  near(savings.initialPayment, 4000);
  near(savings.rows[0].debt, 6000);
  near(savings.rows[1].interest, 60);
  assert.ok(
    savings.interest < monthly.interest && monthly.interest < base.interest,
  );
  assert.ok(savings.debtFree <= monthly.debtFree);
  assert.equal(savings.fundingGap, 0);
  for (const scenario of [base, monthly, savings])
    for (const row of scenario.rows)
      near(
        row.net,
        row.liquid + row.assetValue + p.emergency - row.debt - row.arrears,
      );
});
test("sale removes rent and asset, settles secured debt and deducts exact fees and taxes", () => {
  const p = plan();
  p.assets = [{ ...asset(), linkedLoanId: "loan" }];
  p.loans[0].fee = 10;
  const sale = compareDecisions(p).find((s) => s.id === "sell-shop");
  assert.equal(sale.error, null);
  near(sale.saleProceeds, 7500);
  near(sale.initialPayment, 10000);
  near(sale.initialFees, 1000);
  near(sale.rows[0].liquid, 11500);
  near(sale.rows[0].assetValue, 0);
  near(sale.rows[0].debt, 0);
  near(sale.rows[1].rent, 0);
  near(sale.rows[1].liquid, 13500);
  const base = compareDecisions(p)[0];
  near(base.rows[1].rent, 130);
  near(base.rows[0].net - sale.rows[0].net, 2500);
});
test("rent included in funding is counted once and lost after sale", () => {
  const p = plan();
  p.assets = [asset()];
  p.loans[0].balance = 0;
  const separate = decisionScenario(
    p,
    "keep",
    "Keep",
    "",
    false,
    undefined,
    false,
  );
  p.assets[0].rentIncluded = true;
  p.extra += 130;
  const included = decisionScenario(
    p,
    "keep",
    "Keep",
    "",
    false,
    undefined,
    false,
  );
  near(separate.rows[1].liquid, included.rows[1].liquid);
  const sale = decisionScenario(p, "sale", "Sale", "", false, "shop", false);
  near(sale.rows[1].liquid - sale.rows[0].liquid, 1000);
  p.assets[0].replacementCost = 100;
  const replacement = decisionScenario(
    p,
    "sale",
    "Sale",
    "",
    false,
    "shop",
    false,
  );
  near(replacement.rows[1].liquid - replacement.rows[0].liquid, 900);
});
test("lock-ins and underwater asset settlements are blocked without using emergency savings", () => {
  const p = plan();
  p.assets = [{ ...asset(), linkedLoanId: "loan" }];
  p.loans[0].lock = 3;
  assert.match(compareDecisions(p).at(-1).error, /lock-in/);
  const saving = compareDecisions(p).find((s) => s.id === "savings");
  near(saving.initialPayment, 0);
  near(saving.rows[0].liquid, 4000);
  p.loans[0].lock = 0;
  p.assets[0].value = 1000;
  assert.match(compareDecisions(p).at(-1).error, /cannot settle/);
  assert.equal(p.emergency, 3000);
});
test("cash shortfalls leave unpaid debt and operating costs visible", () => {
  const p = plan();
  p.extra = 0;
  p.assets = [{ ...asset(), rent: 0, costs: 2000 }];
  const scenario = compareDecisions(p)[1];
  assert.ok(scenario.fundingGap > 0);
  near(scenario.rows[1].arrears, 1000);
  near(scenario.rows[1].debt, 10100);
  near(
    scenario.rows[1].net,
    scenario.rows[1].liquid + 20000 + 3000 - 10100 - 1000,
  );
});
test("asset validation rejects malformed links, duplicate loans, nonfinite and unsafe assumptions", () => {
  const p = plan();
  p.assets = [asset()];
  assert.deepEqual(validateLoanPlan(p), []);
  for (const patch of [
    { value: -1 },
    { rent: Infinity },
    { vacancy: 101 },
    { linkedLoanId: "missing" },
    { rentIncluded: "yes" },
    { replacementCost: -1 },
  ])
    assert.ok(
      validateLoanPlan({ ...p, assets: [{ ...asset(), ...patch }] }).length,
    );
  p.assets = [
    { ...asset(), linkedLoanId: "loan" },
    { ...asset(), id: "home", linkedLoanId: "loan" },
  ];
  assert.ok(validateLoanPlan(p).length);
});
test("zero and negative growth, rent growth and cash yields reconcile", () => {
  const p = plan();
  p.cashReturn = -10;
  p.assets = [{ ...asset(), appreciation: -20, rentGrowth: 12 }];
  near(netRent(p.assets[0]), 130);
  assert.ok(netRent(p.assets[0], 13) > 130);
  const result = compareDecisions(p)[0];
  near(result.rows[12].assetValue, 16000);
  assert.ok(Number.isFinite(result.rows[12].net));
});

test("forty mixed scenarios conserve monthly cash, debt and net wealth", () => {
  for (let sample = 0; sample < 40; sample++) {
    const p = plan();
    p.horizon = 24 + (sample % 4) * 12;
    p.extra = 1000 + sample * 53;
    p.lumpSum = sample * 113;
    p.loans.push({
      ...p.loans[0],
      id: "second",
      balance: 5000 + sample * 137,
      rate: sample % 3 === 0 ? 0 : 7,
      emi: 450,
      fee: sample % 4,
      lock: sample % 3,
    });
    p.assets = [
      {
        ...asset(),
        value: 100000 + sample * 1171,
        rent: 200 + sample * 11,
        costs: 50,
        rentIncluded: sample % 2 === 0,
      },
    ];
    for (const scenario of compareDecisions(p)) {
      if (scenario.error) continue;
      const isSale = scenario.id.startsWith("sell-");
      const rentalChange =
        (isSale ? 0 : netRent(p.assets[0])) -
        (p.assets[0].rentIncluded ? netRent(p.assets[0]) : 0);
      for (let month = 1; month < scenario.rows.length; month++) {
        const now = scenario.rows[month],
          before = scenario.rows[month - 1];
        near(now.debt, before.debt + now.interest - now.paid);
        near(
          now.liquid,
          before.liquid +
            cashFlow(p).commitment +
            rentalChange -
            now.paid -
            now.fees,
        );
        near(
          now.net,
          before.net +
            cashFlow(p).commitment +
            rentalChange -
            now.interest -
            now.fees,
        );
      }
      near(
        Object.values(scenario.remaining).reduce((a, b) => a + b, 0),
        scenario.rows.at(-1).debt,
      );
      if (scenario.debtFree !== null)
        for (const balance of Object.values(scenario.remaining))
          near(balance, 0);
    }
  }
});
