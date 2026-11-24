import { investment } from "./investment";
import { loans } from "./loans";
import { debtDashboard } from "./debtDashboard";
import { tax } from "./tax";
import { schemes } from "./schemes";
import { insurance } from "./insurance";
import { business } from "./business";
import { property } from "./property";
import { utility } from "./utility";
import type { Calculator } from "./model";
import type { PlannerRoute } from "../runtime/routes";

export interface PlannerLink {
  title: string;
  route: PlannerRoute;
  description: string;
}
function planner(
  title: string,
  route: PlannerRoute,
  description: string,
): PlannerLink {
  return { title, route, description };
}
export interface Category {
  name: string;
  detail: string;
  tools: (Calculator | PlannerLink)[];
}
export const categories: Category[] = [
  {
    name: "Investment",
    detail: "Contributions, returns and retirement",
    tools: [
      planner(
        "Investment growth planner",
        "growth",
        "Project regular SIP deposits, annual increases and investment goals.",
      ),
      planner(
        "SIP guide",
        "learn",
        "Explore an interactive example of monthly investing.",
      ),
      planner(
        "Systematic withdrawal and retirement",
        "survival",
        "Model monthly withdrawals and inflation-adjusted expenses.",
      ),
      planner(
        "FIRE and financial freedom",
        "freedom",
        "Estimate when investments could support your income goal.",
      ),
      planner(
        "Retirement buckets",
        "bucket-plan",
        "Plan cash, income and growth allocations.",
      ),
      ...investment,
    ],
  },
  { name: "Tax", detail: "Income, deductions and capital gains", tools: tax },
  {
    name: "Loans & EMI",
    detail: "Borrowing, repayment and affordability",
    tools: [
      planner(
        "Loan management and prepayment",
        "loan-payoff",
        "Compare payoff strategies and inspect the amortisation schedule.",
      ),
      debtDashboard,
      ...loans,
    ],
  },
  {
    name: "Government schemes",
    detail: "Small savings, pensions and benefits",
    tools: schemes,
  },
  {
    name: "Insurance",
    detail: "Cover, premiums and maturity",
    tools: insurance,
  },
  {
    name: "Business",
    detail: "Payroll, cash flow and valuation",
    tools: business,
  },
  {
    name: "Real estate",
    detail: "Property prices, rent and registration",
    tools: property,
  },
  {
    name: "Everyday utilities",
    detail: "Household bills, travel and conversions",
    tools: [
      planner(
        "Currency converter",
        "currency-converter",
        "Convert between currencies using daily reference rates.",
      ),
      planner(
        "Salary and budget planner",
        "salary-budget",
        "Balance bills, savings and upcoming expenses.",
      ),
      ...utility,
    ],
  },
];
