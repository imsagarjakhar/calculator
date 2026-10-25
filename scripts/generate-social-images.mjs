// Optional authoring command, not part of deployment: npm run seo:images.
// Commit its PNG output so normal builds never need a browser installation.
import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { searchPages, canonicalUrl } from "../src/content/search.mts";

const output = fileURLToPath(new URL("../public/social/", import.meta.url));
const font = await readFile(
  new URL("../public/fonts/newsreader.ttf", import.meta.url),
);
const escape = (value) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
try {
  const tab = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await tab.route("https://**", (route) => route.abort());
  for (const [page, info] of Object.entries(searchPages)) {
    const title =
      page === "home" ? "Financial planning.\nA clearer future." : info.name;
    await tab.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
      @font-face{font-family:Newsreader;src:url(data:font/ttf;base64,${font.toString("base64")})}
      *{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#f8faf5;color:#203b32;font-family:'Segoe UI',sans-serif;padding:56px 68px;overflow:hidden}
      header{display:flex;align-items:center;gap:14px;font:450 32px Newsreader,serif}
      header svg{width:35px;height:35px}h1{font:450 66px/1.08 Newsreader,serif;letter-spacing:-1.5px;white-space:pre-line;text-wrap:balance;margin:67px 0 23px;max-width:830px;position:relative;z-index:1}
      p{font-size:21px;line-height:1.65;max-width:820px;margin:0;color:#405e4d;position:relative;z-index:1}
      .mark{position:absolute;right:65px;top:187px;width:170px;height:170px;color:#d8e5d0}
      footer{position:absolute;left:68px;right:68px;bottom:43px;padding-top:19px;border-top:1px solid #cad8c9;display:flex;justify-content:space-between;color:#42634d;font-size:17px}
      svg{fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    </style></head><body>
      <header><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 25V15l8 5V7l8 5V4l8 5v16H4Z"/></svg>Financial AI Planner</header>
      <svg class="mark" viewBox="0 0 48 48" aria-hidden="true"><path d="m5 38 13-15 9 7 15-23M27 7h15v15"/></svg>
      <h1>${escape(title)}</h1><p>${escape(info.description)}</p>
      <footer><span>${escape(canonicalUrl(page).replace("https://", ""))}</span><span>Free financial planning tools</span></footer>
    </body></html>`);
    await tab.evaluate(() => document.fonts.ready);
    const fits = await tab.evaluate(
      () =>
        document.querySelector("p").getBoundingClientRect().bottom <
        document.querySelector("footer").getBoundingClientRect().top - 14,
    );
    if (!fits) throw new Error(`Preview text overlaps its footer: ${page}`);
    await tab.screenshot({ path: `${output}${page}.png`, type: "png" });
    console.log(`Created public/social/${page}.png`);
  }
} finally {
  await browser.close();
}
