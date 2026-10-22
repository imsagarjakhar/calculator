"use strict";
const { vlogApiOrigin } = require("./vlog-config.cjs");

async function checkBlogApi(origin, options = {}) {
  const request = options.fetch || globalThis.fetch;
  const attempts = options.attempts || 12;
  const wait =
    options.wait || (() => new Promise((resolve) => setTimeout(resolve, 5000)));
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const get = (path) =>
        request(origin + path, {
          headers: { Origin: "https://intimetec.org" },
          redirect: "error",
          signal: AbortSignal.timeout(10000),
        });
      const healthResponse = await get("/health");
      if (!healthResponse.ok) throw new Error();
      const health = await healthResponse.json();
      if (health.ready !== true || health.publicRead !== true)
        throw new Error();
      const feedResponse = await get("/public/posts");
      if (!feedResponse.ok) throw new Error();
      const feed = await feedResponse.json();
      if (feed.version !== 1 || !Array.isArray(feed.posts)) throw new Error();
      return;
    } catch {
      if (attempt < attempts) await wait();
    }
  }
  throw new Error(
    "Blog API is not ready for private-repository reads. Deploy the updated vlog Worker and verify its GitHub token access before deploying the website.",
  );
}

if (require.main === module) {
  const origin = vlogApiOrigin();
  if (!origin)
    throw new Error("VITE_VLOG_API_ORIGIN is required for this check.");
  checkBlogApi(origin).then(
    () =>
      console.log(
        "Blog API public reads verified; website deployment may proceed.",
      ),
    (error) => {
      console.error(error.message);
      process.exitCode = 1;
    },
  );
}
module.exports = { checkBlogApi };
