import type { PlannerRoute } from "../runtime/routes";
import { payment } from "../loans/model.ts";
export type Topic = "sip" | "swp" | "return" | "inflation" | "emi";
export const lessons: Record<
  Topic,
  {
    name: string;
    full: string;
    title: string;
    explanation: string;
    analogy: string;
    amountLabel: string;
    resultLabel: string;
    route: PlannerRoute;
    question: string;
    answers: string[];
    correct: number;
    feedback: string;
  }
> = {
  sip: {
    name: "SIP",
    full: "Systematic Investment Plan",
    title: "A little, again and again.",
    explanation:
      "A SIP is a way to invest a fixed amount regularly, often each month. It is a habit for adding money—not a product or a promised return.",
    analogy:
      "Think of adding a scoop to a jar every month. The scoops are yours; investment growth can add to them, but losses can reduce the jar too.",
    amountLabel: "Add each month",
    resultLabel: "Investment value",
    route: "growth",
    question: "Does a SIP guarantee a profit?",
    answers: [
      "Yes, because it is monthly",
      "No, the investment can lose value",
      "Only after one year",
    ],
    correct: 1,
    feedback:
      "Regular deposits do not remove investment risk. The return depends on what you invest in.",
  },
  swp: {
    name: "SWP",
    full: "Systematic Withdrawal Plan",
    title: "Take a little from your pot.",
    explanation:
      "An SWP lets you withdraw from an investment regularly. The payment may include your own savings, not just growth.",
    analogy:
      "Imagine taking a scoop out of a jar each month. If you take out more than the jar gains, the amount left gets smaller.",
    amountLabel: "Starting investment pot",
    resultLabel: "Money left",
    route: "survival",
    question: "Where can an SWP payment come from?",
    answers: [
      "Only guaranteed interest",
      "Only dividends",
      "Growth and your original savings",
    ],
    correct: 2,
    feedback:
      "A withdrawal can use your original investment. It is not the same as receiving guaranteed interest.",
  },
  return: {
    name: "Return",
    full: "Investment gain or loss",
    title: "What changed, beyond what you added?",
    explanation:
      "Return is the gain or loss on your investment. A positive return adds value; a negative return takes value away.",
    analogy:
      "Plant one seed, then watch what grows. Putting in another seed is a contribution. Growth from the first seed is a return.",
    amountLabel: "Invest once",
    resultLabel: "Investment value",
    route: "growth",
    question: "You add money to an investment. Is that extra money a return?",
    answers: [
      "No, it is a contribution",
      "Yes, it is always profit",
      "Only when it is monthly",
    ],
    correct: 0,
    feedback:
      "Your deposits and your investment’s gains are different. Keeping them separate helps you understand performance.",
  },
  inflation: {
    name: "Inflation",
    full: "Rising prices over time",
    title: "The same basket can cost more.",
    explanation:
      "Inflation means prices generally rise. Your money may buy less, even if the number in your bank account stays the same.",
    analogy:
      "Picture the same grocery basket today and years from now. The items stay the same in this example; the price tag changes.",
    amountLabel: "Basket price today",
    resultLabel: "Future basket price",
    route: "freedom",
    question: "If prices rise but your savings stay flat, what changes?",
    answers: [
      "Your savings buy more",
      "Your savings buy less",
      "Nothing changes",
    ],
    correct: 1,
    feedback:
      "The account balance is unchanged, but its purchasing power falls. This is why planners show today’s money and future money.",
  },
  emi: {
    name: "EMI",
    full: "Equated Monthly Instalment",
    title: "One payment. Two jobs.",
    explanation:
      "An EMI is a regular loan payment. Part pays the lender’s interest; the rest reduces the money you still owe.",
    analogy:
      "Think of paying a rental fee for borrowed money while also returning the money itself. Interest is the fee; principal is what you borrowed.",
    amountLabel: "Amount borrowed",
    resultLabel: "Loan balance",
    route: "loan-payoff",
    question: "Does your entire EMI reduce the amount borrowed?",
    answers: [
      "Yes, every part does",
      "No, some pays interest",
      "Only the first payment does",
    ],
    correct: 1,
    feedback:
      "The principal part reduces the loan. The interest part pays the borrowing cost. Extra payments may reduce future interest, subject to lender terms.",
  },
};
export type LessonSettings = {
  amount: number;
  rate: number;
  years: number;
  withdrawal: number;
};
export const lessonDefaults: Record<Topic, LessonSettings> = {
  sip: { amount: 1000, rate: 8, years: 5, withdrawal: 1000 },
  swp: { amount: 100000, rate: 0, years: 10, withdrawal: 1000 },
  return: { amount: 10000, rate: 5, years: 5, withdrawal: 1000 },
  inflation: { amount: 100, rate: 6, years: 5, withdrawal: 1000 },
  emi: { amount: 10000, rate: 12, years: 3, withdrawal: 1000 },
};
export function lessonTimeline(topic: Topic, s: LessonSettings) {
  const months = s.years * 12;
  let balance = topic === "sip" ? 0 : s.amount,
    added = topic === "sip" ? 0 : s.amount,
    withdrawn = 0,
    interest = 0;
  const emi =
    topic === "emi"
      ? payment({
          id: "demo",
          name: "Demo",
          balance: s.amount,
          rate: s.rate,
          months,
          emi: 0,
          fee: 0,
          lock: 0,
          taxRelief: 0,
        })
      : 0;
  const rows = [{ month: 0, balance, added, withdrawn, interest }];
  for (let month = 1; month <= months; month++) {
    const growth = (balance * s.rate) / 1200;
    if (topic === "inflation")
      balance = s.amount * Math.pow(1 + s.rate / 100, month / 12);
    else if (topic === "sip") {
      balance += growth + s.amount;
      added += s.amount;
    } else if (topic === "return") balance += growth;
    else if (topic === "swp") {
      const available = Math.max(0, balance + growth);
      const draw = Math.min(available, s.withdrawal);
      balance = available - draw;
      withdrawn += draw;
    } else {
      const paid = Math.min(balance + growth, emi);
      balance = Math.max(0, balance + growth - paid);
      interest += growth;
      withdrawn += paid;
    }
    if (Math.abs(balance) < 1e-7) balance = 0;
    rows.push({ month, balance, added, withdrawn, interest });
  }
  return { rows, emi };
}

export const categories = [
  "All terms",
  "Everyday money",
  "Investing",
  "Loans",
  "Retirement",
] as const;
export type Category = (typeof categories)[number];
type Term = {
  name: string;
  full?: string;
  category: Category;
  meaning: string;
  example: (m: (n: number) => string) => string;
  route: PlannerRoute;
};
export const terms: Term[] = [
  {
    name: "SIP",
    full: "Systematic Investment Plan",
    category: "Investing",
    meaning: "Investing an amount regularly rather than all at once.",
    example: (m) => `Adding ${m(1000)} each month is a monthly SIP.`,
    route: "growth",
  },
  {
    name: "SWP",
    full: "Systematic Withdrawal Plan",
    category: "Retirement",
    meaning:
      "Taking money out of an investment at regular intervals. It can use up your original savings.",
    example: (m) => `Withdrawing ${m(500)} each month from a fund is an SWP.`,
    route: "survival",
  },
  {
    name: "Return",
    category: "Investing",
    meaning:
      "An investment’s gain or loss, separate from the money you put in.",
    example: (m) =>
      `${m(1000)} becoming ${m(1100)} without deposits or withdrawals is a 10% gain.`,
    route: "growth",
  },
  {
    name: "Expected return",
    category: "Investing",
    meaning:
      "The return you assume in a projection. It is a guess for planning, not a promise.",
    example: () =>
      "An 8% assumption draws a smooth illustration. Real market results vary.",
    route: "growth",
  },
  {
    name: "Compounding",
    category: "Investing",
    meaning:
      "Growth on your original money and on earlier growth that stays invested.",
    example: (m) =>
      `At 10% a year, ${m(1000)} becomes ${m(1100)}, then ${m(1210)} after two years.`,
    route: "growth",
  },
  {
    name: "Inflation",
    category: "Everyday money",
    meaning:
      "A general increase in prices that reduces what the same money can buy.",
    example: (m) =>
      `At 5% inflation, a ${m(100)} basket costs ${m(105)} one year later.`,
    route: "freedom",
  },
  {
    name: "Purchasing power",
    category: "Everyday money",
    meaning:
      "How much your money can buy. A higher balance does not always mean you can afford more.",
    example: () =>
      "If your money grows 3% but prices rise 5%, it buys less than before.",
    route: "freedom",
  },
  {
    name: "Today’s money / future money",
    category: "Retirement",
    meaning:
      "Today’s money describes purchasing power now. Future money is the amount paid at a later date.",
    example: (m) =>
      `${m(1000)} of today’s living costs needs a larger future amount if prices rise.`,
    route: "freedom",
  },
  {
    name: "Corpus",
    category: "Retirement",
    meaning: "Your accumulated investment pot or savings balance.",
    example: (m) =>
      `Savings of ${m(20000)} plus investments of ${m(80000)} make a ${m(100000)} corpus.`,
    route: "survival",
  },
  {
    name: "EMI",
    full: "Equated Monthly Instalment",
    category: "Loans",
    meaning:
      "A regular loan payment covering interest and repayment of the borrowed money.",
    example: (m) =>
      `A ${m(1000)} EMI could include ${m(200)} interest and ${m(800)} principal.`,
    route: "loan-payoff",
  },
  {
    name: "Principal",
    category: "Loans",
    meaning:
      "The borrowed amount still to repay, or the original amount invested, depending on context.",
    example: (m) =>
      `If you borrow ${m(10000)}, that starts as your loan principal.`,
    route: "loan-payoff",
  },
  {
    name: "Interest",
    category: "Loans",
    meaning:
      "The cost of borrowing money, or money earned on certain savings. Check which context applies.",
    example: (m) =>
      `A 10% yearly charge on an unchanged ${m(1000)} balance is ${m(100)} before other charges.`,
    route: "loan-payoff",
  },
  {
    name: "Outstanding balance",
    category: "Loans",
    meaning: "The amount of loan principal you still owe at a point in time.",
    example: (m) =>
      `After repaying ${m(2000)} principal on a ${m(10000)} loan, ${m(8000)} remains.`,
    route: "loan-payoff",
  },
  {
    name: "Loan tenure / term",
    category: "Loans",
    meaning:
      "The time scheduled to repay a loan. A longer term can mean lower payments but more total interest.",
    example: () => "A three-year monthly loan has 36 scheduled payments.",
    route: "loan-payoff",
  },
  {
    name: "Amortization",
    category: "Loans",
    meaning:
      "The process of paying a loan down over time through principal and interest payments.",
    example: () =>
      "A payment schedule shows the interest, principal and remaining debt for each month.",
    route: "loan-payoff",
  },
  {
    name: "Prepayment",
    category: "Loans",
    meaning:
      "Paying part or all of a loan earlier than scheduled. Lenders may have fees or restrictions.",
    example: (m) =>
      `Paying an extra ${m(5000)} toward principal is a prepayment.`,
    route: "loan-payoff",
  },
  {
    name: "Lock-in period",
    category: "Loans",
    meaning:
      "A period when specified actions, such as an extra loan payment or investment withdrawal, may be restricted.",
    example: () =>
      "A 12-month prepayment lock means this app delays optional extra repayments during those months.",
    route: "loan-payoff",
  },
  {
    name: "Avalanche / snowball",
    category: "Loans",
    meaning:
      "Two repayment orders: highest interest first, or smallest balance first. Required payments continue on every loan.",
    example: () =>
      "Avalanche targets borrowing cost; snowball targets closing small balances first.",
    route: "loan-payoff",
  },
  {
    name: "Take-home salary",
    category: "Everyday money",
    meaning:
      "Pay that reaches you after payroll deductions, rather than your headline salary.",
    example: (m) =>
      `If ${m(5000)} reaches your account after deductions, budget from that amount.`,
    route: "salary-budget",
  },
  {
    name: "Budget",
    category: "Everyday money",
    meaning:
      "A plan for where your income goes: spending, upcoming bills and saving.",
    example: (m) =>
      `Allocate ${m(5000)} income across living costs, bills and goals.`,
    route: "salary-budget",
  },
  {
    name: "Cash flow",
    category: "Everyday money",
    meaning: "Money coming in and going out during a period.",
    example: (m) =>
      `${m(5000)} coming in minus ${m(4000)} going out leaves ${m(1000)}.`,
    route: "salary-budget",
  },
  {
    name: "Emergency fund",
    category: "Everyday money",
    meaning:
      "Accessible savings for unexpected essential costs or a loss of income.",
    example: (m) =>
      `Three months of ${m(2000)} essential costs gives a ${m(6000)} illustrative target.`,
    route: "salary-budget",
  },
  {
    name: "Cash buffer",
    category: "Everyday money",
    meaning:
      "Money kept unassigned for small surprises in your monthly budget.",
    example: (m) =>
      `Keep ${m(100)} aside instead of investing every available amount.`,
    route: "salary-budget",
  },
  {
    name: "Bill reserve",
    category: "Everyday money",
    meaning: "Money set aside gradually for a known upcoming payment.",
    example: (m) =>
      `A ${m(1200)} bill due in 12 months needs ${m(100)} a month if nothing is saved yet.`,
    route: "salary-budget",
  },
  {
    name: "Shortfall",
    category: "Everyday money",
    meaning:
      "The part of a spending or savings plan that available money cannot cover.",
    example: (m) =>
      `Income of ${m(5000)} with ${m(5300)} allocated creates a ${m(300)} shortfall.`,
    route: "salary-budget",
  },
  {
    name: "Asset / liability",
    category: "Everyday money",
    meaning:
      "An asset is something you own with value. A liability is something you owe.",
    example: () =>
      "An owned property is an asset; its outstanding mortgage is a liability.",
    route: "custom-plan",
  },
  {
    name: "Net wealth / net worth",
    category: "Everyday money",
    meaning: "The value of what you own minus what you owe.",
    example: (m) =>
      `${m(50000)} in assets minus ${m(20000)} debt gives ${m(30000)} net worth.`,
    route: "custom-plan",
  },
  {
    name: "Lump sum",
    category: "Investing",
    meaning:
      "A single amount invested or paid at once, rather than a recurring contribution.",
    example: (m) => `Investing a ${m(5000)} bonus once is a lump sum.`,
    route: "custom-plan",
  },
  {
    name: "Step-up",
    category: "Investing",
    meaning: "An increase in your regular investment over time.",
    example: (m) =>
      `A 10% annual step-up changes a ${m(1000)} monthly SIP to ${m(1100)} in year two.`,
    route: "growth",
  },
  {
    name: "Mutual fund",
    category: "Investing",
    meaning:
      "A pooled investment that holds assets on behalf of many investors. Returns and risks depend on its holdings.",
    example: () =>
      "An equity fund mainly holds shares; a debt fund mainly holds debt instruments.",
    route: "growth",
  },
  {
    name: "Equity / debt investments",
    category: "Investing",
    meaning:
      "Equity usually means ownership shares. Debt investments involve lending money to an issuer.",
    example: () =>
      "Company shares are equity; a bond is debt. Both carry risks.",
    route: "custom-plan",
  },
  {
    name: "FD",
    full: "Fixed deposit",
    category: "Investing",
    meaning:
      "Money deposited for an agreed term and interest arrangement. Early withdrawal conditions and protection vary.",
    example: () =>
      "A one-year deposit has a specified maturity date. Check the provider’s terms.",
    route: "growth",
  },
  {
    name: "Diversification",
    category: "Investing",
    meaning:
      "Spreading investments across different holdings to reduce concentration in one risk. It cannot prevent every loss.",
    example: () =>
      "Holding several sectors spreads exposure compared with owning only one company.",
    route: "custom-plan",
  },
  {
    name: "Risk / volatility",
    category: "Investing",
    meaning:
      "Risk includes possible loss or missing a goal. Volatility describes how much prices fluctuate.",
    example: () =>
      "An investment can move up and down sharply even when you plan to hold it for years.",
    route: "growth",
  },
  {
    name: "CAGR",
    full: "Compound Annual Growth Rate",
    category: "Investing",
    meaning:
      "The smooth yearly growth rate connecting a starting and ending value, without intervening cash flows.",
    example: (m) =>
      `${m(1000)} growing to ${m(1210)} in two years has a 10% CAGR, even if the yearly path varied.`,
    route: "growth",
  },
  {
    name: "XIRR",
    full: "Extended Internal Rate of Return",
    category: "Investing",
    meaning:
      "An annualized rate based on dated deposits, withdrawals and ending value. Some cash flows can have no unique answer.",
    example: () =>
      "Investments on different dates need more than a simple gain percentage to compare performance.",
    route: "custom-plan",
  },
  {
    name: "Liquidity",
    category: "Investing",
    meaning:
      "How readily an asset can be turned into spendable money, considering time, costs and restrictions.",
    example: () =>
      "Cash is usually easier to spend quickly than selling a property.",
    route: "custom-plan",
  },
  {
    name: "Fees / capital gains tax",
    category: "Investing",
    meaning:
      "Fees pay for services. Capital gains tax may apply to a profit when an asset is sold; rules depend on your situation.",
    example: (m) =>
      `A gain is not all yours to spend if charges or tax apply to it.`,
    route: "loan-payoff",
  },
  {
    name: "Withdrawal rate",
    category: "Retirement",
    meaning:
      "The yearly amount taken from a corpus, expressed as a percentage. It is separate from the investment return.",
    example: (m) =>
      `3% of ${m(100000)} is ${m(3000)} a year, or ${m(250)} a month initially.`,
    route: "freedom",
  },
  {
    name: "Retirement buckets / refill",
    category: "Retirement",
    meaning:
      "Separate pots for near-term spending, emergencies and longer-term investing. A refill moves money between pots.",
    example: () =>
      "Moving money from growth investments to living costs is a transfer, not new income.",
    route: "bucket-plan",
  },
  {
    name: "Sequence risk",
    category: "Retirement",
    meaning:
      "The order of gains and losses can change how long savings last when you withdraw money.",
    example: () =>
      "Losses early in retirement can be harder to recover from while money is also being withdrawn.",
    route: "survival",
  },
  {
    name: "Projection / time horizon",
    category: "Investing",
    meaning:
      "A projection is a what-if calculation. The time horizon is how far into the future it looks.",
    example: () =>
      "A ten-year chart shows the entered assumptions over ten years; it is not a market forecast.",
    route: "growth",
  },
];
