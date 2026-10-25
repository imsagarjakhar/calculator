export const siteUrl = "https://intimetec.org";
export const searchPages = {
  learn: {
    title: "Finance Terms Explained: SIP, SWP & EMI | Financial AI Planner",
    description:
      "Learn finance in plain language with interactive examples, illustrated SIP and SWP lessons, quick questions and a searchable glossary of financial terms.",
    name: "Finance basics",
  },
  "loan-payoff": {
    title: "Loan Repayment vs Investment Calculator | Financial AI Planner",
    description:
      "Compare paying multiple loans faster with investing on the same monthly budget. Explore debt payoff order, fees, tax assumptions and a monthly payment guide.",
    name: "Loan Payoff & Investment Planner",
  },
  "salary-budget": {
    title: "Salary & Monthly Budget Calculator | Financial AI Planner",
    description:
      "Plan your take-home salary, expenses, upcoming bills, emergency savings and goals. Explore a one-year monthly investment projection using your return assumption.",
    name: "Monthly Salary & Budget Planner",
  },
  home: {
    title: "Free SIP, Loan & Budget Calculators | Financial AI Planner",
    description:
      "Learn how to do financial planning: budget your salary, build emergency savings, compare loan payoff with investing and plan retirement with free calculators.",
    name: "Financial AI Planner",
  },
  growth: {
    title: "SIP Calculator with Step-Up | Financial AI Planner",
    description:
      "Calculate SIP growth with Financial AI Planner. Compare monthly investments, annual step-ups, one-time deposits, existing assets and loans using your own return assumptions.",
    name: "SIP & Investment Growth Calculator",
  },
  survival: {
    title: "SWP & Retirement Calculator | Financial AI Planner",
    description:
      "How long could your savings last? Use Financial AI Planner's retirement and SWP calculator to explore monthly withdrawals, inflation, investment returns and future expenses.",
    name: "Retirement & SWP Calculator",
  },
  "custom-plan": {
    title: "Investment & Loan EMI Planner | Financial AI Planner",
    description:
      "Build a monthly plan with Financial AI Planner. Track investment records, calculate loan EMIs and outstanding balances, and project assets, debt and inflation-adjusted net worth.",
    name: "Monthly Investment Planner & Loan EMI Calculator",
  },
  freedom: {
    title: "FIRE & Financial Freedom Calculator | Financial AI Planner",
    description:
      "Explore your financial freedom age with Financial AI Planner. Model your current savings, monthly SIP, annual step-up, desired income, expected returns and inflation.",
    name: "Financial Freedom Age Calculator",
  },
  "bucket-plan": {
    title: "Retirement Bucket Strategy Planner | Financial AI Planner",
    description:
      "Explore a three-bucket retirement strategy with Financial AI Planner: living costs, an emergency reserve and long-term investments. Model withdrawals, inflation and refills.",
    name: "Retirement Bucket Planner",
  },
} as const;
export type SearchPage = keyof typeof searchPages;
export function canonicalUrl(page: SearchPage) {
  return siteUrl + (page === "home" ? "/" : "/" + page + "/");
}
export function searchGraph(page: SearchPage) {
  const info = searchPages[page];
  const url = canonicalUrl(page);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": siteUrl + "/#website",
        name: "Financial AI Planner",
        alternateName: ["intimetec.org"],
        url: siteUrl + "/",
        inLanguage: "en",
      },
      {
        "@type": "WebPage",
        "@id": url + "#webpage",
        url,
        name: info.title,
        description: info.description,
        isPartOf: { "@id": siteUrl + "/#website" },
        inLanguage: "en",
        ...(page !== "home"
          ? {
              breadcrumb: { "@id": url + "#breadcrumb" },
              mainEntity: {
                "@id": url + (page === "learn" ? "#guide" : "#calculator"),
              },
            }
          : { mainEntity: { "@id": url + "#calculators" } }),
      },
      ...(page === "home"
        ? [
            {
              "@type": "ItemList",
              "@id": url + "#calculators",
              name: "Free financial planning calculators",
              itemListElement: (Object.keys(searchPages) as SearchPage[])
                .filter((key) => key !== "home" && key !== "learn")
                .map((key, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  name: searchPages[key].name,
                  url: canonicalUrl(key),
                })),
            },
          ]
        : [
            {
              "@type": "BreadcrumbList",
              "@id": url + "#breadcrumb",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Financial AI Planner",
                  item: siteUrl + "/",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: info.name,
                  item: url,
                },
              ],
            },
            {
              "@type": page === "learn" ? "LearningResource" : "WebApplication",
              "@id": url + (page === "learn" ? "#guide" : "#calculator"),
              name: info.name,
              url,
              description: info.description,
              ...(page === "learn"
                ? {
                    learningResourceType: "Interactive glossary",
                    educationalUse: "instruction",
                  }
                : {
                    applicationCategory: "FinanceApplication",
                    operatingSystem: "Any",
                    browserRequirements:
                      "Requires JavaScript for interactive calculations",
                  }),
              isAccessibleForFree: true,
              isPartOf: { "@id": siteUrl + "/#website" },
            },
          ]),
    ],
  };
}
