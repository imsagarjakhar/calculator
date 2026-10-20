import { defineConfig, type Plugin } from "vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildBase } from "./scripts/build-base.cjs";
import {
  searchPages,
  canonicalUrl,
  searchGraph,
  type SearchPage,
} from "./src/content/search.mjs";

function searchMetadata(): Plugin {
  return {
    name: "search-metadata-and-crawlable-directory",
    transformIndexHtml(html, context) {
      const segment = context.path.split("/").filter(Boolean)[0];
      const page: SearchPage =
        segment && segment in searchPages ? (segment as SearchPage) : "home";
      const info = searchPages[page];
      const escape = (value: string) =>
        value
          .replaceAll("&", "&amp;")
          .replaceAll('"', "&quot;")
          .replaceAll("<", "&lt;");
      html = html.replace(
        /<title>[\s\S]*?<\/title>/,
        `<title>${escape(info.title)}</title>`,
      );
      html = html.replace(
        /<meta\b[^>]*\b(?:name|property)="(description|og:title|og:description|og:url|twitter:title|twitter:description)"[^>]*>/g,
        (tag, name: string) => {
          const value = name.endsWith("title")
            ? info.title
            : name === "og:url"
              ? canonicalUrl(page)
              : info.description;
          return tag.replace(/content="[^"]*"/, `content="${escape(value)}"`);
        },
      );
      html = html.replace(
        /<link rel="canonical"[^>]*>/,
        `<link rel="canonical" href="${canonicalUrl(page)}" />`,
      );
      const data = `<script type="application/ld+json">${JSON.stringify(searchGraph(page)).replaceAll("<", "\\u003c")}</script>`;
      html = /<script type="application\/ld\+json">/.test(html)
        ? html.replace(
            /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
            data,
          )
        : html.replace("</head>", data + "</head>");
      const footer = readFileSync(
        resolve("src/content/site-footer.html"),
        "utf8",
      ).replaceAll("{{base}}", buildBase());
      return {
        html,
        tags: [
          {
            tag: "meta",
            attrs: {
              name: "google-adsense-account",
              content: "ca-pub-7696234797118425",
            },
            injectTo: "head",
          },
          {
            tag: "footer",
            attrs: { class: "site-footer" },
            children: footer,
            injectTo: "body",
          },
        ],
      };
    },
  };
}

// Bundle the tested engines and controllers as isolated ES modules. No script
// injection, eval, global API installation, or second copy of the calculations.
const engines: Record<string, { name: string; deps?: Record<string, string> }> =
  {
    "life-events": { name: "LifeEvents" },
    "calculator-report": { name: "CalculatorReport" },
    "growth-engine": {
      name: "GrowthEngine",
      deps: { LifeEvents: "life-events" },
    },
    "growth-holdings": {
      name: "GrowthHoldings",
      deps: { GrowthEngine: "growth-engine" },
    },
    "survival-engine": {
      name: "CorpusSurvival",
      deps: { LifeEvents: "life-events" },
    },
    "custom-engine": {
      name: "CustomPlan",
      deps: { GrowthEngine: "growth-engine" },
    },
    "custom-report": {
      name: "CustomReport",
      deps: {
        CustomPlan: "custom-engine",
        CalculatorReport: "calculator-report",
      },
    },
    "freedom-engine": {
      name: "FinancialFreedom",
      deps: { LifeEvents: "life-events" },
    },
    "bucket-engine": { name: "BucketPlanner" },
    "chart-hover": { name: "ChartHover" },
  };
const controllers: Record<string, { file: string; deps: string[] }> = {
  growth: {
    file: "index.html",
    deps: [
      "life-events",
      "growth-engine",
      "growth-holdings",
      "calculator-report",
      "chart-hover",
    ],
  },
  survival: {
    file: "survival.js",
    deps: [
      "life-events",
      "survival-engine",
      "calculator-report",
      "chart-hover",
    ],
  },
  custom: {
    file: "custom-plan.js",
    deps: [
      "custom-engine",
      "custom-report",
      "growth-engine",
      "calculator-report",
      "chart-hover",
    ],
  },
  freedom: {
    file: "freedom.js",
    deps: ["life-events", "freedom-engine", "calculator-report", "chart-hover"],
  },
  bucket: {
    file: "bucket-plan.js",
    deps: ["bucket-engine", "calculator-report", "chart-hover"],
  },
};
function compatibilityModules(): Plugin {
  return {
    name: "tested-planner-modules",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url || "/", "http://localhost");
        const base = buildBase();
        const local = url.pathname.startsWith(base)
          ? url.pathname.slice(base.length)
          : url.pathname;
        const oldPage = local.match(
          /^(custom-plan|freedom|bucket-plan)\.html$/,
        );
        if (oldPage) {
          response.writeHead(302, {
            Location: base + oldPage[1] + "/" + url.search,
          });
          response.end();
        } else next();
      });
    },
    resolveId(id) {
      if (id.startsWith("planner:")) return "\0" + id;
    },
    load(id) {
      if (!id.startsWith("\0planner:")) return;
      const [, kind, key] = id.slice(1).split(":");
      const item = kind === "engine" ? engines[key] : controllers[key];
      if (!item) throw new Error("Unknown planner module: " + id);
      const file = resolve(
        "bkp",
        kind === "engine" ? key + ".js" : controllers[key].file,
      );
      this.addWatchFile(resolve(file));
      let source = readFileSync(file, "utf8");
      if (kind === "engine") {
        const { name, deps = {} } = engines[key];
        const imports = Object.entries(deps)
          .map(([api, dep]) => `import ${api} from 'planner:engine:${dep}';`)
          .join("\n");
        const requires = Object.entries(deps)
          .map(([api, dep]) => `${JSON.stringify("./" + dep)}:${api}`)
          .join(",");
        return (
          `${imports}\nconst root={${Object.keys(deps).join(",")}};const module={exports:{}};const require=name=>{const deps={${requires}};if(!(name in deps))throw Error('Unknown dependency '+name);return deps[name];};\n` +
          source.replace(
            /\}\)\((?:typeof globalThis!=='undefined'\?globalThis:this|globalThis)\);?\s*$/,
            "})(root);",
          ) +
          `\nexport default ${key === "growth-holdings" ? "root." + name : "module.exports"};`
        );
      }
      if (key === "growth") {
        source = source.match(/<script>([\s\S]*?)<\/script>/)![1];
      } else {
        source = source
          .replace(/^[\s\S]*?\(function\s*\(\)\s*\{/, "")
          .replace(/\}\)\(\);?\s*$/, "");
      }
      if (key === "survival") {
        source = source.replace(/\s*screen\.innerHTML = `[\s\S]*?`;/, "");
        source = source.replace("window.CorpusSurvival", "CorpusSurvival");
        source = source.replace(
          /  function showScreen\([\s\S]*?(?=  eventsEditor=LifeEvents\.mount)/,
          "",
        );
        source = source.replace(
          "update();showScreen(location.hash.slice(1));",
          "update();",
        );
      }
      const imports = controllers[key].deps
        .map(
          (dep) => `import ${engines[dep].name} from 'planner:engine:${dep}';`,
        )
        .join("\n");
      return `${imports}\nexport default function mount(scope){const {document,window,setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame,cancelAnimationFrame}=scope;\n${source}\n}`;
    },
  };
}
export default defineConfig({
  root: "web",
  resolve: { alias: { "/src": resolve("src") } },
  base: buildBase(),
  publicDir: "../public",
  plugins: [compatibilityModules(), searchMetadata()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: {
      input: Object.fromEntries(
        [
          "index",
          "growth",
          "survival",
          "custom-plan",
          "freedom",
          "bucket-plan",
        ].map((page) => [
          page,
          resolve(
            "web",
            page === "index" ? "index.html" : page + "/index.html",
          ),
        ]),
      ),
    },
  },
  server: { fs: { allow: [resolve(".")] } },
});
