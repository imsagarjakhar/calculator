export type Loan = {
  id: string;
  name: string;
  balance: number;
  rate: number;
  months: number;
  emi: number;
  fee: number;
  lock: number;
  taxRelief: number;
};
export type LoanAsset = {
  id: string;
  name: string;
  value: number;
  rent: number;
  costs: number;
  vacancy: number;
  appreciation: number;
  rentGrowth: number;
  sellingCost: number;
  saleTax: number;
  linkedLoanId: string;
  rentIncluded: boolean;
  replacementCost?: number;
};
export type LoanPlan = {
  version: 1;
  currency: string;
  start: string;
  salary: number;
  expenses: number;
  reserve: number;
  buffer: number;
  emergency: number;
  coverMonths: number;
  extra: number;
  horizon: number;
  returns: number;
  investmentFee: number;
  gainsTax: number;
  split: number;
  loans: Loan[];
  fundingMode?: "manual" | "salary";
  repaymentBudget?: number;
  useAvailable?: boolean;
  lumpSum?: number;
  cashReturn?: number;
  assets?: LoanAsset[];
  useSalaryInvestment?: boolean;
};
export type Strategy = "avalanche" | "snowball" | "invest" | "split";
export const strategies: { id: Strategy; name: string; description: string }[] =
  [
    {
      id: "avalanche",
      name: "Highest interest first",
      description:
        "All extra money to the highest effective-rate eligible loan.",
    },
    {
      id: "snowball",
      name: "Smallest balance first",
      description: "All extra money to the smallest eligible balance.",
    },
    {
      id: "invest",
      name: "Invest the extra",
      description: "Pay required EMIs; invest extra money and released EMIs.",
    },
    {
      id: "split",
      name: "A little of both",
      description:
        "Split extra money between highest-interest debt and investing.",
    },
  ];
export const initialLoanPlan: LoanPlan = {
  version: 1,
  currency: "INR",
  start: "2026-10",
  salary: 80000,
  expenses: 35000,
  reserve: 5000,
  buffer: 5000,
  emergency: 100000,
  coverMonths: 6,
  extra: 10000,
  horizon: 60,
  returns: 10,
  investmentFee: 0.5,
  gainsTax: 0,
  split: 50,
  loans: [
    {
      id: "personal",
      name: "Personal loan",
      balance: 300000,
      rate: 14,
      months: 48,
      emi: 0,
      fee: 0,
      lock: 0,
      taxRelief: 0,
    },
    {
      id: "car",
      name: "Car loan",
      balance: 180000,
      rate: 9,
      months: 60,
      emi: 0,
      fee: 0,
      lock: 0,
      taxRelief: 0,
    },
  ],
};
export function payment(loan: Loan) {
  if (loan.emi > 0) return loan.emi;
  const r = loan.rate / 1200;
  return r === 0
    ? loan.balance / loan.months
    : (loan.balance * r) / (1 - Math.pow(1 + r, -loan.months));
}
export function cashFlow(p: LoanPlan) {
  const emis = p.loans
    .filter((l) => l.balance > 0)
    .reduce((s, l) => s + payment(l), 0);
  const capacity = p.salary - p.expenses - p.reserve - p.buffer - emis;
  const manual = p.fundingMode === "manual";
  const available = manual
    ? p.repaymentBudget === undefined
      ? p.extra
      : p.repaymentBudget - emis
    : capacity;
  const extra = manual
    ? Math.max(0, available)
    : p.useAvailable
      ? Math.max(0, capacity)
      : p.extra;
  return {
    emis,
    capacity: available,
    extra,
    commitment: emis + extra,
    unassigned: available - extra,
    emergencyTarget: (p.expenses + emis) * p.coverMonths,
  };
}
/** Preserve older extra/EMI plans as one explicit total repayment budget. */
export function withRepaymentBudget(p: LoanPlan): LoanPlan {
  return {
    ...p,
    fundingMode: "manual",
    repaymentBudget:
      p.fundingMode === "manual" && p.repaymentBudget !== undefined
        ? p.repaymentBudget
        : cashFlow(p).commitment,
    useSalaryInvestment: p.useSalaryInvestment ?? false,
  };
}
export function validateLoanPlan(value: unknown): string[] {
  if (!value || typeof value !== "object") return ["Enter a valid loan plan."];
  const p = value as LoanPlan;
  const amount = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1e9;
  const range = (n: unknown, low: number, high: number) =>
    typeof n === "number" && Number.isFinite(n) && n >= low && n <= high;
  if (
    p.version !== 1 ||
    !["INR", "SAR", "USD", "AED", "EUR", "GBP"].includes(p.currency) ||
    typeof p.start !== "string" ||
    !/^(20\d{2}|21[0-4]\d)-(0[1-9]|1[0-2])$/.test(p.start) ||
    ![p.salary, p.expenses, p.reserve, p.buffer, p.emergency, p.extra].every(
      amount,
    ) ||
    !range(p.coverMonths, 1, 24) ||
    !Number.isInteger(p.coverMonths) ||
    !range(p.horizon, 12, 360) ||
    !Number.isInteger(p.horizon) ||
    !range(p.returns, -99, 100) ||
    !range(p.investmentFee, 0, 10) ||
    !range(p.gainsTax, 0, 60) ||
    !range(p.split, 0, 100)
  )
    return [
      "Check the income, dates and scenario assumptions. Amounts must be between 0 and 1 billion; the horizon is 12–360 whole months.",
    ];
  if (!Array.isArray(p.loans) || p.loans.length > 20)
    return ["Use a list with no more than 20 loans."];
  if (
    !p.loans.every(
      (l) =>
        l &&
        typeof l === "object" &&
        typeof l.id === "string" &&
        l.id.length <= 80 &&
        typeof l.name === "string" &&
        l.name.trim().length > 0 &&
        l.name.length <= 80 &&
        amount(l.balance) &&
        range(l.rate, 0, 120) &&
        range(l.months, 1, 600) &&
        Number.isInteger(l.months) &&
        amount(l.emi) &&
        range(l.fee, 0, 20) &&
        range(l.lock, 0, 360) &&
        Number.isInteger(l.lock) &&
        range(l.taxRelief, 0, 60),
    )
  )
    return [
      "Check each loan: give it a name, a non-negative balance and rate, and 1–600 whole months remaining. Fees, lock-ins and tax relief must be within the shown limits.",
    ];
  if (new Set(p.loans.map((l) => l.id)).size !== p.loans.length)
    return ["Loan identifiers must be unique."];
  if (
    (p.fundingMode !== undefined &&
      !["manual", "salary"].includes(p.fundingMode)) ||
    (p.repaymentBudget !== undefined && !amount(p.repaymentBudget)) ||
    (p.useAvailable !== undefined && typeof p.useAvailable !== "boolean") ||
    (p.useSalaryInvestment !== undefined &&
      typeof p.useSalaryInvestment !== "boolean") ||
    (p.lumpSum !== undefined && !amount(p.lumpSum)) ||
    (p.cashReturn !== undefined && !range(p.cashReturn, -99, 100))
  )
    return [
      "Check the monthly repayment budget, spare savings and cash-return assumption.",
    ];
  if (p.assets !== undefined) {
    if (
      !Array.isArray(p.assets) ||
      p.assets.length > 8 ||
      !p.assets.every(
        (a) =>
          a &&
          typeof a === "object" &&
          typeof a.id === "string" &&
          a.id.length <= 80 &&
          typeof a.name === "string" &&
          a.name.trim().length > 0 &&
          a.name.length <= 80 &&
          [a.value, a.rent, a.costs, a.saleTax].every(amount) &&
          (a.replacementCost === undefined || amount(a.replacementCost)) &&
          range(a.vacancy, 0, 100) &&
          range(a.appreciation, -99, 100) &&
          range(a.rentGrowth, -99, 100) &&
          range(a.sellingCost, 0, 30) &&
          typeof a.rentIncluded === "boolean" &&
          typeof a.linkedLoanId === "string" &&
          (a.linkedLoanId === "" ||
            p.loans.some((l) => l.id === a.linkedLoanId)),
      )
    )
      return [
        "Check each asset’s name, value, rent, running costs, selling assumptions and linked loan.",
      ];
    if (new Set(p.assets.map((a) => a.id)).size !== p.assets.length)
      return ["Asset identifiers must be unique."];
    const linked = p.assets.map((a) => a.linkedLoanId).filter(Boolean);
    if (new Set(linked).size !== linked.length)
      return ["Link each secured loan to only one asset."];
  }
  return [];
}
export type LoanMonth = {
  id: string;
  name: string;
  opening: number;
  interest: number;
  required: number;
  extra: number;
  fee: number;
  closing: number;
};
export type Month = {
  month: number;
  interest: number;
  fees: number;
  required: number;
  extra: number;
  invested: number;
  growth: number;
  taxCredit: number;
  debt: number;
  portfolio: number;
  net: number;
  loans: LoanMonth[];
};
export type Simulation = {
  strategy: Strategy;
  rows: Month[];
  interest: number;
  fees: number;
  taxCredit: number;
  contributed: number;
  portfolio: number;
  investmentTax: number;
  debt: number;
  net: number;
  debtFree: number | null;
  paidOff: Record<string, number>;
};
export function simulate(
  p: LoanPlan,
  strategy: Strategy,
  annualReturn = p.returns,
): Simulation {
  const budget = cashFlow(p).commitment;
  const balances = p.loans.map((l) => l.balance);
  const monthlyReturn =
    Math.pow((1 + annualReturn / 100) * (1 - p.investmentFee / 100), 1 / 12) -
    1;
  let portfolio = 0,
    contributed = 0,
    interest = 0,
    fees = 0,
    taxCredit = 0;
  let debtFree: number | null = balances.every((b) => b < 1e-7) ? 0 : null;
  const paidOff: Record<string, number> = Object.create(null);
  const rows: Month[] = [];
  for (let month = 1; month <= p.horizon; month++) {
    const growth = portfolio * monthlyReturn;
    portfolio += growth;
    const details: LoanMonth[] = p.loans.map((l, i) => {
      const opening = balances[i];
      const charge = (opening * l.rate) / 1200;
      const required = Math.min(
        opening + charge,
        opening > 1e-7 ? payment(l) : 0,
      );
      balances[i] = Math.max(0, opening + charge - required);
      if (balances[i] < 1e-7) balances[i] = 0;
      return {
        id: l.id,
        name: l.name,
        opening,
        interest: charge,
        required,
        extra: 0,
        fee: 0,
        closing: balances[i],
      };
    });
    const required = details.reduce((s, l) => s + l.required, 0);
    const available = Math.max(0, budget - required);
    const fraction =
      strategy === "invest" ? 0 : strategy === "split" ? p.split / 100 : 1;
    let extraBudget = available * fraction;
    const order = p.loans
      .map((l, i) => ({ l, i }))
      .filter(({ l, i }) => balances[i] > 1e-7 && month > l.lock)
      .sort((a, b) =>
        strategy === "snowball"
          ? balances[a.i] - balances[b.i] || a.i - b.i
          : b.l.rate * (1 - b.l.taxRelief / 100) -
              a.l.rate * (1 - a.l.taxRelief / 100) ||
            balances[a.i] - balances[b.i] ||
            a.i - b.i,
      );
    for (const { l, i } of order) {
      const principal = Math.min(balances[i], extraBudget / (1 + l.fee / 100));
      const fee = (principal * l.fee) / 100;
      balances[i] = Math.max(0, balances[i] - principal);
      if (balances[i] < 1e-7) balances[i] = 0;
      details[i].extra = principal;
      details[i].fee = fee;
      details[i].closing = balances[i];
      extraBudget = Math.max(0, extraBudget - principal - fee);
    }
    const extra = details.reduce((s, l) => s + l.extra, 0);
    const monthFees = details.reduce((s, l) => s + l.fee, 0);
    const monthInterest = details.reduce((s, l) => s + l.interest, 0);
    const credit = details.reduce(
      (s, l, i) => s + (l.interest * p.loans[i].taxRelief) / 100,
      0,
    );
    // Credits are modeled as monthly cash refunds, invested after all debt payments.
    const invested =
      Math.max(0, budget - required - extra - monthFees) + credit;
    portfolio += invested;
    contributed += invested;
    interest += monthInterest;
    fees += monthFees;
    taxCredit += credit;
    p.loans.forEach((l, i) => {
      if (l.balance > 0 && balances[i] < 1e-7 && paidOff[l.id] === undefined)
        paidOff[l.id] = month;
    });
    const debt = balances.reduce((s, b) => s + b, 0);
    if (debt < 1e-7 && debtFree === null) debtFree = month;
    const gainsTax = (Math.max(0, portfolio - contributed) * p.gainsTax) / 100;
    rows.push({
      month,
      interest: monthInterest,
      fees: monthFees,
      required,
      extra,
      invested,
      growth,
      taxCredit: credit,
      debt,
      portfolio,
      net: portfolio - gainsTax + p.emergency + p.reserve * month - debt,
      loans: details,
    });
  }
  const last = rows[rows.length - 1];
  return {
    strategy,
    rows,
    interest,
    fees,
    taxCredit,
    contributed,
    portfolio,
    investmentTax: (Math.max(0, portfolio - contributed) * p.gainsTax) / 100,
    debt: last.debt,
    net: last.net,
    debtFree,
    paidOff,
  };
}
export function compare(p: LoanPlan) {
  const errors = validateLoanPlan(p);
  if (errors.length) return { errors, results: [] as Simulation[] };
  if (!p.loans.some((l) => l.balance > 0))
    return {
      errors: [
        "Add at least one loan from your lender statements before comparing paths.",
      ],
      results: [] as Simulation[],
    };
  const cash = cashFlow(p);
  if (cash.capacity < -1e-6)
    errors.push(
      p.fundingMode === "manual"
        ? "The total repayment budget does not cover all required EMIs. Increase it or review the loan payments before comparing."
        : "Income does not cover living costs, reserves, the buffer and required EMIs. Reduce commitments or review the income before comparing strategies.",
    );
  else if (cash.unassigned < -1e-6)
    errors.push(
      "The extra monthly amount exceeds your available budget. Lower it or change the income and expense inputs.",
    );
  return {
    errors,
    results: errors.length ? [] : strategies.map((s) => simulate(p, s.id)),
  };
}
export function breakEven(p: LoanPlan): {
  kind: "crossing" | "multiple" | "none" | "tie";
  rates: number[];
} {
  const delta = (rate: number) =>
    simulate(p, "invest", rate).net - simulate(p, "avalanche", rate).net;
  const rates: number[] = [];
  let previousRate = -50,
    previous = delta(previousRate),
    allTie = Math.abs(previous) < 0.01;
  for (let rate = -45; rate <= 50; rate += 5) {
    const value = delta(rate);
    allTie = allTie && Math.abs(value) < 0.01;
    if (previous * value < 0) {
      let low = previousRate,
        high = rate,
        lowValue = previous;
      for (let i = 0; i < 28; i++) {
        const mid = (low + high) / 2,
          d = delta(mid);
        if (lowValue * d <= 0) high = mid;
        else {
          low = mid;
          lowValue = d;
        }
      }
      rates.push((low + high) / 2);
    } else if (Math.abs(value) < 0.01 && Math.abs(previous) >= 0.01)
      rates.push(rate);
    previousRate = rate;
    previous = value;
  }
  return {
    kind: allTie
      ? "tie"
      : rates.length > 1
        ? "multiple"
        : rates.length
          ? "crossing"
          : "none",
    rates,
  };
}
