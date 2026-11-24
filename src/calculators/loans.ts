import { field, tool } from "./model.ts";

const money = (name: string, amount: number, min = 0) =>
  field(name + " (₹)", amount, min, 1e12);
const percent = (name: string, rate: number, min = 0, max = 100) =>
  field(name + " (%)", rate, min, max);
const months = (name: string, value: number) => ({
  ...field(name + " (months)", value, 1, 600),
  step: 1,
});
const principal = money("Loan principal", 500000);
const rate = percent("Quoted nominal annual interest", 9);
const term = months("Repayment term", 60);
const fees = money("Upfront fees paid separately", 0);
const days = field("Days at this balance", 30, 1, 366);
const income = money("Monthly net income", 80000, 0.01);
const existing = money("Existing monthly repayments", 10000);
const ceiling = percent("Assumed debt payment limit as share of income", 40);

function discountFactor(annual: number, months: number) {
  if (!Number.isInteger(months))
    throw new Error("Enter a whole number of months.");
  const r = annual / 1200;
  return r === 0 ? months : -Math.expm1(-months * Math.log1p(r)) / r;
}
function repayments(p: number, annual: number, n: number, fees = 0) {
  const emi = p / discountFactor(annual, n);
  return {
    "Monthly EMI (₹)": emi,
    "Total interest (₹)": Math.max(0, emi * n - p),
    "Total repaid including fees (₹)": emi * n + fees,
  };
}
function amortisationSchedule([principal, rate, term]: number[]) {
  if (!Number.isInteger(term) || term < 1 || term > 600)
    throw new Error("Enter a term of 1 to 600 whole months.");
  const emi = principal / discountFactor(rate, term);
  const rows: number[][] = [];
  let opening = principal;
  for (let month = 1; month <= term; month++) {
    const closing = emi * discountFactor(rate, term - month);
    const interest = (opening * rate) / 1200;
    rows.push([
      month,
      opening,
      emi,
      interest,
      Math.max(0, opening - closing),
      closing,
    ]);
    opening = closing;
  }
  return {
    columns: [
      "Month",
      "Opening balance (₹)",
      "EMI (₹)",
      "Interest (₹)",
      "Principal (₹)",
      "Closing balance (₹)",
    ],
    rows,
  };
}
const emi = (id: string, title: string, p: number, n: number) => ({
  ...tool(
    id,
    title,
    "Use the rate and fees in your own lender quote. This estimate assumes a fixed rate, monthly reducing balance and end-of-month repayments.",
    [money("Amount financed", p), rate, months("Repayment term", n), fees],
    ([p, r, n, f]) => repayments(p, r, n, f),
  ),
  schedule: amortisationSchedule,
});
const eligibility = (id: string, title: string, n: number) =>
  tool(
    id,
    title,
    "Estimate borrowing capacity from your income and the lender's assumed repayment limit. Actual approval depends on underwriting.",
    [income, existing, ceiling, rate, months("Term", n)],
    ([income, commitments, limit, r, n]) => {
      const available = Math.max(0, (income * limit) / 100 - commitments);
      return {
        "Indicative borrowing capacity (₹)": available * discountFactor(r, n),
        "Available monthly EMI (₹)": available,
      };
    },
  );
const secured = (id: string, title: string, asset: string) =>
  tool(
    id,
    title,
    "Apply the lender's quoted loan-to-value limit to your collateral and estimate instalments if repaid monthly at a fixed rate.",
    [
      money(asset, 500000),
      percent("Lender loan-to-value limit", 65),
      rate,
      term,
    ],
    ([value, limit, r, n]) => {
      const amount = (value * limit) / 100;
      return {
        "Maximum secured principal (₹)": amount,
        ...repayments(amount, r, n),
      };
    },
  );

export const loans = [
  {
    ...tool(
      "emi-schedule",
      "Loan amortisation schedule",
      "Inspect the principal, interest and outstanding balance for any month of a fixed-rate loan. Month one is the first repayment.",
      [principal, rate, term, months("Payment month to inspect", 12)],
      ([p, r, n, m]) => {
        if (!Number.isInteger(m) || m < 1 || m > n)
          throw new Error("Choose a whole payment month within the loan term.");
        const [, opening, , interest, principal, closing] =
          amortisationSchedule([p, r, n]).rows[m - 1];
        return {
          "Opening balance (₹)": opening,
          "Interest in selected payment (₹)": interest,
          "Principal repaid (₹)": principal,
          "Closing balance (₹)": closing,
        };
      },
    ),
    schedule: amortisationSchedule,
  },
  tool(
    "prepayment-benefit",
    "Loan prepayment benefit",
    "Compare a lump-sum principal reduction today with your original schedule, holding the remaining term fixed and reducing the EMI.",
    [
      principal,
      rate,
      term,
      money("Lump-sum principal prepayment", 50000),
      money("Prepayment fee", 0),
    ],
    ([p, r, n, lump, fee]) => {
      if (lump > p)
        throw new Error(
          "The prepayment must be within the outstanding principal.",
        );
      const factor = discountFactor(r, n),
        old = p / factor,
        updated = (p - lump) / factor;
      return {
        "Revised EMI (₹)": updated,
        "Monthly saving (₹)": old - updated,
        "Interest saved after fee (₹)": (old - updated) * n - lump - fee,
      };
    },
  ),
  tool(
    "advanced-prepayment",
    "Advanced EMI prepayment",
    "Apply one lump sum today and a fixed extra amount with each EMI. Continue paying the original EMI until the final partial payment.",
    [
      principal,
      rate,
      term,
      money("Prepayment today", 50000),
      money("Extra monthly payment", 1000),
      money("Total prepayment fees", 0),
    ],
    ([p, r, n, lump, extra, fee]) => {
      if (lump > p)
        throw new Error(
          "The prepayment must be within the outstanding principal.",
        );
      const emi = p / discountFactor(r, n);
      let balance = p - lump,
        interest = 0,
        count = 0;
      while (balance > 1e-7 && count < n) {
        const charge = (balance * r) / 1200;
        interest += charge;
        balance = Math.max(0, balance + charge - emi - extra);
        count++;
      }
      return {
        "Months to repay": count,
        "Months saved": n - count,
        "Interest on revised schedule (₹)": interest,
        "Interest saving after fees (₹)": emi * n - p - interest - fee,
      };
    },
  ),
  emi("home-loan-emi", "Home loan EMI", 4000000, 240),
  emi("axis-home-emi", "Axis Bank home loan EMI", 4000000, 240),
  emi("kotak-home-emi", "Kotak home loan EMI", 4000000, 240),
  emi("sbi-home-emi", "SBI home loan EMI", 4000000, 240),
  emi("personal-loan-emi", "Personal loan EMI", 500000, 48),
  emi("hdfc-personal-emi", "HDFC personal loan EMI", 500000, 48),
  emi("sbi-personal-emi", "SBI personal loan EMI", 500000, 48),
  emi("car-loan-emi", "Car loan EMI", 800000, 60),
  emi("icici-car-emi", "ICICI car loan EMI", 800000, 60),
  emi("ev-loan-emi", "Electric vehicle loan EMI", 1000000, 60),
  emi("two-wheeler-emi", "Two-wheeler loan EMI", 90000, 36),
  emi("used-car-emi", "Used car loan EMI", 450000, 48),
  emi("business-loan-emi", "Business loan EMI", 1500000, 72),
  emi("emi", "EMI calculator", 500000, 60),
  emi("credit-card-emi", "Credit card EMI conversion", 60000, 12),
  tool(
    "down-payment",
    "Down payment",
    "Estimate the cash needed at purchase, including separately paid closing costs.",
    [
      money("Purchase price", 5000000),
      percent("Down payment", 20),
      money("Closing costs", 150000),
    ],
    ([price, share, cost]) => ({
      "Cash required upfront (₹)": (price * share) / 100 + cost,
      "Down payment (₹)": (price * share) / 100,
      "Amount financed (₹)": price * (1 - share / 100),
    }),
  ),
  tool(
    "home-affordability",
    "Home affordability",
    "Estimate a property budget limited by both your deposit and monthly repayment capacity. Enter cash available after purchase costs.",
    [
      income,
      existing,
      ceiling,
      money("Available deposit", 1000000),
      percent("Minimum deposit share", 20, 0.01, 99.99),
      rate,
      months("Loan term", 240),
    ],
    ([income, existing, limit, cash, deposit, r, n]) => {
      const emi = Math.max(0, (income * limit) / 100 - existing);
      const budget = Math.min(
        (cash * 100) / deposit,
        cash + emi * discountFactor(r, n),
      );
      return {
        "Indicative property budget (₹)": budget,
        "Loan required using available deposit (₹)": Math.max(0, budget - cash),
      };
    },
  ),
  eligibility("home-loan-eligibility", "Home loan eligibility", 240),
  eligibility("personal-loan-eligibility", "Personal loan eligibility", 48),
  tool(
    "mortgage",
    "Mortgage payment",
    "Estimate principal and interest alongside monthly property costs.",
    [
      principal,
      rate,
      term,
      money("Annual property taxes", 12000),
      money("Annual home insurance", 6000),
    ],
    ([p, r, n, tax, insurance]) => {
      const base = repayments(p, r, n);
      return {
        "Monthly housing payment (₹)":
          base["Monthly EMI (₹)"] + (tax + insurance) / 12,
        ...base,
      };
    },
  ),
  tool(
    "reverse-mortgage",
    "Reverse mortgage",
    "Estimate equal end-of-month advances against a chosen terminal debt ceiling, with interest accruing until the payout period ends.",
    [
      money("Home value", 6000000),
      percent("Terminal debt ceiling as share of value", 60),
      rate,
      months("Payout period", 180),
    ],
    ([value, ltv, annual, n]) => {
      const r = annual / 1200;
      if (!Number.isInteger(n))
        throw new Error("Enter a whole payout period in months.");
      const ceiling = (value * ltv) / 100;
      const factor = r === 0 ? n : Math.expm1(n * Math.log1p(r)) / r;
      return {
        "Monthly advance (₹)": ceiling / factor,
        "Total advances (₹)": (n * ceiling) / factor,
        "Debt at end of payout period (₹)": ceiling,
      };
    },
  ),
  tool(
    "balloon-emi",
    "Balloon EMI",
    "Model end-of-month instalments followed by a balloon paid alongside the final regular instalment.",
    [principal, rate, term, money("Balloon at maturity", 100000)],
    ([p, r, n, b]) => {
      if (b > p)
        throw new Error("Balloon amount must not exceed the loan principal.");
      const emi = (p - b * (1 + r / 1200) ** -n) / discountFactor(r, n);
      return {
        "Regular EMI (₹)": emi,
        "Final payment including balloon (₹)": emi + b,
        "Total interest (₹)": emi * n + b - p,
      };
    },
  ),
  tool(
    "emi-moratorium",
    "EMI moratorium",
    "Defer all payments, capitalise interest monthly during the pause and repay over the subsequent repayment term.",
    [principal, rate, months("Deferred period", 6), term],
    ([p, r, pause, n]) => {
      if (!Number.isInteger(pause))
        throw new Error("Enter whole months for the deferred period.");
      const newPrincipal = p * (1 + r / 1200) ** pause;
      return {
        "Balance when repayments begin (₹)": newPrincipal,
        "Deferred interest (₹)": newPrincipal - p,
        "Revised EMI (₹)": newPrincipal / discountFactor(r, n),
      };
    },
  ),
  tool(
    "flat-reducing",
    "Flat vs reducing interest",
    "Compare two quotes for the same amount and term. The flat quote earns interest on original principal throughout.",
    [
      principal,
      percent("Flat annual interest", 5),
      percent("Reducing annual interest", 9),
      term,
    ],
    ([p, f, r, n]) => {
      const flat = (p * f * n) / 1200,
        reducing = p / discountFactor(r, n);
      return {
        "Flat-rate EMI (₹)": (p + flat) / n,
        "Reducing-balance EMI (₹)": reducing,
        "Flat minus reducing total cost (₹)": p + flat - reducing * n,
      };
    },
  ),
  secured("loan-against-fd", "Loan against fixed deposit", "FD value"),
  secured(
    "loan-against-property",
    "Loan against property EMI",
    "Appraised property value",
  ),
  secured(
    "loan-against-securities",
    "Loan against securities",
    "Eligible securities value",
  ),
  tool(
    "overdraft-interest",
    "Overdraft interest",
    "Calculate interest on a constant drawn balance using a 365-day year, plus any facility fee.",
    [money("Average drawn balance", 100000), rate, days, fees],
    ([p, r, d, f]) => ({
      "Interest (₹)": (p * r * d) / 36500,
      "Total cost (₹)": (p * r * d) / 36500 + f,
    }),
  ),
  tool(
    "pli-loan-surrender",
    "PLI loan or surrender",
    "Compare available policy-loan proceeds with surrender proceeds using the surrender value, lending limit and existing dues on your India Post quotation.",
    [
      money("Quoted surrender value", 300000),
      percent("Quoted loan limit against surrender value", 80),
      money("Outstanding policy loan and interest", 20000),
    ],
    ([value, limit, dues]) => ({
      "Net surrender proceeds (₹)": Math.max(0, value - dues),
      "Additional loan available (₹)": Math.max(
        0,
        (value * limit) / 100 - dues,
      ),
    }),
  ),
  tool(
    "top-up-loan",
    "Top-up loan EMI",
    "Compare your current EMI with one consolidated loan after adding a top-up and refinancing the entire balance.",
    [
      money("Existing principal outstanding", 800000),
      money("Additional borrowing", 200000),
      money("Current EMI", 18000),
      rate,
      term,
    ],
    ([p, top, old, r, n]) => {
      const emi = (p + top) / discountFactor(r, n);
      return {
        "Consolidated EMI (₹)": emi,
        "Change in monthly payment (₹)": emi - old,
        "Principal after top-up (₹)": p + top,
      };
    },
  ),
  tool(
    "foreclosure",
    "Loan foreclosure",
    "Estimate a settlement quote using outstanding principal, accrued interest, and the lender's applicable charges including tax.",
    [
      money("Outstanding principal", 400000),
      money("Accrued interest", 1500),
      percent("Applicable closure fee including tax", 0),
      money("Other settlement charges", 0),
    ],
    ([p, i, f, c]) => ({
      "Settlement amount (₹)": p + i + (p * f) / 100 + c,
      "Fees and charges (₹)": (p * f) / 100 + c,
    }),
  ),
  tool(
    "bnpl",
    "Buy now, pay later cost",
    "Compare the cash price with an upfront instalment, equal later instalments and fees.",
    [
      money("Cash purchase price", 20000, 0.01),
      money("Due today", 5000),
      money("Each later instalment", 5200),
      months("Number of monthly instalments", 3),
      fees,
    ],
    ([price, first, pay, n, f]) => {
      if (!Number.isInteger(n))
        throw new Error("Enter a whole number of instalments.");
      const total = first + pay * n + f;
      return {
        "Total cost (₹)": total,
        "Extra cost vs cash (₹)": total - price,
        "Extra cost vs cash (%)": ((total - price) / price) * 100,
      };
    },
  ),
  tool(
    "credit-score-impact",
    "Credit score factors · utilisation",
    "See how a new card balance changes your credit utilisation, one factor in credit scoring. Credit bureaus determine the actual score.",
    [
      money("Total credit limit", 100000, 0.01),
      money("Current balance", 20000),
      money("Balance after change", 35000),
    ],
    ([limit, before, after]) => ({
      "Current utilisation (%)": (before / limit) * 100,
      "New utilisation (%)": (after / limit) * 100,
      "Change (percentage points)": ((after - before) / limit) * 100,
    }),
    "https://www.cibil.com/faq-brochure",
  ),
  tool(
    "debt-consolidation",
    "Debt consolidation",
    "Compare two outstanding instalment loans with refinancing their combined balance, allowing for an upfront refinancing fee.",
    [
      money("Loan A balance", 300000),
      percent("Loan A annual rate", 12),
      months("Loan A remaining term", 36),
      money("Loan B balance", 150000),
      percent("Loan B annual rate", 18),
      months("Loan B remaining term", 24),
      percent("New annual rate", 10),
      months("New term", 36),
      fees,
    ],
    ([a, ra, na, b, rb, nb, r, n, f]) => {
      const first = a / discountFactor(ra, na),
        second = b / discountFactor(rb, nb),
        merged = (a + b) / discountFactor(r, n);
      return {
        "New EMI (₹)": merged,
        "Initial monthly payment reduction (₹)": first + second - merged,
        "Total repayment saving after fees (₹)":
          first * na + second * nb - merged * n - f,
      };
    },
  ),
  tool(
    "debt-income",
    "Debt-to-income ratio",
    "Compare all required monthly debt payments with monthly gross income.",
    [
      money("Monthly gross income", 90000, 0.01),
      existing,
      money("Proposed new EMI", 10000),
    ],
    ([income, existing, proposed]) => ({
      "Current debt-to-income (%)": (existing / income) * 100,
      "With new EMI (%)": ((existing + proposed) / income) * 100,
    }),
  ),
  tool(
    "loan-comparison",
    "Loan comparison",
    "Compare monthly payments and total cost of two fixed-rate offers for the same principal.",
    [
      principal,
      percent("Offer A annual interest", 9),
      months("Offer A term", 60),
      money("Offer A fees", 2000),
      percent("Offer B annual interest", 8.5),
      months("Offer B term", 72),
      money("Offer B fees", 4000),
    ],
    ([p, ra, na, fa, rb, nb, fb]) => {
      const a = p / discountFactor(ra, na),
        b = p / discountFactor(rb, nb);
      return {
        "Offer A EMI (₹)": a,
        "Offer B EMI (₹)": b,
        "Offer A total (₹)": a * na + fa,
        "Offer B total (₹)": b * nb + fb,
      };
    },
  ),
  tool(
    "credit-card-eligibility",
    "Credit card income eligibility",
    "Compare your income and existing debt payments against criteria provided by the card issuer.",
    [
      income,
      money("Issuer monthly income requirement", 30000),
      existing,
      ceiling,
    ],
    ([income, threshold, dues, limit]) => ({
      "Income headroom (₹)": income - threshold,
      "Monthly debt-payment headroom (₹)": (income * limit) / 100 - dues,
      "Meets both entered criteria":
        income >= threshold && dues <= (income * limit) / 100 ? "Yes" : "No",
    }),
  ),
  tool(
    "credit-card-interest",
    "Credit card interest",
    "Estimate simple daily interest on a revolving balance in a period with no grace days, using a 365-day year.",
    [
      money("Average daily revolving balance", 25000),
      percent("Annual card rate", 36),
      days,
    ],
    ([p, r, d]) => ({
      "Finance charge before fees and taxes (₹)": (p * r * d) / 36500,
    }),
  ),
  tool(
    "credit-card-minimum",
    "Credit card minimum due",
    "Apply your issuer's percentage and minimum floor to the eligible statement balance, then add charges that must be paid in full.",
    [
      money("Balance excluding fully payable charges", 30000),
      percent("Minimum due rate", 5),
      money("Minimum floor", 200),
      money("EMIs, fees and other fully payable charges", 500),
    ],
    ([p, r, f, charges]) => {
      const minimum = Math.min(p, Math.max(f, (p * r) / 100)) + charges;
      return {
        "Minimum due (₹)": minimum,
        "Balance carried forward (₹)": p + charges - minimum,
      };
    },
  ),
  tool(
    "education-loan-emi",
    "Education loan EMI",
    "Accrue simple interest during the study and grace period. At repayment, add unpaid interest to the principal.",
    [
      principal,
      rate,
      field("Months before repayment", 36, 0, 180),
      money("Interest paid during study period", 0),
      term,
    ],
    ([p, r, wait, paid, n]) => {
      const accrued = (p * r * wait) / 1200;
      if (paid > accrued)
        throw new Error(
          "Interest paid cannot exceed the study-period interest.",
        );
      const balance = p + accrued - paid;
      return {
        "Study-period interest (₹)": accrued,
        "Principal at repayment (₹)": balance,
        ...repayments(balance, r, n),
      };
    },
  ),
  tool(
    "gold-loan",
    "Gold loan",
    "Estimate the eligible value from net metal weight, purity, your quoted pure-gold price and lender advance ratio.",
    [
      field("Net gold weight (grams)", 20, 0.01, 1000000),
      field("Purity (karats)", 22, 1, 24),
      money("Quoted 24-karat price per gram", 8000),
      percent("Quoted loan-to-value limit", 70),
      rate,
      term,
    ],
    ([g, k, price, ltv, r, n]) => {
      const value = ((g * k) / 24) * price;
      const p = (value * ltv) / 100;
      return {
        "Assessed metal value (₹)": value,
        "Loan amount (₹)": p,
        ...repayments(p, r, n),
      };
    },
  ),
];
