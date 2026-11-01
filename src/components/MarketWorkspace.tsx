import { useEffect, useRef } from "react";
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
        <MarketWatchlists selectSymbol={selectSymbol} />
      </div>
    </dialog>
  );
}
