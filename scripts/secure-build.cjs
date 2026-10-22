"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { buildBase } = require("./build-base.cjs");
const { vlogApiOrigin } = require("./vlog-config.cjs");
const output = path.resolve("dist");
const base = buildBase();
const digest = (bytes, algorithm = "sha384") =>
  algorithm + "-" + crypto.createHash(algorithm).update(bytes).digest("base64");
for (const page of [
  "index.html",
  "growth/index.html",
  "survival/index.html",
  "custom-plan/index.html",
  "freedom/index.html",
  "bucket-plan/index.html",
  "salary-budget/index.html",
  "loan-payoff/index.html",
]) {
  const file = path.join(output, page);
  let source = fs.readFileSync(file, "utf8");
  if (
    !/<meta\s+name="google-adsense-account"\s+content="ca-pub-7696234797118425"\s*\/?>/.test(
      source,
    )
  )
    throw new Error("Missing AdSense account verification: " + page);
  source = source.replace(
    /<meta\s+(?:http-equiv="Content-Security-Policy"|name="referrer")[^>]*>\s*/gi,
    "",
  );
  const inline = [
    ...source.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi),
  ].map((match) => "'" + digest(match[1], "sha256") + "'");
  source = source.replace(/<(script|link)\b[^>]*>/gi, (tag) => {
    if (
      !/^<script\b/i.test(tag) &&
      !/rel="(?:stylesheet|modulepreload)"/.test(tag)
    )
      return tag;
    const resource = tag.match(/(?:src|href)="([^"]+)"/);
    if (!resource) return tag;
    if (!resource[1].startsWith(base + "assets/"))
      throw new Error("Unexpected build resource: " + resource[1]);
    const resourcePath = path.resolve(output, resource[1].slice(base.length));
    if (!resourcePath.startsWith(output + path.sep))
      throw new Error("Invalid build resource path");
    const sri = digest(fs.readFileSync(resourcePath));
    return tag
      .replace(/\s+(?:integrity="[^"]*"|crossorigin(?:="[^"]*")?)/gi, "")
      .replace(/>$/, ` integrity="${sri}" crossorigin="anonymous">`);
  });
  const hasVlogs = [
    "index.html",
    "growth/index.html",
    "survival/index.html",
  ].includes(page);
  const blogOrigin = vlogApiOrigin();
  const connections = hasVlogs
    ? (blogOrigin
        ? ["'self'", blogOrigin]
        : [
            "'self'",
            "https://api.github.com",
            "https://raw.githubusercontent.com",
          ]
      ).join(" ")
    : "'none'";
  const policy =
    "default-src 'none'; script-src 'self' " +
    [...new Set(inline)].join(" ") +
    "; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self'; connect-src " +
    connections +
    "; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; worker-src 'none'";
  source = source.replace(
    /(<meta\s+charset="utf-8"\s*\/?>)/i,
    '$1\n<meta http-equiv="Content-Security-Policy" content="' +
      policy +
      '">\n<meta name="referrer" content="no-referrer">',
  );
  if (
    !source.includes('http-equiv="Content-Security-Policy"') ||
    source.indexOf("Content-Security-Policy") > source.indexOf("<script")
  )
    throw new Error("Missing early CSP: " + page);
  fs.writeFileSync(file, source);
}
// Preserve old bookmarks; the entry module normalizes them to clean URLs.
for (const name of ["custom-plan", "freedom", "bucket-plan"]) {
  fs.copyFileSync(
    path.join(output, name, "index.html"),
    path.join(output, name + ".html"),
  );
}
for (const file of ["CNAME", "robots.txt", "sitemap.xml", "ads.txt"]) {
  if (
    fs.readFileSync(path.join(output, file), "utf8").trim() !==
    fs.readFileSync(path.join("public", file), "utf8").trim()
  )
    throw new Error("Public metadata differs from " + file);
}
if (
  fs.readFileSync(path.join(output, "ads.txt"), "utf8").trim() !==
  "google.com, pub-7696234797118425, DIRECT, f08c47fec0942fa0"
)
  throw new Error("Unexpected AdSense publisher record");
for (const asset of fs.readdirSync(path.join(output, "assets"))) {
  if (!asset.endsWith(".js")) continue;
  const source = fs.readFileSync(path.join(output, "assets", asset), "utf8");
  if (
    /GH_VLOG_TOKEN|ADMIN_PASSWORD|SESSION_SECRET|\/git\/trees|\/git\/commits|\/git\/refs/.test(
      source,
    )
  )
    throw new Error(
      "Server-side publishing code leaked into a browser bundle: " + asset,
    );
}
console.log(
  "Production security applied: CSP, resource integrity, scoped GitHub vlog connections, and preserved domain/SEO files.",
);
