export type Expense = {
  id: string;
  name: string;
  group: "needs" | "wants";
  planned: number;
  actual: number | null;
};
export type Bill = {
  id: string;
  name: string;
  amount: number;
  reserved: number;
  months: number;
};
export type Budget = {
  version: 1;
  currency: string;
  salary: number;
  otherIncome: number;
  expenses: Expense[];
  bills: Bill[];
  investment: number;
  annualReturn: number;
  emergencySaved: number;
  emergencyMonthly: number;
  emergencyMonths: number;
  goalName: string;
  goalAmount: number;
  goalSaved: number;
  goalMonths: number;
  buffer: number;
};
export const initialBudget: Budget = {
  version: 1,
  currency: "INR",
  salary: 50000,
  otherIncome: 0,
  expenses: [
    {
      id: "rent",
      name: "Rent / home",
      group: "needs",
      planned: 12000,
      actual: null,
    },
    {
      id: "groceries",
      name: "Groceries",
      group: "needs",
      planned: 5000,
      actual: null,
    },
    {
      id: "bills",
      name: "Utilities & bills",
      group: "needs",
      planned: 2000,
      actual: null,
    },
    {
      id: "transport",
      name: "Transport",
      group: "needs",
      planned: 2000,
      actual: null,
    },
    {
      id: "health",
      name: "Health & insurance",
      group: "needs",
      planned: 1000,
      actual: null,
    },
    {
      id: "debt",
      name: "Minimum EMIs",
      group: "needs",
      planned: 3000,
      actual: null,
    },
    {
      id: "family",
      name: "Family & dependants",
      group: "needs",
      planned: 0,
      actual: null,
    },
    {
      id: "enjoyment",
      name: "Dining & enjoyment",
      group: "wants",
      planned: 6000,
      actual: null,
    },
    {
      id: "shopping",
      name: "Shopping & subscriptions",
      group: "wants",
      planned: 2000,
      actual: null,
    },
    {
      id: "misc",
      name: "Miscellaneous",
      group: "wants",
      planned: 2000,
      actual: null,
    },
  ],
  bills: [
    {
      id: "annual",
      name: "Annual fees & renewals",
      amount: 36000,
      reserved: 0,
      months: 12,
    },
  ],
  investment: 6000,
  annualReturn: 10,
  emergencySaved: 25000,
  emergencyMonthly: 4000,
  emergencyMonths: 6,
  goalName: "My next goal",
  goalAmount: 0,
  goalSaved: 0,
  goalMonths: 12,
  buffer: 2000,
};
export function monthlyReserve(amount: number, saved: number, months: number) {
  return Math.max(0, amount - saved) / months;
}
export function calculateBudget(plan: Budget) {
  const income = plan.salary + plan.otherIncome;
  const needs = plan.expenses
    .filter((e) => e.group === "needs")
    .reduce((s, e) => s + e.planned, 0);
  const wants = plan.expenses
    .filter((e) => e.group === "wants")
    .reduce((s, e) => s + e.planned, 0);
  const bills = plan.bills.reduce(
    (s, b) => s + monthlyReserve(b.amount, b.reserved, b.months),
    0,
  );
  const goal = monthlyReserve(plan.goalAmount, plan.goalSaved, plan.goalMonths);
  const future = plan.investment + plan.emergencyMonthly + goal;
  const allocated = needs + wants + bills + future + plan.buffer;
  const difference = income - allocated;
  const remainder = Math.abs(difference) < 1e-7 ? 0 : difference;
  const emergencyTarget = (needs + bills) * plan.emergencyMonths;
  const emergencyGap = Math.max(0, emergencyTarget - plan.emergencySaved);
  const recorded = plan.expenses.filter((e) => e.actual !== null);
  const actual = recorded.reduce((s, e) => s + (e.actual ?? 0), 0);
  const recordedPlan = recorded.reduce((s, e) => s + e.planned, 0);
  // Annual effective return converted to an equivalent monthly rate. Deposits at month end.
  const rate = Math.pow(1 + plan.annualReturn / 100, 1 / 12) - 1;
  let corpus = 0;
  const projection = Array.from({ length: 12 }, (_, index) => {
    const opening = corpus;
    const growth = opening * rate;
    corpus = opening + growth + plan.investment;
    const invested = plan.investment * (index + 1);
    return {
      month: index + 1,
      opening,
      contribution: plan.investment,
      growth,
      invested,
      corpus,
      gain: corpus - invested,
    };
  });
  return {
    income,
    needs,
    wants,
    bills,
    goal,
    future,
    allocated,
    remainder,
    emergencyTarget,
    emergencyGap,
    emergencyTime:
      emergencyGap === 0
        ? 0
        : plan.emergencyMonthly > 0
          ? Math.ceil(emergencyGap / plan.emergencyMonthly)
          : null,
    actual,
    recordedPlan,
    recordedCount: recorded.length,
    projection,
    end: projection[11],
  };
}
export function validBudget(value: unknown): value is Budget {
  if (!value || typeof value !== "object") return false;
  const p = value as Budget;
  const amount = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1e9;
  const months = (n: unknown) =>
    amount(n) && Number.isInteger(n) && Number(n) >= 1 && Number(n) <= 120;
  const name = (s: unknown) => typeof s === "string" && s.length <= 80;
  return (
    p.version === 1 &&
    ["INR", "SAR", "USD", "AED", "EUR", "GBP"].includes(p.currency) &&
    [
      p.salary,
      p.otherIncome,
      p.investment,
      p.emergencySaved,
      p.emergencyMonthly,
      p.goalAmount,
      p.goalSaved,
      p.buffer,
    ].every(amount) &&
    Number.isFinite(p.annualReturn) &&
    p.annualReturn >= -99 &&
    p.annualReturn <= 100 &&
    months(p.emergencyMonths) &&
    months(p.goalMonths) &&
    name(p.goalName) &&
    Array.isArray(p.expenses) &&
    p.expenses.length <= 30 &&
    p.expenses.length > 0 &&
    p.expenses.every((e) => e && typeof e === "object") &&
    new Set(p.expenses.map((e) => e.id)).size === p.expenses.length &&
    p.expenses.every(
      (e) =>
        name(e.id) &&
        name(e.name) &&
        ["needs", "wants"].includes(e.group) &&
        amount(e.planned) &&
        (e.actual === null || amount(e.actual)),
    ) &&
    Array.isArray(p.bills) &&
    p.bills.length <= 20 &&
    p.bills.every((b) => b && typeof b === "object") &&
    new Set(p.bills.map((b) => b.id)).size === p.bills.length &&
    p.bills.every(
      (b) =>
        name(b.id) &&
        name(b.name) &&
        amount(b.amount) &&
        amount(b.reserved) &&
        months(b.months),
    )
  );
}
