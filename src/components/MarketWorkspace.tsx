import { useEffect, useRef, useState } from "react";
import {
  countryByCode,
  marketPeriods,
  needsExternalChart,
  stockChartUrl,
} from "../content/markets";
import { MarketWidget } from "./MarketWidget";
import { MarketWatchlists } from "./MarketWatchlists";

export function MarketWorkspace({
  open,
  close,
  country,
  symbol,
  selectSymbol,
  range,
  setRange,
}: {
  open: boolean;
  close: () => void;
  country: ReturnType<typeof countryByCode>;
  symbol: string;
  selectSymbol: (symbol: string) => void;
  range: string;
  setRange: (range: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState(symbol);
  useEffect(() => {
    setSearch(symbol);
  }, [symbol]);
  useEffect(() => {
    const node = dialog.current!;
    if (!open) {
      node.close();
      return;
    }
    const previous = document.activeElement as HTMLElement | null;
    node.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      node.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="market-workspace"
      aria-labelledby="workspace-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header className="market-workspace-heading">
        <div>
          <p className="markets-kicker">Chart workspace</p>
          <h2 id="workspace-title">Your market desk.</h2>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close chart workspace"
        >
          Close ×
        </button>
      </header>
      <div className="market-workspace-body">
        <section
          className="market-workspace-chart"
          aria-label="Interactive stock chart"
        >
          <form
            className="market-symbol-search"
            onSubmit={(event) => {
              event.preventDefault();
              if (search.trim()) selectSymbol(search.trim().toUpperCase());
            }}
          >
            <label htmlFor="workspace-symbol">Chart symbol</label>
            <div>
              <input
                id="workspace-symbol"
                required
                maxLength={100}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="NASDAQ:AAPL"
              />
              <button type="submit">Show chart</button>
            </div>
          </form>
          <div
            className="market-periods"
            role="group"
            aria-label="Workspace chart time range"
          >
            {marketPeriods.map((period) => (
              <button
                key={period.range}
                type="button"
                aria-pressed={range === period.range}
                onClick={() => setRange(period.range)}
              >
                {period.label}
              </button>
            ))}
          </div>
          {open &&
            (needsExternalChart(symbol) ? (
              <div className="market-country-fallback market-chart-fallback">
                <h3>This search opens on TradingView.</h3>
                <p>
                  {symbol.includes(":")
                    ? "This exchange is not licensed for public embedded charts."
                    : "Choose the exact company listing on TradingView, or enter exchange:ticker above."}
                </p>
                <a
                  href={stockChartUrl(symbol)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open {symbol} on TradingView ↗
                </a>
              </div>
            ) : (
              <MarketWidget
                country={country}
                kind="chart"
                range={range}
                symbol={symbol}
              />
            ))}
          {!needsExternalChart(symbol) && (
            <p className="market-help">
              Use the chart’s left toolbar for trend lines, drawing shapes, text
              and measurements. Tools depend on the provider. Only watchlists
              are saved to your account; drawings reset when the chart reloads.
              If a chart is unavailable,{" "}
              <a
                href={stockChartUrl(symbol)}
                target="_blank"
                rel="noopener noreferrer"
              >
                open {symbol} on TradingView ↗
              </a>
              .
            </p>
          )}
        </section>
        <MarketWatchlists symbol={symbol} selectSymbol={selectSymbol} />
      </div>
    </dialog>
  );
}
