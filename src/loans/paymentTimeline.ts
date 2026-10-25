import { payment, loanTimelineMonths, type Loan } from "./model";
import { originalLoanSchedule } from "./origination";

export type AmountPoint = { month: number; amount: number; invested?: number; balance?: number };

export function loanPaymentTimeline(loan: Loan, comparisonMonth: string) {
  const original = loan.inputMode === "original";
  const originalSchedule = original
    ? originalLoanSchedule(loan, comparisonMonth)
    : null;
  const principal = original ? (loan.originalAmount ?? 0) : loan.balance;
  const firstMonth = original
    ? (loan.firstEmiMonth ?? comparisonMonth)
    : comparisonMonth;
  const months = Math.min(
    600,
    originalSchedule?.originalMonths ?? loanTimelineMonths(loan) ?? 600,
  );
  const emi = payment(loan);
  const points: AmountPoint[] = [{ month: 0, amount: 0, balance: principal }];
  let balance = principal,
    totalPaid = 0,
    totalInterest = 0;
  for (let month = 1; month <= months && balance > 1e-7; month++) {
    const interest = (balance * loan.rate) / 1200;
    const paid = Math.min(balance + interest, emi);
    totalInterest += interest;
    totalPaid += paid;
    balance = Math.max(0, balance + interest - paid);
    if (balance < 1e-7) balance = 0;
    points.push({ month, amount: totalPaid, balance });
  }
  return {
    points,
    firstMonth,
    principal,
    emi,
    totalPaid,
    totalInterest,
    remaining: balance,
    includesEarlierPayments: original,
  };
}
