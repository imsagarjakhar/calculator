import { useEffect, useRef, useState } from "react";
import { loadVlog, type Vlog } from "../vlogs/client";
import type { Hub } from "./Vlogs";
import "../styles/vlog-mailbox.css";

const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
export function VlogMailbox({ hub }: { hub: Hub }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(
    () => new URLSearchParams(window.location.search).get("post") || "",
  );
  const [readerOpen, setReaderOpen] = useState(() =>
    new URLSearchParams(window.location.search).has("post"),
  );
  const [article, setArticle] = useState<Vlog | null>(null);
  const [loading, setLoading] = useState(false);
  const [readError, setReadError] = useState("");
  const [retry, setRetry] = useState(0);
  const reader = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const selected = hub.posts.find((p) => p.id === selectedId) || hub.posts[0];
  const filtered = hub.posts.filter((p) =>
    `${p.title} ${p.summary}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  useEffect(() => {
    if (hub.loading) return;
    if (selected?.id !== selectedId) setSelectedId(selected?.id || "");
  }, [selected?.id, selectedId, hub.loading]);
  useEffect(() => {
    let cancelled = false;
    setArticle(null);
    setReadError("");
    if (!selected) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void loadVlog(selected, hub.session || undefined)
      .then((result) => {
        if (!cancelled) setArticle(result);
      })
      .catch((error) => {
        if (!cancelled)
          setReadError(
            error instanceof Error
              ? error.message
              : "This blog could not be loaded. Please try again.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.id, selected?.updatedAt, hub.session?.token, retry]);
  useEffect(() => {
    if (reader.current) reader.current.scrollTop = 0;
    if (readerOpen && window.matchMedia("(max-width: 760px)").matches) {
      title.current?.focus({ preventScroll: true });
      reader.current?.scrollIntoView({ block: "start" });
    }
  }, [selected?.id, readerOpen, article]);
  function back() {
    setReaderOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("post");
    history.replaceState(null, "", url);
    requestAnimationFrame(() => {
      document
        .getElementById(`vlog-message-${selectedId}`)
        ?.focus({ preventScroll: true });
      list.current?.scrollIntoView({ block: "start" });
    });
  }
  const current = article?.id === selected?.id ? article : null;
  const count = hub.posts.length;
  return (
    <section className="vlog-section" aria-labelledby="vlogsTitle" id="vlogs">
      <div className="vlog-section-heading">
        <div>
          <p className="eyebrow">THE READING ROOM</p>
          <h2 id="vlogsTitle" tabIndex={-1}>
            The Financial AI Planner Blog
          </h2>
          <p>Ideas for your money. A little space to think.</p>
        </div>
        <button
          className="ghost vlog-refresh"
          onClick={hub.refresh}
          disabled={hub.loading || hub.busy}
        >
          <span aria-hidden="true">↻</span>
          {hub.loading ? "Refreshing…" : "Refresh blogs"}
        </button>
      </div>
      {hub.notice && (
        <p className="vlog-notice" role="status">
          {hub.notice}
        </p>
      )}
      {hub.error && (
        <p className="vlog-error" role="alert">
          {hub.error}
        </p>
      )}
      <div className={`vlog-mailbox${readerOpen ? " is-reading" : ""}`}>
        <aside className="vlog-index" aria-label="All blogs" ref={list}>
          <div className="vlog-index-heading">
            <div>
              <h3>All blogs</h3>
              <span>
                {count} {count === 1 ? "story" : "stories"}
              </span>
            </div>
            <label className="vlog-search">
              <span className="vlog-visually-hidden">Find a blog</span>
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={query}
                placeholder="Search blogs…"
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          <nav
            className="vlog-message-list"
            aria-label="Choose a blog"
            onKeyDown={(e) => {
              if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key))
                return;
              const buttons = Array.from(
                e.currentTarget.querySelectorAll<HTMLButtonElement>(
                  ".vlog-message",
                ),
              );
              const index = buttons.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              if (index < 0) return;
              e.preventDefault();
              const next =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? buttons.length - 1
                    : Math.max(
                        0,
                        Math.min(
                          buttons.length - 1,
                          index + (e.key === "ArrowDown" ? 1 : -1),
                        ),
                      );
              buttons[next]?.focus();
            }}
          >
            {filtered.map((post) => (
              <button
                type="button"
                id={`vlog-message-${post.id}`}
                key={post.id}
                className={`vlog-message${selected?.id === post.id ? " is-selected" : ""}`}
                aria-current={selected?.id === post.id ? "true" : undefined}
                aria-label={`Read ${post.title}`}
                onClick={() => {
                  setSelectedId(post.id);
                  setReaderOpen(true);
                  const url = new URL(window.location.href);
                  url.searchParams.set("post", post.id);
                  history.replaceState(null, "", url);
                }}
              >
                <span className="vlog-message-meta">
                  <span>{post.videoUrl ? "VIDEO & STORY" : "STORY"}</span>
                  <time dateTime={post.createdAt}>
                    {dateLabel(post.createdAt)}
                  </time>
                </span>
                <strong>{post.title}</strong>
                <span className="vlog-message-preview">{post.summary}</span>
                <span className="vlog-message-open" aria-hidden="true">
                  {selected?.id === post.id ? "Selected" : "Read story"}
                  <span>↗</span>
                </span>
              </button>
            ))}
            {!filtered.length && (
              <div className="vlog-list-empty" role="status">
                {hub.loading
                  ? "Loading the latest blogs…"
                  : query.trim()
                    ? "No matching blogs. Try another search."
                    : hub.error
                      ? "The list could not be loaded. Try Refresh blogs."
                      : "Our first blog is on the way."}
                {query.trim() && (
                  <button onClick={() => setQuery("")}>Clear search</button>
                )}
              </div>
            )}
          </nav>
          <div className="vlog-index-foot">
            {query.trim()
              ? `${filtered.length} matching ${filtered.length === 1 ? "story" : "stories"}`
              : "A fresh perspective, one story at a time."}
          </div>
        </aside>
        <div
          className="vlog-reading-pane"
          ref={reader}
          aria-label="Blog reading pane"
          aria-busy={loading}
        >
          <div className="vlog-reading-toolbar">
            <button className="vlog-back-to-list" onClick={back}>
              ← All blogs
            </button>
            <span className="vlog-reading-label">
              Financial AI Planner / JOURNAL
            </span>
            {hub.session && selected && (
              <div className="vlog-owner-actions">
                <button disabled={hub.busy} onClick={() => hub.edit(selected)}>
                  Edit
                </button>
                <button
                  disabled={hub.busy}
                  onClick={() => hub.remove(selected)}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          {selected ? (
            <article
              className="vlog-inline-article"
              aria-labelledby="vlogReaderTitle"
            >
              <div className="vlog-article-meta">
                <span className="vlog-kind">
                  {selected.videoUrl ? "VIDEO & STORY" : "STORY"}
                </span>
                <time dateTime={selected.createdAt}>
                  {dateLabel(selected.createdAt)}
                </time>
                {current && (
                  <span>
                    {Math.max(
                      1,
                      Math.ceil(current.body.trim().split(/\s+/).length / 200),
                    )}{" "}
                    min read
                  </span>
                )}
              </div>
              <h3 id="vlogReaderTitle" ref={title} tabIndex={-1}>
                {selected.title}
              </h3>
              <p className="vlog-reader-summary">{selected.summary}</p>
              {loading && (
                <div className="vlog-reading-loading" role="status">
                  <span />
                  <span />
                  <span />
                  <p>Opening the story…</p>
                </div>
              )}
              {readError && (
                <div className="vlog-error" role="alert">
                  <p>{readError}</p>
                  <button onClick={() => setRetry((n) => n + 1)}>
                    Try loading again
                  </button>
                </div>
              )}
              {!loading && current && (
                <>
                  {current.updatedAt !== current.createdAt && (
                    <p className="vlog-article-updated">
                      Updated {dateLabel(current.updatedAt)}
                    </p>
                  )}
                  {current.videoUrl && (
                    <a
                      className="vlog-video"
                      href={current.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ▷ Watch the video <span aria-hidden="true">↗</span>
                    </a>
                  )}
                  <div className="vlog-reader-body">{current.body}</div>
                  <footer className="vlog-article-end">
                    <span aria-hidden="true">✦</span>
                    <p>
                      A little more perspective.
                      <br />
                      <span>Choose another story from the list.</span>
                    </p>
                  </footer>
                </>
              )}
            </article>
          ) : (
            <div className="vlog-reader-empty">
              <span aria-hidden="true">▤</span>
              <h3>Your next good read starts here.</h3>
              <p>
                {hub.loading
                  ? "We’re bringing in the latest stories."
                  : "When a blog is published, you can open it here."}
              </p>
              {hub.session && (
                <button className="primary" onClick={hub.create}>
                  Write the first blog
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
