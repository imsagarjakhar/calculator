import { field, tool } from "./model";

const salarySource =
  "https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1";
const deductionSource =
  "https://www.incometax.gov.in/iec/foportal/help/all-topics/tax-payer/individual/deductions-on-which-i-get-tax-benefit";
const gainsSource = "https://www.incometaxindia.gov.in/w/capital-gain";
const tdsSource = "https://www.incometaxindia.gov.in/w/tds-rates-1";
const gstSource = "https://cbic-gst.gov.in/gst-payment-rules.html";
const presumptiveSource =
  "https://www.incometax.gov.in/iec/foportal/help/e-filing-itr4-form-sugam-faq";
const money = (name: string, initial: number, max = 1e12) =>
  field(name + " (₹)", initial, 0, max);
const rate = (name: string, initial: number) =>
  field(name + " (%)", initial, 0, 100);
const gross = money(
  "Annual salary before standard deduction",
  1500000,
  5000000,
);
const taxable = money("Ordinary taxable income", 1500000, 5000000);
const deductions = money(
  "Eligible old-regime deductions and exemptions",
  150000,
);
const scope =
  "FY 2025–26, resident under 60, ordinary income up to ₹50 lakh. Includes rebate, marginal relief and 4% cess.";
const pos = (n: number) => Math.max(0, n);
function baseTax(income: number, old: boolean) {
  const widths = old
    ? [250000, 250000, 500000, Infinity]
    : [400000, 400000, 400000, 400000, 400000, 400000, Infinity];
  const rates = old
    ? [0, 0.05, 0.2, 0.3]
    : [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3];
  let balance = pos(income);
  return widths.reduce((sum, width, i) => {
    const slab = Math.min(balance, width);
    balance -= slab;
    return sum + slab * rates[i];
  }, 0);
}
function personal(income: number, old = false) {
  const before = baseTax(income, old);
  const after = old
    ? income <= 500000
      ? 0
      : before
    : Math.min(before, pos(income - 1200000));
  return after * 1.04;
}
function comparison(salary: number, relief: number) {
  const old = personal(pos(salary - 50000 - relief), true);
  const current = personal(pos(salary - 75000));
  return {
    "Old regime tax (₹)": old,
    "New regime tax (₹)": current,
    "Lower annual tax (₹)": Math.min(old, current),
  };
}
function validate(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}
const cashFlow = [
  money("Annual gross professional receipts", 1800000),
  money("Allowable business expenses", 400000),
];
const profitTax = ([receipts, expenses]: number[]) => {
  const profit = pos(receipts - expenses);
  validate(profit <= 5000000, "Use taxable profit up to ₹50 lakh.");
  return {
    "Taxable business profit (₹)": profit,
    "New regime tax (₹)": personal(profit),
  };
};
const tax = [
  tool(
    "rent-receipt",
    "Rent receipt generator",
    "Prepare a printable acknowledgement for rent paid.",
    [money("Rent paid", 20000)],
    ([r]) => ({ "Rent paid (₹)": r }),
  ),
  tool(
    "income-tax",
    "Income tax",
    scope,
    [gross],
    ([s]) => ({
      "Taxable salary (₹)": pos(s - 75000),
      "Annual new-regime tax (₹)": personal(s - 75000),
    }),
    salarySource,
  ),
  tool(
    "budget-2026-tax",
    "Budget 2026 income tax",
    "Tax year 2026–27. Resident individual, ordinary new-regime taxable income after deductions, up to ₹50 lakh.",
    [taxable],
    ([i]) => ({ "Income tax with cess (₹)": personal(i) }),
    "https://www.incometaxindia.gov.in/documents/d/guest/income_tax_act_2025_as_amended_by_fa_act_2026-pdf",
  ),
  tool(
    "old-vs-new-tax-regime",
    "Old vs new tax regime",
    scope,
    [gross, deductions],
    ([s, d]) => comparison(s, d),
    salarySource,
  ),
  tool(
    "section-87a-rebate",
    "Section 87A rebate",
    scope,
    [taxable],
    ([i]) => ({
      "Tax before relief (₹)": baseTax(i, false),
      "Rebate or marginal relief (₹)": baseTax(i, false) - personal(i) / 1.04,
      "Tax including cess (₹)": personal(i),
    }),
    salarySource,
  ),
  tool(
    "form-16-tax",
    "Form 16 reconciliation",
    scope +
      " Use taxable salary from Part B after deductions under the new regime.",
    [taxable, money("TDS from Part A", 80000)],
    ([i, t]) => ({
      "Annual liability (₹)": personal(i),
      "Tax outstanding (₹)": pos(personal(i) - t),
      "Excess withheld (₹)": pos(t - personal(i)),
    }),
    salarySource,
  ),
  tool(
    "tds-salary",
    "Salary TDS",
    scope + " Spread the outstanding salary tax over remaining payrolls.",
    [
      gross,
      money("Tax already withheld", 50000),
      field("Remaining payroll months", 6, 1, 12),
    ],
    ([s, t, m]) => ({
      "Monthly TDS estimate (₹)": pos(personal(s - 75000) - t) / m,
    }),
    salarySource,
  ),
  tool(
    "huf-tax",
    "HUF income tax",
    "FY 2025–26 ordinary HUF income up to ₹50 lakh. The individual rebate is excluded.",
    [taxable, deductions],
    ([i, d]) => ({
      "Old regime with cess (₹)": baseTax(pos(i - d), true) * 1.04,
      "New regime with cess (₹)": baseTax(i, false) * 1.04,
    }),
    salarySource,
  ),
  tool(
    "freelancer-income-tax-india",
    "Freelancer income tax",
    scope + " Uses actual business expenses.",
    cashFlow,
    profitTax,
    presumptiveSource,
  ),
  tool(
    "freelancer-tax",
    "Freelancer tax reserve",
    scope + " Budget monthly for tax on annual professional profit.",
    cashFlow,
    ([r, e]) => ({
      "Monthly tax reserve (₹)": profitTax([r, e])["New regime tax (₹)"] / 12,
    }),
    presumptiveSource,
  ),
  tool(
    "advance-tax",
    "Advance tax instalments",
    "FY 2025–26 regular taxpayer subject to advance tax. Cumulative payments due by the 15th of each listed month; net liability under ₹10,000 is below threshold.",
    [money("Annual liability after TDS", 90000)],
    ([t]) => {
      const due = t >= 10000 ? t : 0;
      return {
        "June cumulative (₹)": due * 0.15,
        "September cumulative (₹)": due * 0.45,
        "December cumulative (₹)": due * 0.75,
        "March cumulative (₹)": due,
      };
    },
    salarySource,
  ),
  tool(
    "advance-tax-interest",
    "Advance tax interest under 234A, B and C",
    "FY 2025–26 regular taxpayer. Enter applicable unpaid balances, chargeable months (including part months), and cumulative payments at deadlines. Excludes waivers, changing balances and exceptional income.",
    [
      money("Assessed tax net of withholding", 100000),
      money("By June 15", 10000),
      money("By September 15", 30000),
      money("By December 15", 60000),
      money("By March 15", 90000),
      money("Advance tax by March 31", 90000),
      money("234A unpaid balance", 10000),
      field("234A months", 1, 0, 120),
      field("234B months", 1, 0, 120),
    ],
    ([t, j, s, d, m, y, a, am, bm]) => {
      validate(
        j <= s && s <= d && d <= m && m <= y,
        "Enter cumulative payments in increasing order.",
      );
      const charge = (principal: number, months: number) =>
        Math.floor(pos(principal) / 100) * months;
      const c =
        t < 10000
          ? 0
          : [
              [j, 0.12, 0.15, 3],
              [s, 0.36, 0.45, 3],
              [d, 0.75, 0.75, 3],
              [m, 1, 1, 1],
            ].reduce(
              (sum, [paid, min, target, months]) =>
                sum + (paid < t * min ? charge(t * target - paid, months) : 0),
              0,
            );
      return {
        "234A interest (₹)": charge(a, am),
        "234B interest (₹)": t >= 10000 && y < t * 0.9 ? charge(t - y, bm) : 0,
        "234C interest (₹)": c,
      };
    },
    "https://www.incometaxindia.gov.in/documents/20117/42998/Interest-and-Fees_2026-01-20_02-55-55_48c87c_en.pdf/20388f8c-1b6a-e849-c537-4d209d92c0ee",
  ),
  tool(
    "education-loan-tax-benefit-80e",
    "Education loan interest deduction",
    "Old regime. Enter qualifying interest paid during an eligible deduction year. Compare tax before and after the deduction.",
    [taxable, money("Eligible interest paid", 80000)],
    ([i, p]) => ({
      "Deduction used (₹)": Math.min(i, p),
      "Annual tax saving (₹)": personal(i, true) - personal(pos(i - p), true),
    }),
    deductionSource,
  ),
  tool(
    "section-80c-investment-planner",
    "Section 80C investment planner",
    "FY 2025–26 old regime. Includes the shared ₹1.5 lakh limit for 80C, 80CCC and 80CCD(1).",
    [
      money("Existing eligible contributions", 90000),
      money("Planned additional investment", 50000),
    ],
    ([e, p]) => ({
      "Total eligible (₹)": Math.min(150000, e + p),
      "Unused limit (₹)": pos(150000 - e - p),
    }),
    deductionSource,
  ),
  tool(
    "health-insurance-tax-benefit-80d",
    "Health insurance deduction under 80D",
    "Old regime. Enter qualifying non-cash premiums. Use the oldest insured age in each group to apply its senior-citizen limit. Assumes resident insured persons.",
    [
      money("Self and family premium", 25000),
      field("Oldest family member age", 42, 0, 120),
      money("Parents’ premium", 45000),
      field("Oldest parent age", 67, 0, 120),
    ],
    ([s, a, p, b]) => ({
      "Deductible premiums (₹)":
        Math.min(s, a >= 60 ? 50000 : 25000) +
        Math.min(p, b >= 60 ? 50000 : 25000),
    }),
    deductionSource,
  ),
  tool(
    "family-pension-tax",
    "Family pension deduction",
    "FY 2025–26, qualifying ordinary family pension. Deduction is one-third of the pension subject to the regime ceiling.",
    [money("Annual family pension", 180000)],
    ([p]) => ({
      "New regime taxable pension (₹)": p - Math.min(p / 3, 25000),
      "Old regime taxable pension (₹)": p - Math.min(p / 3, 15000),
    }),
    salarySource,
  ),
  tool(
    "gratuity-tax-exemption",
    "Gratuity tax exemption",
    "FY 2025–26 non-government employee covered by Payment of Gratuity Act, on qualifying exit. Enter completed service rounded under the Act and remaining lifetime ceiling.",
    [
      money("Gratuity received", 800000),
      money("Last monthly basic plus DA", 60000),
      field("Qualifying service years", 20, 0, 80),
      money("Remaining exemption ceiling", 2000000, 2000000),
    ],
    ([g, s, y, c]) => {
      const exempt = Math.min(g, (s * 15 * y) / 26, c);
      return {
        "Exempt gratuity (₹)": exempt,
        "Taxable gratuity (₹)": g - exempt,
      };
    },
    deductionSource,
  ),
  tool(
    "home-loan-tax-benefit",
    "Home loan tax benefit",
    "FY 2025–26 old regime, qualifying completed self-occupied property. Applies the ₹2 lakh interest cap and remaining Section 80C room.",
    [
      taxable,
      money("Eligible interest paid", 180000),
      money("Eligible principal repaid", 70000),
      money("Remaining 80C limit", 50000, 150000),
    ],
    ([i, a, p, c]) => {
      const d = Math.min(200000, a) + Math.min(c, p);
      return {
        "Potential deduction (₹)": d,
        "Tax saving (₹)": personal(i, true) - personal(pos(i - d), true),
      };
    },
    deductionSource,
  ),
  tool(
    "section-44ada",
    "Section 44ADA presumptive income",
    "FY 2025–26 specified profession. The ₹50 lakh limit rises to ₹75 lakh when cash receipts are at most 5%. Models the statutory 50% baseline.",
    [
      money("Annual receipts", 2800000, 7500000),
      money("Cash and deemed cash receipts", 100000),
    ],
    ([r, c]) => {
      validate(
        c <= r && (r <= 5000000 || c <= r * 0.05),
        "Receipts exceed the applicable 44ADA limits.",
      );
      return {
        "Presumptive professional income (₹)": r / 2,
        "New regime tax with cess (₹)": personal(r / 2),
      };
    },
    presumptiveSource,
  ),
  tool(
    "presumptive-tax-44ad-44ae",
    "Presumptive business and goods vehicle income",
    "FY 2025–26. Enter eligible 44AD receipts and 44AE vehicle-months separately. Heavy vehicles use tonne-months of qualifying weight. Assumes eligibility, including the 10-vehicle ceiling.",
    [
      money("44AD qualifying digital receipts", 3000000),
      money("44AD other receipts", 200000),
      money("Cash and deemed cash receipts", 200000),
      field("44AE non-heavy vehicle-months", 0, 0, 120),
      field("44AE heavy vehicle tonne-months", 0, 0, 12000),
    ],
    ([d, c, cash, m, h]) => {
      validate(
        cash <= d + c &&
          d + c <= (cash <= (d + c) * 0.05 ? 30000000 : 20000000),
        "Receipts exceed applicable 44AD limits.",
      );
      return {
        "44AD presumptive profit (₹)": d * 0.06 + c * 0.08,
        "44AE presumptive profit (₹)": m * 7500 + h * 1000,
      };
    },
    presumptiveSource,
  ),
];

const gainFields = [
  money("Gross sale proceeds", 800000),
  money("Eligible acquisition cost", 500000),
  money("Permitted transfer expenses", 10000),
];
const weightedTax = (base: number, percentage: number) =>
  (pos(base) * percentage) / 100;
tax.push(
  tool(
    "capital-gains-tax",
    "Capital gains tax",
    "Enter the rate and remaining exemption applicable to your asset and sale date. Estimates tax before surcharge and cess.",
    [
      ...gainFields,
      money("Available exemption", 0),
      rate("Applicable tax rate", 12.5),
    ],
    ([s, c, e, x, r]) => ({
      "Gain before exemptions (₹)": s - c - e,
      "Tax (₹)": weightedTax(s - c - e - x, r),
    }),
    gainsSource,
  ),
  tool(
    "long-term-capital-gains-tax",
    "Long-term equity capital gains",
    "FY 2025–26, Section 112A eligible equity. Assumes basic exemption fully used, no surcharge. Enter unused annual exemption after other gains.",
    [...gainFields, money("Remaining 112A exemption", 125000, 125000)],
    ([s, c, e, x]) => ({
      "Taxable gain (₹)": pos(s - c - e - x),
      "Tax with cess (₹)": pos(s - c - e - x) * 0.125 * 1.04,
    }),
    gainsSource,
  ),
  tool(
    "54ec-capital-gains-bonds",
    "Section 54EC capital gains bonds",
    "FY 2025–26 qualifying long-term land or building gain. Assume investment within six months. Enter the unused portion of the ₹50 lakh cumulative limit.",
    [
      money("Eligible capital gain", 3800000),
      money("Qualifying bond investment", 2000000),
      money("Remaining statutory limit", 5000000, 5000000),
    ],
    ([g, b, c]) => ({
      "Exempt gain (₹)": Math.min(g, b, c),
      "Remaining gain (₹)": pos(g - Math.min(b, c)),
    }),
    gainsSource,
  ),
  tool(
    "capital-gains-indexation",
    "Capital gains indexation",
    "Use only where indexation is applicable. Supply official cost inflation indices for acquisition and transfer.",
    [
      money("Eligible acquisition cost", 1500000),
      money("Net sale proceeds", 3800000),
      field("Acquisition year CII", 200, 1, 10000),
      field("Sale year CII", 376, 1, 10000),
    ],
    ([c, s, a, b]) => ({
      "Indexed cost (₹)": (c * b) / a,
      "Indexed gain (₹)": s - (c * b) / a,
    }),
    gainsSource,
  ),
  tool(
    "digital-gold-capital-gains",
    "Digital gold capital gains",
    "FY 2025–26 sale of gold held directly. Over 24 months uses 12.5%, otherwise use your marginal rate. Excludes basic exemption adjustments and surcharge.",
    [
      ...gainFields,
      field("Holding months", 30, 0, 1200),
      rate("Short-term marginal rate", 20),
    ],
    ([s, c, e, m, r]) => ({
      "Capital gain (₹)": s - c - e,
      "Estimated tax with cess (₹)":
        weightedTax(s - c - e, m > 24 ? 12.5 : r) * 1.04,
    }),
    gainsSource,
  ),
  ...["Crypto income", "Crypto capital gains"].map((title) =>
    tool(
      title.toLowerCase().replaceAll(" ", "-"),
      title + " tax",
      "FY 2025–26 single VDA transfer. Deduct acquisition cost only. Losses produce zero tax on this transfer. Excludes surcharge.",
      [money("Transfer proceeds", 300000), money("Acquisition cost", 200000)],
      ([s, c]) => ({
        "Taxable transfer income (₹)": pos(s - c),
        "Tax with cess (₹)": pos(s - c) * 0.3 * 1.04,
      }),
      salarySource,
    ),
  ),
  tool(
    "swp-tax",
    "SWP redemption tax",
    "One mutual fund redemption. Supply the FIFO cost of units sold, available exemption and applicable gain rate. Excludes surcharge.",
    [
      money("Withdrawal proceeds", 30000),
      money("FIFO cost of units redeemed", 22000),
      money("Remaining applicable exemption", 0),
      rate("Applicable gains rate", 12.5),
    ],
    ([s, c, e, r]) => ({
      "Realised gain (₹)": s - c,
      "Tax with cess (₹)": weightedTax(s - c - e, r) * 1.04,
    }),
    gainsSource,
  ),
  tool(
    "esop-rsu-tax",
    "ESOP and RSU tax",
    "Estimate perquisite at exercise or vesting and subsequent gain on sale for one lot. Enter applicable marginal and capital-gain rates, before surcharge and cess.",
    [
      field("Shares", 100, 1, 1e9),
      money("Exercise price per share", 50),
      money("Perquisite FMV per share", 150),
      money("Sale price per share", 200),
      rate("Marginal income tax rate", 30),
      rate("Applicable gain rate", 12.5),
    ],
    ([n, p, f, s, r, g]) => ({
      "Perquisite tax (₹)": weightedTax(n * (f - p), r),
      "Sale gain or loss (₹)": n * (s - f),
      "Gain tax (₹)": weightedTax(n * (s - f), g),
    }),
    gainsSource,
  ),
  tool(
    "dividend-tax",
    "Dividend income tax",
    scope + " Estimates incremental new-regime tax on domestic dividends.",
    [
      money("Other ordinary taxable income", 1000000, 5000000),
      money("Gross dividend", 100000),
    ],
    ([i, d]) => {
      validate(i + d <= 5000000, "Combined income must be within ₹50 lakh.");
      return { "Incremental dividend tax (₹)": personal(i + d) - personal(i) };
    },
    salarySource,
  ),
  tool(
    "buyback-tax",
    "Buyback shareholder tax",
    "FY 2025–26 domestic company buyback. Proceeds are dividend income; share cost is separately recorded as capital loss. Enter your applicable marginal rate before cess and surcharge.",
    [
      money("Buyback proceeds", 500000),
      money("Share acquisition cost", 300000),
      rate("Dividend marginal tax rate", 30),
    ],
    ([p, c, r]) => ({
      "Dividend income (₹)": p,
      "Illustrative dividend tax (₹)": weightedTax(p, r),
      "Separate capital loss (₹)": c,
    }),
    gainsSource,
  ),
  tool(
    "tds-refund",
    "TDS refund estimate",
    "Reconcile annual credits with your final tax and interest liability.",
    [
      money("TDS and TCS credits", 110000),
      money("Advance and self-assessment tax", 5000),
      money("Final liability including interest", 90000),
    ],
    ([a, b, c]) => ({
      "Expected refund (₹)": pos(a + b - c),
      "Outstanding liability (₹)": pos(c - a - b),
    }),
    tdsSource,
  ),
  tool(
    "tds-section-194",
    "Section 194 withholding",
    "Supply the taxable payment base and applicable section-specific rate after checking thresholds, PAN and exemption status.",
    [money("Payment subject to TDS", 180000), rate("Applicable TDS rate", 10)],
    ([p, r]) => ({
      "Tax withheld (₹)": (p * r) / 100,
      "Net payment (₹)": p * (1 - r / 100),
    }),
    tdsSource,
  ),
  tool(
    "tds-on-rent",
    "TDS on rent",
    "FY 2025–26 Section 194-IB. Assumes resident landlord with PAN, individual/HUF tenant in scope and constant monthly rent.",
    [money("Monthly rent", 65000), field("Months in tax year", 12, 1, 12)],
    ([r, m]) => ({
      "Rent paid (₹)": r * m,
      "TDS at 2% if monthly rent exceeds ₹50,000 (₹)":
        r > 50000 ? r * m * 0.02 : 0,
    }),
    tdsSource,
  ),
  tool(
    "gst",
    "GST",
    "Enter the applicable GST rate. Calculate both adding tax to a base price and extracting tax from an inclusive price.",
    [money("Quoted amount", 10000), rate("GST rate", 18)],
    ([p, r]) => ({
      "Gross if quote excludes GST (₹)": p * (1 + r / 100),
      "GST added (₹)": (p * r) / 100,
      "Base if quote includes GST (₹)": p / (1 + r / 100),
      "GST embedded (₹)": p - p / (1 + r / 100),
    }),
    gstSource,
  ),
  tool(
    "freelance-gst",
    "Freelance GST",
    "Estimate net output liability for taxable domestic invoices with eligible credit. Excludes reverse-charge and export treatment.",
    [
      money("Fees before GST", 120000),
      rate("GST rate", 18),
      money("Eligible input tax credit", 3000),
    ],
    ([p, r, c]) => ({
      "Invoice total (₹)": p * (1 + r / 100),
      "Net GST payable (₹)": pos((p * r) / 100 - c),
      "Unused credit (₹)": pos(c - (p * r) / 100),
    }),
    gstSource,
  ),
  tool(
    "gst-reverse-charge",
    "GST reverse charge",
    "Enter the taxable purchase value and applicable reverse-charge rate. Credit depends on eligibility and timing.",
    [
      money("Taxable purchase", 90000),
      rate("Reverse-charge rate", 18),
      rate("Eligible credit share", 100),
    ],
    ([p, r, e]) => ({
      "Cash payment under RCM (₹)": (p * r) / 100,
      "Potential input credit (₹)": (p * r * e) / 10000,
    }),
    gstSource,
  ),
  tool(
    "gst-late-fee-interest",
    "GST late fee and interest",
    "Use the applicable combined daily late fee and return-specific cap. Assumes a constant overdue cash tax balance.",
    [
      money("Overdue cash tax", 20000),
      field("Days overdue", 10, 0, 3650),
      rate("Annual interest rate", 18),
      money("Daily combined late fee", 50),
      money("Applicable late fee cap", 2000),
    ],
    ([p, d, r, f, c]) => ({
      "Interest (₹)": (p * r * d) / 36500,
      "Late fee (₹)": Math.min(d * f, c),
      "Additional amount (₹)": (p * r * d) / 36500 + Math.min(d * f, c),
    }),
    gstSource,
  ),
  tool(
    "income-tax-notice-interest",
    "Income tax demand interest",
    "FY 2025–26 Section 220(2). Enter unpaid demand and months or part-months after the permitted payment period. Assumes no intervening payments.",
    [money("Unpaid demand", 60000), field("Chargeable months", 3, 0, 240)],
    ([d, m]) => ({
      "Interest (₹)": Math.floor(d / 100) * Math.ceil(m),
      "Total outstanding (₹)": d + Math.floor(d / 100) * Math.ceil(m),
    }),
    salarySource,
  ),
);

const hraFields = [
  money("Annual salary for HRA", 600000),
  money("Annual HRA received", 240000),
  money("Annual rent paid", 200000),
  {
    ...field("City where you rent", 0),
    options: ["Other city", "Delhi, Mumbai, Kolkata or Chennai"],
  },
];
function hra(s: number, h: number, r: number, m: number) {
  validate(m === 0 || m === 1, "Use 0 or 1 for the city type.");
  return Math.min(h, pos(r - s * 0.1), s * (m === 1 ? 0.5 : 0.4));
}
tax.push(
  tool(
    "hra",
    "House rent allowance",
    "FY 2025–26 old regime. Metro means Delhi, Mumbai, Kolkata or Chennai. Use the same period for salary, allowance and rent.",
    hraFields,
    ([s, h, r, m]) => ({
      "Exempt HRA (₹)": hra(s, h, r, m),
      "Taxable HRA (₹)": h - hra(s, h, r, m),
    }),
    salarySource,
  ),
  tool(
    "hra-vs-home-loan",
    "HRA vs home loan tax relief",
    "Compare old-regime exempt HRA with the qualifying home interest deduction for a completed self-occupied property. Compares deductions only.",
    [...hraFields, money("Eligible home loan interest", 180000)],
    ([s, h, r, m, i]) => ({
      "HRA exemption (₹)": hra(s, h, r, m),
      "Home interest deduction (₹)": Math.min(i, 200000),
    }),
    deductionSource,
  ),
  tool(
    "tax-planning",
    "Tax planning",
    "FY 2025–26. Estimate take-home after salary tax and planned annual savings under both regimes.",
    [gross, deductions, money("Annual savings outflow", 120000)],
    ([s, d, p]) => {
      const t = comparison(s, d);
      return {
        "Old regime cash after savings (₹)": s - t["Old regime tax (₹)"] - p,
        "New regime cash after savings (₹)": s - t["New regime tax (₹)"] - p,
      };
    },
    salarySource,
  ),
  tool(
    "tax-saving-portfolio",
    "Tax-saving portfolio planner",
    "FY 2025–26 old regime. Allocate annual 80C contributions across ELSS, EPF, PPF and other eligible products.",
    [
      money("ELSS", 50000),
      money("Employee EPF", 60000),
      money("PPF", 30000),
      money("Other eligible payments", 20000),
    ],
    ([a, b, c, d]) => ({
      "Total contributions (₹)": a + b + c + d,
      "80C deduction (₹)": Math.min(150000, a + b + c + d),
      "Remaining room (₹)": pos(150000 - a - b - c - d),
    }),
    deductionSource,
  ),
  tool(
    "tax-efficient-investment",
    "Tax-efficient investment comparison",
    "Compare two one-year investments using expected gross yield and each investment’s effective tax rate on income.",
    [
      money("Capital", 500000),
      rate("Investment A yield", 8),
      rate("Tax on A income", 30),
      rate("Investment B yield", 7),
      rate("Tax on B income", 0),
    ],
    ([p, a, x, b, y]) => ({
      "A after-tax income (₹)": ((p * a) / 100) * (1 - x / 100),
      "B after-tax income (₹)": ((p * b) / 100) * (1 - y / 100),
      "A minus B (₹)": (p * (a * (1 - x / 100) - b * (1 - y / 100))) / 100,
    }),
  ),
  tool(
    "professional-tax",
    "Professional tax payroll",
    "Use the monthly deduction from your applicable state schedule and enter any special collection month separately.",
    [
      money("Regular monthly professional tax", 200),
      field("Regular months", 11, 0, 12),
      money("Other months’ total tax", 300),
    ],
    ([r, m, s]) => ({ "Annual professional tax (₹)": r * m + s }),
  ),
  {
    ...tool(
      "all-states-professional-tax",
      "State professional tax lookup",
      "FY 2025–26 salaried worker, constant monthly pay and no personal exemptions. Choose a built-in schedule or enter the annual levy assessed by another state or local authority.",
      [
        {
          ...field("Work state", 0),
          options: [
            "Maharashtra",
            "Karnataka",
            "Telangana",
            "Gujarat",
            "Assam",
            "Bihar",
            "Jharkhand",
            "Madhya Pradesh",
            "Tamil Nadu (Chennai)",
            "Tripura",
            "West Bengal",
            ...[
              "Andhra Pradesh",
              "Arunachal Pradesh",
              "Chhattisgarh",
              "Goa",
              "Haryana",
              "Himachal Pradesh",
              "Kerala",
              "Manipur",
              "Meghalaya",
              "Mizoram",
              "Nagaland",
              "Odisha",
              "Punjab",
              "Rajasthan",
              "Sikkim",
              "Tamil Nadu (outside Chennai)",
              "Uttar Pradesh",
              "Uttarakhand",
              "Andaman and Nicobar Islands",
              "Chandigarh",
              "Dadra and Nagar Haveli and Daman and Diu",
              "Delhi",
              "Jammu and Kashmir",
              "Ladakh",
              "Lakshadweep",
              "Puducherry",
            ].map((name) => name + " (enter local assessment)"),
          ],
        },
        money("Gross monthly salary", 30000),
        {
          ...field("Maharashtra salary schedule", 0),
          options: ["Men", "Women"],
        },
        money("Locally assessed annual levy, if applicable", 0, 2500),
        {
          ...field("Local assessment for manual entries", 0),
          options: [
            "Choose or verify your local assessment",
            "I have verified the annual levy, including nil",
          ],
        },
      ],
      ([state, salary, gender, other, confirmed]): Record<
        string,
        number | string
      > => {
        if (state >= 11) {
          if (!confirmed)
            throw new Error(
              "This jurisdiction uses a manual assessment. Enter the annual amount confirmed by your employer or local authority, then confirm it above.",
            );
          return {
            "Entered annual liability (₹)": other,
            "Average monthly reserve (₹)": other / 12,
          };
        }
        const annual = 12 * salary;
        if (state === 5) {
          // Bihar Commercial Taxes Department, PT Schedule, S.O. 28.
          return {
            "Annual liability (₹)":
              annual <= 300000
                ? 0
                : annual <= 500000
                  ? 1000
                  : annual <= 1000000
                    ? 2000
                    : 2500,
          };
        }
        if (state === 6) {
          // Jharkhand Commercial Taxes Department, A Giant Leap, fig. 14.
          return {
            "Annual liability (₹)":
              annual <= 300000
                ? 0
                : annual <= 500000
                  ? 1200
                  : annual <= 800000
                    ? 1800
                    : annual <= 1000000
                      ? 2100
                      : 2500,
          };
        }
        if (state === 7) {
          // MP Commercial Tax Department, Professional Tax Schedule.
          const amount =
            annual <= 225000
              ? 0
              : annual <= 300000
                ? 1500
                : annual <= 400000
                  ? 2000
                  : 2500;
          const regular = Math.floor(amount / 12);
          return {
            "Annual liability (₹)": amount,
            "First eleven months, each (₹)": regular,
            "Twelfth month (₹)": amount - regular * 11,
          };
        }
        if (state === 8) {
          // Greater Chennai Corporation, revised II/2024–25 schedule.
          const half = salary * 6;
          const amount =
            half <= 21000
              ? 0
              : half <= 30000
                ? 180
                : half <= 45000
                  ? 425
                  : half <= 60000
                    ? 930
                    : half <= 75000
                      ? 1025
                      : 1250;
          return {
            "Half-year liability (₹)": amount,
            "Annual liability (₹)": amount * 2,
          };
        }
        let month: number;
        if (state === 0) {
          const limit = gender === 0 ? 7500 : 25000;
          month = salary <= limit ? 0 : salary <= 10000 ? 175 : 200;
        } else if (state === 1) month = salary >= 25000 ? 200 : 0;
        else if (state === 2)
          month = salary <= 15000 ? 0 : salary <= 20000 ? 150 : 200;
        else if (state === 3) month = salary <= 12000 ? 0 : 200;
        else if (state === 4)
          month = salary <= 15000 ? 0 : salary < 25000 ? 180 : 208; // Assam Gazette, 2 April 2025.
        else if (state === 9)
          month = salary <= 7500 ? 0 : salary <= 15000 ? 150 : 208; // Tripura Gazette, 25 July 2018.
        else
          month =
            salary <= 10000
              ? 0
              : salary <= 15000
                ? 110
                : salary <= 25000
                  ? 130
                  : salary <= 40000
                    ? 150
                    : 200; // West Bengal Finance Act 2016, section 5.
        const february = month === 200 && state < 2 ? 300 : month;
        return {
          "Annual liability (₹)": month * 11 + february,
          "Regular month (₹)": month,
          "February (₹)": february,
        };
      },
    ),
    sourceFor: ([state]: number[]) =>
      [
        "https://www.mahagst.gov.in/public/uploads/mvatservices/1760346808Maharashtra%20Profession%20Tax%20Act%201975.pdf",
        "https://ptax.karnataka.gov.in/ptemployer/FAQ",
        "https://www.tgct.gov.in/tgportal/AllActs/APPT/APPTSchedule.aspx",
        "https://commercialtax.gujarat.gov.in/vatwebsite/download/schedule/Rate_of_Profession_Tax.pdf",
        "https://uncomplycate.com/wp-content/uploads/2025/04/Government-of-Assam-issued-an-Amendment-to-Assam-Professional-Tax-Rates-2025-APR032025.pdf",
        "https://state.bihar.gov.in/cache/13/Tax%20Schedule/Professional%20Tax%20Schedules/PT_Schedule.pdf",
        "https://ctax.jharkhand.gov.in/documents/10231/0/A%2BGiant%2BLeap%2B-%2BRevenue%2BAugmentation/7074ea1d-d15d-4840-8171-3eaefbc2b05f?version=1.0",
        "https://mptax.mp.gov.in/mpvatweb/download/home/MPCTD_Registration_Checklist%26_Rates.pdf",
        "https://chennaicorporation.gov.in/gcc/department/revenue/",
        "https://taxes.tripura.gov.in/sites/default/files/2024-04/PTAX_NOTF_2_up.pdf",
        "https://comtax.wb.gov.in/notification/682_L_20160708.pdf",
      ][state],
  },
  tool(
    "property-tax",
    "Municipal property tax",
    "Use the annual taxable value on your assessment. Greater Chennai uses its half-yearly percentage on annual rental value. For another municipality, enter the applicable annual percentage. Enter an eligible rebate as an effective percentage after any cap.",
    [
      {
        ...field("Municipal assessment", 0),
        options: [
          "Greater Chennai Corporation",
          "Other municipality (enter annual rate)",
        ],
      },
      money("Assessed annual value", 240000),
      rate("Other municipality annual tax rate", 10),
      rate("Effective rebate after cap", 0),
    ],
    ([city, v, r, b]) => {
      const annual = city === 0 ? v * 0.124 * 2 : (v * r) / 100;
      return {
        "Annual assessment before rebate (₹)": annual,
        "Annual tax after rebate (₹)": annual * (1 - b / 100),
      };
    },
    "https://portal.chennaicorporation.gov.in/gcc/department/revenue/",
  ),
  tool(
    "enhanced-property-tax",
    "Unit area property tax",
    "Enter the local unit-area value, area, and combined usage, age and occupancy multiplier for your assessment.",
    [
      field("Carpet area (m²)", 90, 0, 1e8),
      money("Annual unit value per m²", 1000),
      field("Combined local multiplier", 1, 0, 100),
      rate("Municipal tax rate", 10),
    ],
    ([a, v, m, r]) => ({
      "Assessed annual value (₹)": a * v * m,
      "Annual property tax (₹)": (a * v * m * r) / 100,
    }),
  ),
  tool(
    "motor-vehicle-tax",
    "Motor vehicle tax estimate",
    "Estimate registration costs using the vehicle-specific percentage in your state's tariff.",
    [
      money("Taxable vehicle value", 900000),
      rate("Notified percentage", 10),
      money("Fixed registration charges", 2000),
    ],
    ([p, r, f]) => ({
      "Road tax (₹)": (p * r) / 100,
      "Tax and fees (₹)": (p * r) / 100 + f,
    }),
  ),
  {
    ...tool(
      "road-tax-by-state",
      "State road tax lookup",
      "FY 2025–26 new private petrol or diesel car, first vehicle of an individual owner. Telangana uses its August 2025 schedule. Excludes EV concessions, discounts and special levies. Choose a custom rate for other jurisdictions.",
      [
        {
          ...field("Registration jurisdiction", 0),
          options: ["Delhi", "Telangana", "Other jurisdiction (enter rate)"],
        },
        money("Taxable vehicle cost", 900000),
        { ...field("Fuel", 0), options: ["Petrol", "Diesel"] },
        rate("Custom road tax rate", 10),
        money("Additional fees and levies", 2000),
      ],
      ([state, cost, fuel, custom, fees]) => {
        let r = custom;
        if (state === 0)
          r =
            (cost <= 600000 ? 4 : cost <= 1000000 ? 7 : 10) *
            (fuel === 1 ? 1.25 : 1);
        if (state === 1) {
          if (cost === 5000000)
            throw new Error(
              "Confirm the treatment of exactly ₹50 lakh with the RTO and use the custom rate option.",
            );
          r =
            cost < 500000
              ? 13
              : cost < 1000000
                ? 14
                : cost < 2000000
                  ? 18
                  : cost < 5000000
                    ? 20
                    : 21;
        }
        return {
          "Applied rate (%)": r,
          "Road tax (₹)": (cost * r) / 100,
          "Tax and additional fees (₹)": (cost * r) / 100 + fees,
        };
      },
    ),
    sourceFor: ([state]: number[]) =>
      [
        "https://transport.delhi.gov.in/sites/default/files/2022-08/citizen_charter_2018_transport.pdf",
        "https://www.transport.telangana.gov.in/pdf_uploads/2025TRB_MS53.PDF",
      ][state],
  },
);
export { tax };
