import { field, tool } from "./model";

const amount = (name: string, value: number) => field(name + " (₹)", value, 0);
const pct = (name: string, value: number) =>
  field(name + " (%)", value, 0, 100);
const price = amount("Agreed purchase price", 6000000);
function stamp(
  id: string,
  name: string,
  notes: string,
  baseRate: number,
  feeRate: number,
  fees: number,
  source?: string,
) {
  return tool(
    id,
    name,
    notes +
      " The estimate uses the higher of the price and assessed value. Enter the confirmed rates, local additions and concessions for your deed.",
    [
      price,
      amount("Authority-assessed market value", 6200000),
      pct("Stamp duty rate", baseRate),
      pct("Additional local duty on property value", 0),
      amount("Eligible duty concession", 0),
      pct("Registration fee rate", feeRate),
      amount("Registration fee cap (0 for uncapped)", 0),
      amount("Fixed charges", fees),
    ],
    ([
      sale,
      assessment,
      dutyRate,
      localRate,
      concession,
      regRate,
      cap,
      fixed,
    ]) => {
      const base = Math.max(sale, assessment);
      const duty = Math.max(
        0,
        (base * (dutyRate + localRate)) / 100 - concession,
      );
      const registration = Math.min((base * regRate) / 100, cap || Infinity);
      return {
        "Assessable value (₹)": base,
        "Stamp and local duty (₹)": duty,
        "Registration fee (₹)": registration,
        "Total charges (₹)": duty + registration + fixed,
      };
    },
    source,
  );
}
type DutyRates = {
  stamp: number;
  local: number;
  registration: number;
  feeCap?: number;
  feeMinimum?: number;
  feeUnit?: number;
};

function stateStamp(
  id: string,
  title: string,
  description: string,
  scenarios: string[],
  ratesFor: (scenario: number, value: number) => DutyRates,
  source: string,
) {
  const example = ratesFor(0, 6200000);
  return tool(
    id,
    title,
    description +
      " Choose Custom rates to apply the manual fields instead of a preset. Fixed charges apply in both modes.",
    [
      {
        label: "Sale deed scenario",
        options: [...scenarios, "Custom rates"],
        value: 0,
      },
      price,
      amount("Authority-assessed market value", 6200000),
      pct("Custom basic stamp duty", example.stamp),
      pct("Custom local duty as share of property value", example.local),
      pct("Custom registration rate", example.registration),
      amount("Custom registration cap (0 for uncapped)", example.feeCap ?? 0),
      amount("Custom concession", 0),
      amount("Fixed filing and service charges", 0),
    ],
    ([
      scenario,
      sale,
      assessed,
      customDuty,
      customLocal,
      customFee,
      cap,
      concession,
      fixed,
    ]) => {
      const value = Math.max(sale, assessed);
      if (value === 0)
        throw new Error("Enter a positive purchase price or assessed value.");
      const custom = scenario === scenarios.length;
      const rates: DutyRates = custom
        ? {
            stamp: customDuty,
            local: customLocal,
            registration: customFee,
            feeCap: cap || undefined,
          }
        : ratesFor(scenario, value);
      const basic = (value * rates.stamp) / 100,
        local = (value * rates.local) / 100;
      const duty = Math.max(0, basic + local - (custom ? concession : 0));
      const feeBase = rates.feeUnit
        ? Math.ceil(value / rates.feeUnit) * rates.feeUnit
        : value;
      const fee = Math.min(
        rates.feeCap ?? Infinity,
        Math.max(rates.feeMinimum ?? 0, (feeBase * rates.registration) / 100),
      );
      return {
        "Total estimated charges (₹)": duty + fee + fixed,
        "Assessable value (₹)": value,
        "Basic stamp duty rate (%)": rates.stamp,
        "Basic stamp duty (₹)": basic,
        "Local and additional duty (₹)": local,
        "Registration fee (₹)": fee,
      };
    },
    source,
  );
}

export const property = [
  tool(
    "property-appreciation",
    "Property appreciation",
    "Project a property's resale value at an assumed annual rate, before sale costs and tax.",
    [
      amount("Present property value", 6000000),
      field("Annual price change (%)", 5, -99, 100),
      field("Holding period (years)", 10, 0, 100),
    ],
    ([value, growth, years]) => ({
      "Projected property value (₹)": value * (1 + growth / 100) ** years,
      "Change in value (₹)": value * ((1 + growth / 100) ** years - 1),
    }),
  ),
  tool(
    "property-roi",
    "Property ROI and rental yield",
    "Compare net rent and sale proceeds with the all-in purchase cost for a cash purchase. Enter rent and operating expenses as annual averages.",
    [
      field("All-in purchase cost (₹)", 6000000, 0.01),
      amount("Expected sale price after selling costs", 7500000),
      amount("Annual rent collected", 240000),
      amount("Annual operating expenses", 60000),
      field("Holding period (years)", 5, 0, 100),
    ],
    ([cost, sale, rent, expense, years]) => {
      const income = rent - expense,
        gain = sale - cost + income * years;
      return {
        "Net annual rental yield (%)": (income / cost) * 100,
        "Total profit before tax (₹)": gain,
        "Total ROI (%)": (gain / cost) * 100,
      };
    },
  ),
  tool(
    "property-valuation",
    "Property valuation",
    "Estimate market value from the price per square foot of comparable sales and a location or condition adjustment.",
    [
      field("Built-up area (sq ft)", 1200, 0.01),
      amount("Comparable sale price per sq ft", 5800),
      field("Condition and location adjustment (%)", 0, -100, 300),
    ],
    ([area, price, adjust]) => ({
      "Unadjusted comparable value (₹)": area * price,
      "Adjusted estimate (₹)": area * price * (1 + adjust / 100),
    }),
  ),
  tool(
    "rent-vs-buy",
    "Rent vs buy",
    "Compare a mortgage-funded purchase with renting and investing the down payment and fees. Each month the cheaper option invests the difference. The final comparison includes home sale charges and remaining debt.",
    [
      price,
      pct("Down payment", 20),
      amount("Purchase fees", 300000),
      pct("Mortgage interest per year", 8.5),
      field("Loan term (whole years)", 20, 1, 100),
      amount("Monthly rent", 22000),
      pct("Annual rent increase", 5),
      amount("Annual ownership costs", 65000),
      pct("Annual increase in ownership costs", 4),
      field("Annual home price change (%)", 4, -99, 100),
      field("Annual investment return (%)", 7, -99, 100),
      field("Comparison period (whole years)", 10, 1, 100),
      pct("Sale charges", 2),
    ],
    ([
      cost,
      down,
      fees,
      loanRate,
      term,
      rent,
      rentGrowth,
      upkeep,
      upkeepGrowth,
      appreciation,
      ret,
      years,
      selling,
    ]) => {
      if (!Number.isInteger(years) || !Number.isInteger(term))
        throw new Error(
          "Enter whole years for the comparison and loan periods.",
        );
      const deposit = (cost * down) / 100;
      let debt = cost - deposit;
      const r = loanRate / 1200,
        months = term * 12;
      const emi =
        r === 0
          ? debt / months
          : (debt * r) / -Math.expm1(-months * Math.log1p(r));
      const investmentFactor = (1 + ret / 100) ** (1 / 12);
      let renting = deposit + fees,
        buyerSavings = 0;
      for (let month = 0; month < years * 12; month++) {
        const year = Math.floor(month / 12);
        const payment = month < months ? Math.min(emi, debt * (1 + r)) : 0;
        debt = month + 1 >= months ? 0 : Math.max(0, debt * (1 + r) - payment);
        const ownerCost =
          payment + (upkeep / 12) * (1 + upkeepGrowth / 100) ** year;
        const rentCost = rent * (1 + rentGrowth / 100) ** year;
        renting =
          renting * investmentFactor + Math.max(0, ownerCost - rentCost);
        buyerSavings =
          buyerSavings * investmentFactor + Math.max(0, rentCost - ownerCost);
      }
      const buy =
        cost * (1 + appreciation / 100) ** years * (1 - selling / 100) -
        debt +
        buyerSavings;
      return {
        "Buying terminal wealth (₹)": buy,
        "Renting terminal wealth (₹)": renting,
        "Buying advantage (₹)": buy - renting,
        "Monthly mortgage payment (₹)": emi,
        "Remaining loan at sale (₹)": debt,
      };
    },
  ),
  stamp(
    "stamp-duty-registration",
    "Stamp duty and registration charges",
    "Plan closing costs with a custom rate schedule.",
    5,
    1,
    0,
  ),
  stamp(
    "delhi-stamp-duty",
    "Delhi stamp duty",
    "Delhi Revenue lists 6% for a male buyer, 4% for a female buyer and a 1% registration fee plus ₹100 for a sale deed.",
    6,
    1,
    100,
    "https://revenue.delhi.gov.in/revenue/important-information-regarding-registration-property",
  ),
  stateStamp(
    "karnataka-stamp-duty",
    "Karnataka stamp duty",
    "Mysuru city sale deed, September 2025. Article 20(2A) first-flat rates are 2% up to ₹20 lakh, 3% up to ₹45 lakh and 5% above. The city estimate adds 10% and 2% of basic duty plus the registration fee in effect from 31 August 2025.",
    [
      "Mysuru city · first sale of flat by promoter",
      "Mysuru city · ordinary resale of flat",
    ],
    (scenario, value) => {
      const stamp =
        scenario === 1 || value > 4500000 ? 5 : value <= 2000000 ? 2 : 3;
      // Karnataka Stamp Act s.3B, Karnataka Municipal Corporations Act s.140;
      // registration fee notification RD/46/MNMU/2025 (₹20 per ₹1,000 or part).
      return { stamp, local: stamp * 0.12, registration: 2, feeUnit: 1000 };
    },
    "https://www.indiacode.nic.in/bitstream/123456789/7744/1/34_of_1957_%28e%29_30_of_2025.pdf",
  ),
  stateStamp(
    "maharashtra-stamp-duty",
    "Maharashtra stamp duty",
    "March 2026 residential sale in Brihan Mumbai's notified transport-project area. Article 25 sets 5% basic duty. Eligible women-only purchases receive a one-point reduction. Section 144F adds 1% on the property value. Registration is capped at ₹30,000.",
    [
      "Brihan Mumbai · ordinary residential sale",
      "Brihan Mumbai · eligible woman or women as sole buyers",
    ],
    (scenario) => ({
      // Mumbai Municipal Corporation Act s.144F; Revenue & Forests Dept. order of
      // 31 March 2021; CAG's Maharashtra stamp and registration manual §6.8.10.
      stamp: scenario === 1 ? 4 : 5,
      local: 1,
      registration: 1,
      feeUnit: 1000,
      feeCap: 30000,
    }),
    "https://old-lj.maharashtra.gov.in/Site/Upload/Acts/Act_No_60_of_1958_13-03-2026.pdf",
  ),
  stateStamp(
    "uttar-pradesh-stamp-duty",
    "Uttar Pradesh stamp duty",
    "August 2025 ordinary sale. A notified development area adds two points to the 5% basic duty. The eligible sole-woman preset applies the one-point concession on properties worth up to ₹1 crore. The rural preset assumes an area without a local levy. Registration is 1% with a ₹100 minimum.",
    [
      "Notified development area · ordinary sale",
      "Notified development area · eligible sole woman buyer",
      "Rural area without local levy · ordinary sale",
      "Rural area without local levy · eligible sole woman buyer",
    ],
    (scenario, value) => {
      // UP Urban Planning and Development Act §39; registration fee notification
      // of 13 February 2020; UP notification 13/2025/914 of 29 July 2025.
      const eligible = (scenario === 1 || scenario === 3) && value <= 10000000;
      return {
        stamp: eligible ? 4 : 5,
        local: scenario < 2 ? 2 : 0,
        registration: 1,
        feeMinimum: 100,
      };
    },
    "https://igrsup.gov.in/igrsup/homePage/home_getStampExemptionGO.jsp",
  ),
];
