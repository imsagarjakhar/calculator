"use strict";
function vlogApiOrigin(value = process.env.VITE_VLOG_API_ORIGIN || "") {
  if (!value) return "";
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error(
      "VITE_VLOG_API_ORIGIN must be an HTTPS origin without a path.",
    );
  if (
    url.hostname !== "api.intimetec.org" &&
    !/^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(url.hostname)
  )
    throw new Error(
      "Use the publishing Worker's workers.dev origin or https://api.intimetec.org.",
    );
  return url.origin;
}
module.exports = { vlogApiOrigin };
