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
  /** Months between payments; 0 or absent means a one-time bill. */
  intervalMonths?: number;
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
  goalAnnualReturn?: number;
  investmentMode?: "available" | "custom";
  goalStepUp?: number;
  goalPlannerVersion?: 1;
  buffer: number;
};
/** Worked example only; fresh personal plans are created with emptyBudget(). */
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
      intervalMonths: 12,
    },
  ],
  investment: 6000,
  annualReturn: 12,
  emergencySaved: 25000,
  emergencyMonthly: 4000,
  emergencyMonths: 6,
  goalName: "My next goal",
  goalAmount: 0,
  goalSaved: 0,
  goalMonths: 12,
  goalAnnualReturn: 0,
  investmentMode: "available",
  goalStepUp: 0,
  goalPlannerVersion: 1,
  buffer: 2000,
};
/** Keep the worked example separate from a new user's own, zero-based plan. */
export function emptyBudget(currency = "INR"): Budget {
  const sample = structuredClone(initialBudget);
  return {
    ...sample,
    currency,
    salary: 0,
    otherIncome: 0,
    expenses: sample.expenses.map((expense) => ({
      ...expense,
      planned: 0,
      actual: null,
    })),
    bills: sample.bills.map((bill) => ({ ...bill, amount: 0, reserved: 0 })),
    investment: 0,
    emergencySaved: 0,
    emergencyMonthly: 0,
    goalAmount: 0,
    goalSaved: 0,
    buffer: 0,
  };
}
export function monthlyReserve(amount: number, saved: number, months: number) {
  return Math.max(0, amount - saved) / months;
}
// Existing balance grows from today; equal new contributions arrive at month end.
export function monthlyGoalSaving(
  amount: number,
  saved: number,
  months: number,
  annualReturn = 0,
) {
  if (annualReturn === 0) return monthlyReserve(amount, saved, months);
  const monthlyRate = Math.expm1(Math.log1p(annualReturn / 100) / 12);
  if (monthlyRate === 0) return monthlyReserve(amount, saved, months);
  const growth = Math.expm1(months * Math.log1p(monthlyRate));
  return Math.max(0, (amount - saved * (1 + growth)) / (growth / monthlyRate));
}
/** Upgrade the old two-allocation goal UI without discarding the saved inputs. */
export function upgradeBudget(plan: Budget): Budget {
  return plan.goalPlannerVersion === 1
    ? plan
    : {
        ...plan,
        annualReturn: 12,
        investmentMode: "available",
        goalStepUp: 0,
        goalPlannerVersion: 1,
      };
}
export function projectSavings(
  monthly: number,
  saved: number,
  months: number,
  annualReturn: number,
  stepUp = 0,
) {
  const rate = Math.expm1(Math.log1p(annualReturn / 100) / 12);
  let corpus = saved;
  let invested = saved;
  const rows = [{ month: 0, contribution: 0, invested, corpus, gain: 0 }];
  for (let month = 1; month <= months; month++) {
    const contribution =
      monthly * Math.pow(1 + stepUp / 100, Math.floor((month - 1) / 12));
    corpus = corpus * (1 + rate) + contribution;
    invested += contribution;
    rows.push({
      month,
      contribution,
      invested,
      corpus,
      gain: corpus - invested,
    });
  }
  return rows;
}
export function requiredAnnualStepUp(
  target: number,
  monthly: number,
  saved: number,
  months: number,
  annualReturn: number,
) {
  const value = (step: number) =>
    projectSavings(monthly, saved, months, annualReturn, step).at(-1)!.corpus;
  if (value(0) >= target) return 0;
  if (monthly <= 0 || months <= 12 || value(100) < target) return null;
  let low = 0,
    high = 100;
  for (let i = 0; i < 45; i++) {
    const mid = (low + high) / 2;
    if (value(mid) >= target) high = mid;
    else low = mid;
  }
  return high;
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
  const goal = monthlyGoalSaving(
    plan.goalAmount,
    plan.goalSaved,
    plan.goalMonths,
    plan.annualReturn,
  );
  const available =
    income - needs - wants - bills - plan.emergencyMonthly - plan.buffer;
  const monthlyInvestment =
    plan.investmentMode === "custom" ? plan.investment : Math.max(0, available);
  const future = monthlyInvestment + plan.emergencyMonthly;
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
    corpus = opening + growth + monthlyInvestment;
    const invested = monthlyInvestment * (index + 1);
    return {
      month: index + 1,
      opening,
      contribution: monthlyInvestment,
      growth,
      invested,
      corpus,
      gain: corpus - invested,
    };
  });
  const goalProjection = projectSavings(
    monthlyInvestment,
    plan.goalSaved,
    plan.goalMonths,
    plan.annualReturn,
    plan.goalStepUp ?? 0,
  );
  const flatGoalProjection = projectSavings(
    monthlyInvestment,
    plan.goalSaved,
    plan.goalMonths,
    plan.annualReturn,
  );
  const goalEnd = goalProjection.at(-1)!;
  const goalStepUpNeeded = requiredAnnualStepUp(
    plan.goalAmount,
    monthlyInvestment,
    plan.goalSaved,
    plan.goalMonths,
    plan.annualReturn,
  );
  return {
    available,
    monthlyInvestment,
    goalProjection,
    flatGoalProjection,
    goalEnd,
    goalStepUpNeeded,
    goalExtraMonthly: Math.max(0, goal - monthlyInvestment),
    goalGap: Math.max(0, plan.goalAmount - goalEnd.corpus),
    goalReachedMonth:
      plan.goalAmount > 0
        ? (goalProjection.find((row) => row.corpus >= plan.goalAmount)?.month ??
          null)
        : null,
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
    (p.investmentMode === undefined ||
      p.investmentMode === "available" ||
      p.investmentMode === "custom") &&
    (p.goalPlannerVersion === undefined || p.goalPlannerVersion === 1) &&
    (p.goalStepUp === undefined ||
      (typeof p.goalStepUp === "number" &&
        Number.isFinite(p.goalStepUp) &&
        p.goalStepUp >= 0 &&
        p.goalStepUp <= 100)) &&
    months(p.emergencyMonths) &&
    Number.isInteger(p.goalMonths) &&
    p.goalMonths >= 1 &&
    p.goalMonths <= 600 &&
    (p.goalAnnualReturn === undefined ||
      (typeof p.goalAnnualReturn === "number" &&
        Number.isFinite(p.goalAnnualReturn) &&
        p.goalAnnualReturn >= -99 &&
        p.goalAnnualReturn <= 100)) &&
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
        months(b.months) &&
        (b.intervalMonths === undefined ||
          (Number.isInteger(b.intervalMonths) &&
            b.intervalMonths >= 0 &&
            b.intervalMonths <= 12)),
    )
  );
}
