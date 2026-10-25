// Validate the actual shipped HTML, rather than just the source configuration.
import { readFile, readdir } from "node:fs/promises";
import { strict as assert } from "node:assert";
import {
  searchPages,
  canonicalUrl,
  previewImage,
  searchMetadataTags,
  siteUrl,
  isTrustPage,
} from "../src/content/search.mts";

const decode = (s) =>
  s.replace(
    /&(amp|quot|lt|gt|#39);/g,
    (_, entity) =>
      ({ amp: "&", quot: '"', lt: "<", gt: ">", "#39": "'" })[entity],
  );
const attributes = (tag) =>
  Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], decode(m[2])]),
  );
const seenTitles = new Set(),
  seenDescriptions = new Set();
const sitemap = await readFile("dist/sitemap.xml", "utf8");
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
  decode(m[1]),
);
assert.equal(
  new Set(locations).size,
  locations.length,
  "Duplicate sitemap URLs",
);
assert.equal(
  locations.length,
  Object.keys(searchPages).length,
  "Sitemap must cover every public page",
);
const robots = await readFile("dist/robots.txt", "utf8");
assert.match(
  robots,
  new RegExp(`Sitemap: ${siteUrl.replaceAll(".", "\\.")}/sitemap\\.xml`),
);
assert.doesNotMatch(
  robots,
  /^Disallow:\s*\/\s*$/m,
  "Site is blocked from crawling",
);

const entries = await readdir("dist", { withFileTypes: true });
const aliases = ["custom-plan", "freedom", "bucket-plan"];
for (const entry of entries) {
  if (
    entry.isFile() &&
    entry.name.endsWith(".html") &&
    entry.name !== "index.html"
  ) {
    const route = entry.name.slice(0, -5);
    assert.ok(
      aliases.includes(route),
      `Unregistered public HTML page: ${entry.name}`,
    );
    assert.equal(
      await readFile(`dist/${entry.name}`, "utf8"),
      await readFile(`dist/${route}/index.html`, "utf8"),
      `Legacy bookmark must retain canonical page metadata: ${entry.name}`,
    );
  }
  if (
    !entry.isDirectory() ||
    entry.name === "assets" ||
    entry.name === "social" ||
    entry.name === "fonts"
  )
    continue;
  try {
    await readFile(`dist/${entry.name}/index.html`);
    assert.ok(
      entry.name in searchPages,
      `Public page has no SEO registration: ${entry.name}`,
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

for (const [page, info] of Object.entries(searchPages)) {
  const file = page === "home" ? "dist/index.html" : `dist/${page}/index.html`;
  const html = await readFile(file, "utf8");
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  assert.ok(head, `Missing head: ${page}`);
  assert.match(html, /<html\b[^>]*lang="en"/, `Missing language: ${page}`);
  const titles = [...head.matchAll(/<title>([^<]*)<\/title>/g)];
  assert.equal(
    titles.length,
    1,
    `Exactly one document title required: ${page}`,
  );
  assert.equal(decode(titles[0][1]), info.title);
  assert.ok(!seenTitles.has(info.title), `Duplicate title: ${page}`);
  assert.ok(
    !seenDescriptions.has(info.description),
    `Duplicate description: ${page}`,
  );
  seenTitles.add(info.title);
  seenDescriptions.add(info.description);
  const tags = [...head.matchAll(/<meta\b[^>]*>/g)].map((m) =>
    attributes(m[0]),
  );
  for (const [attribute, key, expected] of searchMetadataTags(page)) {
    const found = tags.filter((tag) => tag[attribute] === key);
    assert.equal(found.length, 1, `${page}: missing/duplicate ${key}`);
    assert.equal(found[0].content, expected, `${page}: stale ${key}`);
  }
  assert.doesNotMatch(
    tags.find((tag) => tag.name === "robots").content,
    /noindex|nofollow/,
  );
  const canonical = [...head.matchAll(/<link\b[^>]*>/g)]
    .map((m) => attributes(m[0]))
    .filter((tag) => tag.rel === "canonical");
  assert.equal(canonical.length, 1, `Exactly one canonical required: ${page}`);
  assert.equal(canonical[0].href, canonicalUrl(page));
  assert.ok(locations.includes(canonicalUrl(page)), `Not in sitemap: ${page}`);
  assert.equal(
    [...html.matchAll(/<h1\b/g)].length,
    1,
    `Expected one readable page heading: ${page}`,
  );
  assert.match(
    html,
    /<details\b/,
    `Missing readable supporting content: ${page}`,
  );
  if (page !== "home" && page !== "learn" && !isTrustPage(page))
    assert.match(
      html,
      /<input\b[^>]*type="number"/,
      `Calculator content isn't prerendered: ${page}`,
    );
  const graphs = [
    ...head.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    ),
  ];
  assert.equal(graphs.length, 1, `Exactly one JSON-LD graph required: ${page}`);
  const graph = JSON.parse(graphs[0][1])["@graph"];
  if (isTrustPage(page)) {
    assert.ok(
      !graph.some((node) => node["@type"] === "WebApplication"),
      `Information page incorrectly labelled as calculator: ${page}`,
    );
    assert.match(
      html,
      /aria-label="Website information"/,
      `Missing trust links: ${page}`,
    );
  }
  const webpage = graph.find((node) => node["@type"] === "WebPage");
  assert.equal(webpage.url, canonicalUrl(page));
  assert.ok(
    graph.some((node) => node["@id"] === webpage.mainEntity["@id"]),
    `Unresolved primary entity: ${page}`,
  );
  const image = previewImage(page);
  const imageNode = graph.find(
    (node) => node["@id"] === webpage.primaryImageOfPage["@id"],
  );
  assert.equal(
    imageNode?.contentUrl,
    image.url,
    `Missing representative image: ${page}`,
  );
  const png = await readFile(`dist/social/${page}.png`);
  assert.equal(
    png.subarray(0, 8).toString("hex"),
    "89504e470d0a1a0a",
    `Invalid preview PNG: ${page}`,
  );
  assert.equal(png.readUInt32BE(16), image.width);
  assert.equal(png.readUInt32BE(20), image.height);
  console.log(`SEO OK: ${canonicalUrl(page)}`);
}
console.log(
  `SEO audit passed for all ${Object.keys(searchPages).length} public pages.`,
);
