import {
  loadVlog as readPublicVlog,
  loadFeed as readPublicFeed,
  parseVlog,
  parseFeed,
  type Vlog,
  type VlogDraft,
  type VlogSummary,
} from "./repository";
export { repository } from "./repository";
export type { Vlog, VlogDraft, VlogSummary } from "./repository";
export type EditorSession = {
  username: string;
  token: string;
  expiresAt: number;
};
const origin = import.meta.env.VITE_VLOG_API_ORIGIN || "";
export const publisherConfigured = Boolean(origin);

export async function loadFeed(fresh = false) {
  if (!origin) return readPublicFeed(fresh);
  return parseFeed(await request("/public/posts", "GET"));
}

async function request(
  path: string,
  method: string,
  session?: EditorSession,
  body?: unknown,
) {
  if (!origin)
    throw new Error(
      "Publisher login is not connected yet. Please try again after the site owner completes setup.",
    );
  let response: Response;
  try {
    response = await fetch(origin + path, {
      method,
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(60000),
      headers: {
        ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new Error(
      path.startsWith("/public/")
        ? "Could not load the blogs. Check your connection and try again."
        : "Could not reach the publishing service. Your draft is still in this tab; try again.",
    );
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : "Publishing is unavailable right now. Please try again.",
    );
  return result;
}
export async function logIn(
  username: string,
  password: string,
): Promise<EditorSession> {
  const result = await request("/login", "POST", undefined, {
    username: username.trim(),
    password,
  });
  if (
    typeof result.username !== "string" ||
    typeof result.token !== "string" ||
    !result.token ||
    result.token.length > 2048 ||
    !Number.isFinite(result.expiresAt) ||
    result.expiresAt <= Date.now() ||
    result.expiresAt > Date.now() + 16 * 60000
  )
    throw new Error("The publishing service returned an invalid session.");
  return result;
}
export async function loadVlog(
  post: VlogSummary,
  session?: EditorSession,
): Promise<Vlog> {
  if (!session && !origin) return readPublicVlog(post);
  return parseVlog(
    await request(
      `${session ? "" : "/public"}/posts/${encodeURIComponent(post.id)}`,
      "GET",
      session,
    ),
    post.id,
  );
}
export async function publishVlog(
  session: EditorSession,
  draft: VlogDraft,
  original?: Vlog,
  newId?: string,
): Promise<{ post: Vlog; posts: VlogSummary[] }> {
  const result = await request("/posts", "POST", session, {
    draft,
    original: original
      ? { id: original.id, updatedAt: original.updatedAt }
      : null,
    newId,
  });
  return {
    post: parseVlog(result.post),
    posts: parseFeed({ version: 1, posts: result.posts }).posts,
  };
}
export async function deleteVlog(
  session: EditorSession,
  post: VlogSummary,
): Promise<VlogSummary[]> {
  const result = await request(
    `/posts/${encodeURIComponent(post.id)}`,
    "DELETE",
    session,
    { updatedAt: post.updatedAt },
  );
  return parseFeed({ version: 1, posts: result.posts }).posts;
}
