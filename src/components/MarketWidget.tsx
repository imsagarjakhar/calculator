import { countryByCode, widgetConfig } from "../content/markets";
import { canonicalStockSymbol } from "../markets/symbols";
import type { Ref } from "react";
export function MarketWidget({
  kind,
  country,
  range,
  view,
  symbol,
  iframeRef,
}: {
  kind: "indices" | "stocks" | "chart";
  country: ReturnType<typeof countryByCode>;
  range?: string;
  view?: string;
  symbol?: string;
  iframeRef?: Ref<HTMLIFrameElement>;
}) {
  const config = {
    ...widgetConfig(kind, country, range, view),
    ...(kind === "chart" && symbol
      ? { symbol: canonicalStockSymbol(symbol) }
      : {}),
  };
  // Direct third-party frames keep the provider on its own origin, rather than
  // executing provider scripts in a page that can read planner local storage.
  const names = {
    indices: "symbol-overview",
    stocks: "screener",
    chart: "advanced-chart",
  };
  const source = `https://www.tradingview-widget.com/embed-widget/${names[kind]}/?locale=en#${encodeURIComponent(JSON.stringify(config))}`;
  return (
    <div className={`market-embed market-embed-${kind}`}>
      <iframe
        ref={iframeRef}
        key={source}
        title={
          kind === "chart"
            ? `${symbol ?? country.stock} stock price chart`
            : `${country.name} ${kind === "indices" ? "market indices" : "stock list"}`
        }
        src={source}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
      />
      <a
        className="market-attribution"
        href="https://www.tradingview.com/"
        target="_blank"
        rel="noopener nofollow noreferrer"
      >
        Market data by TradingView ↗
      </a>
    </div>
  );
}
