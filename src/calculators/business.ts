import { field, tool } from "./model";

const money = (label: string, value: number, min = 0) =>
  field(label + " (₹)", value, min);
const pct = (label: string, value: number) =>
  field(label + " (%)", value, 0, 100);
const capital = money("Initial investment", 100000, 0.01);
const annualFlows = [40000, 40000, 50000].map((value) =>
  money("Year-end cash flow", value, -1e15),
);
function irr(cash: number[], times: number[]) {
  if (!cash.some((value) => value < 0) || !cash.some((value) => value > 0)) {
    throw new Error("Include at least one investment and one receipt.");
  }
  // Discount relative to the largest exponential so long holding periods cannot overflow.
  const npv = (logGrowth: number) => {
    const pivot = logGrowth < 0 ? Math.max(...times) : Math.min(...times);
    return cash.reduce(
      (sum, value, i) =>
        sum + value * Math.exp(-(times[i] - pivot) * logGrowth),
      0,
    );
  };
  const intervals: [number, number][] = [];
  let previousRate = -30,
    previousValue = npv(previousRate);
  for (let index = 1; index <= 1200; index++) {
    const rate = -30 + index / 20,
      value = npv(rate);
    if (value === 0 || value * previousValue < 0)
      intervals.push([previousRate, rate]);
    previousRate = rate;
    previousValue = value;
  }
  if (intervals.length !== 1)
    throw new Error(
      intervals.length
        ? "These cash flows yield multiple possible returns."
        : "No annual return was found for this cash-flow schedule.",
    );
  let [low, high] = intervals[0];
  if (npv(high) === 0) return 100 * Math.expm1(high);
  for (let i = 0; i < 120; i++) {
    const mid = (low + high) / 2;
    if (Math.sign(npv(mid)) === Math.sign(npv(low))) low = mid;
    else high = mid;
  }
  return 100 * Math.expm1((low + high) / 2);
}
export const business = [
  tool(
    "bonus-overtime-arrears",
    "Bonus, overtime and arrears",
    "Total your gross additional pay using the overtime rate and arrears agreed by your employer.",
    [
      money("Bonus", 10000),
      field("Overtime hours", 10, 0),
      money("Overtime pay per hour", 500),
      money("Monthly arrears", 1000),
      field("Arrears months", 3, 0, 600),
    ],
    ([bonus, hours, rate, arrears, months]) => ({
      "Overtime pay (₹)": hours * rate,
      "Gross extra pay (₹)": bonus + hours * rate + arrears * months,
    }),
  ),
  tool(
    "ctc-in-hand",
    "CTC to in-hand salary",
    "Convert annual employer cost to regular monthly take-home pay. Enter employer-only costs, variable pay and employee deductions separately.",
    [
      money("Annual CTC", 1200000),
      money("Employer contributions and noncash benefits per year", 100000),
      money("Annual bonus outside regular pay", 100000),
      money("Monthly employee deductions and TDS", 10000),
    ],
    ([ctc, benefits, bonus, deductions]) => {
      const gross = (ctc - benefits - bonus) / 12;
      if (gross < deductions)
        throw new Error("Regular gross pay must cover the monthly deductions.");
      return {
        "Regular monthly gross (₹)": gross,
        "Monthly in-hand (₹)": gross - deductions,
      };
    },
  ),
  tool(
    "dearness-allowance",
    "Dearness allowance",
    "Apply the existing and revised allowance rates to eligible monthly basic pay and calculate arrears at constant pay.",
    [
      money("Eligible monthly pay", 50000),
      pct("Previous DA rate", 50),
      pct("Revised DA rate", 53),
      field("Arrears months", 3, 0, 120),
    ],
    ([basic, old, revised, months]) => ({
      "Revised monthly DA (₹)": (basic * revised) / 100,
      "Arrears (₹)": ((basic * (revised - old)) / 100) * months,
    }),
  ),
  tool(
    "gratuity",
    "Gratuity",
    "For an eligible monthly-rated employee, enter recognised service years, rounding a part-year over six months up. Apply the ceiling for your employment terms.",
    [
      money("Last drawn qualifying monthly wages", 50000),
      field("Recognised service years", 8, 0, 100),
      money("Applicable payment ceiling", 2000000),
    ],
    ([pay, years, ceiling]) => ({
      "Amount before ceiling (₹)": ((pay * 15) / 26) * years,
      "Estimated gratuity (₹)": Math.min(((pay * 15) / 26) * years, ceiling),
    }),
    "https://www.labour.gov.in/static/uploads/2026/02/83978455025732b99b0165def80ab171.pdf",
  ),
  tool(
    "leave-encashment",
    "Leave encashment",
    "Estimate gross leave encashment from eligible leave days and the salary divisor used by your employer.",
    [
      money("Qualifying monthly pay", 60000),
      field("Payable leave days", 15, 0),
      field("Payroll days per month", 30, 1, 31),
    ],
    ([salary, days, divisor]) => ({
      "Gross leave payout (₹)": (salary * days) / divisor,
    }),
  ),
  tool(
    "notice-period-buyout",
    "Notice period buyout",
    "Calculate payment for the unserved notice period using the contract's qualifying salary and day-count basis.",
    [
      money("Qualifying monthly salary", 60000),
      field("Required notice days", 90, 0),
      field("Days served or waived", 45, 0),
      field("Payroll days per month", 30, 1, 31),
    ],
    ([salary, required, served, divisor]) => ({
      "Unserved days": Math.max(0, required - served),
      "Estimated buyout (₹)":
        (Math.max(0, required - served) * salary) / divisor,
    }),
  ),
  tool(
    "pay-commission-salary",
    "Pay commission salary",
    "Estimate revised monthly salary using your fitment assumption. Enter the actual matrix basic, if available, by setting the factor to one.",
    [
      money("Previous basic pay", 40000),
      field("Fitment factor", 2, 0.01, 20),
      pct("DA on revised basic", 10),
      pct("HRA on revised basic", 20),
      money("Other monthly allowances", 3600),
    ],
    ([basic, factor, da, hra, allowances]) => ({
      "Revised basic estimate (₹)": basic * factor,
      "Revised monthly gross estimate (₹)":
        basic * factor * (1 + (da + hra) / 100) + allowances,
    }),
  ),
  tool(
    "salary-hike",
    "Salary hike",
    "Compare gross pay before and after a salary change using the same pay period.",
    [money("Current salary", 60000, 0.01), money("Revised salary", 69000)],
    ([old, revised]) => ({
      "Salary change (₹)": revised - old,
      "Hike (%)": (revised / old - 1) * 100,
    }),
  ),
  tool(
    "salary-take-home",
    "Salary take-home pay",
    "Subtract monthly employee contributions, payroll taxes and other deductions from monthly gross earnings.",
    [
      money("Monthly gross pay", 100000),
      money("Employee retirement contribution", 6000),
      money("Monthly income tax withheld", 7000),
      money("Professional tax and other deductions", 200),
    ],
    ([gross, pension, tax, other]) => ({
      "Total deductions (₹)": pension + tax + other,
      "Monthly take-home (₹)": gross - pension - tax - other,
    }),
  ),
  tool(
    "superannuation-commutation",
    "Pension commutation",
    "Estimate the lump sum for surrendering part of your pension using the commutation factor for your age and scheme.",
    [
      money("Monthly pension", 40000),
      pct("Pension commuted", 33),
      field("Commutation factor in years", 8.194, 0, 50),
    ],
    ([pension, share, factor]) => ({
      "Lump sum (₹)": ((pension * share) / 100) * 12 * factor,
      "Remaining monthly pension (₹)": pension * (1 - share / 100),
    }),
  ),
  tool(
    "dcf-intrinsic-value",
    "DCF intrinsic value",
    "Project five years of free cash flow to the firm and a perpetual terminal value. Subtract net debt and divide by diluted shares.",
    [
      money("Latest annual free cash flow", 1000000),
      pct("Five-year cash flow growth", 8),
      pct("Discount rate", 12),
      pct("Perpetual growth after year five", 3),
      money("Net debt (negative for net cash)", 500000, -1e15),
      field("Diluted shares", 100000, 1),
    ],
    ([flow, growth, rate, terminal, debt, shares]) => {
      if (rate <= terminal)
        throw new Error("The discount rate must exceed perpetual growth.");
      let enterprise = 0;
      for (let year = 1; year <= 5; year++) {
        flow *= 1 + growth / 100;
        enterprise += flow / (1 + rate / 100) ** year;
      }
      enterprise +=
        (flow * (1 + terminal / 100)) /
        ((rate - terminal) / 100) /
        (1 + rate / 100) ** 5;
      return {
        "Enterprise value (₹)": enterprise,
        "Estimated value per share (₹)": (enterprise - debt) / shares,
      };
    },
  ),
  {
    ...tool(
      "irr",
      "Internal rate of return (IRR)",
      "Calculate the annual discount rate that balances an initial investment and annual cash flows in chronological order. Enter costs as negative amounts.",
      [capital, ...annualFlows],
      ([cost, ...cash]) => ({
        "Annual IRR (%)": irr(
          [-cost, ...cash],
          [0, ...cash.map((_, i) => i + 1)],
        ),
      }),
    ),
    repeatFields: { size: 1, label: "Year", start: 1 },
  },
  {
    ...tool(
      "npv",
      "Net present value (NPV)",
      "Discount year-end net cash flows to today, then subtract the initial investment. Negative flows represent costs.",
      [capital, pct("Annual discount rate", 10), ...annualFlows],
      ([cost, rate, ...cash]) => ({
        "Net present value (₹)": cash.reduce(
          (sum, v, i) => sum + v / (1 + rate / 100) ** (i + 1),
          -cost,
        ),
      }),
    ),
    repeatFields: { size: 1, label: "Year", start: 2 },
  },
  tool(
    "business-roi",
    "Return on investment (ROI)",
    "Compare sale proceeds and distributions with the original amount invested and total fees.",
    [
      capital,
      money("Sale proceeds or current value", 120000),
      money("Income distributions", 6000),
      money("Costs and fees", 1000),
    ],
    ([cost, proceeds, income, fees]) => ({
      "Net gain (₹)": proceeds + income - cost - fees,
      "ROI (%)": ((proceeds + income - cost - fees) / cost) * 100,
    }),
  ),
  {
    ...tool(
      "xirr",
      "Irregular cash flow return (XIRR)",
      "Enter dated investments as negative amounts and receipts as positive amounts. Include the current value as a final receipt for an open investment. Returns use actual days and a 365-day year.",
      [
        ...[-100000, -25000, 10000, 150000].flatMap((value, i) => [
          {
            label: "Transaction date",
            type: "date" as const,
            value: Date.UTC(2023 + i, i, 1),
          },
          money("Cash flow", value, -1e15),
        ]),
      ],
      (values) => {
        const amountsByDate = new Map<number, number>();
        for (let i = 0; i < values.length; i += 2) {
          amountsByDate.set(
            values[i],
            (amountsByDate.get(values[i]) ?? 0) + values[i + 1],
          );
        }
        const dates = [...amountsByDate.keys()]
          .filter((date) => amountsByDate.get(date) !== 0)
          .sort((a, b) => a - b);
        if (dates.length < 2)
          throw new Error(
            "Enter investments and receipts on at least two different dates.",
          );
        const cash = dates.map((date) => amountsByDate.get(date)!);
        const times = dates.map((date) => (date - dates[0]) / 86400000 / 365);
        return {
          "Annualised XIRR (%)": irr(cash, times),
          "Total net gain (₹)": cash.reduce((sum, value) => sum + value, 0),
        };
      },
    ),
    repeatFields: { size: 2, label: "Transaction", start: 0 },
  },
  tool(
    "breakeven-point",
    "Break-even point",
    "Calculate the whole units needed to recover fixed costs from the contribution on each sale.",
    [
      money("Fixed costs", 120000),
      money("Price per unit", 500),
      money("Variable cost per unit", 300),
    ],
    ([fixed, price, cost]) => {
      if (price <= cost)
        throw new Error(
          "Selling price must exceed variable cost to reach break-even.",
        );
      const units = Math.ceil(fixed / (price - cost));
      return {
        "Units to break even": units,
        "Revenue at break-even (₹)": units * price,
      };
    },
  ),
  tool(
    "intraday-net-profit",
    "Intraday net profit or loss",
    "Estimate net trade results from the sell and buy prices and all charges on both legs.",
    [
      money("Buy price per share", 500),
      money("Sell price per share", 510),
      field("Shares traded", 100, 1),
      money("Total brokerage", 40),
      money("Taxes and exchange charges", 35),
    ],
    ([buy, sell, qty, brokerage, charges]) => ({
      "Gross trading gain (₹)": (sell - buy) * qty,
      "Net result (₹)": (sell - buy) * qty - brokerage - charges,
    }),
  ),
  tool(
    "business-registration-cost",
    "Business registration cost",
    "Budget incorporation costs using the actual quoted filing fees, stamp duty, digital certificates and professional charges.",
    [
      money("Filing and name reservation fees", 2000),
      money("Stamp duty", 1500),
      money("Digital certificates", 2000),
      money("Professional fees and other costs", 5000),
    ],
    (values) => ({
      "Total registration budget (₹)": values.reduce((sum, v) => sum + v, 0),
    }),
  ),
  tool(
    "car-depreciation",
    "Car depreciation",
    "Estimate resale value under a constant reducing-balance depreciation assumption.",
    [
      money("Purchase price", 900000),
      pct("Annual depreciation", 15),
      field("Years owned", 5, 0, 100),
    ],
    ([cost, rate, years]) => ({
      "Estimated resale value (₹)": cost * (1 - rate / 100) ** years,
      "Accumulated depreciation (₹)": cost * (1 - (1 - rate / 100) ** years),
    }),
  ),
  tool(
    "einvoice-tcs",
    "E-invoice and GST TCS",
    "Estimate GST and e-commerce operator TCS for net taxable sales after returns. Enter the applicable rates for the reporting period.",
    [
      money("Taxable sales before GST", 100000),
      money("Returned taxable supplies", 5000),
      pct("GST rate", 18),
      pct("Combined TCS rate", 0.5),
    ],
    ([sales, returned, gst, tcs]) => {
      if (returned > sales)
        throw new Error("Returns exceed this example's taxable sales.");
      const net = sales - returned;
      return {
        "Net taxable supplies (₹)": net,
        "GST on net supplies (₹)": (net * gst) / 100,
        "TCS withheld (₹)": (net * tcs) / 100,
      };
    },
    "https://tutorial.gst.gov.in/userguide/returns/FAQs_GSTR-8.htm",
  ),
  tool(
    "import-duty",
    "Import duty",
    "Estimate basic customs duty, social welfare surcharge on BCD and IGST on their combined assessable base. Use your product's applicable tariff rates.",
    [
      money("Customs assessable value", 100000),
      field("Basic duty rate (%)", 10, 0, 1000),
      pct("Surcharge on basic duty", 10),
      pct("IGST rate", 18),
    ],
    ([value, rate, surcharge, gst]) => {
      const bcd = (value * rate) / 100,
        sws = (bcd * surcharge) / 100,
        igst = ((value + bcd + sws) * gst) / 100;
      return {
        "Basic duty (₹)": bcd,
        "Social welfare surcharge (₹)": sws,
        "IGST (₹)": igst,
        "Total estimated import taxes (₹)": bcd + sws + igst,
      };
    },
    "https://courier.cbic.gov.in/ECCS/PN%20Bengaluru/PN%20issued%20by%20Bangalore%20Customs%20on%20duty%20structure.pdf",
  ),
  tool(
    "working-capital",
    "Working capital",
    "Subtract short-term liabilities from cash, receivables, inventory and other current assets.",
    [
      money("Cash and liquid balances", 200000),
      money("Receivables", 300000),
      money("Inventory and other current assets", 150000),
      money("Current liabilities", 400000),
    ],
    ([cash, receivables, stock, liabilities]) => ({
      "Total current assets (₹)": cash + receivables + stock,
      "Net working capital (₹)": cash + receivables + stock - liabilities,
    }),
  ),
];
