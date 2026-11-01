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
        In the chart’s stock search, choose <strong>All sources → BSE</strong>,
        then search any Indian company. This keeps results on BSE instead of
        restricted NSE listings. BSE charts use end-of-day data.
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
