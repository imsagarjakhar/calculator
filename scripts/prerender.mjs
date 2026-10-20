import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile, writeFile } from "node:fs/promises";

// Render the same public homepage component for every visitor, without a server
// or browser dependency. Interactive calculators still start in the browser.
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
try {
  const { HomeContent } = await server.ssrLoadModule("/src/pages/HomeContent.tsx");
  const content = renderToStaticMarkup(createElement("main", null, createElement(HomeContent)));
  const file = "dist/index.html";
  const html = await readFile(file, "utf8");
  if (!html.includes('<div id="root"></div>')) throw new Error("Missing homepage render target");
  await writeFile(file, html.replace('<div id="root"></div>', `<div id="root">${content}</div>`));
  const { searchPages } = await server.ssrLoadModule("/src/content/search.mts");
  for (const [route, info] of Object.entries(searchPages)) {
    if (route === "home") continue;
    const page = `dist/${route}/index.html`;
    const source = await readFile(page, "utf8");
    const introduction = renderToStaticMarkup(createElement("main", { className: "static-introduction" },
      createElement("h1", null, info.name),
      createElement("p", null, info.description),
      createElement("p", null, "Enable JavaScript to enter your assumptions and calculate your plan privately in your browser."),
    ));
    await writeFile(page, source.replace('<div id="root"></div>', `<div id="root">${introduction}</div>`));
  }
  console.log("Six pages pre-rendered: homepage, calculator introductions and links available without JavaScript.");
} finally {
  await server.close();
}
