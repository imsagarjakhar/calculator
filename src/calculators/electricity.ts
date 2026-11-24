import { field, tool } from "./model";

type Schedule = [string, number, [number | null, number][]];
const schedules: Schedule[] = [
  [
    "Andhra Pradesh",
    40,
    [
      [50, 1.45],
      [100, 3.25],
      [200, 4.85],
      [300, 7],
      [400, 8.5],
      [null, 9.5],
    ],
  ],
  [
    "Arunachal Pradesh",
    25,
    [
      [100, 2.65],
      [200, 3.4],
      [null, 4.25],
    ],
  ],
  [
    "Assam",
    20,
    [
      [30, 2],
      [100, 5.2],
      [200, 5.8],
      [300, 6.6],
      [null, 7.6],
    ],
  ],
  [
    "Bihar",
    110,
    [
      [100, 5.5],
      [200, 6.65],
      [300, 7.45],
      [null, 7.45],
    ],
  ],
  [
    "Chhattisgarh",
    50,
    [
      [30, 0],
      [100, 3.7],
      [200, 5],
      [400, 5.5],
      [null, 6],
    ],
  ],
  [
    "Goa",
    75,
    [
      [100, 1.65],
      [200, 2.65],
      [300, 3.3],
      [null, 3.6],
    ],
  ],
  [
    "Gujarat",
    50,
    [
      [50, 1.9],
      [100, 2.45],
      [250, 3.2],
      [null, 5],
    ],
  ],
  [
    "Haryana",
    40,
    [
      [50, 2.5],
      [100, 4],
      [150, 5.25],
      [250, 6.3],
      [null, 7.1],
    ],
  ],
  [
    "Himachal Pradesh",
    30,
    [
      [125, 0.5],
      [300, 3.5],
      [500, 4.25],
      [null, 5.15],
    ],
  ],
  [
    "Jharkhand",
    75,
    [
      [100, 4.65],
      [200, 5.75],
      [300, 6.55],
      [null, 7.4],
    ],
  ],
  [
    "Karnataka",
    50,
    [
      [30, 3.3],
      [100, 5.45],
      [200, 7.1],
      [500, 8.35],
      [null, 9],
    ],
  ],
  [
    "Kerala",
    35,
    [
      [40, 1.5],
      [80, 2.9],
      [120, 4.1],
      [200, 6.1],
      [300, 7.4],
      [null, 8.65],
    ],
  ],
  [
    "Madhya Pradesh",
    80,
    [
      [30, 3],
      [100, 4.35],
      [300, 5.6],
      [500, 6.15],
      [null, 6.75],
    ],
  ],
  [
    "Maharashtra",
    110,
    [
      [100, 1.53],
      [300, 6.52],
      [500, 9.09],
      [null, 10.19],
    ],
  ],
  [
    "Manipur",
    30,
    [
      [100, 3.5],
      [200, 4.5],
      [null, 5.5],
    ],
  ],
  [
    "Meghalaya",
    50,
    [
      [100, 4.2],
      [200, 5],
      [300, 6.25],
      [null, 7],
    ],
  ],
  [
    "Mizoram",
    30,
    [
      [100, 3.65],
      [200, 4.65],
      [null, 5.75],
    ],
  ],
  [
    "Nagaland",
    50,
    [
      [100, 4],
      [200, 5],
      [null, 5.85],
    ],
  ],
  [
    "Odisha",
    25,
    [
      [50, 2.4],
      [200, 4.5],
      [400, 5.5],
      [null, 6],
    ],
  ],
  [
    "Punjab",
    120,
    [
      [300, 5.65],
      [500, 6.25],
      [null, 6.98],
    ],
  ],
  [
    "Rajasthan",
    80,
    [
      [50, 4.75],
      [150, 6],
      [300, 7.25],
      [500, 8.15],
      [null, 9],
    ],
  ],
  [
    "Sikkim",
    40,
    [
      [100, 2.5],
      [200, 4],
      [null, 5.5],
    ],
  ],
  [
    "Tamil Nadu",
    30,
    [
      [100, 0],
      [200, 1.5],
      [500, 3],
      [1000, 4.5],
      [null, 6],
    ],
  ],
  [
    "Telangana",
    25,
    [
      [50, 1.45],
      [100, 3.25],
      [200, 5],
      [300, 7],
      [400, 8.5],
      [null, 9.5],
    ],
  ],
  [
    "Tripura",
    25,
    [
      [50, 2.8],
      [100, 3.85],
      [200, 4.95],
      [300, 5.55],
      [null, 6.1],
    ],
  ],
  [
    "Uttar Pradesh",
    110,
    [
      [100, 5.5],
      [150, 6],
      [300, 6.5],
      [null, 7],
    ],
  ],
  [
    "Uttarakhand",
    50,
    [
      [100, 2.5],
      [200, 4.1],
      [400, 5.55],
      [null, 6.15],
    ],
  ],
  [
    "West Bengal",
    25,
    [
      [25, 4.87],
      [75, 5.67],
      [150, 6.27],
      [250, 6.96],
      [null, 7.97],
    ],
  ],
];

export const electricity = [
  tool(
    "electricity-bill",
    "Electricity bill",
    "Use a flat or blended unit rate from your bill, or choose a state calculator for tiered rates.",
    [
      field("Monthly consumption (kWh)", 150, 0),
      field("Unit rate (₹/kWh)", 5, 0),
      field("Fixed charges (₹)", 40, 0),
      field("Other charges less subsidy (₹)", 0),
    ],
    ([units, rate, fixed, other]) => ({
      "Bill estimate (₹)": units * rate + fixed + other,
      "Energy charge (₹)": units * rate,
    }),
  ),
  ...schedules.map(([state, fixed, slabs]) => {
    const slug = state.toLowerCase().replaceAll(" ", "-");
    const labels = slabs.map(([upper], index) => {
      const lower = index ? slabs[index - 1][0]! : 0;
      return upper === null ? `Above ${lower} kWh` : `${lower}–${upper} kWh`;
    });
    return tool(
      slug + "-electricity",
      state + " electricity bill",
      "Model a monthly residential bill using FY 2025–26 example slabs. Replace sample charges with your supplier’s rates and enter any adjustments for your connection.",
      [
        field("Monthly consumption (kWh)", 150, 0),
        field("Fixed charge (₹)", fixed, 0),
        field("Duty and fees less subsidies (₹)", 0),
        ...slabs.map(([, rate], index) =>
          field(labels[index] + " (₹/kWh)", rate, 0),
        ),
      ],
      ([units, fee, adjustment, ...rates]) => {
        const breakdown: Record<string, number> = {};
        let lower = 0,
          energy = 0;
        slabs.forEach(([upper], index) => {
          const consumption = Math.max(
            0,
            Math.min(units, upper ?? units) - lower,
          );
          const cost = consumption * rates[index];
          breakdown[labels[index] + " (₹)"] = cost;
          energy += cost;
          lower = upper ?? units;
        });
        return {
          "Estimated bill (₹)": energy + fee + adjustment,
          "Total energy charges (₹)": energy,
          ...breakdown,
        };
      },
      "https://calcwise.finance/electricity-bill-calculator/" + slug + "/",
    );
  }),
];
