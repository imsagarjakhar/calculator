import type { Loan, LoanPlan } from "./model.ts";

const monthIndex = (value: unknown): number | null => {
  if (
    typeof value !== "string" ||
    !/^(19\d{2}|20\d{2}|21[0-4]\d)-(0[1-9]|1[0-2])$/.test(value)
  )
    return null;
  const [year, month] = value.split("-").map(Number);
  return year * 12 + month - 1;
};

/** Balances immediately before the comparison month's EMI. First/final EMI months are inclusive. */
export function originalLoanSchedule(loan: Loan, asOf: string) {
  const invalid = (error: string) => ({
    error,
    emi: 0,
    balance: 0,
    originalMonths: 0,
    paidMonths: 0,
    remainingMonths: 0,
  });
  if (
    typeof loan.originalAmount !== "number" ||
    !Number.isFinite(loan.originalAmount) ||
    loan.originalAmount <= 0 ||
    loan.originalAmount > 1e9
  )
    return invalid("Enter the original loan amount above zero.");
  if (!Number.isFinite(loan.rate) || loan.rate < 0 || loan.rate > 120)
    return invalid("Enter an annual interest rate from 0% to 120%.");
  const first = monthIndex(loan.firstEmiMonth),
    last = monthIndex(loan.lastEmiMonth),
    now = monthIndex(asOf);
  if (first === null || last === null || now === null)
    return invalid("Enter the first and final EMI months.");
  if (last < first)
    return invalid(
      "The final EMI month must be on or after the first EMI month.",
    );
  const originalMonths = last - first + 1;
  if (originalMonths > 600)
    return invalid("Use an original term of no more than 600 months.");
  if (first > now)
    return invalid(
      "The first EMI month must be on or before the comparison month. This planner compares existing loans.",
    );
  const paidMonths = Math.min(originalMonths, now - first);
  const remainingMonths = originalMonths - paidMonths;
  const rate = loan.rate / 1200;
  const emi =
    rate === 0
      ? loan.originalAmount / originalMonths
      : (loan.originalAmount * rate) /
        -Math.expm1(-originalMonths * Math.log1p(rate));
  const balance =
    remainingMonths === 0
      ? 0
      : paidMonths === 0
        ? loan.originalAmount
        : rate === 0
          ? emi * remainingMonths
          : (emi * -Math.expm1(-remainingMonths * Math.log1p(rate))) / rate;
  return {
    error: null,
    emi,
    balance,
    originalMonths,
    paidMonths,
    remainingMonths,
  };
}

/** Original inputs are authoritative, including after an import or comparison-date change. */
export function resolveLoanPlan(plan: LoanPlan): LoanPlan {
  if (!plan || !Array.isArray(plan.loans)) return plan;
  return {
    ...plan,
    loans: plan.loans.map((loan) => {
      if (loan?.inputMode !== "original") return loan;
      const result = originalLoanSchedule(loan, plan.start);
      return {
        ...loan,
        emi: result.emi,
        balance: result.balance,
        months: Math.max(1, result.remainingMonths),
      };
    }),
  };
}
