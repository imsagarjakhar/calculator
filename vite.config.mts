import { defineConfig, type Plugin } from "vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildBase } from "./scripts/build-base.cjs";

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
  plugins: [compatibilityModules()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: {
      input: Object.fromEntries(
        ["index", "custom-plan", "freedom", "bucket-plan"].map((page) => [
          page,
          resolve("web", page + ".html"),
        ]),
      ),
    },
  },
  server: { fs: { allow: [resolve(".")] } },
});
