export const siteUrl = "https://intimetec.org";
export const searchPages = {
  guides: {
    title: "Financial Planning Worked Examples | Financial AI Planner",
    description:
      "Follow five worked financial planning examples: monthly bill reserves, SIP growth, loan repayment versus investing, net asset income and retirement withdrawals.",
    name: "Financial planning worked examples",
  },
  contact: {
    title: "Contact & Calculation Corrections | Financial AI Planner",
    description:
      "Contact Financial AI Planner about calculator questions, accessibility, privacy or corrections. Learn which sample details help us check an issue safely.",
    name: "Contact Financial AI Planner",
  },
  about: {
    title: "About Our Financial Planning Tools | Financial AI Planner",
    description:
      "Understand what Financial AI Planner does, how its formula-based tools are checked, and the limits to consider before using a financial projection.",
    name: "About Financial AI Planner",
  },
  privacy: {
    title: "Privacy Policy & Browser Storage | Financial AI Planner",
    description:
      "How calculator entries, browser storage, downloaded reports, public blog requests and Google advertising cookies are handled by Financial AI Planner.",
    name: "Privacy policy",
  },
  methodology: {
    title: "Calculation Methods & Limitations | Financial AI Planner",
    description:
      "Understand SIP compounding, retirement withdrawals, inflation and loan comparisons. Read the assumptions, source references and limits behind your projections.",
    name: "Calculation methods & limitations",
  },
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
    title: "Financial Planning Calculators | Financial AI Planner",
    description:
      "Financial planning calculators for budgets, SIP investing, loan repayment and retirement. Choose your currency and explore your plan privately in your browser.",
    name: "Financial AI Planner",
  },
  growth: {
    title: "SIP Calculator with Step-Up | Financial AI Planner",
    description:
      "Calculate SIP growth with annual step-ups and extra deposits. Explore investment goals using your own return and inflation assumptions, in your selected currency.",
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
export function isTrustPage(page: string) {
  return ["about", "privacy", "methodology", "contact"].includes(page);
}
export function isLearningPage(page: string) {
  return page === "learn" || page === "guides";
}
export function canonicalUrl(page: SearchPage) {
  return siteUrl + (page === "home" ? "/" : "/" + page + "/");
}
export function previewImage(page: SearchPage) {
  return {
    url: `${siteUrl}/social/${page}.png`,
    alt: `${searchPages[page].name} — Financial AI Planner`,
    width: 1200,
    height: 630,
  };
}

// One source for build-time HTML and metadata after in-app navigation.
export function searchMetadataTags(
  page: SearchPage,
): ["name" | "property", string, string][] {
  const info = searchPages[page];
  const image = previewImage(page);
  return [
    ["name", "description", info.description],
    ["name", "robots", "index, follow, max-image-preview:large"],
    ["property", "og:type", "website"],
    ["property", "og:locale", "en_US"],
    ["property", "og:site_name", "Financial AI Planner"],
    ["property", "og:title", info.title],
    ["property", "og:description", info.description],
    ["property", "og:url", canonicalUrl(page)],
    ["property", "og:image", image.url],
    ["property", "og:image:secure_url", image.url],
    ["property", "og:image:type", "image/png"],
    ["property", "og:image:width", String(image.width)],
    ["property", "og:image:height", String(image.height)],
    ["property", "og:image:alt", image.alt],
    ["name", "twitter:card", "summary_large_image"],
    ["name", "twitter:title", info.title],
    ["name", "twitter:description", info.description],
    ["name", "twitter:image", image.url],
    ["name", "twitter:image:alt", image.alt],
  ];
}
export function searchGraph(page: SearchPage) {
  const info = searchPages[page];
  const url = canonicalUrl(page);
  const image = previewImage(page);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": siteUrl + "/#website",
        name: "Financial AI Planner",
        alternateName: ["intimetec.org"],
        url: siteUrl + "/",
        description: searchPages.home.description,
        inLanguage: "en",
      },
      {
        "@type": "ImageObject",
        "@id": url + "#preview",
        url: image.url,
        contentUrl: image.url,
        caption: image.alt,
        width: image.width,
        height: image.height,
      },
      {
        "@type": "WebPage",
        "@id": url + "#webpage",
        url,
        name: info.title,
        description: info.description,
        isPartOf: { "@id": siteUrl + "/#website" },
        inLanguage: "en",
        primaryImageOfPage: { "@id": url + "#preview" },
        ...(page !== "home"
          ? {
              breadcrumb: { "@id": url + "#breadcrumb" },
              mainEntity: {
                "@id":
                  url +
                  (isTrustPage(page)
                    ? "#information"
                    : isLearningPage(page)
                      ? "#guide"
                      : "#calculator"),
              },
            }
          : { mainEntity: { "@id": url + "#calculators" } }),
      },
      ...(page === "home"
        ? [
            {
              "@type": "ItemList",
              "@id": url + "#calculators",
              name: "Financial planning calculators",
              itemListElement: (Object.keys(searchPages) as SearchPage[])
                .filter(
                  (key) =>
                    key !== "home" && !isLearningPage(key) && !isTrustPage(key),
                )
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
              "@type": isTrustPage(page)
                ? "CreativeWork"
                : isLearningPage(page)
                  ? "LearningResource"
                  : "WebApplication",
              "@id":
                url +
                (isTrustPage(page)
                  ? "#information"
                  : isLearningPage(page)
                    ? "#guide"
                    : "#calculator"),
              name: info.name,
              url,
              description: info.description,
              ...(isTrustPage(page)
                ? {}
                : isLearningPage(page)
                  ? {
                      learningResourceType:
                        page === "guides"
                          ? "Worked examples"
                          : "Interactive glossary",
                      educationalUse: "instruction",
                    }
                  : {
                      applicationCategory: "FinanceApplication",
                      operatingSystem: "Any",
                      browserRequirements:
                        "Requires JavaScript for interactive calculations",
                    }),
              isAccessibleForFree: true,
              inLanguage: "en",
              image: { "@id": url + "#preview" },
              isPartOf: { "@id": siteUrl + "/#website" },
            },
          ]),
    ],
  };
}
