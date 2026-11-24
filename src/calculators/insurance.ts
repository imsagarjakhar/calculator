import { field, tool } from "./model";
const privateCarPolicy =
  "https://www.newindia.co.in/assets/docs/know-more/motor/STANDARD%20FORM%20FOR%20PRIVATE%20CAR%20BASE%20PACKAGE%20POLICY.pdf";

const amount = (name: string, value: number) => field(name + " (₹)", value, 0);
const percent = (name: string, value: number) =>
  field(name + " (%)", value, 0, 100);
const gap = (need: number, available: number) => Math.max(0, need - available);
function futureContributions(amount: number, rate: number, years: number) {
  return rate === 0
    ? amount * years
    : (amount * Math.expm1(years * Math.log1p(rate))) / rate;
}
export const insurance = [
  tool(
    "human-life-value",
    "Human life value",
    "Discount the family's future annual income requirement to today's rupees, allowing for inflation and existing resources.",
    [
      amount("Annual family income requirement", 600000),
      field("Income replacement years", 20, 1, 100),
      percent("Expected annual return", 7),
      percent("Annual inflation", 5),
      amount("Debts to clear", 1500000),
      amount("Available savings and life cover", 800000),
    ],
    ([income, years, rate, inflation, debt, assets]) => {
      const ratio = (1 + inflation / 100) / (1 + rate / 100);
      const capital =
        (income / (1 + rate / 100)) *
        (ratio === 1 ? years : (1 - ratio ** years) / (1 - ratio));
      return {
        "Income replacement capital (₹)": capital,
        "Additional cover required (₹)": gap(capital + debt, assets),
      };
    },
  ),
  tool(
    "life-insurance-maturity",
    "Life insurance maturity",
    "Add contractual maturity benefits, vested bonuses and the terminal bonus from your endowment policy statement.",
    [
      amount("Guaranteed maturity benefit", 500000),
      amount("Vested bonuses", 80000),
      amount("Terminal bonus", 25000),
      amount("Outstanding loan and interest", 0),
    ],
    ([base, bonus, terminal, debt]) => ({
      "Gross maturity benefit (₹)": base + bonus + terminal,
      "Net payout (₹)": gap(base + bonus + terminal, debt),
    }),
  ),
  tool(
    "term-insurance-premium",
    "Term insurance premium",
    "Use the insurer's annual rate per ₹1 lakh for your age and term. Apply its risk loading and annual rider cost.",
    [
      amount("Sum assured", 10000000),
      amount("Annual premium per lakh of cover", 110),
      percent("Risk loading", 0),
      amount("Annual rider premium", 1000),
    ],
    ([cover, rate, loading, rider]) => ({
      "Annual premium before taxes (₹)":
        (cover / 100000) * rate * (1 + loading / 100) + rider,
    }),
  ),
  tool(
    "health-insurance-gap",
    "Health insurance gap",
    "Project the cost of one hospitalisation and compare it with usable cover after the policy co-payment.",
    [
      amount("Hospitalisation cost today", 750000),
      percent("Annual medical inflation", 8),
      field("Years ahead", 5, 0, 100),
      amount("Available insurance limit", 500000),
      percent("Policy co-payment", 10),
    ],
    ([cost, inflation, years, cover, copay]) => {
      const bill = cost * (1 + inflation / 100) ** years;
      const insurer = Math.min(cover, bill * (1 - copay / 100));
      return {
        "Projected bill (₹)": bill,
        "Insurer contribution (₹)": insurer,
        "Out-of-pocket amount (₹)": bill - insurer,
      };
    },
  ),
  tool(
    "health-insurance-premium",
    "Health insurance premium",
    "Build an annual premium from a family or individual plan quote. Enter its base rate, underwriting loading, discount and add-ons.",
    [
      amount("Quoted annual base premium", 18000),
      percent("Loading on base", 10),
      percent("Discount on loaded premium", 5),
      amount("Annual add-ons", 1500),
    ],
    ([base, loading, discount, addons]) => ({
      "Estimated annual premium before tax (₹)":
        base * (1 + loading / 100) * (1 - discount / 100) + addons,
    }),
  ),
  tool(
    "vehicle-idv",
    "Insured declared value (IDV)",
    "Apply the New India private car policy's age-based depreciation schedule. For an older or discontinued vehicle, select the agreed valuation from your insurer.",
    [
      amount("Manufacturer listed vehicle price", 900000),
      {
        label: "Vehicle age at renewal",
        value: 3,
        options: [
          "Up to 6 months",
          "Over 6 months to 1 year",
          "Over 1 to 2 years",
          "Over 2 to 3 years",
          "Over 3 to 4 years",
          "Over 4 to 5 years",
          "Over 5 years or discontinued model",
        ],
      },
      amount(
        "Agreed vehicle valuation for older or discontinued models",
        350000,
      ),
      amount("Depreciated accessory value", 12000),
    ],
    ([price, band, agreed, accessories]) => {
      const vehicle =
        band === 6 ? agreed : price * (1 - [5, 15, 20, 30, 40, 50][band] / 100);
      return {
        "Vehicle value (₹)": vehicle,
        "Insured declared value with accessories (₹)": vehicle + accessories,
      };
    },
    privateCarPolicy,
  ),
  tool(
    "motor-insurance-premium",
    "Motor insurance premium",
    "Combine the quoted own-damage rate, no-claim discount, third-party premium and add-ons.",
    [
      amount("Insured declared value", 600000),
      percent("Own-damage premium rate", 2),
      percent("No-claim discount on own damage", 20),
      amount("Third-party premium", 3500),
      amount("Add-ons and other covers", 1500),
      percent("Applicable tax", 18),
    ],
    ([idv, rate, discount, third, addons, tax]) => {
      const own = ((idv * rate) / 100) * (1 - discount / 100);
      return {
        "Own-damage premium after discount (₹)": own,
        "Annual premium including tax (₹)":
          (own + third + addons) * (1 + tax / 100),
      };
    },
  ),
  tool(
    "no-claim-bonus",
    "No-claim bonus",
    "Apply the New India private car renewal schedule using completed claim-free years. Enter the discount retained after a claim if you have NCB protection.",
    [
      amount("Own-damage base premium", 12000),
      { ...field("Consecutive full claim-free years", 3, 0, 100), step: 1 },
      percent("NCB after claim", 0),
    ],
    ([base, years, after]) => {
      const rate = [0, 20, 25, 35, 45, 50][Math.min(5, Math.floor(years))];
      return {
        "Renewal discount (%)": rate,
        "Renewal discount (₹)": (base * rate) / 100,
        "Premium increase after claim (₹)": (base * (rate - after)) / 100,
      };
    },
    privateCarPolicy,
  ),
  tool(
    "ulip-returns",
    "ULIP returns",
    "Project year-end contributions after allocation charges, assumed annual mortality charges and annual fund management charges.",
    [
      amount("Annual premium", 100000),
      percent("Premium allocation charge", 3),
      amount("Annual mortality and fixed charges", 2000),
      percent("Gross annual fund return", 8),
      percent("Annual fund management fee", 1.35),
      field("Policy years", 15, 1, 100),
    ],
    ([premium, allocation, fixed, gross, fee, years]) => {
      const contribution = premium * (1 - allocation / 100) - fixed;
      if (contribution < 0 || fee >= 100)
        throw new Error(
          "Charges must leave a positive investible balance and fund value.",
        );
      return {
        "Total premiums (₹)": premium * years,
        "Projected fund value (₹)": futureContributions(
          contribution,
          (1 + gross / 100) * (1 - fee / 100) - 1,
          years,
        ),
      };
    },
  ),
  tool(
    "ulip-surrender",
    "ULIP surrender value",
    "Estimate your discontinued fund after the charge quoted by your insurer and growth until the permitted payout date.",
    [
      amount("Current fund value", 420000),
      amount("Applicable surrender charge", 3000),
      percent("Annual discontinued fund return", 4),
      field("Years until permitted payout", 1, 0, 100),
    ],
    ([value, charge, rate, years]) => ({
      "Value after charge (₹)": gap(value, charge),
      "Projected payout (₹)": gap(value, charge) * (1 + rate / 100) ** years,
    }),
  ),
  tool(
    "ulip-mutual-fund",
    "ULIP vs mutual fund",
    "Compare equal year-end budgets using net annual returns. Deduct insurance charges from the ULIP and equivalent term cover cost from the mutual fund budget.",
    [
      amount("Annual budget", 100000),
      amount("Annual ULIP insurance and upfront charges", 4000),
      amount("Equivalent annual term premium", 6000),
      percent("ULIP annual return net of fund fees", 7),
      percent("Mutual fund annual return net of fees", 8),
      field("Years invested", 15, 1, 100),
    ],
    ([budget, ulipCost, term, ulipRate, mfRate, years]) => {
      if (Math.max(ulipCost, term) > budget)
        throw new Error(
          "The annual budget must cover both alternatives' charges.",
        );
      return {
        "ULIP fund value (₹)": futureContributions(
          budget - ulipCost,
          ulipRate / 100,
          years,
        ),
        "Mutual fund value with separate term cover (₹)": futureContributions(
          budget - term,
          mfRate / 100,
          years,
        ),
      };
    },
  ),
  tool(
    "insurance-planning",
    "Insurance planning",
    "Estimate the life cover your household needs for debts, future goals and a chosen number of years of expenses, in today's rupees.",
    [
      amount("Annual family expenses", 600000),
      field("Years to support", 15, 0, 100),
      amount("Debts and future goals", 3000000),
      amount("Liquid assets", 1000000),
      amount("Existing life cover", 3000000),
    ],
    ([expenses, years, debt, assets, cover]) => ({
      "Total family capital need (₹)": expenses * years + debt,
      "Additional life cover (₹)": gap(expenses * years + debt, assets + cover),
    }),
  ),
  tool(
    "integrated-insurance-optimizer",
    "Integrated insurance budget",
    "Allocate the annual insurance budget to health cover first, then purchase as much of the life cover gap as the remaining budget allows at your quoted rate.",
    [
      amount("Annual premium budget", 36000),
      amount("Annual health premium", 18000),
      amount("Life cover gap", 10000000),
      field("Annual term premium per lakh (₹)", 150, 0.01),
    ],
    ([budget, health, need, rate]) => {
      const life = Math.min(need, (gap(budget, health) / rate) * 100000);
      return {
        "Affordable additional life cover (₹)": life,
        "Remaining life cover gap (₹)": need - life,
        "Health premium funding gap (₹)": gap(health, budget),
      };
    },
  ),
  tool(
    "travel-insurance-premium",
    "Travel insurance premium",
    "Estimate a trip premium using the insurer's destination-specific daily price, number of travellers and trip-level extras.",
    [
      amount("Daily premium per traveller", 150),
      field("Travel days", 10, 1, 3660),
      field("Number of travellers", 2, 1, 1000),
      amount("Extras for the whole trip", 500),
    ],
    ([rate, days, people, extras]) => ({
      "Estimated trip premium before tax (₹)": rate * days * people + extras,
    }),
  ),
];
