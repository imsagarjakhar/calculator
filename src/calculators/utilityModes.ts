import { field, type Calculator } from "./model";

type Mode = Pick<Calculator, "title" | "fields" | "calculate">;
function conversion(title: string, units: Record<string, number>): Mode {
  const names = Object.keys(units),
    factors = Object.values(units);
  return mode(
    title,
    [
      field("Quantity", 1),
      { label: "From unit", value: 0, options: names },
      { label: "To unit", value: 1, options: names },
    ],
    ([quantity, from, to]) => ({
      [names[to]]: (quantity * factors[from]) / factors[to],
    }),
  );
}
export const unitModes: Mode[] = [
  conversion("Length", {
    Metres: 1,
    Centimetres: 0.01,
    Kilometres: 1000,
    Miles: 1609.344,
    Feet: 0.3048,
    Inches: 0.0254,
    Yards: 0.9144,
  }),
  conversion("Mass", {
    Grams: 1,
    Kilograms: 1000,
    Pounds: 453.59237,
    Ounces: 28.349523125,
    Quintals: 100000,
    "Metric tonnes": 1000000,
  }),
  conversion("Area", {
    "Square metres": 1,
    "Square feet": 0.3048 ** 2,
    "Square yards": 0.9144 ** 2,
    Acres: 4046.8564224,
    Hectares: 10000,
    Cents: 40.468564224,
  }),
  conversion("Volume", {
    Litres: 1,
    Millilitres: 0.001,
    "Cubic metres": 1000,
    "US gallons": 3.785411784,
    "US cups": 0.2365882365,
    "US tablespoons": 0.01478676478125,
  }),
  conversion("Speed", {
    "Kilometres/hour": 1,
    "Miles/hour": 1.609344,
    "Metres/second": 3.6,
    Knots: 1.852,
  }),
  conversion("Pressure", {
    Pascals: 1,
    Kilopascals: 1000,
    Bar: 100000,
    "Standard atmospheres": 101325,
    "Pounds per square inch": 6894.757293168,
  }),
  mode(
    "Temperature",
    [
      field("Temperature", 20),
      {
        label: "From unit",
        value: 0,
        options: ["Celsius", "Fahrenheit", "Kelvin"],
      },
    ],
    ([value, from]) => {
      const c =
        from === 0
          ? value
          : from === 1
            ? ((value - 32) * 5) / 9
            : value - 273.15;
      if (c < -273.15) throw Error("Temperature falls below absolute zero.");
      return { Celsius: c, Fahrenheit: c * 1.8 + 32, Kelvin: c + 273.15 };
    },
  ),
  mode(
    "Gold weight and value",
    [
      field("Weight (grams)", 10, 0),
      field("Purity (karats)", 22, 0, 24),
      field("Quoted fine gold price (₹/gram)", 8000, 0),
    ],
    ([g, k, p]) => ({
      "Metal value (₹)": ((g * k) / 24) * p,
      "Fine gold (g)": (g * k) / 24,
      "Gross troy ounces": g / 31.1034768,
    }),
  ),
  mode(
    "Land area and local units",
    [
      field("Plot length (ft)", 60, 0),
      field("Plot width (ft)", 40, 0),
      field("Local square feet per bigha", 27000, 0.01),
      field("Local square feet per katha", 1350, 0.01),
    ],
    ([l, w, b, k]) => ({
      "Plot area (ft²)": l * w,
      Acres: (l * w) / 43560,
      Bigha: (l * w) / b,
      Katha: (l * w) / k,
    }),
  ),
];
const number = (title: string, value: number) => field(title, value);
const money = (title: string, value: number) => field(title + " (₹)", value, 0);
const pct = (title: string, value: number, max = 100) =>
  field(title + " (%)", value, 0, max);
function mode(
  title: string,
  fields: Calculator["fields"],
  calculate: Calculator["calculate"],
): Mode {
  return { title, fields, calculate };
}
export const percentageModes: Mode[] = [
  mode(
    "One number as a percentage of another",
    [number("Part", 25), number("Whole", 200)],
    ([a, b]) => {
      if (b === 0)
        throw Error("The whole must be nonzero to calculate a share.");
      return { "Share (%)": (100 * a) / b };
    },
  ),
  mode(
    "Percentage change",
    [number("Original value", 200), number("New value", 250)],
    ([a, b]) => ({
      "Change (%)":
        a === 0 ? "Undefined for a zero starting value" : ((b - a) / a) * 100,
      "Absolute change": b - a,
    }),
  ),
  mode(
    "Value after a percentage change",
    [number("Original value", 500), number("Signed change (%)", -10)],
    ([a, b]) => ({ "New value": a * (1 + b / 100) }),
  ),
  mode(
    "Recover the original value",
    [number("Final value", 450), number("Signed change (%)", -10)],
    ([a, b]) => {
      if (b === -100)
        throw Error(
          "A 100% decrease leaves zero and cannot determine the original value.",
        );
      return { "Original value": a / (1 + b / 100) };
    },
  ),
  mode(
    "Convert CGPA to percentage",
    [
      field("CGPA", 8, 0, 10),
      field("Institution’s conversion multiplier", 9.5, 0.01),
    ],
    ([a, b]) => ({ "Percentage (%)": a * b }),
  ),
  mode(
    "Remove included GST",
    [money("Tax-inclusive price", 1180), pct("GST rate", 18)],
    ([p, r]) => ({
      "Price before GST (₹)": p / (1 + r / 100),
      "GST portion (₹)": p - p / (1 + r / 100),
    }),
  ),
  mode(
    "Marks percentage",
    [field("Marks earned", 75, 0), field("Maximum marks", 100, 0.01)],
    ([a, b]) => {
      if (a > b) throw Error("Earned marks exceed the maximum.");
      return { "Score (%)": (100 * a) / b };
    },
  ),
  mode(
    "Markup and margin",
    [field("Unit cost (₹)", 80, 0.01), field("Selling price (₹)", 100, 0.01)],
    ([a, b]) => ({
      "Markup on cost (%)": (100 * (b - a)) / a,
      "Margin on sales (%)": (100 * (b - a)) / b,
    }),
  ),
];
export const discountModes: Mode[] = [
  mode(
    "Stack two discounts",
    [
      money("Original price", 2000),
      pct("First discount", 20),
      pct("Additional discount", 10),
    ],
    ([a, b, c]) => ({
      "Final price (₹)": a * (1 - b / 100) * (1 - c / 100),
      "Effective discount (%)": 100 * (1 - (1 - b / 100) * (1 - c / 100)),
    }),
  ),
  mode(
    "Add GST after a discount",
    [
      money("Original price before GST", 1000),
      pct("Discount", 10),
      pct("GST", 18),
    ],
    ([a, b, c]) => ({
      "Final price (₹)": a * (1 - b / 100) * (1 + c / 100),
      "GST (₹)": (a * (1 - b / 100) * c) / 100,
    }),
  ),
  mode(
    "Buy X, get Y free",
    [
      { ...field("Paid items", 2, 1), step: 1 },
      { ...field("Free items", 1, 0), step: 1 },
      money("Price per item", 100),
    ],
    ([a, b, p]) => ({
      "Effective discount (%)": (b / (a + b)) * 100,
      "Total paid (₹)": a * p,
      "Effective price per item (₹)": (a * p) / (a + b),
    }),
  ),
  mode(
    "Find the original price",
    [money("Final price", 1600), pct("Discount", 20, 99.99999)],
    ([a, b]) => ({ "Original price (₹)": a / (1 - b / 100) }),
  ),
  mode(
    "Find the discount rate",
    [field("Original price (₹)", 2000, 0.01), money("Sale price", 1600)],
    ([a, b]) => ({ "Discount (%)": ((a - b) / a) * 100, "Savings (₹)": a - b }),
  ),
];
