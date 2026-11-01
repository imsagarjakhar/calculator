import { repository, type EditorSession } from "../src/vlogs/repository";
import {
  emptyWatchlists,
  parseWatchlists,
  type Watchlists,
} from "../src/markets/watchlists";
export class WatchlistError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function fileUrl(session: EditorSession) {
  // Derive the namespace from the verified account, never a request parameter.
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(session.username),
  );
  const key = Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  return `https://api.github.com/repos/${repository.owner}/${repository.name}/contents/watchlists/${key}.json`;
}
async function request(session: EditorSession, method: string, body?: unknown) {
  let response: Response;
  try {
    response = await fetch(
      (await fileUrl(session)) +
        (method === "GET" ? `?ref=${repository.branch}` : ""),
      {
        method,
        redirect: "manual",
        signal: AbortSignal.timeout(20000),
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${session.token}`,
          "X-GitHub-Api-Version": "2026-03-10",
          "User-Agent": "Financial-AI-Planner-Watchlists",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
  } catch {
    throw new WatchlistError(
      502,
      "Could not reach watchlist storage. Your changes are still in this tab.",
    );
  }
  if (response.status === 404 && method === "GET") return null;
  if (response.status === 409 || response.status === 422)
    throw new WatchlistError(
      409,
      "Saved watchlists changed in another tab. Your changes are kept here. Reload saved lists to use the latest version.",
    );
  if (!response.ok)
    throw new WatchlistError(
      502,
      "Watchlist storage is unavailable. Your changes are still in this tab; try again.",
    );
  const text = await response.text();
  if (text.length > 250000)
    throw new WatchlistError(502, "The saved watchlist file is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new WatchlistError(502, "Could not read the saved watchlists.");
  }
}
export async function readWatchlists(session: EditorSession) {
  const file = await request(session, "GET");
  if (!file) return { ...emptyWatchlists(), revision: null };
  try {
    if (
      file.type !== "file" ||
      file.encoding !== "base64" ||
      typeof file.content !== "string" ||
      file.content.length > 200000 ||
      !/^[a-f0-9]{40,64}$/.test(file.sha)
    )
      throw new Error();
    const text = new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(atob(file.content.replace(/\s/g, "")), (c) =>
        c.charCodeAt(0),
      ),
    );
    return {
      ...parseWatchlists(JSON.parse(text)),
      revision: file.sha as string,
    };
  } catch {
    throw new WatchlistError(
      502,
      "The saved watchlist file is invalid. It has not been overwritten.",
    );
  }
}
export async function writeWatchlists(
  session: EditorSession,
  data: Watchlists,
  revision: unknown,
) {
  let clean: Watchlists;
  try {
    clean = parseWatchlists(data);
  } catch (e) {
    throw new WatchlistError(400, (e as Error).message);
  }
  if (
    !(
      revision === null ||
      (typeof revision === "string" && /^[a-f0-9]{40,64}$/.test(revision))
    )
  )
    throw new WatchlistError(
      400,
      "Invalid watchlist version. Reload saved lists first.",
    );
  const bytes = new TextEncoder().encode(JSON.stringify(clean));
  const content = btoa(
    Array.from(bytes, (b) => String.fromCharCode(b)).join(""),
  );
  const result = await request(session, "PUT", {
    message: "Update saved market watchlists",
    branch: repository.branch,
    content,
    ...(revision ? { sha: revision } : {}),
  });
  if (!result?.content?.sha || !/^[a-f0-9]{40,64}$/.test(result.content.sha))
    throw new WatchlistError(
      502,
      "The save could not be confirmed. Reload saved lists before trying again.",
    );
  return { ...clean, revision: result.content.sha as string };
}
