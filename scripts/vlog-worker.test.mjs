import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";

const out = await mkdtemp(join(tmpdir(), "intimetec-vlog-tests-"));
await build({
  configFile: false,
  logLevel: "silent",
  build: {
    ssr: resolve("worker/index.ts"),
    outDir: out,
    emptyOutDir: false,
    rollupOptions: { output: { entryFileNames: "worker.mjs" } },
  },
});
const worker = (await import(pathToFileURL(join(out, "worker.mjs")).href))
  .default;
const origin = "https://intimetec.org";
const password = "test-only-publisher-password-31";
const githubToken = "test-only-github-repository-token";
const env = () => ({
  SITE_ORIGIN: origin,
  ADMIN_USERNAME: "imsagarjakhar",
  ADMIN_PASSWORD: password,
  SESSION_SECRET: "test-only-session-signing-key-".repeat(4),
  GH_VLOG_TOKEN: githubToken,
  LOGIN_LIMITER: { limit: async () => ({ success: true }) },
  WRITE_LIMITER: { limit: async () => ({ success: true }) },
});
function call(
  path,
  bindings,
  body,
  token,
  method = body ? "POST" : "GET",
  from = origin,
) {
  return worker.fetch(
    new Request("https://intimetec-vlogs.tests.workers.dev" + path, {
      method,
      headers: {
        Origin: from,
        "CF-Connecting-IP": "192.0.2.1",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
    bindings,
  );
}
async function login(bindings) {
  const response = await call("/login", bindings, {
    username: bindings.ADMIN_USERNAME,
    password,
  });
  assert.equal(response.status, 200);
  return response.json();
}
const postId = "11111111-1111-4111-8111-111111111111";
const draft = {
  title: "Investing ₹20,000",
  summary: "A practical monthly habit",
  body: "नमस्ते — Plan first.\n<script>alert('never execute')</script>",
  videoUrl: "https://www.youtube.com/watch?v=example",
};

function githubFixture({ conflict = false, loseReply = false } = {}) {
  const requests = [];
  let head = "a".repeat(40);
  let files = new Map();
  let staged = [];
  let lost = false;
  const reply = (value, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  const fetch = async (input, options) => {
    const url = new URL(input);
    assert.equal(url.origin, "https://api.github.com");
    assert.equal(options.headers.Authorization, "Bearer " + githubToken);
    const path = url.pathname.replace("/repos/imsagarjakhar/vlog", "");
    const body = options.body ? JSON.parse(options.body) : null;
    requests.push({ path, method: options.method, body });
    if (path === "/git/ref/heads/main") return reply({ object: { sha: head } });
    if (path.startsWith("/git/commits/") && options.method === "GET")
      return reply({ tree: { sha: "b".repeat(40) } });
    if (path.startsWith("/contents/")) {
      const file = path.slice("/contents/".length);
      const text = files.get(file);
      return text === undefined
        ? reply({}, 404)
        : reply({
            type: "file",
            encoding: "base64",
            content: Buffer.from(text, "utf8").toString("base64"),
          });
    }
    if (path === "/git/trees") {
      staged = body.tree;
      return reply({ sha: "c".repeat(40) });
    }
    if (path === "/git/commits") {
      assert.deepEqual(body.parents, [head]);
      return reply({ sha: "d".repeat(40) });
    }
    if (path === "/git/refs/heads/main") {
      assert.equal(body.force, false);
      if (conflict) return reply({ message: "Non-fast-forward" }, 422);
      for (const entry of staged) {
        if (entry.sha === null) files.delete(entry.path);
        else files.set(entry.path, entry.content);
      }
      head = body.sha;
      if (loseReply && !lost) {
        lost = true;
        throw new Error("Simulated connection loss after commit");
      }
      return reply({ object: { sha: head } });
    }
    throw new Error("Unexpected GitHub request: " + path);
  };
  return { requests, fetch, files: () => files };
}

test("publisher rejects unknown origins, unauthenticated writes and incomplete secrets", async () => {
  const bindings = env();
  assert.equal(
    (
      await call(
        "/login",
        bindings,
        { username: bindings.ADMIN_USERNAME, password },
        undefined,
        "POST",
        "https://evil.example",
      )
    ).status,
    403,
  );
  assert.equal(
    (await call("/posts", bindings, { draft, newId: postId })).status,
    401,
  );
  assert.equal(
    (await call("/health", { ...bindings, SESSION_SECRET: "short" })).status,
    503,
  );
  const preflight = await call(
    "/posts",
    bindings,
    undefined,
    undefined,
    "OPTIONS",
  );
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), origin);
  assert.equal(preflight.headers.get("Access-Control-Allow-Credentials"), null);
});
test("login uses rate limits and issues a signed, expiring session without repository credentials", async () => {
  const bindings = env();
  assert.equal(
    (
      await call("/login", bindings, {
        username: bindings.ADMIN_USERNAME,
        password: "incorrect",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await call(
        "/login",
        {
          ...bindings,
          LOGIN_LIMITER: { limit: async () => ({ success: false }) },
        },
        { username: bindings.ADMIN_USERNAME, password },
      )
    ).status,
    429,
  );
  const session = await login(bindings);
  assert.ok(session.expiresAt > Date.now());
  assert.ok(session.expiresAt <= Date.now() + 15 * 60000);
  assert.equal(JSON.stringify(session).includes(githubToken), false);
  assert.equal(JSON.stringify(session).includes(password), false);
  assert.equal(
    (
      await call(
        "/posts",
        bindings,
        { draft, newId: postId },
        session.token + "tampered",
      )
    ).status,
    401,
  );
  const originalNow = Date.now;
  try {
    Date.now = () => session.expiresAt + 1;
    assert.equal(
      (await call("/posts", bindings, { draft, newId: postId }, session.token))
        .status,
      401,
    );
  } finally {
    Date.now = originalNow;
  }
});
test("authenticated publishing commits UTF-8 post and index together, then edits and removes them", async () => {
  const bindings = env();
  const session = await login(bindings);
  const github = githubFixture();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = github.fetch;
  try {
    const response = await call(
      "/posts",
      bindings,
      { draft, newId: postId },
      session.token,
    );
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.post.body, draft.body);
    assert.equal(result.post.author, bindings.ADMIN_USERNAME);
    assert.equal(result.posts.length, 1);
    assert.ok(github.files().has(`vlogs/posts/${postId}.json`));
    assert.equal(
      JSON.parse(github.files().get("vlogs/index.json")).posts[0].title,
      draft.title,
    );
    const published = result.post;
    const edit = await call(
      "/posts",
      bindings,
      {
        draft: { ...draft, title: "Updated plan" },
        original: published,
        newId: postId,
      },
      session.token,
    );
    assert.equal(edit.status, 200);
    const updated = (await edit.json()).post;
    assert.equal(updated.createdAt, published.createdAt);
    assert.equal(updated.title, "Updated plan");
    const stale = await call(
      "/posts",
      bindings,
      {
        draft,
        original: { ...published, updatedAt: "2000-01-01T00:00:00.000Z" },
        newId: postId,
      },
      session.token,
    );
    assert.equal(stale.status, 502);
    assert.match((await stale.json()).error, /changed/);
    const remove = await call(
      `/posts/${postId}`,
      bindings,
      { updatedAt: updated.updatedAt },
      session.token,
      "DELETE",
    );
    assert.equal(remove.status, 200);
    assert.deepEqual((await remove.json()).posts, []);
    assert.equal(github.files().has(`vlogs/posts/${postId}.json`), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("a conflicting branch update leaves public files unchanged", async () => {
  const bindings = env();
  const session = await login(bindings);
  const github = githubFixture({ conflict: true });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = github.fetch;
  try {
    const response = await call(
      "/posts",
      bindings,
      { draft, newId: postId },
      session.token,
    );
    assert.equal(response.status, 502);
    assert.equal(github.files().size, 0);
    assert.match((await response.json()).error, /changed|rejected/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("retry after a lost publish response returns the same post without creating a duplicate commit", async () => {
  const bindings = env();
  const session = await login(bindings);
  const github = githubFixture({ loseReply: true });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = github.fetch;
  try {
    assert.equal(
      (await call("/posts", bindings, { draft, newId: postId }, session.token))
        .status,
      502,
    );
    assert.equal(
      (await call("/posts", bindings, { draft, newId: postId }, session.token))
        .status,
      200,
    );
    assert.equal(
      github.requests.filter(
        (item) => item.path === "/git/commits" && item.method === "POST",
      ).length,
      1,
    );
    assert.equal(
      JSON.parse(github.files().get("vlogs/index.json")).posts.length,
      1,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("publisher bounds input and rejects unsafe video URLs before writing", async () => {
  const bindings = env();
  const session = await login(bindings);
  const github = githubFixture();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = github.fetch;
  try {
    assert.equal(
      (
        await call(
          "/posts",
          bindings,
          { draft: { ...draft, body: "x".repeat(140000) }, newId: postId },
          session.token,
        )
      ).status,
      413,
    );
    assert.equal(
      (
        await call(
          "/posts",
          bindings,
          {
            draft: { ...draft, videoUrl: "javascript:alert(1)" },
            newId: postId,
          },
          session.token,
        )
      ).status,
      502,
    );
    assert.equal(github.requests.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
