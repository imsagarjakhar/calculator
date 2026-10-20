const fs = require("node:fs");
const path = require("node:path");
const fixtureDirectory = path.resolve("bkp");
const { spawnSync } = require("node:child_process");
for (const file of fs
  .readdirSync(fixtureDirectory)
  .filter((name) => name.endsWith(".test.js"))
  .sort()) {
  const result = spawnSync(
    process.execPath,
    [path.join(fixtureDirectory, file)],
    { stdio: "inherit", cwd: fixtureDirectory },
  );
  if (result.status !== 0) process.exit(result.status || 1);
}
