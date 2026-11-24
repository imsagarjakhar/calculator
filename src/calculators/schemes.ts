import { field, tool } from "./model";

const post = "https://www.indiapost.gov.in/banking-services/savings";
const pli = "https://www.indiapost.gov.in/insurance-services/pli";
const epfo = "https://www.epfindia.gov.in/site_en/FAQ.php";
const nps = "https://www.pfrda.org.in/";
const apy = "https://www.pfrda.org.in/documents/33652/676426/APY%2BFAQs.pdf";
const money = (label: string, value: number, min = 0, max = 1e12) =>
  field(label + " (₹)", value, min, max);
const rate = (label: string, value: number) =>
  field(label + " (%)", value, 0, 100);
const years = (label: string, value: number, min = 1, max = 75) =>
  field(label + " (years)", value, min, max);
const annual = money("Annual contribution", 75000, 500, 150000);
const capital = money("Initial deposit", 100000, 1000);
const amount = money("Sum assured", 500000, 20000, 5000000);
const term = years("Policy duration", 20);
const assumed = (r: number) => rate("Assumed annual rate", r);
const bonus = field("Assumed annual bonus per ₹1,000 assured (₹)", 52, 0, 500);
const fixedRates =
  "Uses the rate you enter throughout. Actual future credits depend on declared rates.";
const monthly = money("Monthly contribution", 5000);
function whole(n: number, label: string) {
  if (!Number.isInteger(n))
    throw new Error("Enter a whole number for " + label + ".");
  return n;
}
function series(deposit: number, r: number, n: number) {
  return r === 0 ? deposit * n : (deposit * Math.expm1(n * Math.log1p(r))) / r;
}
function startAnnual(deposit: number, r: number, n: number) {
  return series(deposit, r / 100, n) * (1 + r / 100);
}
function ssy(deposit: number, r: number) {
  return startAnnual(deposit, r, 15) * (1 + r / 100) ** 6;
}
const depositYears = years("Full financial years modelled", 15, 1, 50);
// With monthly deposits at month end, the first receives eleven months of
// interest and the last receives none before the annual credit is posted.
function provident(
  opening: number,
  monthlyDeposit: number,
  r: number,
  y: number,
) {
  return (
    opening * (1 + r / 100) ** y +
    series(monthlyDeposit * (12 + (5.5 * r) / 100), r / 100, y)
  );
}
const pfFields = [
  money("Opening fund balance", 300000),
  monthly,
  assumed(8),
  depositYears,
];
const pfPlan = ([o, m, r, y]: number[]) => ({
  "Projected fund (₹)": provident(o, m, r, whole(y, "years")),
  "Total deposits and opening balance (₹)": o + 12 * m * y,
});
const ssyInfo =
  "Contribute by April 5 each year for 15 years, then leave funds invested until the 21st anniversary. Assumes no withdrawals. " +
  fixedRates;
const maturity = (sum: number, paidYears: number, ratePerThousand: number) =>
  sum + (sum * paidYears * ratePerThousand) / 1000;
const yearsBeforeAnnuity = years("Contribution period", 25);
const pensionFields = [
  money("Opening balance", 200000),
  monthly,
  assumed(9),
  yearsBeforeAnnuity,
];
const portfolio = ([p, m, r, y]: number[]) => {
  const monthlyRate = (1 + r / 100) ** (1 / 12) - 1;
  return p * (1 + r / 100) ** y + series(m, monthlyRate, 12 * y);
};
const apyMonthly = [
  [42, 84, 126, 168, 210],
  [46, 92, 138, 183, 228],
  [50, 100, 150, 198, 248],
  [54, 108, 162, 215, 269],
  [59, 117, 177, 234, 292],
  [64, 127, 192, 254, 318],
  [70, 139, 208, 277, 346],
  [76, 151, 226, 301, 376],
  [82, 164, 246, 327, 409],
  [90, 178, 268, 356, 446],
  [97, 194, 292, 388, 485],
  [106, 212, 318, 423, 529],
  [116, 231, 347, 462, 577],
  [126, 252, 379, 504, 630],
  [138, 276, 414, 551, 689],
  [151, 302, 453, 602, 752],
  [165, 330, 495, 659, 824],
  [181, 362, 543, 722, 902],
  [198, 396, 594, 792, 990],
  [218, 436, 654, 870, 1087],
  [240, 480, 720, 957, 1196],
  [264, 528, 792, 1054, 1318],
  [291, 582, 873, 1164, 1454],
];
export const schemes = [
  tool(
    "ppf",
    "Public Provident Fund (PPF)",
    "Assumes one annual deposit by April 5 in each full financial year you model. The statutory term runs from the end of the opening financial year. " +
      fixedRates,
    [annual, assumed(7.1), depositYears],
    ([a, r, y]) => ({
      "Projected balance (₹)": startAnnual(a, r, whole(y, "years")),
      "Contributed (₹)": a * y,
    }),
    post,
  ),
  tool(
    "elss-vs-ppf",
    "ELSS vs PPF",
    "Compare equal start-of-year deposits over full financial years. ELSS returns are market-dependent. Results are before investor-specific taxes.",
    [annual, assumed(7.1), rate("Expected ELSS return", 11), depositYears],
    ([a, p, e, y]) => ({
      "Projected PPF (₹)": startAnnual(a, p, y),
      "Projected ELSS (₹)": startAnnual(a, e, y),
    }),
    post,
  ),
  tool(
    "sip-vs-fd-ppf-rd",
    "SIP vs FD, PPF and RD",
    "Compare equal annual outlays for 15 years before tax. SIP and RD receive month-end deposits, PPF and a rolled-over cumulative FD receive start-of-year deposits. Enter effective annual yields.",
    [
      annual,
      rate("SIP expected return", 10),
      rate("Cumulative FD yield", 7),
      rate("PPF yield", 7.1),
      rate("RD effective yield", 6.8),
    ],
    ([a, s, f, p, r]) => ({
      "SIP balance (₹)": series(a / 12, (1 + s / 100) ** (1 / 12) - 1, 180),
      "Rolled FD balance (₹)": startAnnual(a, f, 15),
      "PPF balance (₹)": startAnnual(a, p, 15),
      "Rolled RD balance (₹)": series(
        a / 12,
        (1 + r / 100) ** (1 / 12) - 1,
        180,
      ),
    }),
    post,
  ),
  tool(
    "sukanya-vs-ppf",
    "Sukanya vs PPF",
    "Model equal deposits by April 5 for 15 years. Both balances grow to year 21, assuming a valid PPF continuation without further deposits.",
    [annual, rate("SSY rate", 8.2), rate("PPF rate", 7.1)],
    ([a, s, p]) => ({
      "Sukanya balance (₹)": ssy(a, s),
      "PPF balance (₹)": ssy(a, p),
    }),
    post,
  ),
  tool(
    "ssy",
    "Sukanya Samriddhi (SSY)",
    ssyInfo,
    [money("Annual deposit", 60000, 250, 150000), assumed(8.2)],
    ([a, r]) => ({
      "Maturity balance (₹)": ssy(a, r),
      "Total paid (₹)": 15 * a,
      "Projected interest (₹)": ssy(a, r) - 15 * a,
    }),
    post,
  ),
  tool(
    "ssy-maturity-planner",
    "SSY maturity planner",
    "Work backwards from a future education goal. " + ssyInfo,
    [money("Target at maturity", 2500000), assumed(8.2)],
    ([g, r]) => ({
      "Required yearly deposit (₹)": g / ssy(1, r),
      "Shortfall at ₹1.5 lakh annual limit (₹)": Math.max(
        0,
        g - ssy(150000, r),
      ),
    }),
    post,
  ),
  tool(
    "employees-provident-fund",
    "Employees’ Provident Fund",
    "Enter monthly employee and employer EPF credits from your payslip, excluding EPS. Interest is credited annually on each month’s opening balance.",
    [
      money("Opening balance", 250000),
      money("Employee EPF per month", 3500),
      money("Employer EPF excluding EPS per month", 2250),
      assumed(8.25),
      depositYears,
    ],
    ([o, e, c, r, y]) => pfPlan([o, e + c, r, y]),
    epfo,
  ),
  tool(
    "epf-passbook-interest",
    "EPF passbook interest",
    "Reconcile one full financial year with equal credits at each month end, one stable rate and no withdrawals.",
    [
      money("Opening EPF balance", 200000),
      money("Total monthly EPF credits", 6000),
      assumed(8.25),
    ],
    ([o, m, r]) => ({
      "Interest credit (₹)": provident(o, m, r, 1) - o - 12 * m,
      "Closing balance (₹)": provident(o, m, r, 1),
    }),
    epfo,
  ),
  tool(
    "epf-withdrawal",
    "EPF withdrawal",
    "Estimate settlement on the eligible EPF balance you supply. Enter the applicable permitted percentage and TDS rate for your claim. EPS benefits are separate.",
    [
      money("Eligible EPF balance", 450000),
      rate("Permitted withdrawal", 75),
      rate("Applicable withholding", 0),
    ],
    ([b, p, r]) => ({
      "Gross withdrawal (₹)": (b * p) / 100,
      "Net after withholding (₹)": ((b * p) / 100) * (1 - r / 100),
      "Remaining balance (₹)": b * (1 - p / 100),
    }),
    epfo,
  ),
  tool(
    "gpf",
    "General Provident Fund",
    "Estimate GPF balance with subscriptions credited at the start of each month and interest credited annually. Assumes a constant rate and no advances.",
    pfFields,
    ([o, m, r, y]) => ({
      "Projected GPF (₹)":
        o * (1 + r / 100) ** y +
        series(m * (12 + (6.5 * r) / 100), r / 100, whole(y, "years")),
    }),
  ),
  tool(
    "vpf",
    "Voluntary Provident Fund",
    "Project the VPF portion alone with month-end contributions and annual interest credit. Assumes a constant rate, before tax on any taxable interest.",
    pfFields,
    pfPlan,
    epfo,
  ),
  tool(
    "pf-vs-nps",
    "PF vs NPS",
    "Compare equal month-end deposits. PF receives annual interest credits and NPS follows the assumed effective investment return. Before tax and exit conditions.",
    [...pfFields, rate("Expected NPS return", 10)],
    ([o, m, p, y, n]) => ({
      "PF projection (₹)": provident(o, m, p, whole(y, "years")),
      "NPS projection (₹)": portfolio([o, m, n, y]),
    }),
    nps,
  ),
  tool(
    "apy",
    "Atal Pension Yojana (APY)",
    "Monthly contribution schedule for eligible new subscribers who join at age 18–40. Select a pension of ₹1,000 to ₹5,000 in ₹1,000 steps.",
    [
      field("Age at entry", 30, 18, 40),
      money("Guaranteed monthly pension", 3000, 1000, 5000),
    ],
    ([a, p]) => {
      const premium =
        apyMonthly[whole(a, "age") - 18][
          whole(p / 1000, "pension in thousands") - 1
        ];
      return {
        "Monthly contribution (₹)": premium,
        "Total contributions to age 60 (₹)": premium * 12 * (60 - a),
        "Monthly pension from age 60 (₹)": p,
      };
    },
    apy,
  ),
  tool(
    "nps",
    "National Pension System",
    "Model a month-end contribution plan. Set your applicable annuity allocation and quoted payout rate. The split is a scenario input.",
    [
      ...pensionFields,
      rate("Annuity allocation", 40),
      rate("Quoted annual annuity payout", 6),
    ],
    ([o, m, r, y, f, a]) => {
      const c = portfolio([o, m, r, y]);
      return {
        "Corpus (₹)": c,
        "Lump sum (₹)": c * (1 - f / 100),
        "Estimated monthly annuity (₹)": (c * f * a) / 120000,
      };
    },
    nps,
  ),
  tool(
    "nps-annuity",
    "NPS annuity income",
    "Estimate monthly income using the annuity purchase amount and payout rate on your insurer’s quote.",
    [
      money("Annuity purchase price", 2000000),
      rate("Annual annuity payout rate", 6),
    ],
    ([p, r]) => ({
      "Annual income (₹)": (p * r) / 100,
      "Monthly equivalent (₹)": (p * r) / 1200,
    }),
    nps,
  ),
  tool(
    "nps-tier-2",
    "NPS Tier II",
    "Project month-end voluntary investments using an assumed effective annual return. Results are before taxes and fees.",
    pensionFields,
    ([o, m, r, y]) => ({
      "Projected value (₹)": portfolio([o, m, r, y]),
      "Investment gain (₹)": portfolio([o, m, r, y]) - o - 12 * m * y,
    }),
    nps,
  ),
  tool(
    "pension",
    "EPS pension estimate",
    "Basic EPS-95 pension formula using eligible pensionable salary and credited service from EPFO. Excludes early pension adjustments, service splits and minimum-pension adjustments.",
    [
      money("Pensionable monthly salary", 15000),
      years("Credited pensionable service", 25, 10, 60),
    ],
    ([s, y]) => ({ "Formula monthly pension (₹)": (s * y) / 70 }),
    epfo,
  ),
  tool(
    "senior-citizen-savings-scheme",
    "Senior Citizens Savings Scheme",
    "Quarterly interest paid out for five years on an eligible SCSS deposit. Enter the rate fixed for the account.",
    [money("Deposit", 500000, 1000, 3000000), assumed(8.2)],
    ([p, r]) => ({
      "Full quarter interest (₹)": (p * r) / 400,
      "Five years of interest (₹)": (p * r) / 20,
      "Principal returned (₹)": p,
    }),
    post,
  ),
  tool(
    "kisan-vikas-patra",
    "Kisan Vikas Patra (KVP)",
    "Enter the doubling period from your certificate. At maturity the deposit doubles.",
    [capital, field("Issue-specific maturity (months)", 115, 1, 600)],
    ([p, m]) => ({
      "Maturity value (₹)": 2 * p,
      "Effective annual yield (%)": 100 * (2 ** (12 / m) - 1),
    }),
    post,
  ),
  tool(
    "mahila-samman",
    "Mahila Samman Savings Certificate",
    "For an existing certificate opened by March 31, 2025. Two-year term, 7.5% interest compounded quarterly, assuming no partial withdrawal.",
    [money("Original deposit", 100000, 1000, 200000)],
    ([p]) => ({
      "Maturity amount (₹)": Math.round(p * (1 + 0.075 / 4) ** 8),
      "Interest (₹)": Math.round(p * (1 + 0.075 / 4) ** 8) - p,
    }),
    "https://www.indiapost.gov.in/VAS/DOP_PDFFiles/MSSC/Mahila_Samman_Savings_Certificate_2023_English.pdf",
  ),
  tool(
    "national-savings-certificate",
    "National Savings Certificate",
    "Five-year NSC term with annual compounding. Enter the rate applying to the issue.",
    [capital, assumed(7.7)],
    ([p, r]) => ({
      "Maturity amount (₹)": p * (1 + r / 100) ** 5,
      "Interest (₹)": p * ((1 + r / 100) ** 5 - 1),
    }),
    post,
  ),
  tool(
    "nsc-vs-kvp",
    "NSC vs KVP",
    "Compare original certificate maturity values and effective annual yields. Their terms differ.",
    [
      capital,
      rate("NSC rate", 7.7),
      field("KVP maturity (months)", 115, 1, 600),
    ],
    ([p, r, m]) => ({
      "NSC after five years (₹)": p * (1 + r / 100) ** 5,
      "KVP at its maturity (₹)": 2 * p,
      "NSC annual yield (%)": r,
      "KVP annual yield (%)": 100 * (2 ** (12 / m) - 1),
    }),
    post,
  ),
  tool(
    "post-office-fd",
    "Post Office time deposit",
    "Quarterly compounding determines interest paid out annually. Choose a one-, two-, three- or five-year term. Assumes no reinvestment of payouts.",
    [capital, assumed(7.5), years("Deposit term", 5, 1, 5)],
    ([p, r, y]) => {
      if (![1, 2, 3, 5].includes(y))
        throw new Error("Choose a 1, 2, 3 or 5 year deposit.");
      const interest = p * ((1 + r / 400) ** 4 - 1);
      return {
        "Annual payout (₹)": interest,
        "Total interest (₹)": interest * y,
        "Principal returned (₹)": p,
      };
    },
    post,
  ),
  tool(
    "post-office-monthly-income",
    "Post Office Monthly Income Scheme",
    "Monthly interest over a five-year term with principal returned at maturity. Enter an eligible deposit under the account’s single or joint limit.",
    [money("Deposit", 500000, 1000, 1500000), assumed(7.4)],
    ([p, r]) => ({
      "Monthly income (₹)": (p * r) / 1200,
      "Five-year interest (₹)": (p * r) / 20,
      "Principal returned at maturity (₹)": p,
    }),
    post,
  ),
];

const bonusQuote = (sum: number) => ({
  "Whole life annual bonus (₹)": Math.round(sum * 0.076),
  "Endowment annual bonus (₹)": Math.round(sum * 0.052),
  "Anticipated endowment annual bonus (₹)": Math.round(sum * 0.048),
});
const maturityFields = [
  amount,
  term,
  bonus,
  money("Applicable terminal bonus", 0),
];
const grossMaturity = ([s, y, r, t]: number[]) => ({
  "Simple reversionary bonus (₹)": (s * y * r) / 1000,
  "Projected total (₹)": maturity(s, y, r) + t,
});
const policyRates =
  "Project an in-force policy with an assumed average annual bonus per ₹1,000 of sum assured. Actual declared rates vary by year. Excludes loans and unpaid premiums.";
const quoteFields = [
  amount,
  term,
  field("PLI average annual bonus per ₹1,000 (₹)", 52, 0, 500),
  field("RPLI average annual bonus per ₹1,000 (₹)", 48, 0, 500),
  money("PLI annual premium quote", 24000),
  money("RPLI annual premium quote", 22000),
];
const compareQuotes = ([s, y, p, r, pp, rp]: number[]) => ({
  "Projected PLI maturity (₹)": maturity(s, y, p),
  "Projected RPLI maturity (₹)": maturity(s, y, r),
  "PLI premiums paid (₹)": pp * y,
  "RPLI premiums paid (₹)": rp * y,
});
schemes.push(
  ...[
    ["2025-26", "https://egazette.gov.in/WriteReadData/2024/259207.pdf"],
    ["2026-27", "https://egazette.gov.in/WriteReadData/2026/269411.pdf"],
  ].map(([year, source]) =>
    tool(
      "pli-bonus-" + year,
      "PLI bonus rates " + year,
      "See the annual simple bonus for each policy class under this financial year’s declaration. Excludes terminal bonus.",
      [amount],
      ([s]) => bonusQuote(s),
      source,
    ),
  ),
  tool(
    "pli-rpli-maturity",
    "PLI and RPLI maturity",
    policyRates,
    maturityFields,
    grossMaturity,
    pli,
  ),
  tool(
    "pli-santosh",
    "PLI Santosh endowment",
    policyRates,
    maturityFields,
    grossMaturity,
    pli,
  ),
  tool(
    "pli-suraksha",
    "PLI Suraksha whole life",
    "Estimate the assured amount and accumulated bonus at death or age 80, whichever occurs first. Enter whole credited years and a representative bonus.",
    [
      amount,
      years("Credited years", 25),
      field("Average annual bonus per ₹1,000 (₹)", 76, 0, 500),
      money("Eligible terminal bonus", 0),
    ],
    grossMaturity,
    pli,
  ),
  tool(
    "pli-sumangal",
    "PLI Sumangal money back",
    "15-year plan pays 20% after years 6, 9 and 12; 20-year plan after years 8, 12 and 16. The remaining 40% plus accrued bonus is due on survival to maturity.",
    [
      amount,
      years("Plan term", 15, 15, 20),
      field("Average annual bonus per ₹1,000 (₹)", 48, 0, 500),
    ],
    ([s, y, r]) => {
      if (y !== 15 && y !== 20)
        throw new Error("Choose a 15- or 20-year term.");
      return {
        "Each of three survival payments (₹)": s * 0.2,
        "Final maturity payment (₹)": s * 0.4 + (s * y * r) / 1000,
        "All payments combined (₹)": maturity(s, y, r),
      };
    },
    pli,
  ),
  tool(
    "pli-suvidha",
    "PLI Suvidha conversion projection",
    "Estimate benefits under an approved whole-life to endowment conversion using bonus years and rates credited by India Post.",
    [
      amount,
      years("Years credited at whole-life rate", 5, 0, 75),
      years("Years credited at endowment rate", 15, 0, 75),
      field("Whole-life bonus per ₹1,000 (₹)", 76, 0, 500),
      bonus,
    ],
    ([s, w, e, wr, er]) => ({
      "Illustrative bonus (₹)": (s * (w * wr + e * er)) / 1000,
      "Assured plus bonus (₹)": s + (s * (w * wr + e * er)) / 1000,
    }),
    pli,
  ),
  tool(
    "post-office-pli",
    "Post Office PLI policy budget",
    "Estimate annual outlay and total premiums using the policy quote and premium-paying term.",
    [
      money("Quoted monthly premium", 2000),
      years("Premium-paying term", 20),
      amount,
    ],
    ([p, y, s]) => ({
      "Annual premium (₹)": p * 12,
      "Total premiums (₹)": p * 12 * y,
      "Sum assured (₹)": s,
    }),
    pli,
  ),
  tool(
    "pli-rpli-guide",
    "PLI and RPLI policy guide",
    "Compare endowment quotes on matching sum assured and benefit terms. Enter quoted premiums and assumed average bonus rates.",
    quoteFields,
    compareQuotes,
    pli,
  ),
  tool(
    "rpli-vs-pli",
    "RPLI vs PLI maturity comparison",
    "Compare projected payouts for matching endowment policies. Enter average expected bonus rates.",
    quoteFields,
    compareQuotes,
    pli,
  ),
  tool(
    "rpli-vs-pli-comparison",
    "RPLI vs PLI premium comparison",
    "Compare premium outlay and projected maturity less nominal premiums, before time value and any tax.",
    quoteFields,
    ([s, y, p, r, pp, rp]) => ({
      "PLI maturity less premiums (₹)": maturity(s, y, p) - pp * y,
      "RPLI maturity less premiums (₹)": maturity(s, y, r) - rp * y,
      "Difference in annual premiums (₹)": pp - rp,
    }),
    pli,
  ),
  tool(
    "pli-conversion-to-rpli",
    "PLI and RPLI change-of-cover comparison",
    "Changing from PLI to RPLI requires confirmation from India Post. Compare cash flows for retaining a policy or surrendering and purchasing separately quoted cover. Rates and surrender values come from your quotes.",
    [
      money("Existing policy quoted future payout", 800000),
      money("Remaining premiums on existing policy", 200000),
      money("Surrender proceeds", 180000),
      money("New policy quoted future payout", 600000),
      money("New policy future premiums", 240000),
    ],
    ([e, p, s, n, c]) => ({
      "Keep policy, nominal net (₹)": e - p,
      "Surrender and replace, nominal net (₹)": s + n - c,
    }),
    "https://pli.indiapost.gov.in/CustomerPortal/Documents/GuidelinesforCustomers.action",
  ),
  tool(
    "pli-eligibility",
    "PLI Santosh entry age eligibility",
    "Santosh endowment entry ages are 19–55. Applicant must belong to an eligible category, including specified employment, professionals or recognised graduate/diploma holders. Underwriting and policy terms determine acceptance.",
    [
      field("Age at entry", 30, 0, 100),
      {
        ...field("Meets employment or qualification requirement", 1),
        options: ["No", "Yes"],
      },
    ],
    ([a, c]) => ({
      "Meets these two entry checks (1 yes, 0 no)": Number(
        a >= 19 && a <= 55 && whole(c, "category") === 1,
      ),
    }),
    pli,
  ),
  tool(
    "pli-eligibility-guide",
    "PLI policy entry guide",
    "Check entry age for Santosh and Sumangal. Assumes the applicant satisfies the occupation or qualification requirement. Insurer underwriting applies.",
    [field("Applicant age", 32, 0, 100)],
    ([a]) => ({
      "Santosh age check (1 yes, 0 no)": Number(a >= 19 && a <= 55),
      "15-year Sumangal age check (1 yes, 0 no)": Number(a >= 19 && a <= 45),
      "20-year Sumangal age check (1 yes, 0 no)": Number(a >= 19 && a <= 40),
    }),
    pli,
  ),
  tool(
    "sovereign-gold-bond",
    "Sovereign Gold Bond",
    "For SGB issues with a 2.5% coupon. Enter issue subscription price and your assumed redemption price per gram. Assumes all coupons paid, before tax.",
    [
      field("Grams purchased", 10, 1, 1e6),
      money("Issue subscription price per gram", 6000),
      money("Redemption price per gram", 8000),
      years("Holding period", 8, 1, 8),
    ],
    ([g, p, r, y]) => ({
      "Annual interest (₹)": g * p * 0.025,
      "Redemption proceeds (₹)": g * r,
      "Total gain including interest (₹)": g * (r - p) + g * p * 0.025 * y,
    }),
    "https://www.rbi.org.in/Scripts/FAQView.aspx?Id=109",
  ),
  tool(
    "frsb",
    "Floating Rate Savings Bond",
    "Estimate the next full half-year coupon at the applicable NSC rate plus 0.35 percentage points. Rates reset each half year.",
    [capital, rate("Applicable NSC rate", 7.7)],
    ([p, r]) => ({
      "Annual coupon rate (%)": r + 0.35,
      "Full half-year coupon (₹)": (p * (r + 0.35)) / 200,
    }),
    "https://www.rbi.org.in/scripts/PublicationsView.aspx?Id=23794",
  ),
  tool(
    "government-bond-yield",
    "Government bond yield",
    "Calculate current yield and yield to maturity on a fixed-rate bond purchased on a coupon date with semiannual coupons and par redemption.",
    [
      money("Face value", 1000, 1),
      money("Purchase price", 975, 0.01),
      rate("Annual coupon", 7),
      field("Remaining half-year periods", 10, 1, 200),
    ],
    ([f, p, c, n]) => {
      whole(n, "half-year periods");
      const coupon = (f * c) / 200;
      const value = (r: number) => {
        let pv = 0;
        for (let t = 1; t <= n; t++)
          pv += (coupon + (t === n ? f : 0)) / (1 + r) ** t;
        return pv;
      };
      let low = -0.99999999,
        high = 1;
      while (value(high) > p) high *= 2;
      for (let i = 0; i < 100; i++) {
        const mid = (low + high) / 2;
        if (value(mid) > p) low = mid;
        else high = mid;
      }
      return {
        "Current yield (%)": (100 * coupon * 2) / p,
        "Annualised YTM, semiannual convention (%)": 100 * (low + high),
      };
    },
  ),
  tool(
    "government-schemes",
    "Government savings income planner",
    "Estimate income from a combination of MIS, SCSS and floating-rate bonds using the rates applicable to your holdings. Monthly figure is an average across payout schedules.",
    [
      money("MIS capital", 300000),
      rate("MIS rate", 7.4),
      money("SCSS capital", 500000),
      rate("SCSS rate", 8.2),
      money("Floating-rate bond capital", 100000),
      rate("Current bond coupon", 8.05),
    ],
    ([m, a, s, b, f, c]) => ({
      "Annual income at these rates (₹)": (m * a + s * b + f * c) / 100,
      "Average monthly income (₹)": (m * a + s * b + f * c) / 1200,
    }),
    post,
  ),
  tool(
    "mgnrega-wage",
    "MGNREGA wages",
    "Use your state’s notified daily rate and recorded paid person-days. Estimates gross wages for the recorded work.",
    [
      field("Paid person-days", 25, 0, 10000),
      money("Notified daily wage", 300),
    ],
    ([d, w]) => ({ "Expected wages (₹)": d * w }),
    "https://nrega.nic.in/",
  ),
  tool(
    "pm-jeevan-jyoti-bima-yojana",
    "PM Jeevan Jyoti Bima Yojana",
    "Estimate a household’s full June–May coverage-year premiums. Each eligible account holder has ₹2 lakh life cover. Mid-year first enrolments can have different premiums.",
    [field("Eligible insured members", 2, 1, 100)],
    ([n]) => ({
      "Annual premiums (₹)": 436 * whole(n, "members"),
      "Cover per insured member (₹)": 200000,
    }),
    "https://jansuraksha.gov.in/Files/PMJJBY/ENGLISH/Rules.pdf",
  ),
  tool(
    "pm-kisan",
    "PM Kisan instalments",
    "One eligible farmer family receives three instalments of ₹2,000 in a year. Enter instalments already credited.",
    [field("Instalments received this year", 1, 0, 3)],
    ([n]) => ({
      "Credited (₹)": whole(n, "instalments") * 2000,
      "Expected remaining (₹)": (3 - n) * 2000,
    }),
    "https://www.pmkisan.gov.in/",
  ),
  tool(
    "pm-suraksha-bima-yojana",
    "PM Suraksha Bima Yojana",
    "Annual accidental death and disability cover for eligible insured members. Partial disability benefit applies only to qualifying permanent losses.",
    [field("Eligible insured members", 2, 1, 100)],
    ([n]) => ({
      "Annual premiums (₹)": 20 * whole(n, "members"),
      "Death or full disability per member (₹)": 200000,
      "Qualifying partial disability per member (₹)": 100000,
    }),
    "https://jansuraksha.gov.in/Files/PMSBY/ENGLISH/FAQ.pdf",
  ),
  tool(
    "pradhan-mantri-fasal-bima-yojana",
    "Pradhan Mantri Fasal Bima Yojana",
    "Enter the notified scale of finance and actuarial rate for the crop. The farmer pays the lower of that rate and the crop-class cap.",
    [
      field("Cultivated area (hectares)", 2, 0, 1e6),
      money("Sum insured per hectare", 50000),
      rate("Actuarial rate", 8),
      {
        ...field("Crop class", 0),
        options: [
          "Kharif food grains or oilseeds",
          "Rabi food grains or oilseeds",
          "Commercial or horticultural crops",
        ],
      },
    ],
    ([a, v, r, c]) => {
      const cap = [2, 1.5, 5][c];
      return {
        "Sum insured (₹)": a * v,
        "Farmer premium (₹)": (a * v * Math.min(r, cap)) / 100,
        "Premium subsidy (₹)": (a * v * Math.max(0, r - cap)) / 100,
      };
    },
    "https://pmfby.gov.in/faq",
  ),
);
