const { createServer } = require("node:net");
const { spawn } = require("node:child_process");

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

async function main() {
  const env = { ...process.env };
  // Persistent runners can share a machine with a developer's preview or an old
  // job. CI must start its own server, not reuse that server or terminate it.
  if (env.CI && !env.PREVIEW_PORT)
    env.PREVIEW_PORT = String(await availablePort());
  const port = env.PREVIEW_PORT || "4173";
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)
    throw new Error("PREVIEW_PORT must be an integer from 1 to 65535.");
  console.log(
    `Browser tests: http://127.0.0.1:${port}${env.VITE_BASE_PATH || "/"}${env.CI ? " (isolated CI preview)" : ""}`,
  );
  const child = spawn(
    process.execPath,
    [require.resolve("@playwright/test/cli"), "test", ...process.argv.slice(2)],
    {
      env,
      stdio: "inherit",
    },
  );
  child.once("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  child.once("exit", (code) => {
    process.exitCode = code ?? 1;
  });
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
