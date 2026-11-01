import { stockChartUrl } from "../content/markets";
export function IndianMarketHelp({
  selectSymbol,
  expanded = false,
}: {
  selectSymbol: (symbol: string) => void;
  expanded?: boolean;
}) {
  return (
    <details className="indian-market-help" open={expanded || undefined}>
      <summary>Indian stock not loading?</summary>
      <p>
        TradingView’s search can show NSE listings, but NSE charts cannot load
        here. Choose the BSE listing for an end-of-day chart.
      </p>
      <div>
        <button type="button" onClick={() => selectSymbol("BSE:INFY")}>
          Open Infosys on BSE
        </button>
        <button type="button" onClick={() => selectSymbol("BSE:RELIANCE")}>
          Open Reliance on BSE
        </button>
        <a
          href={stockChartUrl("NSE:INFY")}
          target="_blank"
          rel="noopener noreferrer"
        >
          View NSE Infosys on TradingView ↗
        </a>
      </div>
    </details>
  );
}
