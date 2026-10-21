import {
  deleteVlog,
  loadVlog,
  publishVlog,
  type EditorSession,
  type Vlog,
  type VlogDraft,
  type VlogSummary,
} from "../src/vlogs/repository";

export type Env = {
  SITE_ORIGIN: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
  GH_VLOG_TOKEN: string;
  LOGIN_LIMITER: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
  WRITE_LIMITER: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
};
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const encoder = new TextEncoder();
const idPattern = /^[a-f0-9-]{36}$/;
const encode = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
function decode(value: string) {
  return Uint8Array.from(
    atob(value.replaceAll("-", "+").replaceAll("_", "/")),
    (c) => c.charCodeAt(0),
  );
}
function signingKey(env: Env) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(env.SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
async function issue(env: Env) {
  const expiresAt = Date.now() + 15 * 60 * 1000;
  const payload = encode(
    encoder.encode(
      JSON.stringify({
        username: env.ADMIN_USERNAME,
        expiresAt,
        audience: env.SITE_ORIGIN,
      }),
    ),
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(env),
    encoder.encode(payload),
  );
  return {
    username: env.ADMIN_USERNAME,
    token: payload + "." + encode(new Uint8Array(signature)),
    expiresAt,
  };
}
async function authenticate(
  request: Request,
  env: Env,
): Promise<EditorSession> {
  try {
    const token = request.headers
      .get("Authorization")
      ?.match(/^Bearer ([A-Za-z0-9_.-]{1,2048})$/)?.[1];
    if (!token) throw new Error();
    const parts = token.split(".");
    if (
      parts.length !== 2 ||
      !(await crypto.subtle.verify(
        "HMAC",
        await signingKey(env),
        decode(parts[1]),
        encoder.encode(parts[0]),
      ))
    )
      throw new Error();
    const data = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    if (
      data.username !== env.ADMIN_USERNAME ||
      data.audience !== env.SITE_ORIGIN ||
      !Number.isFinite(data.expiresAt) ||
      data.expiresAt <= Date.now()
    )
      throw new Error();
    return { username: env.ADMIN_USERNAME, token: env.GH_VLOG_TOKEN };
  } catch {
    throw new HttpError(
      401,
      "Your publisher session has expired. Log in again to continue.",
    );
  }
}
async function readJson(request: Request): Promise<any> {
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    throw new HttpError(415, "Send content as JSON.");
  const maxBytes = 128 * 1024;
  if (Number(request.headers.get("Content-Length")) > maxBytes)
    throw new HttpError(413, "This post is too large.");
  if (!request.body) throw new HttpError(400, "Missing request content.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "This post is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    if (!value || Array.isArray(value) || typeof value !== "object")
      throw new Error();
    return value;
  } catch {
    throw new HttpError(400, "The request contains invalid JSON.");
  }
}
function configured(env: Env) {
  return Boolean(
    env.GH_VLOG_TOKEN &&
      env.ADMIN_USERNAME &&
      env.ADMIN_PASSWORD?.length >= 20 &&
      env.SESSION_SECRET?.length >= 64 &&
      env.LOGIN_LIMITER &&
      env.WRITE_LIMITER,
  );
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      Vary: "Origin",
    });
    const respond = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), { status, headers });
    if (!env.SITE_ORIGIN || origin !== env.SITE_ORIGIN)
      return respond({ error: "This origin is not allowed." }, 403);
    headers.set("Access-Control-Allow-Origin", env.SITE_ORIGIN);
    headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (!configured(env))
      return respond(
        {
          error:
            "Publishing is not configured yet. Please contact the site owner.",
        },
        503,
      );
    try {
      const path = new URL(request.url).pathname;
      if (request.method === "GET" && path === "/health")
        return respond({ ready: true });
      if (request.method === "POST" && path === "/login") {
        const limited = await env.LOGIN_LIMITER.limit({
          key:
            "login:" + (request.headers.get("CF-Connecting-IP") || "unknown"),
        });
        if (!limited.success)
          throw new HttpError(
            429,
            "Too many login attempts. Wait a minute and try again.",
          );
        const data = await readJson(request);
        if (
          typeof data.username !== "string" ||
          data.username.length > 100 ||
          typeof data.password !== "string" ||
          data.password.length > 256
        )
          throw new HttpError(401, "The username or password is incorrect.");
        const key = await signingKey(env);
        const expected = await crypto.subtle.sign(
          "HMAC",
          key,
          encoder.encode(env.ADMIN_PASSWORD),
        );
        const passwordMatches = await crypto.subtle.verify(
          "HMAC",
          key,
          expected,
          encoder.encode(data.password),
        );
        if (!passwordMatches || data.username !== env.ADMIN_USERNAME)
          throw new HttpError(401, "The username or password is incorrect.");
        return respond(await issue(env));
      }
      const session = await authenticate(request, env);
      const match = path.match(/^\/posts\/([a-f0-9-]{36})$/);
      if (request.method === "GET" && match)
        return respond(
          await loadVlog({ id: match[1] } as VlogSummary, session),
        );
      if (
        !(await env.WRITE_LIMITER.limit({
          key: "publisher:" + session.username,
        }).then((result) => result.success))
      )
        throw new HttpError(
          429,
          "Too many updates. Wait a minute before publishing again.",
        );
      if (request.method === "POST" && path === "/posts") {
        const data = await readJson(request);
        if (
          !data.draft ||
          !["title", "summary", "body", "videoUrl"].every(
            (field) => typeof data.draft[field] === "string",
          ) ||
          !idPattern.test(data.newId)
        )
          throw new HttpError(400, "The post has missing or invalid fields.");
        if (
          data.original &&
          (!idPattern.test(data.original.id) ||
            typeof data.original.updatedAt !== "string" ||
            !Number.isFinite(Date.parse(data.original.updatedAt)))
        )
          throw new HttpError(400, "Invalid original post.");
        return respond(
          await publishVlog(
            session,
            data.draft as VlogDraft,
            data.original as Vlog | undefined,
            data.newId,
          ),
        );
      }
      if (request.method === "DELETE" && match) {
        const data = await readJson(request);
        if (
          typeof data.updatedAt !== "string" ||
          !Number.isFinite(Date.parse(data.updatedAt))
        )
          throw new HttpError(400, "Invalid post version.");
        const post = await loadVlog({ id: match[1] } as VlogSummary, session);
        return respond({
          posts: await deleteVlog(session, {
            ...post,
            updatedAt: data.updatedAt,
          }),
        });
      }
      return respond({ error: "This endpoint does not exist." }, 404);
    } catch (problem) {
      if (problem instanceof HttpError)
        return respond({ error: problem.message }, problem.status);
      // Repository errors are controlled messages; never serialize requests, headers or secrets.
      return respond(
        {
          error:
            problem instanceof Error
              ? problem.message
              : "Publishing is unavailable. Please try again.",
        },
        502,
      );
    }
  },
};
