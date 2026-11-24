import { field, tool } from "./model";

export const debtDashboard = {
  ...tool(
    "loan-debt-dashboard",
    "Loan and debt dashboard",
    "Add each outstanding balance, annual interest rate and monthly instalment. Compare the combined payments with income and see the balance-weighted borrowing rate.",
    [
      field("Monthly take-home income (₹)", 80000, 0.01),
      field("Outstanding balance (₹)", 400000, 0.01),
      field("Annual interest rate (%)", 9, 0, 100),
      field("Monthly instalment (₹)", 14000, 0),
    ],
    ([income, ...debts]) => {
      let balance = 0,
        annualInterest = 0,
        monthlyPayments = 0;
      for (let i = 0; i < debts.length; i += 3) {
        const [principal, rate, payment] = debts.slice(i, i + 3);
        balance += principal;
        annualInterest += (principal * rate) / 100;
        monthlyPayments += payment;
      }
      return {
        "Outstanding debt (₹)": balance,
        "Monthly debt payments (₹)": monthlyPayments,
        "Share of take-home income (%)": (monthlyPayments / income) * 100,
        "Weighted annual interest rate (%)": (annualInterest / balance) * 100,
        "Monthly income after instalments (₹)": income - monthlyPayments,
      };
    },
  ),
  repeatFields: { size: 3, label: "loan" },
};
