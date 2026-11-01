import { useEffect, useState } from "react";
import { PlannerNavigation } from "../components/PlannerNavigation";
import {
  exchangeCurrencies,
  fetchExchangeRate,
  type ExchangeRate,
} from "../runtime/exchangeRates";

const number = (value: number, digits = 6) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(
    value,
  );
const money = (value: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).format(value);
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(value + "T00:00:00Z"));

export function CurrencyPage() {
  const [amount, setAmount] = useState("1000");
  const [base, setBase] = useState("SAR"),
    [quote, setQuote] = useState("INR");
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    setRate(null);
    setError("");
    if (base === quote) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    const timeout = setTimeout(() => controller.abort(), 12000);
    fetchExchangeRate(base, quote, controller.signal)
      .then((next) => {
        if (active) setRate(next);
      })
      .catch(() => {
        if (active)
          setError(
            "We couldn’t fetch this rate. Check your connection and try again.",
          );
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [base, quote, refresh]);
  const valid =
    amount.trim() !== "" &&
    Number.isFinite(Number(amount)) &&
    Number(amount) >= 0;
  // Never display a previous pair's rate while the new request is starting.
  const current = rate?.base === base && rate.quote === quote ? rate : null;
  const value = base === quote ? 1 : current?.rate;
  const converted =
    valid && value !== undefined ? Number(amount) * value : null;
  const usable = converted !== null && Number.isFinite(converted);
  function selector(
    label: string,
    code: string,
    change: (code: string) => void,
  ) {
    return (
      <label>
        {label}
        <select
          aria-label={label}
          value={code}
          onChange={(event) => change(event.target.value)}
        >
          {exchangeCurrencies.map(([currency, name]) => (
            <option key={currency} value={currency}>
              {currency} — {name}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <main className="planner-page currency-page">
      <PlannerNavigation />
      <header className="currency-hero">
        <p className="currency-eyebrow">Across borders. In perspective.</p>
        <h1>
          A different currency.
          <br />A clear comparison.
        </h1>
        <p>Convert money using the latest published reference rates.</p>
      </header>
      <section className="currency-card" aria-label="Currency converter">
        <div className="currency-card-top">
          <h2>Currency converter</h2>
          <span className="currency-badge">Daily reference rates</span>
        </div>
        <label className="currency-amount">
          Amount
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={!valid}
            aria-describedby={!valid ? "currency-input-error" : undefined}
          />
        </label>
        {!valid && (
          <p id="currency-input-error" className="currency-error">
            Enter an amount of zero or more.
          </p>
        )}
        <div className="currency-pair">
          {selector("From currency", base, setBase)}
          <button
            className="currency-swap"
            type="button"
            aria-label="Swap currencies"
            onClick={() => {
              setBase(quote);
              setQuote(base);
            }}
          >
            ⇄
          </button>
          {selector("To currency", quote, setQuote)}
        </div>
        <div
          className="currency-result"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          aria-busy={loading && base !== quote}
        >
          <span>Converted amount</span>
          <output>{usable ? money(converted!, quote) : "—"}</output>
          {base === quote ? (
            <p>
              Same currency · 1 {base} = 1 {quote}
            </p>
          ) : current ? (
            <>
              <p>
                1 {base} = {number(current.rate)} {quote}
              </p>
              <p>
                1 {quote} = {number(1 / current.rate)} {base}
              </p>
              <small>
                Rate date:{" "}
                <time dateTime={current.date}>{dateLabel(current.date)}</time>
              </small>
            </>
          ) : (
            <p>
              {loading
                ? "Fetching the latest published rate…"
                : "Connect to load an exchange rate."}
            </p>
          )}
        </div>
        {error && base !== quote && (
          <p role="alert" className="currency-error">
            {error}
          </p>
        )}
        <div className="currency-source">
          <p>
            Source:{" "}
            <a href="https://frankfurter.dev/" target="_blank" rel="noreferrer">
              Frankfurter ↗
            </a>{" "}
            · No account needed
          </p>
          <button
            type="button"
            disabled={loading || base === quote}
            onClick={() => setRefresh((n) => n + 1)}
          >
            {loading ? "Updating…" : "Refresh rate"}
          </button>
        </div>
        <p className="currency-note">
          Reference rates update daily, not tick by tick. Banks and transfer
          services may use different rates and charge fees.
        </p>
      </section>
      <section
        className="currency-explainer"
        aria-label="About currency conversion"
      >
        <details>
          <summary>How is this calculated?</summary>
          <p>
            Your amount × the published exchange rate = the converted amount.
            For example, if a rate were 20, then 100 would convert to 2,000.
            That is an illustration, not a current quote.
          </p>
          <p>
            The rate date is supplied by the provider; weekends and holidays can
            mean an earlier date. Refresh checks the provider again and does not
            guarantee a newer rate.
          </p>
        </details>
        <details>
          <summary>Does this change my financial plan?</summary>
          <p>
            No. This converter is a separate tool. The planners’ currency
            selector changes the currency used for a plan, without applying an
            exchange rate to existing amounts.
          </p>
        </details>
        <details>
          <summary>What information is sent?</summary>
          <p>
            Only the currency pair is requested from Frankfurter. Your amount is
            multiplied locally in your browser and is not sent to the rate
            provider. The provider receives normal connection information such
            as your IP address.
          </p>
        </details>
      </section>
    </main>
  );
}
