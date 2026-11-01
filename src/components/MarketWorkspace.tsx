import { useEffect, useRef, useState } from "react";
import { useHub } from "./Vlogs";
import { readChartStock, type ChartStock } from "../markets/chartSymbol";
import {
  countryByCode,
  needsExternalChart,
  stockChartUrl,
} from "../content/markets";
import { MarketWidget } from "./MarketWidget";
import { MarketWatchlists } from "./MarketWatchlists";
import { IndianMarketHelp } from "./IndianMarketHelp";

export function MarketWorkspace({
  open,
  close,
  country,
  symbol,
  selectSymbol,
  chartRevision,
}: {
  open: boolean;
  close: () => void;
  country: ReturnType<typeof countryByCode>;
  symbol: string;
  selectSymbol: (symbol: string) => void;
  chartRevision: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const chart = useRef<HTMLIFrameElement>(null);
  const hub = useHub();
  const [candidate, setCandidate] = useState<ChartStock | null>(null);
  const [reading, setReading] = useState(false);
  const [chartError, setChartError] = useState("");
  const requestId = useRef(0);
  useEffect(() => {
    requestId.current++;
    setReading(false);
    setCandidate(null);
    setChartError("");
  }, [open, chartRevision, symbol]);
  async function bookmark() {
    if (!hub.session) {
      hub.login();
      return;
    }
    if (!chart.current || reading) return;
    const current = ++requestId.current;
    setReading(true);
    setChartError("");
    try {
      const stock = await readChartStock(chart.current);
      if (requestId.current === current) setCandidate(stock);
    } catch (error) {
      if (requestId.current === current)
        setChartError(
          error instanceof Error
            ? error.message
            : "Could not read the chart stock.",
        );
    } finally {
      if (requestId.current === current) setReading(false);
    }
  }
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
          <p className="market-help">
            Click the stock name or symbol in the chart to search. Use its time
            controls to change the range.
          </p>
          {open && (
            <IndianMarketHelp
              selectSymbol={selectSymbol}
              expanded={country.code === "in"}
            />
          )}
          {!needsExternalChart(symbol) && (
            <div className="market-chart-actions">
              <span>Search in the chart, then bookmark your stock.</span>
              <button
                type="button"
                className="market-bookmark"
                aria-label="Add chart stock to watchlist"
                title="Add chart stock to watchlist"
                disabled={reading}
                aria-busy={reading}
                onClick={() => void bookmark()}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M6 3h12v18l-6-4-6 4z" />
                  <path d="M9 9h6m-3-3v6" />
                </svg>
                {reading && <span>Reading…</span>}
              </button>
            </div>
          )}
          {chartError && (
            <p role="alert" className="vlog-error">
              {chartError}
            </p>
          )}
          {open &&
            (needsExternalChart(symbol) ? (
              <div className="market-country-fallback market-chart-fallback">
                <h3>This search opens on TradingView.</h3>
                <p>
                  {symbol.includes(":")
                    ? "This exchange is not licensed for public embedded charts."
                    : "Choose the exact company listing on TradingView or select another stock from your watchlist."}
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
                iframeRef={chart}
                key={chartRevision}
                country={country}
                kind="chart"
                symbol={symbol}
              />
            ))}
          {!needsExternalChart(symbol) && (
            <p className="market-help">
              Use the chart’s left toolbar for trend lines, drawing shapes, text
              and measurements. Tools depend on the provider. Only watchlists
              are saved to your account; drawings reset when the chart reloads.
            </p>
          )}
        </section>
        <MarketWatchlists
          selectSymbol={selectSymbol}
          candidate={candidate}
          clearCandidate={() => setCandidate(null)}
        />
      </div>
    </dialog>
  );
}
