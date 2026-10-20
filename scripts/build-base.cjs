"use strict";

function buildBase(value = process.env.VITE_BASE_PATH || "/") {
  if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(value)) {
    throw new Error(
      "VITE_BASE_PATH must be / or a path such as /calculator/ with leading and trailing slashes.",
    );
  }
  return value;
}

module.exports = { buildBase };
