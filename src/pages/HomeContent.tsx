import { SiteSearch } from "../components/SiteSearch";
import { PlannerDirectory } from "../components/PlannerDirectory";
import { FinancialPlanningGuide } from "../components/FinancialPlanningGuide";
import { PlannerNavigation } from "../components/PlannerNavigation";
import { plannerHref } from "../runtime/routes";
import { useEffect, useRef, useState } from "react";
import { currencies, selectCurrency, useCurrency } from "../runtime/currency";
import { VlogProvider, VlogAccountButton, VlogFeed } from "../components/Vlogs";
export function HomeContent({ active = true }: { active?: boolean }) {
  const currency = useCurrency();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    headerRef.current
      ?.querySelector<HTMLAnchorElement>("#home-main-navigation a")
      ?.focus();
    const outside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node))
        setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [menuOpen]);
  const [vlogsOpen, setVlogsOpen] = useState(
    () => typeof window !== "undefined" && window.location.hash === "#vlogs",
  );
  useEffect(() => {
    const sync = () => setVlogsOpen(window.location.hash === "#vlogs");
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);
  useEffect(() => {
    if (!active) return;
    document
      .getElementById(vlogsOpen ? "vlogsTitle" : "welcomeTitle")
      ?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [vlogsOpen, active]);
  return (
    <VlogProvider active={active}>
      <section
        id="homeScreen"
        className="welcome"
        aria-labelledby="welcomeTitle"
        hidden={vlogsOpen}
      >
        <div className="welcome-topbar home-header" ref={headerRef}>
          <a
            className="home-wordmark"
            href={plannerHref("home")}
            aria-label="Financial AI Planner home"
          >
            <svg
              viewBox="0 0 32 32"
              width="30"
              height="30"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 25V15l8 5V7l8 5V4l8 5v16H4Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            Financial AI Planner
          </a>
          <nav
            id="home-main-navigation"
            className="home-nav"
            aria-label="Main navigation"
            data-open={menuOpen}
            onClick={() => setMenuOpen(false)}
          >
            <a href="#planners">The planners</a>
            <a href="#financial-planning">Planning guide</a>
            <a href={plannerHref("learn")}>Learn finance</a>
            <a href="#vlogs">Blog</a>
          </nav>
          <SiteSearch />
          <label
            className="planner-currency home-currency"
            htmlFor="home-currency"
          >
            <select
              id="home-currency"
              aria-label="Your currency"
              title="Used across planners and examples. Amounts aren’t converted. The SIP planner resets contribution amounts when currency changes."
              value={currency}
              onChange={(e) => selectCurrency(e.target.value)}
            >
              {currencies.map(([code, symbol]) => (
                <option key={code} value={code}>
                  {code} — {symbol}
                </option>
              ))}
            </select>
          </label>
          <VlogAccountButton />
          <button
            className="home-menu-toggle"
            type="button"
            ref={menuButtonRef}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="home-main-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path
                d={
                  menuOpen ? "m6 6 12 12M6 18 18 6" : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>
        </div>
        <div className="welcome-hero">
          <div className="welcome-intro">
            <h1 id="welcomeTitle" tabIndex={-1}>
              Financial planning.
              <br />
              <em>A clearer future.</em>
            </h1>
            <p>
              Free calculators for your budget, investments and life after work.
            </p>
            <div className="welcome-actions">
              <a
                href={plannerHref("growth")}
                className="primary"
                data-screen="growth"
              >
                Explore my future <span aria-hidden="true">→</span>
              </a>
              <a href="#planners">
                Find your planner <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className="welcome-privacy">
              Your numbers stay private. No account needed.
            </p>
            <a className="home-learn-link" href={plannerHref("learn")}>
              New to SIP or SWP? Learn the basics →
            </a>
          </div>
          <aside
            className="starting-point"
            aria-labelledby="startingPointTitle"
          >
            <h2 id="startingPointTitle">What’s on your mind?</h2>
            <a href={plannerHref("salary-budget")}>
              <span>
                Organise my salary
                <small>Budget &amp; savings</small>
              </span>
              <span aria-hidden="true">→</span>
            </a>
            <a href={plannerHref("loan-payoff")}>
              <span>
                Pay off my loans
                <small>Repay debt or invest the extra</small>
              </span>
              <span aria-hidden="true">→</span>
            </a>
            <a href={plannerHref("freedom")}>
              <span>
                Plan my freedom
                <small>When could I stop working?</small>
              </span>
              <span aria-hidden="true">→</span>
            </a>
          </aside>
        </div>
        <PlannerDirectory />
        <FinancialPlanningGuide />
        <section className="welcome-faq" aria-labelledby="planningQuestions">
          <h2 id="planningQuestions">Questions, answered.</h2>
          <details>
            <summary>Is this an AI financial planner?</summary>
            <p>
              These tools use financial formulas and your assumptions. They do
              not use generative AI or predict market prices. Review the
              calculations and schedules behind your results.
            </p>
          </details>
          <details>
            <summary>How can I explore a different financial future?</summary>
            <p>
              Change your investment, expected return, inflation or expenses.
              The charts show how your assumptions affect the result.
            </p>
          </details>
          <details>
            <summary>Can I keep my plan and return later?</summary>
            <p>
              Download your report, then use Import report in the same planner
              to continue later. The salary planner starts at zero on every
              visit; other planners may restore a browser copy.
            </p>
          </details>
        </section>
        <aside
          className="home-data-notice"
          aria-label="Calculator data and backups"
        >
          <svg
            viewBox="0 0 24 24"
            width="26"
            height="26"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
            <path d="m8 12 3 3 5-6" />
          </svg>
          <div>
            <strong>Your financial plan stays in your browser.</strong>
            <p>
              We don’t store your calculator entries on our servers. Use{" "}
              <b>Download report</b> to keep your own copy.
            </p>
            <details className="home-backup-help">
              <summary>How to save and restore a plan</summary>
              <p>
                Keep the original report file, then use <b>Import report</b> in
                the same planner—even on another device. Clearing browser data
                can remove browser copies. The salary planner starts at zero
                until you import a report.
              </p>
            </details>
          </div>
        </aside>
        <p className="welcome-foot">
          Educational tools. Your assumptions, your decisions.
        </p>
      </section>
      {vlogsOpen && (
        <section className="welcome vlog-directory" aria-label="Blog">
          <PlannerNavigation homeHref="#">
            <VlogAccountButton />
          </PlannerNavigation>
          <VlogFeed />
        </section>
      )}
    </VlogProvider>
  );
}
