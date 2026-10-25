import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile, writeFile } from "node:fs/promises";

// Serve the same useful page content before and after JavaScript loads.
// Effects/controllers do not run here, so no browser drafts or private inputs
// can enter the public HTML. Calculations still run locally in the browser.
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
try {
  const { HomeContent } = await server.ssrLoadModule(
    "/src/pages/HomeContent.tsx",
  );
  const content = renderToStaticMarkup(
    createElement("main", null, createElement(HomeContent)),
  );
  const file = "dist/index.html";
  const html = await readFile(file, "utf8");
  if (!html.includes('<div id="root"></div>'))
    throw new Error("Missing homepage render target");
  await writeFile(
    file,
    html.replace('<div id="root"></div>', `<div id="root">${content}</div>`),
  );
  const { searchPages, canonicalUrl } = await server.ssrLoadModule(
    "/src/content/search.mts",
  );
  const { PlannerNavigation } = await server.ssrLoadModule(
    "/src/components/PlannerNavigation.tsx",
  );
  const pages = {
    growth: "GrowthPage",
    survival: "SurvivalPage",
    "custom-plan": "CustomPage",
    freedom: "FreedomPage",
    "bucket-plan": "BucketPage",
    "salary-budget": "BudgetPage",
    "loan-payoff": "LoanPage",
    learn: "LearnPage",
  };
  for (const route of Object.keys(searchPages)) {
    if (route === "home") continue;
    const page = `dist/${route}/index.html`;
    const source = await readFile(page, "utf8");
    const name = pages[route];
    if (!name) throw new Error(`No public renderer for ${route}`);
    const module = await server.ssrLoadModule(`/src/pages/${name}.tsx`);
    const element = createElement(module[name]);
    const pageContent =
      route === "growth" || route === "survival"
        ? createElement(
            "main",
            { className: "planner-page" },
            createElement(PlannerNavigation),
            element,
          )
        : element;
    const introduction = renderToStaticMarkup(
      createElement(
        "div",
        null,
        route !== "learn" &&
          createElement(
            "noscript",
            null,
            createElement(
              "p",
              { className: "calculator-noscript" },
              "Enable JavaScript to calculate your plan. You can still read the instructions and calculation methods below.",
            ),
          ),
        pageContent,
      ),
    );
    if (!source.includes('<div id="root"></div>'))
      throw new Error(`Missing render target for ${route}`);
    await writeFile(
      page,
      source.replace(
        '<div id="root"></div>',
        `<div id="root">${introduction}</div>`,
      ),
    );
  }
  console.log(
    "All public pages pre-rendered with calculator fields, instructions, methods and crawlable links.",
  );
  // Include every registered public route; do not invent last-modified dates.
  const urls = Object.keys(searchPages).map(
    (route) => `  <url><loc>${canonicalUrl(route)}</loc></url>`,
  );
  await writeFile(
    "dist/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
  );
} finally {
  await server.close();
}
