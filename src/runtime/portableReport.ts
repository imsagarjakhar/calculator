type Table = { title: string; headers: string[]; rows: (string | number)[][] };

const escape = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

export function downloadReport(
  title: string,
  filename: string,
  kind: string,
  plan: unknown,
  tables: Table[],
  assumptions: string,
) {
  const data = JSON.stringify({
    schema: "money-planner-portable-report",
    version: 1,
    kind,
    plan,
  }).replace(/</g, "\\u003c");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escape(title)} | Financial AI Planner</title><style>body{font:15px/1.6 Arial,sans-serif;color:#183241;background:#f4f7f9;margin:0}main{max-width:1050px;margin:auto;padding:32px}h1{line-height:1.2}section{margin:28px 0;overflow:auto}table{border-collapse:collapse;width:100%;background:white}th,td{padding:10px;text-align:left;border:1px solid #d2dce1}th{background:#e5efed}.restore-data{display:none}@media print{body{background:white}main{padding:0}thead{display:table-header-group}tr{break-inside:avoid}}</style></head><body><main><p>Financial AI Planner / SAVED CALCULATION</p><h1>${escape(title)}</h1><p>Saved ${escape(new Date().toISOString())}. Private offline report.</p><p>Import this original HTML file in the matching planner to restore your inputs. PDF copies cannot restore a plan.</p>${tables.map((t) => `<section><h2>${escape(t.title)}</h2><table><thead><tr>${t.headers.map((h) => `<th>${escape(h)}</th>`).join("")}</tr></thead><tbody>${t.rows.map((row) => `<tr>${row.map((v) => `<td>${escape(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></section>`).join("")}<p>${escape(assumptions)}</p></main><script id="money-planner-restore-data" class="restore-data" type="application/json">${data}</script></body></html>`;

  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readPortablePlan(
  file: File,
  kind: string,
): Promise<unknown> {
  if (file.size > 10000000) throw Error("Choose a report smaller than 10 MB.");

  const text = await file.text();

  if (text.trimStart().startsWith("{")) return JSON.parse(text).plan;

  const doc = new DOMParser().parseFromString(text, "text/html");

  const data = JSON.parse(
    doc.querySelector(
      'script#money-planner-restore-data[type="application/json"]',
    )?.textContent || "null",
  );

  if (
    data?.schema !== "money-planner-portable-report" ||
    data.version !== 1 ||
    data.kind !== kind
  )
    throw Error("Choose an original report for this planner.");

  return data.plan;
}
