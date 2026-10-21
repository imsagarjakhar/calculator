import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  deleteVlog,
  loadFeed,
  loadVlog,
  logIn,
  publishVlog,
  publisherConfigured,
  repository,
  type EditorSession,
  type Vlog,
  type VlogDraft,
  type VlogSummary,
} from "../vlogs/client";
import "../styles/vlogs.css";

type Hub = {
  session: EditorSession | null;
  posts: VlogSummary[];
  loading: boolean;
  error: string;
  notice: string;
  busy: boolean;
  login: () => void;
  logout: () => void;
  refresh: () => void;
  create: () => void;
  read: (post: VlogSummary, edit?: boolean) => void;
  remove: (post: VlogSummary) => void;
};
const VlogContext = createContext<Hub | null>(null);
function useHub() {
  return useContext(VlogContext)!;
}
const blank: VlogDraft = { title: "", summary: "", body: "", videoUrl: "" };
const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));

function Modal({
  title,
  children,
  close,
  busy = false,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  busy?: boolean;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current!;
    node.showModal();
    return () => {
      node.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`vlog-modal${wide ? " vlog-modal-wide" : ""}`}
      aria-labelledby="vlogModalTitle"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) close();
      }}
      onClick={(event) => {
        if (busy || event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          close();
      }}
    >
      <div className="vlog-modal-heading">
        <div>
          <p className="eyebrow">INTIMETEC / VLOGS</p>
          <h2 id="vlogModalTitle">{title}</h2>
        </div>
        <button
          type="button"
          className="vlog-close"
          aria-label="Close vlog window"
          disabled={busy}
          onClick={close}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function VlogProvider({
  children,
  active = true,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  const [session, setSession] = useState<EditorSession | null>(null);
  const [posts, setPosts] = useState<VlogSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [current, setCurrent] = useState<Vlog | null>(null);
  const [original, setOriginal] = useState<Vlog | undefined>();
  const [draft, setDraft] = useState<VlogDraft>({ ...blank });
  const [dirty, setDirty] = useState(false);
  const [formError, setFormError] = useState("");
  const refreshing = useRef(false);
  const mounted = useRef(true);
  const operation = useRef(false);
  const draftId = useRef("");
  const revision = useRef(0);
  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(
      () => {
        setSession(null);
        setNotice(
          "Your publisher session expired. Log in again to continue publishing.",
        );
      },
      Math.max(0, session.expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [session]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function refresh(fresh = false) {
    if (refreshing.current) return;
    refreshing.current = true;
    const startedAt = revision.current;
    setLoading(true);
    try {
      const result = await loadFeed(fresh);
      if (mounted.current && startedAt === revision.current) {
        setPosts(result.posts);
        setError("");
      }
    } catch (problem) {
      if (mounted.current) setError(errorText(problem));
    } finally {
      refreshing.current = false;
      if (mounted.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (!active) {
      setLoginOpen(false);
      setCurrent(null);
      return;
    }
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !operation.current)
        void refresh();
    }, 120000);
    return () => window.clearInterval(timer);
  }, [active]);
  useEffect(() => {
    if (!dirty || !editorOpen) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, editorOpen]);
  function closeEditor() {
    if (busy || (dirty && !window.confirm("Discard this unpublished draft?")))
      return;
    setEditorOpen(false);
    setDirty(false);
    setDraft({ ...blank });
    setOriginal(undefined);
    setFormError("");
  }
  async function read(post: VlogSummary, edit = false) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await loadVlog(post, session || undefined);
      if (!mounted.current) return;
      if (edit && session) {
        draftId.current = result.id;
        setDraft({
          title: result.title,
          summary: result.summary,
          body: result.body,
          videoUrl: result.videoUrl,
        });
        setOriginal(result);
        setDirty(false);
        setFormError("");
        setEditorOpen(true);
      } else setCurrent(result);
    } catch (problem) {
      if (mounted.current) setError(errorText(problem));
    } finally {
      operation.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!session || operation.current) return;
    operation.current = true;
    setBusy(true);
    setFormError("");
    try {
      const result = await publishVlog(
        session,
        draft,
        original,
        draftId.current || undefined,
      );
      if (!mounted.current) return;
      revision.current++;
      setPosts(result.posts);
      setEditorOpen(false);
      setDirty(false);
      setDraft({ ...blank });
      setOriginal(undefined);
      setNotice(
        "Published. Your vlog is now in the public repository; no website deployment is needed.",
      );
      setError("");
    } catch (problem) {
      if (mounted.current) setFormError(errorText(problem));
    } finally {
      operation.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function remove(post: VlogSummary) {
    if (
      !session ||
      operation.current ||
      !window.confirm(
        `Remove “${post.title}” from the website? Its GitHub history will remain public.`,
      )
    )
      return;
    operation.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await deleteVlog(session, post);
      if (mounted.current) {
        revision.current++;
        setPosts(result);
        setNotice("Vlog removed from the feed.");
      }
    } catch (problem) {
      if (mounted.current) setError(errorText(problem));
    } finally {
      operation.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const hub: Hub = {
    session,
    posts,
    loading,
    error,
    notice,
    busy,
    login: () => {
      setFormError("");
      setLoginOpen(true);
    },
    logout: () => {
      if (!operation.current) {
        setSession(null);
        setNotice(
          "Logged out. Your publisher session has been cleared from this page.",
        );
      }
    },
    refresh: () => {
      if (!operation.current) void refresh(true);
    },
    create: () => {
      if (session) {
        draftId.current = crypto.randomUUID();
        setDraft({ ...blank });
        setOriginal(undefined);
        setDirty(false);
        setFormError("");
        setEditorOpen(true);
      }
    },
    read: (post, edit) => {
      void read(post, edit);
    },
    remove: (post) => {
      void remove(post);
    },
  };
  return (
    <VlogContext.Provider value={hub}>
      {children}
      {loginOpen && (
        <LoginModal
          close={() => setLoginOpen(false)}
          success={(result) => {
            setSession(result);
            setLoginOpen(false);
            setNotice(
              `Welcome, ${result.username}. You can now add or edit vlogs.`,
            );
          }}
        />
      )}
      {editorOpen && session && (
        <Modal
          title={original ? "Edit vlog" : "Add a vlog"}
          close={closeEditor}
          busy={busy}
          wide
        >
          <p className="vlog-helper">
            Share an update, an idea or a video. Publishing makes this content
            public.
          </p>
          <form className="vlog-form" onSubmit={publish}>
            <label>
              Title
              <input
                value={draft.title}
                maxLength={120}
                required
                disabled={busy}
                onChange={(event) => {
                  setDraft({ ...draft, title: event.target.value });
                  setDirty(true);
                }}
              />
            </label>
            <label>
              Short introduction
              <textarea
                value={draft.summary}
                maxLength={300}
                rows={2}
                required
                disabled={busy}
                onChange={(event) => {
                  setDraft({ ...draft, summary: event.target.value });
                  setDirty(true);
                }}
              />
            </label>
            <label>
              Content
              <textarea
                className="vlog-body-input"
                value={draft.body}
                maxLength={20000}
                rows={10}
                required
                disabled={busy}
                onChange={(event) => {
                  setDraft({ ...draft, body: event.target.value });
                  setDirty(true);
                }}
              />
            </label>
            <label>
              Video link <span className="vlog-optional">(optional)</span>
              <input
                type="url"
                value={draft.videoUrl}
                maxLength={2048}
                placeholder="https://www.youtube.com/watch?v=…"
                disabled={busy}
                onChange={(event) => {
                  setDraft({ ...draft, videoUrl: event.target.value });
                  setDirty(true);
                }}
              />
            </label>
            <p className="vlog-helper">
              Text is published as written. HTML and scripts are not executed.
              Your draft stays in this tab until you publish or discard it.
            </p>
            {formError && (
              <p className="vlog-error" role="alert">
                {formError}
              </p>
            )}
            <div className="vlog-form-actions">
              <button className="primary" type="submit" disabled={busy}>
                {busy
                  ? "Publishing…"
                  : original
                    ? "Publish changes"
                    : "Publish vlog"}
              </button>
              <button type="button" disabled={busy} onClick={closeEditor}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
      {current && (
        <Modal title={current.title} close={() => setCurrent(null)} wide>
          <p className="vlog-byline">
            {dateLabel(current.createdAt)} · {current.author}
            {current.updatedAt !== current.createdAt
              ? ` · Updated ${dateLabel(current.updatedAt)}`
              : ""}
          </p>
          <p className="vlog-reader-summary">{current.summary}</p>
          <div className="vlog-reader-body">{current.body}</div>
          {current.videoUrl && (
            <a
              className="vlog-video"
              href={current.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Watch the video <span aria-hidden="true">↗</span>
            </a>
          )}
        </Modal>
      )}
    </VlogContext.Provider>
  );
}

function LoginModal({
  close,
  success,
}: {
  close: () => void;
  success: (session: EditorSession) => void;
}) {
  const [username, setUsername] = useState(repository.owner);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await logIn(username, password);
      setPassword("");
      success(result);
    } catch (problem) {
      setError(errorText(problem));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Publisher login" close={close} busy={busy}>
      <p className="vlog-helper">
        For the INTIMETEC site publisher. Visitors can read every vlog without
        logging in.
      </p>
      {!publisherConfigured ? (
        <p className="vlog-error" role="status">
          Publisher login is not connected yet. Please try again after setup is
          complete.
        </p>
      ) : (
        <form className="vlog-form" onSubmit={submit}>
          <label>
            Publisher username
            <input
              autoComplete="username"
              value={username}
              required
              maxLength={100}
              disabled={busy}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              required
              maxLength={300}
              disabled={busy}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <p className="vlog-helper">
            Use your publisher password, not your GitHub password. Your session
            stays in this tab and expires after 15 minutes. Passwords are not
            saved by this website.
          </p>
          {error && (
            <p className="vlog-error" role="alert">
              {error}
            </p>
          )}
          <div className="vlog-form-actions">
            <button className="primary" type="submit" disabled={busy}>
              {busy ? "Checking access…" : "Log in"}
            </button>
            <button type="button" onClick={close} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function VlogAccountButton() {
  const hub = useHub();
  return (
    <div className="vlog-account">
      {hub.session ? (
        <>
          <span className="vlog-user">{hub.session.username}</span>
          <button
            type="button"
            className="primary"
            onClick={hub.create}
            disabled={hub.busy}
          >
            + Add vlog
          </button>
          <button
            type="button"
            className="ghost"
            onClick={hub.logout}
            disabled={hub.busy}
          >
            Log out
          </button>
        </>
      ) : (
        <button type="button" className="vlog-login-button" onClick={hub.login}>
          Login <span aria-hidden="true">↗</span>
        </button>
      )}
    </div>
  );
}

export function VlogFeed() {
  const hub = useHub();
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(6);
  const filtered = hub.posts.filter((post) =>
    `${post.title} ${post.summary}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="vlog-section" aria-labelledby="vlogsTitle" id="vlogs">
      <div className="vlog-section-heading">
        <div>
          <p className="eyebrow">IDEAS, UPDATES &amp; PERSPECTIVE</p>
          <h2 id="vlogsTitle">The INTIMETEC vlog</h2>
          <p>Money conversations, shared one post at a time.</p>
        </div>
        <button
          type="button"
          className="ghost"
          disabled={hub.loading || hub.busy}
          onClick={hub.refresh}
        >
          {hub.loading ? "Loading…" : "Refresh vlogs"}
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
      {hub.posts.length > 0 && (
        <label className="vlog-search">
          Find a vlog
          <input
            type="search"
            value={query}
            placeholder="Search titles and introductions"
            onChange={(event) => {
              setQuery(event.target.value);
              setVisible(6);
            }}
          />
        </label>
      )}
      {!hub.posts.length && !hub.loading && !hub.error && (
        <div className="vlog-empty">
          <span aria-hidden="true">✎</span>
          <h3>A new conversation starts here.</h3>
          <p>Our first vlog is on the way. Come back for updates and ideas.</p>
          {hub.session && (
            <button type="button" className="primary" onClick={hub.create}>
              Write the first vlog
            </button>
          )}
        </div>
      )}
      {hub.loading && !hub.posts.length && (
        <p className="vlog-helper" role="status">
          Loading the latest vlogs…
        </p>
      )}
      {hub.posts.length > 0 && !filtered.length && (
        <p className="vlog-helper">No vlogs match your search.</p>
      )}
      <div className="vlog-grid">
        {filtered.slice(0, visible).map((post) => (
          <article className="vlog-card" key={post.id}>
            <div className="vlog-card-top">
              <span className="vlog-kind">
                {post.videoUrl ? "VIDEO & STORY" : "STORY"}
              </span>
              <time dateTime={post.createdAt}>{dateLabel(post.createdAt)}</time>
            </div>
            <h3>
              <button
                type="button"
                className="vlog-title-button"
                onClick={() => hub.read(post)}
                disabled={hub.busy}
              >
                {post.title}
              </button>
            </h3>
            <p>{post.summary}</p>
            <div className="vlog-card-bottom">
              <button
                type="button"
                className="vlog-read"
                disabled={hub.busy}
                onClick={() => hub.read(post)}
              >
                Read vlog <span aria-hidden="true">↗</span>
              </button>
              <span>by {post.author}</span>
            </div>
            {hub.session && (
              <div className="vlog-owner-actions">
                <button
                  type="button"
                  disabled={hub.busy}
                  onClick={() => hub.read(post, true)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={hub.busy}
                  onClick={() => hub.remove(post)}
                >
                  Remove
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      {filtered.length > visible && (
        <button
          type="button"
          className="vlog-more"
          onClick={() => setVisible((count) => count + 6)}
        >
          Show more vlogs ({filtered.length - visible})
        </button>
      )}
      <p className="vlog-feed-foot">
        Published posts are public. Refresh to check for the latest updates.
      </p>
    </section>
  );
}
