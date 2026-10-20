import { canonicalUrl, searchPages, searchGraph, type SearchPage } from "../content/search.mjs";

export function updateSearchMetadata(page: SearchPage) {
  const info = searchPages[page];
  document.title = info.title;
  for (const [selector, content] of [
    ['meta[name="description"]', info.description],
    ['meta[property="og:title"]', info.title],
    ['meta[property="og:description"]', info.description],
    ['meta[property="og:url"]', canonicalUrl(page)],
    ['meta[name="twitter:title"]', info.title],
    ['meta[name="twitter:description"]', info.description],
  ]) document.querySelector(selector)?.setAttribute("content", content);
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", canonicalUrl(page));
  // JSON-LD is data, never executable JavaScript.
  const data = document.querySelector('script[type="application/ld+json"]');
  if (data) data.textContent = JSON.stringify(searchGraph(page));
}
