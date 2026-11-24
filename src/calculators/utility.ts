import { field, tool } from "./model";
import { ageCalculator, dateOffset, daysBetween, retirementAge } from "./dates";
import { electricity } from "./electricity";
import {
  costOfLiving,
  weddingBudget,
  fuelComparison,
} from "./utilityHousehold";
import { percentageModes, discountModes, unitModes } from "./utilityModes";

const amount = (label: string, value: number) => field(label, value, 0);
const positive = (label: string, value: number) =>
  field(label, value, 0.000001);
const percent = (label: string, value: number) => field(label, value, 0, 100);
const count = (label: string, value: number) => ({
  ...field(label, value, 1),
  step: 1,
});
const units = [
  ["Kilometres to miles", 1 / 1.609344],
  ["Miles to kilometres", 1.609344],
  ["Metres to feet", 1 / 0.3048],
  ["Feet to metres", 0.3048],
  ["Kilograms to pounds", 1 / 0.45359237],
  ["Pounds to kilograms", 0.45359237],
  ["Litres to US gallons", 1 / 3.785411784],
  ["US gallons to litres", 3.785411784],
  ["Square metres to square feet", 1 / 0.3048 ** 2],
  ["Acres to hectares", 0.40468564224],
  ["Celsius to Fahrenheit", 1.8],
  ["Fahrenheit to Celsius", 5 / 9],
] as const;

export const utility = [
  ageCalculator,
  dateOffset,
  daysBetween,
  {
    ...tool(
      "discount",
      "Discount calculator",
      "Work out a sale price, stack offers or find the original price.",
      [amount("Marked price (₹)", 2000), percent("Discount (%)", 15)],
      ([p, r]) => ({
        "Sale price (₹)": p * (1 - r / 100),
        "You save (₹)": (p * r) / 100,
      }),
    ),
    modes: discountModes,
  },
  {
    ...tool(
      "percentage",
      "Percentage calculator",
      "Calculate portions, percentage changes, marks, margins or reverse percentages.",
      [field("Number", 500), field("Percentage (%)", 20)],
      ([a, b]) => ({ "Percentage amount": (a * b) / 100 }),
    ),
    modes: percentageModes,
  },
  retirementAge,
  tool(
    "tip",
    "Tip and bill split",
    "Split a bill and tip equally across your group.",
    [amount("Bill (₹)", 1200), amount("Tip (%)", 10), count("People", 3)],
    ([a, b, c]) => ({
      "Per person (₹)": (a * (1 + b / 100)) / c,
      "Tip (₹)": (a * b) / 100,
      "Total bill (₹)": a * (1 + b / 100),
    }),
  ),
  {
    ...tool(
      "unit-converter",
      "Unit converter",
      "Convert distance, area, mass, volume or temperature.",
      [
        { label: "Conversion", options: units.map((x) => x[0]), value: 0 },
        field("Value", 1),
      ],
      ([i, n]) => ({
        [units[i][0].split(" to ")[1]]:
          i === 10
            ? n * 1.8 + 32
            : i === 11
              ? ((n - 32) * 5) / 9
              : n * units[i][1],
      }),
    ),
    modes: unitModes,
  },
  costOfLiving,
  tool(
    "utility-planning",
    "Household utility planner",
    "Add monthly bills and a seasonal buffer.",
    [
      amount("Power (₹)", 1800),
      amount("Water (₹)", 300),
      amount("Gas (₹)", 800),
      amount("Internet (₹)", 600),
      percent("Buffer (%)", 10),
    ],
    ([a, b, c, d, r]) => ({
      "Monthly reserve (₹)": (a + b + c + d) * (1 + r / 100),
      "Yearly reserve (₹)": 12 * (a + b + c + d) * (1 + r / 100),
    }),
  ),
  tool(
    "water-bill",
    "Water bill",
    "Estimate metered usage with a fixed charge and a per-kilolitre tariff.",
    [
      amount("Consumption (kL)", 20),
      amount("Rate (₹/kL)", 15),
      amount("Fixed charge (₹)", 100),
    ],
    ([v, r, f]) => ({ "Bill (₹)": v * r + f, "Usage charge (₹)": v * r }),
  ),
  weddingBudget,
  tool(
    "car-maintenance",
    "Car maintenance cost",
    "Spread servicing, repairs and tyre replacement over the year.",
    [
      amount("Annual service (₹)", 8000),
      amount("Annual repair reserve (₹)", 5000),
      amount("Replacement tyres (₹)", 20000),
      positive("Tyre life (years)", 4),
    ],
    ([s, r, t, y]) => ({
      "Annual cost (₹)": s + r + t / y,
      "Monthly reserve (₹)": (s + r + t / y) / 12,
    }),
  ),
  fuelComparison,
  tool(
    "toll",
    "Toll cost",
    "Add tolls for a route and multiply by the number of journeys at the same rates.",
    [
      amount("First toll (₹)", 90),
      amount("Second toll (₹)", 70),
      amount("Other tolls (₹)", 0),
      count("Journeys", 2),
    ],
    ([a, b, c, n]) => ({
      "Trip total (₹)": (a + b + c) * n,
      "One way (₹)": a + b + c,
    }),
  ),
  tool(
    "vehicle-scrappage",
    "Vehicle scrappage value",
    "Use the recycler’s recoverable weight, metal quote and collection fees.",
    [
      amount("Recoverable metal (kg)", 700),
      amount("Quote (₹/kg)", 35),
      amount("Other parts (₹)", 3000),
      amount("Collection fees (₹)", 1000),
    ],
    ([m, p, o, f]) => ({ "Net proceeds (₹)": m * p + o - f }),
  ),
  tool(
    "bmi",
    "Adult BMI",
    "Calculate body mass index from weight and height.",
    [positive("Weight (kg)", 65), positive("Height (cm)", 170)],
    ([w, h]) => ({ "BMI (kg/m²)": w / (h / 100) ** 2 }),
    "https://apps.who.int/nutrition/landscape/help.aspx?helpid=392",
  ),
  tool(
    "zakat",
    "Zakat calculator",
    "For wealth held for a full lunar year. Enter your chosen nisab using the current local metal valuation.",
    [
      amount("Eligible wealth (₹)", 300000),
      amount("Deductible debts (₹)", 25000),
      positive("Nisab threshold (₹)", 100000),
    ],
    ([w, d, n]) => ({
      "Zakat (₹)": w - d >= n ? (w - d) * 0.025 : 0,
      "Net eligible wealth (₹)": Math.max(0, w - d),
    }),
    "https://islamic-relief.org/zakat-calculator/",
  ),
  tool(
    "brokerage",
    "Intraday vs delivery brokerage",
    "Compare quoted brokerage rates on buy and sell turnover. Enter additional levies for each settlement type.",
    [
      amount("Buy turnover (₹)", 100000),
      amount("Sell turnover (₹)", 101000),
      percent("Intraday brokerage (%)", 0.03),
      percent("Delivery brokerage (%)", 0.1),
      amount("Other intraday charges (₹)", 0),
      amount("Other delivery charges (₹)", 0),
    ],
    ([b, s, i, d, x, y]) => ({
      "Intraday net profit (₹)": s - b - ((s + b) * i) / 100 - x,
      "Delivery net profit (₹)": s - b - ((s + b) * d) / 100 - y,
    }),
  ),
  tool(
    "stock-average",
    "Stock average price",
    "Combine two purchases using the number of shares as weights.",
    [
      positive("First shares", 100),
      amount("First price (₹)", 150),
      positive("Additional shares", 50),
      amount("Additional price (₹)", 120),
    ],
    ([a, b, c, d]) => ({
      "Average cost (₹/share)": (a * b + c * d) / (a + c),
      "Total cost (₹)": a * b + c * d,
      "Shares held": a + c,
    }),
  ),
  ...electricity,
];
