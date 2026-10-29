import { initialLoanPlan, simulate } from "../loans/model.ts";

// Deliberately invented examples, independent of visitors' saved financial plans.
// Change this date only when the examples and accompanying copy are checked.
export const examplesChecked = "2026-10-29";
export const guideChapters = [
  {
    id: "monthly-budget",
    title: "What is really left from my salary?",
    summary: "A bill reserve is not an expense you should count twice.",
    route: "salary-budget",
  },
  {
    id: "sip-growth",
    title: "How much of a SIP result is my own money?",
    summary: "Separate deposits, growth and purchasing power.",
    route: "growth",
  },
  {
    id: "repay-or-invest",
    title: "Should extra money repay debt or be invested?",
    summary: "Follow the same budget to the same finish date.",
    route: "loan-payoff",
  },
  {
    id: "asset-income",
    title: "Does a valuable asset produce a good income?",
    summary: "Check net yield and what disappears if you sell.",
    route: "custom-plan",
  },
  {
    id: "retirement-income",
    title: "What does a retirement income target mean?",
    summary: "Connect inflation, withdrawals and the order of returns.",
    route: "freedom",
  },
] as const;

export function sipExample(annualRate = 12) {
  const monthly = 1000,
    months = 120,
    rate = annualRate / 1200;
  let balance = 0;
  for (let m = 0; m < months; m++) balance = balance * (1 + rate) + monthly;
  const deposited = monthly * months;
  return {
    balance,
    deposited,
    growth: balance - deposited,
    todayValue: balance / 1.06 ** 10,
  };
}
export function debtExample(annualReturn = 12) {
  const p = {
    ...initialLoanPlan,
    fundingMode: "manual" as const,
    repaymentBudget: 50000,
    start: "2026-10",
    horizon: 35,
    reserve: 0,
    emergency: 0,
    lumpSum: 0,
    assets: [],
    returns: annualReturn,
    investmentFee: 0.5,
    gainsTax: 0,
    loans: [
      {
        id: "illustration",
        name: "Illustrative loan",
        balance: 1000000,
        rate: 10.4,
        months: 35,
        emi: 0,
        fee: 0,
        lock: 0,
        taxRelief: 0,
      },
    ],
  };
  return { invest: simulate(p, "invest"), repay: simulate(p, "avalanche") };
}
export function sequenceExample(returns: number[]) {
  let balance = 100000;
  for (const rate of returns) balance = (balance - 10000) * (1 + rate / 100);
  return balance;
}
