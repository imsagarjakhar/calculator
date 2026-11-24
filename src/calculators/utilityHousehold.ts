import { field, tool, type Field } from "./model";

const rupees = (label: string, value: number) =>
  field(label + " (₹)", value, 0);
const select = (
  label: string,
  options: readonly string[],
  value = 0,
): Field => ({ label, options, value });
const quantity = (label: string, value: number, min: number, max?: number) => ({
  ...field(label, value, min, max),
  step: 1,
});
const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0);

const cities = [
  "Delhi",
  "Mumbai",
  "Bengaluru",
  "Chennai",
  "Hyderabad",
  "Pune",
  "Kolkata",
  "Ahmedabad",
];
const expenses = ["Rent", "Food", "Transport", "Utilities", "Other expenses"];
// Illustrative monthly household budgets, independently chosen for the editable examples.
const samples = [
  [18000, 7000, 2800, 3000, 5000],
  [28000, 8000, 2600, 3500, 5500],
  [22000, 7500, 3400, 2800, 5500],
  [15000, 6500, 2500, 3000, 4500],
  [16000, 6500, 2800, 2800, 4500],
  [16500, 7000, 2600, 2800, 5000],
  [12000, 6000, 2000, 2700, 4000],
  [13000, 6000, 2400, 2800, 4200],
];
const householdFactors = [
  [1, 1, 1, 1, 1],
  [0.55, 0.9, 1, 0.65, 1],
  [1.55, 2.1, 1.5, 1.6, 1.65],
];
function citySample(city: number, lifestyle: number, household: number) {
  return samples[city].map((cost, i) =>
    Math.round(
      cost * [0.8, 1, 1.4][lifestyle] * householdFactors[household][i],
    ),
  );
}
function cityFields(side: string, city: number): Field[] {
  const sample = citySample(city, 1, 0);
  return [
    select(side + " city", cities, city),
    select(side + " lifestyle", ["Economy", "Standard", "Premium"], 1),
    select(side + " household", [
      "Single",
      "Shared accommodation",
      "With family",
    ]),
    ...expenses.map((label, i) =>
      rupees(side + " monthly " + label.toLowerCase(), sample[i]),
    ),
  ];
}
export const costOfLiving = {
  ...tool(
    "cost-of-living",
    "City cost of living comparison",
    "Select two Indian cities, lifestyles and households to load illustrative budgets. Replace each expense with your own figure. Compare the take-home salary needed to preserve purchasing power and cash left after bills.",
    [
      ...cityFields("Current", 0),
      ...cityFields("Target", 1),
      rupees("Current monthly take-home salary", 80000),
      rupees("Target monthly job offer (0 to omit)", 95000),
    ],
    (values) => {
      const current = sum(values.slice(3, 8)),
        target = sum(values.slice(11, 16));
      const salary = values[16],
        offer = values[17];
      const results: Record<string, number | string> = {
        "Current monthly budget (₹)": current,
        "Target monthly budget (₹)": target,
        "Monthly cost change (₹)": target - current,
        "Equivalent salary at target prices (₹)": current
          ? (salary * target) / current
          : "Requires a positive current budget",
        "Salary to preserve cash left after bills (₹)":
          salary + target - current,
        "Current disposable income (₹)": salary - current,
      };
      if (salary > 0)
        results["Current rent share of pay (%)"] = (values[3] / salary) * 100;
      if (offer > 0) {
        results["Target disposable income (₹)"] = offer - target;
        results["Monthly disposable income change (₹)"] =
          offer - target - (salary - current);
        results["Target rent share of pay (%)"] = (values[11] / offer) * 100;
      }
      return results;
    },
  ),
  presetChanges(index: number, values: number[]) {
    const updates: Record<number, number> = {};
    const start = index < 8 ? 0 : 8;
    if (index >= start && index < start + 3)
      citySample(values[start], values[start + 1], values[start + 2]).forEach(
        (cost, i) => {
          updates[start + 3 + i] = cost;
        },
      );
    return updates;
  },
  schedule(values: number[]) {
    return {
      columns: [
        "Monthly expense",
        cities[values[0]] + " (current ₹)",
        cities[values[8]] + " (target ₹)",
        "Difference (₹)",
      ],
      rows: expenses.map((label, i) => [
        label,
        values[i + 3],
        values[i + 11],
        values[i + 11] - values[i + 3],
      ]),
    };
  },
};

const weddingCategories = [
  "Venue",
  "Catering",
  "Decor and florals",
  "Photography and video",
  "Attire",
  "Makeup and grooming",
  "Entertainment",
  "Invitations and gifts",
  "Guest hospitality",
  "Contingency",
];
const shares = [22, 30, 10, 8, 8, 3, 4, 3, 5, 7];
const cateringIndex = 15;
function weddingFigures(v: number[]) {
  const [mode, guests, ceiling, perGuest, attendanceChange] = v;
  const budget = mode === 0 ? ceiling : perGuest * guests;
  const attending = Math.max(
    0,
    Math.round(guests * (1 + attendanceChange / 100)),
  );
  const splits = v.slice(5, cateringIndex);
  if (Math.abs(sum(splits) - 100) > 0.000001)
    throw new Error("Category percentages must add up to 100.");
  const [, taxRate, plateRate, guarantee, serviceRate, counters, upgrade] =
    v.slice(cateringIndex);
  const billed = Math.max(guarantee, attending);
  const food = billed * (plateRate + counters + upgrade);
  const service = (food * serviceRate) / 100,
    tax = ((food + service) * taxRate) / 100;
  return {
    budget,
    attending,
    billed,
    food,
    service,
    tax,
    bill: food + service + tax,
    splits,
  };
}
export const weddingBudget = {
  ...tool(
    "wedding-budget",
    "Wedding budget and catering",
    "Start with a total budget or target per invited guest. Allocate 100% across categories. Model the guarantee, plate extras and attendance change, then compare the caterer's invoice with the allocation. Check GST classification and the actual rate on your quote.",
    [
      select("Budget basis", ["Total budget", "Per invited guest"]),
      quantity("Invited guests", 200, 1),
      rupees("Total budget", 1200000),
      rupees("Budget per invited guest", 6000),
      field("Expected attendance change from invitations (%)", 0, -100, 200),
      ...weddingCategories.map((name, i) =>
        field(name + " share (%)", shares[i], 0, 100),
      ),
      select("Catering GST scenario", [
        "Eligible catering outside specified premises",
        "Catering taxed at the standard rate",
      ]),
      field("GST on food and service charge (%)", 5, 0, 100),
      rupees("Base price per plate", 1100),
      quantity("Minimum guaranteed plates", 180, 0),
      field("Contractual service charge (%)", 5, 0, 100),
      rupees("Live counters per billed plate", 80),
      rupees("Menu upgrade per billed plate", 120),
    ],
    (v) => {
      const f = weddingFigures(v),
        catering = (f.budget * f.splits[1]) / 100;
      return {
        "Total planning budget (₹)": f.budget,
        "Budget per invited guest (₹)": f.budget / v[1],
        "Expected attendees": f.attending,
        "Guaranteed or attended plates billed": f.billed,
        "Catering allocation (₹)": catering,
        "Food subtotal (₹)": f.food,
        "Service charge (₹)": f.service,
        "GST (₹)": f.tax,
        "Estimated catering invoice (₹)": f.bill,
        "Catering budget remaining (₹)": catering - f.bill,
        "Budget with actual catering (₹)": f.budget - catering + f.bill,
        "All-in estimate per attendee (₹)": f.attending
          ? (f.budget - catering + f.bill) / f.attending
          : "No attendees",
      };
    },
    "https://taxinformation.cbic.gov.in/view-pdf/1010273/ENG/Notifications",
  ),
  presetChanges(index: number, v: number[]): Record<number, number> {
    return index === cateringIndex
      ? { [cateringIndex + 1]: v[index] === 0 ? 5 : 18 }
      : {};
  },
  schedule(v: number[]) {
    const f = weddingFigures(v);
    return {
      columns: ["Category", "Budget share (%)", "Allocation (₹)"],
      rows: weddingCategories.map((name, i) => [
        name,
        f.splits[i],
        (f.budget * f.splits[i]) / 100,
      ]),
    };
  },
};

const fuelCities = ["Delhi", "Mumbai", "Chennai", "Kolkata"];
const petrol = [102.12, 111.21, 107.77, 113.51],
  diesel = [95.2, 97.83, 99.55, 99.82];
const fuels = ["Petrol", "Diesel", "CNG", "Electric"];
function fuelCosts(v: number[]) {
  return [v[3] / v[4], v[5] / v[6], v[7] / v[8], v[10] / v[11]];
}
export const fuelComparison = {
  ...tool(
    "fuel",
    "Fuel cost and EV break-even",
    "Compare petrol, diesel, CNG and electric running costs at your mileage. Petrol and diesel city presets come from PPAC on 12 October 2026. CNG and charging tariffs are editable examples. Break-even covers fuel savings against the EV purchase premium.",
    [
      select("City price preset", fuelCities),
      field("Distance on a driving day (km)", 40, 0),
      quantity("Driving days per typical month", 24, 0, 31),
      field("Petrol price (₹/litre)", petrol[0], 0),
      field("Petrol mileage (km/litre)", 15, 0.001),
      field("Diesel price (₹/litre)", diesel[0], 0),
      field("Diesel mileage (km/litre)", 18, 0.001),
      field("CNG price (₹/kg)", 80, 0),
      field("CNG mileage (km/kg)", 24, 0.001),
      select("EV charging", [
        "Home charging example",
        "Public charging example",
      ]),
      field("EV tariff (₹/kWh)", 8, 0),
      field("Distance per kWh purchased (km)", 6, 0.001),
      rupees("EV purchase premium over petrol", 300000),
    ],
    (v) => {
      const costs = fuelCosts(v),
        monthly = v[1] * v[2],
        best = Math.min(...costs),
        saving = costs[0] - costs[3];
      const breakeven =
        v[12] === 0 ? 0 : saving > 0 ? v[12] / saving : undefined;
      return {
        "Lowest cost per km": fuels
          .filter((_, i) => Math.abs(costs[i] - best) < 1e-10)
          .join(" and "),
        "Lowest annual running cost (₹)": monthly * 12 * best,
        "Monthly distance (km)": monthly,
        "EV annual saving against petrol (₹)": saving * monthly * 12,
        "EV break-even distance (km)":
          breakeven ?? "No fuel savings at these rates",
        "EV break-even time (years)":
          breakeven === 0
            ? 0
            : breakeven !== undefined && monthly > 0
              ? breakeven / (monthly * 12)
              : "No payback at this usage",
      };
    },
    "https://ppac.gov.in/uploads/page-images/1791784627_PP_9_a_DailyPriceMSHSD_Metro_12.10.2026.pdf",
  ),
  presetChanges(index: number, v: number[]): Record<number, number> {
    if (index === 0) return { 3: petrol[v[0]], 5: diesel[v[0]] };
    if (index === 9) return { 10: v[9] === 0 ? 8 : 18 };
    return {};
  },
  schedule(v: number[]) {
    return {
      columns: [
        "Fuel",
        "₹ per km",
        "Driving day (₹)",
        "Typical month (₹)",
        "Year (₹)",
      ],
      rows: fuelCosts(v).map((unit, i) => [
        fuels[i],
        unit,
        unit * v[1],
        unit * v[1] * v[2],
        unit * v[1] * v[2] * 12,
      ]),
    };
  },
};
