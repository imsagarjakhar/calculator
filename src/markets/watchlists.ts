export type Watchlist = { id: string; name: string; symbols: string[] };
export type Watchlists = { version: 1; lists: Watchlist[] };
export type SavedWatchlists = Watchlists & { revision: string | null };
export const emptyWatchlists = (): Watchlists => ({ version: 1, lists: [] });
export function normaliseSymbol(value: string) {
  const symbol = value.trim().toUpperCase();
  if (!/^[A-Z0-9_]{1,25}:[A-Z0-9_.!/-]{1,40}$/.test(symbol))
    throw new Error(
      "Enter an exchange and ticker, such as NASDAQ:AAPL or BSE:500209.",
    );
  return symbol;
}
export function parseWatchlists(value: unknown): Watchlists {
  if (!value || typeof value !== "object")
    throw new Error("Invalid watchlist data.");
  const data = value as Record<string, unknown>;
  if (
    data.version !== 1 ||
    !Array.isArray(data.lists) ||
    data.lists.length > 20
  )
    throw new Error("You can save up to 20 watchlists.");
  const ids = new Set<string>();
  const lists = data.lists.map((item): Watchlist => {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.id !== "string" ||
      !/^[a-f0-9-]{36}$/.test(item.id) ||
      ids.has(item.id) ||
      typeof item.name !== "string" ||
      !item.name.trim() ||
      item.name.length > 60 ||
      !Array.isArray(item.symbols) ||
      item.symbols.length > 50
    )
      throw new Error(
        "Each watchlist needs a name (up to 60 characters) and at most 50 symbols.",
      );
    ids.add(item.id);
    const symbols = item.symbols.map((symbol: unknown) => {
      if (typeof symbol !== "string") throw new Error("Invalid stock symbol.");
      return normaliseSymbol(symbol);
    });
    if (new Set(symbols).size !== symbols.length)
      throw new Error("This stock is already in the watchlist.");
    return { id: item.id, name: item.name.trim(), symbols };
  });
  return { version: 1, lists };
}
export function parseSavedWatchlists(value: unknown): SavedWatchlists {
  const data = value as SavedWatchlists;
  if (
    !data ||
    !(
      data.revision === null ||
      (typeof data.revision === "string" &&
        /^[a-f0-9]{40,64}$/.test(data.revision))
    )
  )
    throw new Error("The watchlist service returned an invalid version.");
  return { ...parseWatchlists(data), revision: data.revision };
}
