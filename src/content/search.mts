export const siteUrl = "https://intimetec.org";
export const searchPages = {
  "salary-budget": {
    title: "Monthly Salary & Budget Planner | INTIMETEC",
    description:
      "Plan your take-home salary, expenses, upcoming bills, emergency savings and goals. Explore a one-year monthly investment projection using your return assumption.",
    name: "Monthly Salary & Budget Planner",
  },
  home: {
    title: "INTIMETEC Money Planner | Free SIP, Loan & Retirement Calculators",
    description:
      "Plan with INTIMETEC Money Planner at intimetec.org. Free SIP growth, loan EMI, retirement and financial freedom calculators with private, browser-based projections.",
    name: "INTIMETEC Money Planner",
  },
  growth: {
    title: "SIP & Investment Growth Calculator | INTIMETEC Money Planner",
    description:
      "Calculate SIP growth with INTIMETEC. Compare monthly investments, annual step-ups, one-time deposits, existing assets and loans using your own return assumptions.",
    name: "SIP & Investment Growth Calculator",
  },
  survival: {
    title: "Retirement & SWP Calculator | INTIMETEC Money Planner",
    description:
      "How long could your savings last? Use INTIMETEC's retirement and SWP calculator to explore monthly withdrawals, inflation, investment returns and future expenses.",
    name: "Retirement & SWP Calculator",
  },
  "custom-plan": {
    title: "Monthly Investment Planner & Loan EMI Calculator | INTIMETEC",
    description:
      "Build a monthly plan with INTIMETEC. Track investment records, calculate loan EMIs and outstanding balances, and project assets, debt and inflation-adjusted net worth.",
    name: "Monthly Investment Planner & Loan EMI Calculator",
  },
  freedom: {
    title: "Financial Freedom & FIRE Age Calculator | INTIMETEC",
    description:
      "Explore your financial freedom age with INTIMETEC. Model your current savings, monthly SIP, annual step-up, desired income, expected returns and inflation.",
    name: "Financial Freedom Age Calculator",
  },
  "bucket-plan": {
    title: "Retirement Bucket Planner | INTIMETEC Money Planner",
    description:
      "Explore a three-bucket retirement strategy with INTIMETEC: living costs, an emergency reserve and long-term investments. Model withdrawals, inflation and refills.",
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
        name: "INTIMETEC Money Planner",
        alternateName: ["INTIMETEC", "Intimetec", "intimetec.org"],
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
          ? { breadcrumb: { "@id": url + "#breadcrumb" } }
          : {}),
      },
      ...(page === "home"
        ? []
        : [
            {
              "@type": "BreadcrumbList",
              "@id": url + "#breadcrumb",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "INTIMETEC Money Planner",
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
              "@type": "WebApplication",
              "@id": url + "#calculator",
              name: info.name,
              url,
              description: info.description,
              applicationCategory: "FinanceApplication",
              operatingSystem: "Any",
              isAccessibleForFree: true,
              browserRequirements:
                "Requires JavaScript for interactive calculations",
              isPartOf: { "@id": siteUrl + "/#website" },
            },
          ]),
    ],
  };
}
