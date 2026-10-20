"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { buildBase } = require("./build-base.cjs");
const output = path.resolve("dist");
const base = buildBase();
const digest = (bytes, algorithm = "sha384") =>
  algorithm + "-" + crypto.createHash(algorithm).update(bytes).digest("base64");
for (const page of [
  "index.html",
  "custom-plan.html",
  "freedom.html",
  "bucket-plan.html",
]) {
  const file = path.join(output, page);
  let source = fs.readFileSync(file, "utf8");
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
  const policy =
    "default-src 'none'; script-src 'self' " +
    [...new Set(inline)].join(" ") +
    "; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; worker-src 'none'";
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
for (const file of ["CNAME", "robots.txt", "sitemap.xml"]) {
  if (
    fs.readFileSync(path.join(output, file), "utf8").trim() !==
    fs.readFileSync(path.join("public", file), "utf8").trim()
  )
    throw new Error("Public metadata differs from " + file);
}
console.log(
  "Production security applied: CSP, resource integrity, no external API connections, and preserved domain/SEO files.",
);
