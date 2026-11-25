import { useSyncExternalStore, type ReactNode } from "react";
import { plannerHref, type PlannerRoute } from "../runtime/routes";
import { currencies, selectCurrency, useCurrency } from "../runtime/currency";
import { SiteSearch } from "./SiteSearch";
import "../styles/journey-header.css";

const destinations: [string, PlannerRoute, string?][] = [
  ["Invest", "growth"],
  ["Learn Finance", "learn"],
  ["Calculators", "all-calculators"],
  ["Blog", "home", "#vlogs"],
  ["Global Markets", "markets"],
];
function subscribeToLocation(sync: () => void) {
  window.addEventListener("hashchange", sync);
  window.addEventListener("popstate", sync);
  return () => {
    window.removeEventListener("hashchange", sync);
    window.removeEventListener("popstate", sync);
  };
}
function CurrencySelect() {
  const currency = useCurrency();
  return (
    <div className="header-currency">
      <select
        aria-label="Your currency"
        value={currency}
        onChange={(e) => selectCurrency(e.target.value)}
        title="Used across planners and examples. Amounts aren’t converted. The SIP planner resets contribution amounts when currency changes."
      >
        {currencies.map(([code, symbol]) => (
          <option key={code} value={code}>
            {code} — {symbol}
          </option>
        ))}
      </select>
    </div>
  );
}
export function JourneyHeader({
  children,
  account,
  home = false,
  showCurrency = false,
}: {
  children?: ReactNode;
  account?: ReactNode;
  home?: boolean;
  showCurrency?: boolean;
}) {
  const locationKey = useSyncExternalStore(
    subscribeToLocation,
    () => location.pathname + location.hash,
    () => "",
  );
  return (
    <header className={"journey-header" + (home ? " home-header" : "")}>
      <div className="journey-top">
        <a
          className="journey-brand home-wordmark"
          href={plannerHref("home")}
          aria-label="Financial AI Planner home"
        >
          <svg viewBox="0 0 34 32" width="25" height="27" aria-hidden="true">
            <path
              fill="#21774b"
              d="M2 27C4 17 12 18 18 18c5 0 8-2 12-5-3 9-8 14-16 14H2Z"
            />
            <path
              fill="#85a84c"
              d="M9 15C13 9 23 8 32 2c1 8-4 13-13 14-4 0-7-1-10-1Z"
            />
          </svg>
          <span className="planner-site-name">Financial AI Planner</span>
        </a>
        <div className="journey-tools">
          <div className="journey-search-tools">
            <SiteSearch />
            {showCurrency && <CurrencySelect />}
          </div>
          {account && <div className="journey-account">{account}</div>}
        </div>
      </div>
      <div className="journey-bottom">
        <nav className="journey-links home-nav" aria-label="Main navigation">
          {destinations.map(([title, route, hash]) => {
            const href = plannerHref(route) + (hash ?? "");
            const active = hash
              ? locationKey === href
              : locationKey.split("#")[0] === href;
            return (
              <a
                key={title}
                href={href}
                aria-current={active ? "page" : undefined}
              >
                {title}
              </a>
            );
          })}
        </nav>
        <a className="journey-helper" href={plannerHref("currency-converter")}>
          Convert currency <span aria-hidden="true">↗</span>
        </a>
      </div>
      {!home && children && (
        <div className="journey-page-tools">{children}</div>
      )}
    </header>
  );
}
