import {
  canonicalUrl,
  searchPages,
  searchGraph,
  searchMetadataTags,
  type SearchPage,
} from "../content/search.mjs";

export function updateSearchMetadata(page: SearchPage) {
  const info = searchPages[page];
  document.title = info.title;
  for (const [attribute, name, content] of searchMetadataTags(page)) {
    const selector = `meta[${attribute}="${name}"]`;
    let tag = document.querySelector<HTMLMetaElement>(selector);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(attribute, name);
      document.head.append(tag);
    }
    tag.content = content;
  }
  document
    .querySelector('link[rel="canonical"]')
    ?.setAttribute("href", canonicalUrl(page));
  // JSON-LD is data, never executable JavaScript.
  const data = document.querySelector('script[type="application/ld+json"]');
  if (data) data.textContent = JSON.stringify(searchGraph(page));
}
