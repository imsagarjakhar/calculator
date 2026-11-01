import { useState } from "react";
import { PlannerNavigation } from "../components/PlannerNavigation";
import {
  countryByCode,
  marketCountries,
  marketPeriods,
  widgetConfig,
  hasEmbeddedMarket,
  marketExternalUrl,
} from "../content/markets";

function MarketWidget({
  kind,
  country,
  range,
  view,
}: {
  kind: "indices" | "stocks" | "chart";
  country: ReturnType<typeof countryByCode>;
  range?: string;
  view?: string;
}) {
  const config = widgetConfig(kind, country, range, view);
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
        key={source}
        title={`${country.name} ${kind === "indices" ? "market indices" : kind === "stocks" ? "stock list" : "stock price chart"}`}
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
export function MarketsPage() {
  const [code, setCode] = useState("us");
  const [range, setRange] = useState("12M");
  const [view, setView] = useState("overview");
  const [revision, setRevision] = useState(0);
  const country = countryByCode(code);
  const embedded = hasEmbeddedMarket(country);
  return (
    <main className="planner-page markets-page">
      <PlannerNavigation />
      <header className="markets-hero">
        <div>
          <p className="markets-kicker">A wider view of your money.</p>
          <h1>
            The world’s markets.
            <br />
            One place to explore.
          </h1>
          <p>Explore indices, stock prices and the bigger picture over time.</p>
        </div>
        <div className="markets-globe" aria-hidden="true">
          <svg viewBox="0 0 180 180">
            <circle cx="90" cy="90" r="70" />
            <ellipse cx="90" cy="90" rx="34" ry="70" />
            <path d="M20 90h140M28 57h124M28 123h124M90 20v140" />
            <path
              className="markets-globe-trend"
              d="m34 119 30-24 21 7 24-34 32 7"
            />
          </svg>
        </div>
      </header>
      <section className="market-toolbar" aria-label="Market selection">
        <label>
          Choose a country
          <select
            aria-label="Market country"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setView("overview");
            }}
          >
            {[...new Set(marketCountries.map((item) => item.region))].map(
              (region) => (
                <optgroup label={region} key={region}>
                  {marketCountries
                    .filter((item) => item.region === region)
                    .map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.name}
                        {!hasEmbeddedMarket(item) ? " · external view" : ""}
                      </option>
                    ))}
                </optgroup>
              ),
            )}
          </select>
        </label>
        <div className="market-delay">
          <span>Exchange data · may be delayed</span>
          <p>Check the timestamp and market status shown by TradingView.</p>
        </div>
        <button type="button" onClick={() => setRevision((value) => value + 1)}>
          Reload market data ↻
        </button>
      </section>
      {!embedded && (
        <section className="market-country-fallback">
          <p className="markets-kicker">{country.name}</p>
          <h2>This market opens on TradingView.</h2>
          <p>
            The provider does not make this country’s stock list available in
            public embeds. Open its market page for prices and historical
            performance.
          </p>
          <a href={marketExternalUrl(country)} target="_blank" rel="noreferrer">
            Explore {country.name} stocks ↗
          </a>
          <div className="market-fallback-indices">
            {country.indices.map(([name, symbol]) => (
              <a
                key={symbol}
                href={`https://www.tradingview.com/symbols/${symbol.replace(":", "-")}/`}
                target="_blank"
                rel="noreferrer"
              >
                {name} ↗
              </a>
            ))}
          </div>
        </section>
      )}
      {embedded && (
        <div key={`${code}-${revision}`}>
          <section
            className="market-section"
            aria-labelledby="market-indices-title"
          >
            <div className="market-section-heading">
              <div>
                <p className="markets-kicker">01 / The big picture</p>
                <h2 id="market-indices-title">{country.name}: major indices</h2>
              </div>
              <span>{country.indices.map(([name]) => name).join(" · ")}</span>
            </div>
            <MarketWidget kind="indices" country={country} />
            {"externalIndices" in country && (
              <p className="market-help">
                Additional index quotes:{" "}
                {country.externalIndices.map(([name, symbol]) => (
                  <a
                    className="market-index-link"
                    key={symbol}
                    href={`https://www.tradingview.com/symbols/${symbol}/`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {name} ↗
                  </a>
                ))}{" "}
                · These feeds are not available for embedding.
              </p>
            )}
            <p className="market-help">
              Choose an index and a time range inside the chart. Index values
              are points, not amounts to invest.
              {code === "us" &&
                " The Nasdaq 100 chart uses daily FRED observations, not intraday quotes."}
            </p>
          </section>
          <section
            className="market-section"
            aria-labelledby="market-stocks-title"
          >
            <div className="market-section-heading">
              <div>
                <p className="markets-kicker">02 / Explore companies</p>
                <h2 id="market-stocks-title">Stocks in {country.name}</h2>
              </div>
              <div
                className="market-view-switch"
                role="group"
                aria-label="Stock table view"
              >
                <button
                  type="button"
                  aria-pressed={view === "overview"}
                  onClick={() => setView("overview")}
                >
                  Prices & daily change
                </button>
                <button
                  type="button"
                  aria-pressed={view === "performance"}
                  onClick={() => setView("performance")}
                >
                  Performance
                </button>
              </div>
            </div>
            <p className="market-help">
              Search and sort in the table. Use Performance for the historical
              changes offered by this market. On a phone, scroll the table
              sideways for more columns.
              {code === "in" &&
                " NSE stocks are excluded by the provider; this list uses available Indian exchanges."}
              {code === "ae" &&
                " DFM stocks are excluded by the provider; available ADX stocks are shown."}
              {code === "cn" &&
                " Shenzhen stocks are excluded by the provider; available Shanghai stocks are shown."}
              {code === "vn" &&
                " HOSE stocks are excluded by the provider; available Hanoi stocks are shown."}
            </p>
            <MarketWidget kind="stocks" country={country} view={view} />
          </section>
          <section
            className="market-section"
            aria-labelledby="market-chart-title"
          >
            <div className="market-section-heading">
              <div>
                <p className="markets-kicker">03 / Follow the journey</p>
                <h2 id="market-chart-title">A day. A year. Five years.</h2>
              </div>
            </div>
            <p className="market-help">
              Use the symbol search inside the chart to explore a stock or
              index. Starts with {country.stock}; prices use the symbol’s
              trading currency.
            </p>
            <div
              className="market-periods"
              role="group"
              aria-label="Chart time range"
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
            <MarketWidget kind="chart" country={country} range={range} />
            <p className="market-help">
              One week shows five trading days. Changing the country or time
              range resets the chart to the starting stock. Newer listings may
              have less than five years of history.
            </p>
          </section>
        </div>
      )}
      <aside className="market-reading-note">
        <strong>A price move is only part of the story.</strong>
        <p>
          A rising chart is not a forecast. Compare risk, costs and the time you
          can stay invested before making a decision.
        </p>
      </aside>
      <section className="market-notes" aria-label="Market data information">
        <details>
          <summary>Where do these prices come from?</summary>
          <p>
            Market data and charts are supplied by TradingView. Availability and
            delay depend on the exchange and symbol. Some indices or stocks may
            not be licensed for embedding; the provider will show an unavailable
            message rather than a replacement price. This page covers selected
            markets, not every country.
          </p>
          <p>
            <a
              href="https://www.tradingview.com/widget-docs/faq/data/"
              target="_blank"
              rel="noreferrer"
            >
              Read TradingView’s data availability notes ↗
            </a>
          </p>
        </details>
        <details>
          <summary>What do the changes mean?</summary>
          <p>
            Daily change normally compares the latest available price with the
            previous trading session’s close. Longer performance periods compare
            prices over that period; they are not annualised returns and may not
            include dividends. Read the provider’s column labels and timestamps.
            Holidays, market closures, splits and available history affect
            comparisons.
          </p>
        </details>
        <details>
          <summary>What if a chart is blank?</summary>
          <p>
            Check your connection, allow TradingView in your content blocker, or
            use Reload market data. Some symbols are unavailable in embedded
            widgets. No example or estimated prices are substituted.
          </p>
          <p>
            <a
              href="https://www.tradingview.com/markets/stocks-worldwide/"
              target="_blank"
              rel="noreferrer"
            >
              Explore world stocks on TradingView ↗
            </a>
          </p>
        </details>
        <details>
          <summary>Privacy & third-party content</summary>
          <p>
            These embedded tools connect to TradingView and its data services.
            They receive ordinary connection details, including your IP address,
            and have their own privacy policy. They are isolated from your
            planner inputs and browser storage.
          </p>
          <a
            href="https://www.tradingview.com/privacy-policy/"
            target="_blank"
            rel="noreferrer"
          >
            TradingView privacy policy ↗
          </a>
        </details>
      </section>
    </main>
  );
}
