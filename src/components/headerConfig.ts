function reactHeader(kind: string, title: string, description: string) {
  return {
    eyebrow: `Financial AI Planner / ${kind === "budget" ? "SALARY & BUDGET" : "LOAN PAYOFF"}`,

    title,
    description,
    currencyId: `${kind}-currency`,
    currencyForm: null,

    currencyDescription: null,
    note: "Amounts keep their values. No currency conversion.",

    details:
      "Enter all amounts in your selected currency. Changing currency updates labels throughout this plan; it does not convert amounts.",

    detailsId: null,

    buttons: [
      {
        id: `${kind}-import`,
        text: "Import report",
        title: "Import an original HTML report or saved JSON plan",
        description: null,
      },

      {
        id: `${kind}-report`,
        text: "Download report",
        title: null,
        description: null,
      },

      {
        id: `${kind}-reset`,
        text: "Reset",
        title: "Restore the example plan",
        description: null,
      },

      { id: `${kind}-json`, text: "Save JSON", title: null, description: null },
    ],

    fileId: `${kind}-file`,
    statuses: [],
    resetNote: null,
  };
}

export function budgetHeading(currency = "INR") {
  const names: Record<string, string> = {
    INR: "rupee",
    USD: "dollar",
    SAR: "Saudi riyal",
    AED: "UAE dirham",
    EUR: "euro",
    GBP: "pound",
  };
  return `A place for every ${names[currency] ?? "amount"}. A plan for what’s next.`;
}

export const headerConfig = {
  budget: reactHeader(
    "budget",
    budgetHeading(),
    "Give your salary a purpose, make room for life, and see what a year of investing could become.",
  ),

  loan: reactHeader(
    "loan",
    "Pay it down. Or build it up?",
    "Your loans, one repayment budget. See how extra payments, spare savings and rental assets change debt and net wealth.",
  ),

  growth: {
    eyebrow: "Financial AI Planner / GROWTH PLANNER",

    title: "From your salary to your goal",

    description:
      "Existing assets, monthly investments and life expenses—all in one plan.",

    currencyId: "currency",

    currencyForm: null,

    currencyDescription: null,

    note: "Changing currency resets SIP, goal and extra deposits.",

    details:
      "Assets, loans and life expenses use separate saved lists for each currency. Changing currency resets the SIP and goal amounts and clears extra deposits; no exchange-rate conversion is applied.",

    detailsId: null,

    buttons: [
      {
        id: "growthImport",

        text: "Import report",

        title: "Import an original HTML report or saved JSON plan",

        description: null,
      },

      {
        id: "growthReport",

        text: "Download report",

        title: null,

        description: null,
      },

      {
        id: "reset",

        text: "Reset",

        title:
          "Restore Growth defaults and clear Growth assets, loans, extras and life expenses",

        description: null,
      },
    ],

    fileId: "growthImportFile",

    statuses: [
      {
        id: "growthImportStatus",

        text: "",
      },

      {
        id: "growthReportStatus",

        text: "",
      },
    ],

    resetNote: null,
  },

  custom: {
    eyebrow: "Financial AI Planner / CUSTOM PLAN",

    title: "Your money, month by month",

    description:
      "Plan your investments and loans. Record each contribution and see where it takes you.",

    currencyId: "currency",

    currencyForm: "settingsForm",

    currencyDescription: "currencyNote",

    note: "Amounts keep their values. No currency conversion.",

    details:
      "Currency changes apply instantly to the whole plan. Enter all values in the selected currency; no exchange-rate conversion is applied. Unfinished asset, loan and transaction forms remain available.",

    detailsId: "currencyNote",

    buttons: [
      {
        id: "importButton",

        text: "Import report",

        title: "Import an original HTML report or saved JSON plan",

        description: null,
      },

      {
        id: "exportReport",

        text: "Download report",

        title: null,

        description: null,
      },

      {
        id: "resetPlan",

        text: "Reset",

        title:
          "Restore the default 20,000 monthly SIP and clear Custom Plan loans, extras and transactions",

        description: null,
      },

      {
        id: "copyGrowth",

        text: "Copy Growth setup",

        title: null,

        description: null,
      },

      {
        id: "exportPlan",

        text: "Save JSON",

        title: null,

        description: null,
      },
    ],

    fileId: "importFile",

    statuses: [],

    resetNote: null,
  },

  freedom: {
    eyebrow: "Financial AI Planner / FINANCIAL FREEDOM",

    title: "When could you be financially free?",

    description:
      "Set your monthly investments and the income you want. Explore when your savings could support it.",

    currencyId: "f-currency",

    currencyForm: null,

    currencyDescription: null,

    note: "Amounts keep their values. No currency conversion.",

    details:
      "Enter assumptions directly in the selected currency. Each currency has a separate future-expense list. No exchange-rate conversion is applied.",

    detailsId: null,

    buttons: [
      {
        id: "freedomImport",

        text: "Import report",

        title: "Import an original HTML report or saved JSON plan",

        description: null,
      },

      {
        id: "freedomReport",

        text: "Download report",

        title: null,

        description: null,
      },

      {
        id: "freedomResetTop",

        text: "Reset",

        title: null,

        description: "freedomResetNote",
      },
    ],

    fileId: "freedomImportFile",

    statuses: [
      {
        id: "freedomImportStatus",

        text: "",
      },

      {
        id: "freedomReportStatus",

        text: "",
      },
    ],

    resetNote: {
      id: "freedomResetNote",

      text: "Reset restores inputs and keeps saved future expenses.",
    },
  },

  bucket: {
    eyebrow: "Financial AI Planner / RETIREMENT BUCKETS",

    title: "One retirement.Three purposeful buckets.",

    description:
      "Spend from the first, keep a reserve in the second, and let the third fund the years ahead.",

    currencyId: "b-currency",

    currencyForm: null,

    currencyDescription: null,

    note: "Amounts keep their values. No currency conversion.",

    details:
      "Currency changes the unit for this entire plan without converting amounts. Your bucket plan saves separately from the other calculators.",

    detailsId: null,

    buttons: [
      {
        id: "bucketImport",

        text: "Import report",

        title: "Import an original HTML report or saved JSON plan",

        description: null,
      },

      {
        id: "bucketReport",

        text: "Download report",

        title: null,

        description: null,
      },

      {
        id: "bucketReset",

        text: "Reset",

        title: "Restore the Bucket Plan example and clear extra withdrawals",

        description: null,
      },
    ],

    fileId: "bucketImportFile",

    statuses: [
      {
        id: "bucketImportStatus",

        text: "",
      },

      {
        id: "bucketSave",

        text: "Saved separately from your other calculators.",
      },
    ],

    resetNote: null,
  },

  survival: {
    eyebrow: "Financial AI Planner / CORPUS SURVIVAL",

    title: "How long will your money last?",

    description:
      "Your savings, monthly spending and the years ahead. See what your corpus could support.",

    currencyId: "s-currency",

    currencyForm: null,

    currencyDescription: null,

    note: "Amounts keep their values. No currency conversion.",

    details:
      "Amounts are entered directly in the selected currency. Each currency has its own life-expense list. No exchange-rate conversion is applied.",

    detailsId: null,

    buttons: [
      {
        id: "survivalImport",

        text: "Import report",

        title: "Import an original HTML report or saved JSON plan",

        description: null,
      },

      {
        id: "survivalReport",

        text: "Download report",

        title: null,

        description: null,
      },

      {
        id: "survivalResetTop",

        text: "Reset",

        title: null,

        description: null,
      },
    ],

    fileId: "survivalImportFile",

    statuses: [
      {
        id: "survivalImportStatus",

        text: "",
      },

      {
        id: "survivalReportStatus",

        text: "",
      },
    ],

    resetNote: {
      id: "survivalResetNote",

      text: "Reset starts from today and keeps saved future expenses.",
    },
  },
} as const;

export type PlannerKind = keyof typeof headerConfig;
