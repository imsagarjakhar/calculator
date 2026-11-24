import { tool, field } from "./model.ts";

const cash = (name: string, value: number, min = 0) =>
  field(name + " (₹)", value, min, 1e13);
const pct = (name: string, value: number, min = 0, max = 100) =>
  field(name + " (%)", value, min, max);
const years = field("Term (years)", 10, 0.01, 100);
const principal = cash("Initial investment", 100000);
const growth = pct("Annual effective return", 8, -99);
const inflation = pct("Annual inflation", 5, -50);
const future = (amount: number, rate: number, term: number) =>
  amount * (1 + rate / 100) ** term;
const annuity = (rate: number, months: number) =>
  rate === 0 ? months : Math.expm1(months * Math.log1p(rate)) / rate;
const monthly = (annual: number) => Math.expm1(Math.log1p(annual / 100) / 12);
const goal = cash("Target at end of term", 1000000, 0.01);
const targetSip = (id: string, title: string, target = goal) =>
  tool(
    id,
    title,
    "Estimate end-of-month contributions towards a future target after allowing your existing investment to grow.",
    [target, principal, growth, years],
    ([target, initial, rate, term]) => ({
      "Monthly contribution (₹)":
        Math.max(0, target - future(initial, rate, term)) /
        annuity(monthly(rate), term * 12),
      "Projected existing investment (₹)": future(initial, rate, term),
    }),
  );
const share = cash("Current price per share", 100, 0.01);
const low = cash("Session low", 90);
const high = cash("Session high", 110);
function checkRange(bottom: number, top: number) {
  if (top < bottom)
    throw new Error("The high price must be at least the low price.");
}
const compound = (id: string, title: string) =>
  tool(
    id,
    title,
    "Project a single deposit at a constant annual effective return.",
    [principal, growth, years],
    ([amount, rate, term]) => ({
      "Future value (₹)": future(amount, rate, term),
      "Investment gain (₹)": future(amount, rate, term) - amount,
    }),
  );
const cryptoHolding = {
  repeatFields: { size: 3, label: "holding" },
  ...tool(
    "crypto-portfolio",
    "Crypto portfolio and sale valuation",
    "Value each holding and model a sale of all positions. Positive gains are taxed separately using your effective VDA tax rate including cess and any surcharge. Enter actual withholding from the trade.",
    [
      pct("Effective VDA tax including cess and surcharge", 31.2),
      cash("Total TDS withheld on sale", 0),
      field("Units in holding", 0.5, 0, 1e12),
      cash("Average acquisition price per unit", 100000),
      cash("Current sale price per unit", 115000),
    ],
    ([rate, tds, ...holdings]) => {
      let value = 0,
        cost = 0,
        taxable = 0;
      for (let i = 0; i < holdings.length; i += 3) {
        const [units, purchase, price] = holdings.slice(i, i + 3);
        value += units * price;
        cost += units * purchase;
        taxable += Math.max(0, units * (price - purchase));
      }
      if (tds > value)
        throw new Error("Withholding cannot exceed sale proceeds.");
      const tax = (taxable * rate) / 100;
      return {
        "Current value (₹)": value,
        "Cost basis (₹)": cost,
        "Unrealised gain (₹)": value - cost,
        "Tax if sold (₹)": tax,
        "Cash received on sale after TDS (₹)": value - tds,
        "Tax due after credit, negative means surplus (₹)": tax - tds,
        "Sale proceeds after final tax (₹)": value - tax,
      };
    },
    "https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/itr-2-faq",
  ),
};
const portfolio = [
  cash("Equities", 600000),
  cash("Fixed income", 300000),
  cash("Other assets", 100000),
];
const spending = cash("Monthly living costs today", 40000);
const retirement = (id: string, title: string) =>
  tool(
    id,
    title,
    "Inflate today's spending to retirement, then discount yearly inflation-linked withdrawals. The first withdrawal occurs at retirement.",
    [
      spending,
      field("Years until retirement", 20, 0, 90),
      field("Years in retirement", 30, 1, 90),
      inflation,
      growth,
    ],
    ([cost, wait, duration, inf, ret]) => {
      const first = future(cost * 12, inf, wait);
      const real = (1 + ret / 100) / (1 + inf / 100) - 1;
      const factor =
        real === 0
          ? duration
          : (-Math.expm1(-duration * Math.log1p(real)) * (1 + real)) / real;
      return {
        "Required retirement corpus (₹)": first * factor,
        "First year's spending (₹)": first,
      };
    },
  );

function sipProjection([
  mode,
  frequency,
  amount,
  annualRate,
  term,
  step,
  inflationRate,
]: number[]) {
  const periods = [12, 4, 2, 1][frequency];
  if (
    !periods ||
    (mode !== 0 && mode !== 1) ||
    !Number.isInteger(term) ||
    term < 1 ||
    term > 100
  )
    throw new Error(
      "Choose a calculation, a frequency and a whole term from 1 to 100 years.",
    );
  const rate = annualRate / (periods * 100);
  const yearGrowth = (1 + rate) ** periods;
  const annualPaymentsFactor = annuity(rate, periods) * (1 + rate);
  const unitRows: number[][] = [];
  let instalment = 1,
    contributed = 0,
    balance = 0;
  for (let year = 1; year <= term; year++) {
    balance = balance * yearGrowth + instalment * annualPaymentsFactor;
    contributed += instalment * periods;
    unitRows.push([
      year,
      instalment,
      contributed,
      balance - contributed,
      balance,
      balance / (1 + inflationRate / 100) ** year,
    ]);
    instalment *= 1 + step / 100;
  }
  const first = mode === 1 ? amount / balance : amount;
  const rows = unitRows.map(([year, ...scaled]) => [
    year,
    ...scaled.map((value) => value * first),
  ]);
  const last = rows[rows.length - 1];
  return {
    summary: {
      "First contribution per period (₹)": first,
      "Projected maturity (₹)": last[4],
      "Total contributions (₹)": last[2],
      "Investment gain (₹)": last[3],
      "Gain on contributions (%)": last[2] ? (100 * last[3]) / last[2] : 0,
      "Maturity in today's rupees (₹)": last[5],
      "Same contributions invested upfront (₹)": last[2] * yearGrowth ** term,
    },
    schedule: {
      columns: [
        "Year",
        "Per-period SIP (₹)",
        "Total invested (₹)",
        "Cumulative gain (₹)",
        "Closing value (₹)",
        "Today's purchasing power (₹)",
      ],
      rows,
    },
  };
}
export const investment = [
  {
    ...tool(
      "sip",
      "SIP calculator",
      "Choose a regular SIP to project a contribution, or enter a future target to solve for the first contribution. Deposits occur at the start of each period. The nominal annual return is divided across those periods. Step-ups begin in year two. Results are before tax and fees.",
      [
        {
          ...field("Calculation", 0, 0, 1),
          options: ["Project a contribution", "Solve for a maturity target"],
        },
        {
          ...field("Contribution frequency", 0, 0, 3),
          options: ["Monthly", "Quarterly", "Half-yearly", "Yearly"],
        },
        cash("Contribution per period or target maturity", 10000),
        pct("Expected nominal annual return", 12, -99),
        { ...field("Term (years)", 15, 1, 100), step: 1 },
        pct("Annual contribution step-up", 0),
        pct("Annual inflation", 5, -50),
      ],
      (values) => sipProjection(values).summary,
    ),
    schedule: (values: number[]) => sipProjection(values).schedule,
  },
  tool(
    "step-up-sip",
    "Step-up SIP calculator",
    "Increase the monthly instalment after every twelve deposits and project the effect against a level SIP.",
    [
      cash("Initial monthly SIP", 5000),
      pct("Yearly instalment increase", 10),
      growth,
      { ...field("Investment term (years)", 10, 1, 100), step: 1 },
    ],
    ([m, step, r, t]) => {
      if (!Number.isInteger(t))
        throw new Error("Enter a whole number of years.");
      let value = 0,
        paid = 0,
        contribution = m;
      for (let y = 0; y < t; y++) {
        value = value * (1 + r / 100) + contribution * annuity(monthly(r), 12);
        paid += contribution * 12;
        contribution *= 1 + step / 100;
      }
      return {
        "Stepped-up SIP value (₹)": value,
        "Level SIP value (₹)": m * annuity(monthly(r), 12 * t),
        "Total contributions (₹)": paid,
      };
    },
  ),
  tool(
    "sip-investment-goals",
    "SIP investment goals",
    "Compare your current savings plan with a future target and see what fraction of the target the plan could meet.",
    [
      goal,
      principal,
      cash("Planned monthly contribution", 5000),
      growth,
      years,
    ],
    ([target, p, m, r, t]) => {
      const projected = future(p, r, t) + m * annuity(monthly(r), 12 * t);
      return {
        "Projected value (₹)": projected,
        "Share of target funded (%)": (100 * projected) / target,
        "Remaining gap (₹)": Math.max(0, target - projected),
      };
    },
  ),
  tool(
    "real-retirement-corpus",
    "Inflation-adjusted retirement corpus",
    "Calculate how much today's portfolio could pay monthly in today's purchasing power over a finite retirement, with withdrawals at month end.",
    [principal, growth, inflation, years],
    ([p, r, i, t]) => {
      const realMonthly = monthly(((1 + r / 100) / (1 + i / 100) - 1) * 100);
      const pv =
        realMonthly === 0
          ? t * 12
          : -Math.expm1(-t * 12 * Math.log1p(realMonthly)) / realMonthly;
      return {
        "Sustainable monthly withdrawal in today's rupees (₹)": p / pv,
        "Annual real return (%)": ((1 + r / 100) / (1 + i / 100) - 1) * 100,
      };
    },
  ),
  targetSip("goal-based-sip", "Goal-based SIP"),
  tool(
    "tax-adjusted-goal-sip",
    "Tax-adjusted goal SIP",
    "Estimate equal monthly contributions for a target after tax on redemption gains. Enter the effective tax assumption and any remaining eligible gain exemption.",
    [
      goal,
      growth,
      years,
      pct("Effective tax on gains", 12.5),
      cash("Available gain exemption at redemption", 0),
    ],
    ([target, r, t, tax, exemption]) => {
      const count = t * 12,
        factor = annuity(monthly(r), count);
      const untaxed = target / factor;
      const required =
        untaxed * (factor - count) <= exemption
          ? untaxed
          : (target - (exemption * tax) / 100) /
            (factor - (Math.max(0, factor - count) * tax) / 100);
      return {
        "Monthly SIP (₹)": required,
        "Estimated tax (₹)":
          (Math.max(0, required * (factor - count) - exemption) * tax) / 100,
        "Gross maturity value (₹)": required * factor,
      };
    },
  ),
  tool(
    "multi-goal-planner",
    "Goal-based financial planner",
    "Compare the monthly contributions needed for two independent goals with the savings available. Enter costs in today's rupees.",
    [
      cash("First goal cost", 500000),
      field("Years to first goal", 5, 0.1, 100),
      cash("Second goal cost", 1000000),
      field("Years to second goal", 10, 0.1, 100),
      growth,
      inflation,
      cash("Available monthly savings", 15000),
    ],
    ([a, ta, b, tb, r, i, savings]) => {
      const first = future(a, i, ta) / annuity(monthly(r), 12 * ta),
        second = future(b, i, tb) / annuity(monthly(r), 12 * tb);
      return {
        "First goal monthly SIP (₹)": first,
        "Second goal monthly SIP (₹)": second,
        "Initial monthly surplus or shortfall (₹)": savings - first - second,
      };
    },
  ),
  targetSip(
    "crorepati",
    "Crorepati SIP goal",
    cash("Target wealth", 10000000, 0.01),
  ),
  tool(
    "financial-goal",
    "Financial goal planner",
    "Inflate the cost of a future goal and calculate end-of-month contributions to close the funding gap.",
    [cash("Goal cost today", 500000), principal, growth, inflation, years],
    ([target, initial, rate, inf, term]) => {
      const cost = future(target, inf, term);
      return {
        "Future goal cost (₹)": cost,
        "Monthly saving needed (₹)":
          Math.max(0, cost - future(initial, rate, term)) /
          annuity(monthly(rate), term * 12),
      };
    },
  ),
  tool(
    "digital-gold-sip",
    "Digital gold SIP",
    "Model monthly gold purchases after purchase charges. The entered annual price growth applies to each end-of-month purchase.",
    [
      cash("Monthly purchase", 5000),
      pct("Purchase charges as share of payment", 3),
      growth,
      years,
    ],
    ([pay, fee, rate, term]) => ({
      "Projected gold value (₹)":
        pay * (1 - fee / 100) * annuity(monthly(rate), term * 12),
      "Total paid (₹)": pay * term * 12,
    }),
  ),
  tool(
    "elss",
    "ELSS investment",
    "Project an equity-linked savings investment and estimate its tax deduction using your available eligible allowance and marginal rate.",
    [
      principal,
      growth,
      years,
      cash("Remaining eligible deduction", 0),
      pct("Applicable marginal tax rate", 0),
    ],
    ([p, r, t, limit, rate]) => ({
      "Projected fund value before redemption tax (₹)": future(p, r, t),
      "Estimated contribution-year tax saving (₹)":
        (Math.min(p, limit) * rate) / 100,
    }),
  ),
  {
    ...tool(
      "mutual-fund-overlap",
      "Mutual fund holdings overlap",
      "Add one row per security and enter its weight in each fund. Use zero when a fund does not hold the security. The overlap sums the smaller weight in each row.",
      [
        pct("Security weight in fund A", 12),
        pct("Security weight in fund B", 8),
      ],
      (weights) => {
        let a = 0,
          b = 0,
          overlap = 0,
          shared = 0;
        const breakdown: Record<string, number> = {};
        for (let i = 0; i < weights.length; i += 2) {
          a += weights[i];
          b += weights[i + 1];
          const minimum = Math.min(weights[i], weights[i + 1]);
          overlap += minimum;
          if (minimum > 0) shared++;
          breakdown["Security " + (i / 2 + 1) + " overlap (%)"] = minimum;
        }
        if (a > 100 + 1e-8 || b > 100 + 1e-8)
          throw new Error("Each fund's weights must total 100% or less.");
        return {
          "Overlap across entered holdings (%)": overlap,
          "Shared securities": shared,
          ...breakdown,
        };
      },
    ),
    repeatFields: { size: 2, label: "security" },
  },
  tool(
    "mutual-fund-returns",
    "Mutual fund returns",
    "Calculate total and annualised returns on a single investment with no intermediate cash flows.",
    [
      cash("Purchase value", 100000, 0.01),
      cash("Current value", 130000),
      years,
    ],
    ([p, v, t]) => ({
      "Total return (%)": 100 * (v / p - 1),
      "Annualised return (%)": 100 * ((v / p) ** (1 / t) - 1),
      "Gain (₹)": v - p,
    }),
  ),
  tool(
    "regular-direct",
    "Regular vs direct mutual fund",
    "Compare a lump sum at identical gross returns, deducting each plan's annual percentage fee after growth.",
    [
      principal,
      growth,
      pct("Regular plan annual fee", 1.5),
      pct("Direct plan annual fee", 0.6),
      years,
    ],
    ([p, r, a, b, t]) => {
      const net = (fee: number) => p * ((1 + r / 100) * (1 - fee / 100)) ** t;
      return {
        "Direct plan value (₹)": net(b),
        "Regular plan value (₹)": net(a),
        "Direct plan advantage (₹)": net(b) - net(a),
      };
    },
  ),
  tool(
    "stp",
    "Systematic transfer plan",
    "Each month both funds grow, then the available transfer moves from the source to the destination. Excludes tax and exit loads.",
    [
      principal,
      cash("Monthly transfer", 5000),
      pct("Source annual return", 5, -99),
      pct("Destination annual return", 10, -99),
      field("Transfer months", 24, 1, 600),
    ],
    ([start, transfer, a, b, months]) => {
      if (!Number.isInteger(months))
        throw new Error("Enter a whole number of months.");
      let source = start,
        destination = 0;
      for (let m = 0; m < months; m++) {
        source *= 1 + monthly(a);
        const moved = Math.min(source, transfer);
        source -= moved;
        destination = destination * (1 + monthly(b)) + moved;
      }
      return {
        "Destination fund (₹)": destination,
        "Source balance (₹)": source,
        "Combined value (₹)": source + destination,
      };
    },
  ),
  tool(
    "fd-ladder",
    "Fixed deposit ladder",
    "Split the principal equally between one-, two- and three-year deposits. Each matures on its own date with annual compounding.",
    [
      principal,
      pct("One-year rate", 6),
      pct("Two-year rate", 6.5),
      pct("Three-year rate", 7),
    ],
    ([p, a, b, c]) => ({
      "Year one maturity (₹)": future(p / 3, a, 1),
      "Year two maturity (₹)": future(p / 3, b, 2),
      "Year three maturity (₹)": future(p / 3, c, 3),
    }),
  ),
  tool(
    "fixed-deposit",
    "Fixed deposit",
    "Project the maturity value of a cumulative deposit using the compounding frequency on your deposit.",
    [
      principal,
      pct("Nominal annual rate", 7),
      years,
      field("Compounding periods per year", 4, 1, 365),
    ],
    ([p, r, t, n]) => {
      if (!Number.isInteger(n))
        throw new Error("Enter a whole number of compounding periods.");
      const v = p * (1 + r / (100 * n)) ** (n * t);
      return { "Maturity value (₹)": v, "Interest earned (₹)": v - p };
    },
  ),
  tool(
    "recurring-deposit",
    "Recurring deposit",
    "Estimate a deposit paid at the start of each month with quarterly compounding, using its equivalent monthly rate.",
    [
      cash("Monthly instalment", 5000),
      pct("Nominal annual rate", 7),
      field("Deposit term (months)", 36, 1, 600),
    ],
    ([p, rate, m]) => {
      if (!Number.isInteger(m))
        throw new Error("Enter a whole number of instalments.");
      const r = (1 + rate / 400) ** (1 / 3) - 1;
      return {
        "Maturity value (₹)": p * annuity(r, m) * (1 + r),
        "Total deposited (₹)": p * m,
      };
    },
  ),
  tool(
    "savings-interest",
    "Savings account interest",
    "Estimate simple daily interest for a period using its average end-of-day balance and a 365-day year.",
    [
      cash("Average daily balance", 50000),
      pct("Annual interest", 3),
      field("Days", 90, 1, 366),
    ],
    ([p, r, d]) => ({ "Interest earned (₹)": (p * r * d) / 36500 }),
  ),
  tool(
    "capital-loss-set-off",
    "Capital loss set-off and carry-forward",
    "For eligible, in-time Indian capital losses. Long-term losses offset long-term gains first. Enter ordinary capital gains and losses only.",
    [
      cash("Short-term gains", 20000),
      cash("Short-term losses", 25000),
      cash("Long-term gains", 40000),
      cash("Long-term losses", 10000),
    ],
    ([sg, sl, lg, ll]) => ({
      "Remaining short-term gains (₹)": Math.max(0, sg - sl),
      "Remaining long-term gains (₹)": Math.max(
        0,
        lg - ll - Math.max(0, sl - sg),
      ),
      "Unused short-term loss (₹)": Math.max(0, sl - sg - Math.max(0, lg - ll)),
      "Unused long-term loss (₹)": Math.max(0, ll - lg),
    }),
    "https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/itr-2-faq",
  ),
  tool(
    "surcharge-relief",
    "Surcharge marginal relief",
    "For an Indian surcharge threshold you have crossed. Enter tax including surcharge before cess at your income and at the threshold.",
    [
      cash("Income over applicable threshold", 50000),
      cash("Tax including surcharge before relief", 1450000),
      cash("Tax at threshold including applicable surcharge", 1350000),
    ],
    ([excess, tax, base]) => {
      const relief = Math.max(0, tax - base - excess);
      return {
        "Marginal relief (₹)": relief,
        "Tax after relief before cess (₹)": tax - relief,
      };
    },
    "https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1?Id=292",
  ),
  tool(
    "dividend-yield",
    "Dividend yield",
    "Compare a share's annual cash dividend with its current market price.",
    [cash("Annual dividend per share", 4), share],
    ([d, p]) => ({ "Dividend yield (%)": (d / p) * 100 }),
  ),
  tool(
    "fibonacci",
    "Fibonacci retracement",
    "Calculate retracement prices after an upward swing from low to high.",
    [low, high],
    ([l, h]) => {
      checkRange(l, h);
      return Object.fromEntries(
        [23.6, 38.2, 50, 61.8, 78.6].map((level) => [
          level + "% retracement (₹)",
          h - ((h - l) * level) / 100,
        ]),
      );
    },
  ),
  tool(
    "pivot-points",
    "Pivot points",
    "Calculate classic pivot, support and resistance from the previous session.",
    [low, high, cash("Closing price", 100)],
    ([l, h, c]) => {
      checkRange(l, h);
      if (c < l || c > h)
        throw new Error("Closing price must be within the session range.");
      const p = (l + h + c) / 3;
      return {
        "Pivot (₹)": p,
        "First support (₹)": 2 * p - h,
        "First resistance (₹)": 2 * p - l,
        "Second support (₹)": p - (h - l),
        "Second resistance (₹)": p + h - l,
      };
    },
  ),
  tool(
    "margin-trading",
    "Margin trading",
    "Estimate the net result of a leveraged share purchase with simple daily financing and no margin calls.",
    [
      cash("Own capital", 50000, 0.01),
      cash("Borrowed amount", 50000),
      pct("Price change", 10, -100, 1000),
      pct("Annual financing rate", 12),
      field("Days held", 30, 0, 3650),
    ],
    ([equity, debt, change, rate, days]) => {
      const interest = (debt * rate * days) / 36500;
      const net = ((equity + debt) * change) / 100 - interest;
      return {
        "Net gain (₹)": net,
        "Return on own capital (%)": (net / equity) * 100,
        "Interest cost (₹)": interest,
      };
    },
  ),
  {
    ...tool(
      "option-payoff",
      "Options profit and loss",
      "Build a single- or multi-leg position on one underlying with one expiry. Enter the combined charges from your broker and effective tax rate to estimate take-home profit.",
      [
        cash("Underlying price at expiry", 112),
        cash("Total brokerage, exchange charges and transaction taxes", 0),
        pct("Effective income tax on positive net gains", 0),
        {
          ...field("Leg position", 0, 0, 3),
          options: ["Buy call", "Sell call", "Buy put", "Sell put"],
        },
        cash("Leg strike price", 100),
        cash("Leg premium per unit", 5),
        { ...field("Units in leg", 100, 1, 1e9), step: 1 },
      ],
      ([expiry, charges, taxRate, ...values]) => {
        const legs: {
          call: boolean;
          sign: number;
          strike: number;
          premium: number;
          units: number;
        }[] = [];
        for (let i = 0; i < values.length; i += 4) {
          const [position, strike, premium, units] = values.slice(i, i + 4);
          legs.push({
            call: position < 2,
            sign: position % 2 === 0 ? 1 : -1,
            strike,
            premium,
            units,
          });
        }
        const profit = (spot: number) =>
          legs.reduce((sum, leg) => {
            const intrinsic = Math.max(
              0,
              leg.call ? spot - leg.strike : leg.strike - spot,
            );
            return sum + leg.sign * leg.units * (intrinsic - leg.premium);
          }, -charges);
        const knots = [...new Set([0, ...legs.map((leg) => leg.strike)])].sort(
          (a, b) => a - b,
        );
        const profits = knots.map(profit);
        const tailSlope = legs.reduce(
          (s, leg) => s + (leg.call ? leg.sign * leg.units : 0),
          0,
        );
        const breaks: string[] = [];
        const end = knots.length - 1;
        for (let i = 0; i < knots.length; i++) {
          const x = knots[i],
            y = profits[i];
          const nextX = knots[i + 1],
            nextY = profits[i + 1];
          if (Math.abs(y) < 1e-8) {
            if (i === end && tailSlope === 0)
              breaks.push("₹" + x + " and above");
            else if (i < end && Math.abs(nextY) < 1e-8)
              breaks.push("₹" + x + "–" + nextX);
            else if (i === 0 || Math.abs(profits[i - 1]) >= 1e-8)
              breaks.push("₹" + x);
          } else if (i < end && y * nextY < 0) {
            const cross = x - (y * (nextX - x)) / (nextY - y);
            breaks.push("₹" + cross.toFixed(2));
          } else if (i === end && y * tailSlope < 0)
            breaks.push("₹" + (x - y / tailSlope).toFixed(2));
        }
        const net = profit(expiry),
          tax = (Math.max(0, net) * taxRate) / 100;
        return {
          "Estimated take-home P&L (₹)": net - tax,
          "P&L after charges before income tax (₹)": net,
          "Estimated tax on gain (₹)": tax,
          "Maximum profit before income tax (₹)":
            tailSlope > 0 ? "Uncapped" : Math.max(0, ...profits),
          "Maximum loss before income tax (₹)":
            tailSlope < 0 ? "Uncapped" : Math.max(0, -Math.min(...profits)),
          "Break-even expiry prices": breaks.join(", ") || "None",
        };
      },
    ),
    repeatFields: { size: 4, label: "option leg" },
  },
  ...[
    ["profit-loss", "Profit and loss"],
    ["stock-return", "Stock total return"],
  ].map(([id, title]) =>
    tool(
      id,
      title,
      "Calculate the return on a completed trade including distributions and transaction costs.",
      [
        cash("Purchase cost", 100000, 0.01),
        cash("Sale proceeds", 120000),
        cash("Distributions received", 2000),
        cash("Total fees", 500),
      ],
      ([p, v, d, f]) => ({
        "Net profit (₹)": v + d - p - f,
        "Return on purchase cost (%)": ((v + d - p - f) / p) * 100,
      }),
    ),
  ),
  tool(
    "coast-fire",
    "Coast FIRE",
    "Discount the retirement target to today's required investment, assuming no further contributions.",
    [
      cash("Annual retirement spending in today's money", 480000),
      pct("Assumed withdrawal rate", 4, 0.01),
      growth,
      inflation,
      years,
    ],
    ([annual, draw, ret, inf, t]) => ({
      "Coast FIRE balance today (₹)":
        ((annual * 100) / draw) * ((1 + inf / 100) / (1 + ret / 100)) ** t,
      "Retirement target in future rupees (₹)": future(
        (annual * 100) / draw,
        inf,
        t,
      ),
    }),
  ),
  tool(
    "lean-fire",
    "Lean FIRE",
    "Estimate the portfolio needed to cover essential spending with an assumed initial withdrawal rate.",
    [spending, pct("Withdrawal rate", 3.5, 0.01), principal],
    ([cost, r, p]) => ({
      "Lean FIRE target (₹)": (cost * 1200) / r,
      "Remaining gap (₹)": Math.max(0, (cost * 1200) / r - p),
    }),
  ),
  retirement("retirement-corpus", "Retirement corpus"),
  cryptoHolding,
  tool(
    "digital-assets",
    "Digital asset and net worth tracker",
    "Combine current asset values and liabilities to see your net worth, concentration and allocation by asset class.",
    [
      cash("Equities", 200000),
      cash("Debt investments", 100000),
      cash("Gold", 50000),
      cash("Real estate", 500000),
      cash("Crypto", 25000),
      cash("Cash", 60000),
      cash("Total liabilities", 150000),
    ],
    ([equity, debt, gold, property, crypto, cash, dues]) => {
      const classes = {
        Equities: equity,
        "Debt investments": debt,
        Gold: gold,
        "Real estate": property,
        Crypto: crypto,
        Cash: cash,
      };
      const total = Object.values(classes).reduce(
        (sum, value) => sum + value,
        0,
      );
      const weights = Object.fromEntries(
        Object.entries(classes).map(([name, value]) => [
          name + " allocation (%)",
          total ? (value / total) * 100 : 0,
        ]),
      );
      return {
        "Net worth (₹)": total - dues,
        "Total assets (₹)": total,
        "Largest allocation (%)": Math.max(...Object.values(weights)),
        ...weights,
      };
    },
  ),
  tool(
    "cagr",
    "Compound annual growth rate",
    "Find the constant annual growth rate between beginning and ending balances, without intervening deposits.",
    [cash("Starting value", 100000, 0.01), cash("Ending value", 150000), years],
    ([p, v, t]) => ({ "CAGR (%)": ((v / p) ** (1 / t) - 1) * 100 }),
  ),
  compound("compound-interest", "Compound interest"),
  compound("future-value", "Future value"),
  compound("lumpsum", "Lump sum investment"),
  tool(
    "real-compound",
    "Inflation-adjusted compound interest",
    "Project nominal and purchasing-power-adjusted balances using annual effective rates.",
    [principal, growth, inflation, years],
    ([p, r, i, t]) => ({
      "Value in today's rupees (₹)": future(p, r, t) / future(1, i, t),
      "Nominal value (₹)": future(p, r, t),
    }),
  ),
  tool(
    "inflation",
    "Inflation",
    "Project the cost of the same basket of goods at a constant inflation rate.",
    [cash("Cost today", 100000), inflation, years],
    ([p, i, t]) => ({
      "Future cost (₹)": future(p, i, t),
      "Cost increase (₹)": future(p, i, t) - p,
    }),
  ),
  tool(
    "present-value",
    "Present value",
    "Discount a future payment using a constant annual effective rate.",
    [goal, growth, years],
    ([p, r, t]) => ({ "Present value (₹)": p / future(1, r, t) }),
  ),
  ...[
    [72, 2],
    [114, 3],
    [144, 4],
  ].map(([rule, multiple]) =>
    tool(
      "rule-of-" + rule,
      "Rule of " + rule,
      "Compare the rule-of-thumb growth time with annual compounding.",
      [pct("Annual return", 8, 0.01)],
      ([r]) => ({
        "Approximate time (years)": rule / r,
        ["Exact time to " + multiple + "× (years)"]:
          Math.log(multiple) / Math.log1p(r / 100),
      }),
    ),
  ),
  tool(
    "simple-interest",
    "Simple interest",
    "Calculate interest on the original principal throughout the term.",
    [principal, growth, years],
    ([p, r, t]) => ({
      "Interest (₹)": (p * r * t) / 100,
      "Final balance (₹)": p * (1 + (r * t) / 100),
    }),
  ),
  tool(
    "time-value",
    "Time value of money",
    "Combine an initial investment and end-of-month payments, then discount the final balance to today's value.",
    [principal, cash("Monthly contribution", 5000), growth, years],
    ([p, m, r, t]) => {
      const v = future(p, r, t) + m * annuity(monthly(r), t * 12);
      return {
        "Future value (₹)": v,
        "Present equivalent (₹)": v / future(1, r, t),
      };
    },
  ),
  tool(
    "allocation",
    "Asset allocation rebalancing",
    "Compare current equity holdings with a chosen target across your portfolio.",
    [...portfolio, pct("Target equity weight", 60)],
    ([e, d, o, target]) => ({
      "Target equity (₹)": ((e + d + o) * target) / 100,
      "Equity purchase needed, negative means sell (₹)":
        ((e + d + o) * target) / 100 - e,
    }),
  ),
  tool(
    "emergency-fund",
    "Emergency fund",
    "Size a cash reserve against essential monthly expenses.",
    [
      spending,
      field("Months of cover", 6, 0, 120),
      cash("Existing reserve", 80000),
    ],
    ([cost, m, p]) => ({
      "Target reserve (₹)": cost * m,
      "Remaining gap (₹)": Math.max(0, cost * m - p),
    }),
  ),
  tool(
    "green-investment",
    "Green investment comparison",
    "Compare equally sized green and conventional investments using your expected net annual returns.",
    [
      principal,
      pct("Green annual return", 7, -99),
      pct("Conventional annual return", 8, -99),
      years,
    ],
    ([p, a, b, t]) => ({
      "Green investment (₹)": future(p, a, t),
      "Conventional investment (₹)": future(p, b, t),
      "Difference (₹)": future(p, a, t) - future(p, b, t),
    }),
  ),
  tool(
    "net-worth",
    "Net worth",
    "Subtract short- and long-term liabilities from current asset values.",
    [
      cash("Liquid and investment assets", 500000),
      cash("Property and other assets", 1500000),
      cash("Outstanding loans", 600000),
      cash("Other liabilities", 20000),
    ],
    ([a, b, c, d]) => ({
      "Net worth (₹)": a + b - c - d,
      "Total assets (₹)": a + b,
      "Total liabilities (₹)": c + d,
    }),
  ),
  tool(
    "diversification",
    "Portfolio diversification",
    "Inspect category weights and the effective number of equally weighted asset classes.",
    portfolio,
    ([a, b, c]) => {
      const total = a + b + c;
      if (!total) throw new Error("Enter at least one holding.");
      return {
        "Equities (%)": (a / total) * 100,
        "Fixed income (%)": (b / total) * 100,
        "Other assets (%)": (c / total) * 100,
        "Effective asset classes": total ** 2 / (a * a + b * b + c * c),
      };
    },
  ),
  tool(
    "savings-rate",
    "Savings rate",
    "Measure monthly savings as a share of take-home income.",
    [
      cash("Monthly take-home income", 75000, 0.01),
      cash("Monthly spending", 50000),
    ],
    ([p, s]) => ({
      "Savings rate (%)": ((p - s) / p) * 100,
      "Monthly savings (₹)": p - s,
    }),
  ),
];
