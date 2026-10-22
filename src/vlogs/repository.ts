export const repository = {
  owner: "imsagarjakhar",
  name: "vlog",
  branch: "main",
};
const apiRoot = `https://api.github.com/repos/${repository.owner}/${repository.name}`;
const rawRoot = `https://raw.githubusercontent.com/${repository.owner}/${repository.name}/${repository.branch}/`;
const indexFile = "vlogs/index.json";
const idPattern = /^[a-f0-9-]{36}$/;
const maxPosts = 500;

export type VlogSummary = {
  id: string;
  title: string;
  summary: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  videoUrl: string;
};
export type Vlog = VlogSummary & { body: string };
export type VlogFeed = { version: 1; posts: VlogSummary[] };
export type EditorSession = { username: string; token: string };
export type VlogDraft = {
  title: string;
  summary: string;
  body: string;
  videoUrl: string;
};

function message(status: number) {
  if (status === 401) return "Your GitHub session has expired. Log in again.";
  if (status === 403 || status === 429)
    return "GitHub declined this request. Check your token permissions or try again after its request limit resets.";
  if (status === 409 || status === 422)
    return "The repository changed or rejected this update. Refresh the posts and try again; your draft is still here.";
  if (status === 404)
    return "The repository, branch or post could not be found. Check repository access and try again.";
  return "GitHub is unavailable right now. Please try again; your draft has been kept.";
}
async function jsonRequest(
  url: string,
  options: RequestInit = {},
  missingIsEmpty = false,
  serverSide = false,
) {
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      // Workers have no browser cookie jar and reject the credentials option.
      ...(serverSide ? {} : { credentials: "omit" as RequestCredentials }),
      // Workerd only supports follow/manual; never forward the token on redirects.
      redirect: serverSide ? "manual" : "error",
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error(
      serverSide
        ? "The publishing API could not reach GitHub. Please try again; your draft is still here."
        : "Could not connect to GitHub. Check your connection and try again.",
    );
  }
  if (serverSide && response.status >= 300 && response.status < 400)
    throw new Error(
      "GitHub redirected the publishing request. Check the configured repository owner and name; your draft is still here.",
    );
  if (missingIsEmpty && response.status === 404) return null;
  if (!response.ok) throw new Error(message(response.status));
  const text = await response.text();
  if (text.length > 1_000_000)
    throw new Error("This content is too large to load safely.");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "The blog content could not be read. Please try again later.",
    );
  }
}
function api(
  path: string,
  session?: EditorSession,
  method = "GET",
  body?: unknown,
  missingIsEmpty = false,
) {
  return jsonRequest(
    apiRoot + path,
    {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
        ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
        ...(session ? { "User-Agent": "Money-Planner-Vlog-Publisher" } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    missingIsEmpty,
    Boolean(session),
  );
}
function plain(value: unknown, max: number, required = true): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new Error("A blog has missing or invalid content.");
  return value.trim();
}
export function videoLink(value: string): string {
  if (!value.trim()) return "";
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      value.length > 2048
    )
      throw new Error();
    return url.href;
  } catch {
    throw new Error(
      "Use a complete HTTPS link for the video, or leave it blank.",
    );
  }
}
function summary(value: any): VlogSummary {
  if (!value || typeof value !== "object" || !idPattern.test(value.id))
    throw new Error("A blog has an invalid identifier.");
  const createdAt = plain(value.createdAt, 30);
  const updatedAt = plain(value.updatedAt, 30);
  if (
    !Number.isFinite(Date.parse(createdAt)) ||
    !Number.isFinite(Date.parse(updatedAt))
  )
    throw new Error("A blog has an invalid date.");
  return {
    id: value.id,
    title: plain(value.title, 120),
    summary: plain(value.summary, 300),
    author: plain(value.author, 100),
    createdAt,
    updatedAt,
    videoUrl: videoLink(plain(value.videoUrl, 2048, false)),
  };
}
function feed(value: any): VlogFeed {
  if (value === null) return { version: 1, posts: [] };
  if (
    !value ||
    typeof value !== "object" ||
    value.version !== 1 ||
    !Array.isArray(value.posts) ||
    value.posts.length > maxPosts
  )
    throw new Error("The blog index has an unsupported format.");
  const posts = value.posts.map(summary);
  if (new Set(posts.map((post: VlogSummary) => post.id)).size !== posts.length)
    throw new Error("The blog index contains duplicate posts.");
  return {
    version: 1,
    posts: posts.sort((a: VlogSummary, b: VlogSummary) =>
      b.createdAt.localeCompare(a.createdAt),
    ),
  };
}
export function parseFeed(value: unknown): VlogFeed {
  return feed(value);
}
function decodeFile(value: any) {
  if (
    !value ||
    value.type !== "file" ||
    value.encoding !== "base64" ||
    typeof value.content !== "string"
  )
    throw new Error("GitHub returned an unsupported file format.");
  try {
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        Uint8Array.from(atob(value.content.replace(/\s/g, "")), (c) =>
          c.charCodeAt(0),
        ),
      ),
    );
  } catch {
    throw new Error("The stored blog file could not be read.");
  }
}
async function content(
  path: string,
  ref: string,
  session?: EditorSession,
  optional = false,
) {
  const result = await api(
    `/contents/${path}?ref=${encodeURIComponent(ref)}`,
    session,
    "GET",
    undefined,
    optional,
  );
  return result === null ? null : decodeFile(result);
}
export async function loadFeed(fresh = false): Promise<VlogFeed> {
  if (fresh)
    return feed(await content(indexFile, repository.branch, undefined, true));
  return feed(
    await jsonRequest(
      rawRoot + indexFile + `?minute=${Math.floor(Date.now() / 60000)}`,
      { cache: "no-cache" },
      true,
    ),
  );
}
export async function loadVlog(
  post: VlogSummary,
  session?: EditorSession,
): Promise<Vlog> {
  if (!idPattern.test(post.id)) throw new Error("Invalid blog identifier.");
  const path = `vlogs/posts/${post.id}.json`;
  if (session)
    return parseVlog(await content(path, repository.branch, session), post.id);
  try {
    const result = parseVlog(
      await jsonRequest(
        rawRoot + path + `?updated=${encodeURIComponent(post.updatedAt)}`,
        { cache: "no-cache" },
      ),
      post.id,
    );
    if (result.updatedAt !== post.updatedAt)
      throw new Error("Cached post version");
    return result;
  } catch {
    return parseVlog(await content(path, repository.branch), post.id);
  }
}
export function parseVlog(result: unknown, expectedId?: string): Vlog {
  const parsed = summary(result);
  if (expectedId && parsed.id !== expectedId)
    throw new Error("The requested blog did not match the stored file.");
  return { ...parsed, body: plain((result as Vlog).body, 20000) };
}
async function snapshot(session: EditorSession) {
  const ref = await api(
    `/git/ref/heads/${repository.branch}`,
    session,
    "GET",
    undefined,
    true,
  );
  if (!ref)
    throw new Error(
      "The content repository needs an initial commit. Add a README on its main branch in GitHub first, and check the publishing token's repository access.",
    );
  if (!/^[a-f0-9]{40}$/.test(ref.object?.sha))
    throw new Error(
      "The repository needs an initial commit. Add a README in GitHub first.",
    );
  const head = ref.object.sha as string;
  const commit = await api(`/git/commits/${head}`, session);
  if (!/^[a-f0-9]{40}$/.test(commit.tree?.sha))
    throw new Error("The repository tree could not be read.");
  return {
    head,
    tree: commit.tree.sha as string,
    data: feed(await content(indexFile, head, session, true)),
  };
}
async function commitChanges(
  session: EditorSession,
  state: Awaited<ReturnType<typeof snapshot>>,
  posts: VlogSummary[],
  change: { path: string; content: string } | { path: string; sha: null },
  message: string,
) {
  if (
    new TextEncoder().encode(JSON.stringify({ version: 1, posts })).byteLength >
    500000
  )
    throw new Error(
      "The blog index is full. Archive older posts before publishing more.",
    );
  const tree = await api("/git/trees", session, "POST", {
    base_tree: state.tree,
    tree: [
      {
        path: indexFile,
        mode: "100644",
        type: "blob",
        content: JSON.stringify({ version: 1, posts }, null, 2) + "\n",
      },
      { ...change, mode: "100644", type: "blob" },
    ],
  });
  const commit = await api("/git/commits", session, "POST", {
    message,
    tree: tree.sha,
    parents: [state.head],
  });
  await api(`/git/refs/heads/${repository.branch}`, session, "PATCH", {
    sha: commit.sha,
    force: false,
  });
}
export async function publishVlog(
  session: EditorSession,
  draft: VlogDraft,
  original?: Vlog,
  newId: string = crypto.randomUUID(),
): Promise<{ post: Vlog; posts: VlogSummary[] }> {
  const clean = {
    title: plain(draft.title, 120),
    summary: plain(draft.summary, 300),
    body: plain(draft.body, 20000),
    videoUrl: videoLink(draft.videoUrl),
  };
  const state = await snapshot(session);
  if (!idPattern.test(newId)) throw new Error("Invalid draft identifier.");
  const retry = !original && state.data.posts.find((post) => post.id === newId);
  if (retry) {
    const stored = await loadVlog(retry, session);
    if (
      stored.title === clean.title &&
      stored.summary === clean.summary &&
      stored.body === clean.body &&
      stored.videoUrl === clean.videoUrl &&
      stored.author === session.username
    )
      return { post: stored, posts: state.data.posts };
    throw new Error(
      "This draft may already have been published. Refresh the feed before creating another post.",
    );
  }
  const existing = original
    ? state.data.posts.find((post) => post.id === original.id)
    : undefined;
  if (original && (!existing || existing.updatedAt !== original.updatedAt))
    throw new Error(
      "Someone changed this post. Refresh and reopen it before editing; your draft has been kept.",
    );
  if (!original && state.data.posts.length >= maxPosts)
    throw new Error(
      "The blog index is full. Archive older posts before publishing more.",
    );
  const now = new Date().toISOString();
  const post: Vlog = {
    ...clean,
    id: original?.id || newId,
    author: existing?.author || session.username,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  const { body: _body, ...metadata } = post;
  const posts = [
    metadata,
    ...state.data.posts.filter((item) => item.id !== post.id),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  await commitChanges(
    session,
    state,
    posts,
    {
      path: `vlogs/posts/${post.id}.json`,
      content: JSON.stringify(post, null, 2) + "\n",
    },
    `${original ? "Update" : "Publish"} vlog: ${post.title}`,
  );
  return { post, posts };
}
export async function deleteVlog(
  session: EditorSession,
  post: VlogSummary,
): Promise<VlogSummary[]> {
  const state = await snapshot(session);
  const current = state.data.posts.find((item) => item.id === post.id);
  if (!current) return state.data.posts;
  if (current.updatedAt !== post.updatedAt)
    throw new Error("This post changed. Refresh the list before removing it.");
  const posts = state.data.posts.filter((item) => item.id !== post.id);
  await commitChanges(
    session,
    state,
    posts,
    { path: `vlogs/posts/${post.id}.json`, sha: null },
    `Remove vlog: ${current.title}`,
  );
  return posts;
}
