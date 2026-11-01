import { useEffect, useRef, useState, type FormEvent } from "react";
import { useHub } from "./Vlogs";
import { request, publisherConfigured } from "../vlogs/client";
import {
  emptyWatchlists,
  normaliseSymbol,
  parseSavedWatchlists,
  parseWatchlists,
  type SavedWatchlists,
  type Watchlists,
} from "../markets/watchlists";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Could not update watchlists.";
export function MarketWatchlists({
  selectSymbol,
}: {
  selectSymbol: (symbol: string) => void;
}) {
  const hub = useHub();
  const [data, setData] = useState<SavedWatchlists>({
    ...emptyWatchlists(),
    revision: null,
  });
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [stock, setStock] = useState("");
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const sessionRef = useRef(hub.session);
  sessionRef.current = hub.session;
  const list = data.lists.find((item) => item.id === selected) ?? data.lists[0];
  const locked = !hub.session || !ready || loading || saving;

  useEffect(() => {
    if (!hub.session) {
      setReady(false);
      return;
    }
    let current = true;
    setLoading(true);
    setError("");
    request("/watchlists", "GET", hub.session)
      .then(parseSavedWatchlists)
      .then((result) => {
        if (!current) return;
        if (!dirtyRef.current) {
          setData(result);
          setSelected((previous) =>
            result.lists.some((item) => item.id === previous)
              ? previous
              : (result.lists[0]?.id ?? ""),
          );
        }
        setReady(true);
      })
      .catch((e) => {
        if (current) {
          setError(message(e));
          setReady(false);
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [hub.session, reload]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(next: Watchlists) {
    try {
      const clean = parseWatchlists(next);
      setData({ ...clean, revision: data.revision });
      dirtyRef.current = true;
      setDirty(true);
      setError("");
      setNotice("");
    } catch (e) {
      setError(message(e));
    }
  }
  function create(event: FormEvent) {
    event.preventDefault();
    if (locked) return;
    if (data.lists.length >= 20) {
      setError("You can save up to 20 watchlists.");
      return;
    }
    const id = crypto.randomUUID();
    change({
      version: 1,
      lists: [...data.lists, { id, name: name.trim(), symbols: [] }],
    });
    setSelected(id);
    setName("");
  }
  function add(value: string) {
    if (locked || !list) return;
    try {
      const next = normaliseSymbol(value);
      if (list.symbols.includes(next))
        throw new Error("This stock is already in the watchlist.");
      change({
        version: 1,
        lists: data.lists.map((item) =>
          item.id === list.id
            ? { ...item, symbols: [...item.symbols, next] }
            : item,
        ),
      });
      setStock("");
    } catch (e) {
      setError(message(e));
    }
  }
  async function save() {
    const session = hub.session;
    if (locked || savingRef.current || !session || !dirty) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = parseSavedWatchlists(
        await request("/watchlists", "POST", session, data),
      );
      if (sessionRef.current?.token !== session.token) return;
      setData(result);
      setDirty(false);
      dirtyRef.current = false;
      setNotice("Watchlists saved to your account.");
    } catch (e) {
      setError(message(e));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  return (
    <aside className="market-watchlists" aria-label="Your watchlists">
      <div className="watchlists-heading">
        <div>
          <p className="markets-kicker">Your collection</p>
          <h3>Watchlists</h3>
        </div>
        <span className="watchlists-count">
          {data.lists.length} {data.lists.length === 1 ? "list" : "lists"}
        </span>
      </div>
      {!hub.session ? (
        <div className="watchlists-login">
          <p>Create several lists and return to your saved symbols later.</p>
          <button type="button" onClick={hub.login}>
            Log in to save watchlists
          </button>
          <p className="market-help">
            Uses the existing site publisher account.{" "}
            {publisherConfigured
              ? ""
              : "Account connection is not configured in this preview."}
          </p>
          {dirty && (
            <p className="market-help">
              Your unsaved changes are still in this tab. Log in again to save.
            </p>
          )}
        </div>
      ) : (
        <>
          <label className="watchlist-select-label">
            Choose a watchlist
            <select
              value={list?.id ?? ""}
              disabled={locked || !list}
              onChange={(e) => setSelected(e.target.value)}
            >
              {!list && (
                <option value="">
                  {loading ? "Loading your watchlists…" : "No watchlists yet"}
                </option>
              )}
              {data.lists.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.symbols.length})
                </option>
              ))}
            </select>
          </label>
          {list && (
            <section
              className="watchlist-content"
              aria-label={`Stocks in ${list.name}`}
              aria-busy={loading}
            >
              <div className="watchlist-content-heading">
                <span>Saved stocks</span>
                <span>
                  {list.symbols.length}{" "}
                  {list.symbols.length === 1 ? "stock" : "stocks"}
                </span>
              </div>
              <ul className="watchlist-symbols">
                {list.symbols.map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      className="watchlist-symbol"
                      onClick={() => selectSymbol(item)}
                    >
                      <strong>{item.split(":")[1]}</strong>
                      <span>{item.split(":")[0]}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${item}`}
                      disabled={locked}
                      onClick={() =>
                        change({
                          version: 1,
                          lists: data.lists.map((entry) =>
                            entry.id === list.id
                              ? {
                                  ...entry,
                                  symbols: entry.symbols.filter(
                                    (ticker) => ticker !== item,
                                  ),
                                }
                              : entry,
                          ),
                        })
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              {list.symbols.length === 0 && (
                <div className="watchlist-empty" role="status">
                  <strong>{list.name} is empty</strong>
                  <p>
                    Add your first stock below. The list name does not
                    automatically add companies.
                  </p>
                </div>
              )}
              <form
                className="watchlist-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  add(stock);
                }}
              >
                <label htmlFor="watchlist-stock">
                  Add a stock · exchange:ticker
                </label>
                <div>
                  <input
                    id="watchlist-stock"
                    placeholder="NASDAQ:AAPL"
                    value={stock}
                    maxLength={66}
                    required
                    disabled={locked}
                    onChange={(e) => setStock(e.target.value)}
                  />
                  <button type="submit" disabled={locked || !stock.trim()}>
                    Add
                  </button>
                </div>
              </form>
            </section>
          )}
          {!list && !loading && ready && (
            <p className="market-help">
              Start a list for your ideas, favourite companies or a market you
              follow.
            </p>
          )}
          <details className="watchlist-storage">
            <summary>About saving</summary>
            <p className="market-help">
              Saved to the blog’s GitHub repository. Names and symbols are
              visible to anyone with repository access and remain in its
              history. Keep personal details out.
            </p>
          </details>
          <div className="watchlist-save">
            <span role="status">
              {loading
                ? "Loading saved lists…"
                : saving
                  ? "Saving…"
                  : !ready
                    ? "Saved lists not loaded"
                    : dirty
                      ? "Unsaved changes"
                      : "Up to date"}
            </span>
            <button
              className="primary"
              type="button"
              disabled={locked || !dirty}
              onClick={() => void save()}
            >
              Save watchlists
            </button>
            <button
              type="button"
              disabled={loading || saving}
              onClick={() => {
                if (
                  dirty &&
                  !window.confirm(
                    "Discard unsaved changes and reload your saved watchlists?",
                  )
                )
                  return;
                dirtyRef.current = false;
                setDirty(false);
                setReady(false);
                setReload((value) => value + 1);
              }}
            >
              Reload saved lists
            </button>
          </div>
          <div className="watchlist-management">
            <h4>Manage watchlists</h4>
            <form className="watchlist-form" onSubmit={create}>
              <label htmlFor="watchlist-name">New watchlist</label>
              <div>
                <input
                  id="watchlist-name"
                  placeholder="e.g. Long-term ideas"
                  maxLength={60}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={locked}
                />
                <button type="submit" disabled={locked || !name.trim()}>
                  Create
                </button>
              </div>
            </form>
            {list && (
              <>
                <details className="watchlist-manage">
                  <summary>Rename or delete this list</summary>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (locked) return;
                      const nextName = String(
                        new FormData(event.currentTarget).get("name") ?? "",
                      );
                      change({
                        version: 1,
                        lists: data.lists.map((item) =>
                          item.id === list.id
                            ? { ...item, name: nextName }
                            : item,
                        ),
                      });
                    }}
                    key={list.id + list.name}
                  >
                    <label>
                      List name
                      <input
                        name="name"
                        defaultValue={list.name}
                        required
                        maxLength={60}
                        disabled={locked}
                      />
                    </label>
                    <button type="submit" disabled={locked}>
                      Rename
                    </button>
                  </form>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Remove “${list.name}” from your watchlists? Save to confirm the deletion.`,
                        )
                      )
                        return;
                      change({
                        version: 1,
                        lists: data.lists.filter((item) => item.id !== list.id),
                      });
                      setSelected("");
                    }}
                  >
                    Delete this list
                  </button>
                </details>
              </>
            )}
          </div>
          <div className="watchlists-account">
            <span>Signed in as {hub.session.username}</span>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                if (
                  !dirty ||
                  window.confirm(
                    "Log out and discard unsaved watchlist changes?",
                  )
                ) {
                  setData({ ...emptyWatchlists(), revision: null });
                  setDirty(false);
                  dirtyRef.current = false;
                  setSelected("");
                  hub.logout();
                }
              }}
            >
              Log out
            </button>
          </div>
        </>
      )}
      {error && (
        <p className="vlog-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="watchlist-notice" role="status">
          {notice}
        </p>
      )}
    </aside>
  );
}
