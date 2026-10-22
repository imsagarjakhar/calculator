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
              We don’t store your calculator entries on our servers. Your plan
              may be saved in this browser only. <b>Download report</b> to keep
              your own copy, then use <b>Import report</b> to continue
              later—even on another device.
            </p>
            <small>
              Clearing browser data can remove your saved plan. Keep the
              original report file as your backup.
            </small>
          </div>
        </aside>
        <div className="welcome-hero">
          <div className="welcome-intro">
            <h1 id="welcomeTitle" tabIndex={-1}>
              Financial planning.
              <br />
              <em>A clearer future.</em>
            </h1>
            <p>
              A little clarity goes a long way. Bring your budget, investments
              and retirement into focus with free calculators that put your
              assumptions in your hands.
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
              Calculations stay in your browser. No account needed.
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
            <p>Start with the question you have today.</p>
            <a href={plannerHref("salary-budget")}>
              <span>
                Make room in my budget
                <small>Income, spending &amp; savings</small>
              </span>
              <span aria-hidden="true">→</span>
            </a>
            <a href={plannerHref("loan-payoff")}>
              <span>
                Get ahead of my loans
                <small>Repay debt or invest the extra</small>
              </span>
              <span aria-hidden="true">→</span>
            </a>
            <a href={plannerHref("freedom")}>
              <span>
                Work towards more freedom
                <small>Explore when work could be a choice</small>
              </span>
              <span aria-hidden="true">→</span>
            </a>
            <div className="starting-point-note">
              Your numbers. Your assumptions. Your next step.
            </div>
          </aside>
        </div>
        <PlannerDirectory />
        <FinancialPlanningGuide />
        <section className="welcome-faq" aria-labelledby="planningQuestions">
          <h2 id="planningQuestions">A few things worth knowing.</h2>
          <details>
            <summary>Is this an AI financial planner?</summary>
            <p>
              Financial AI Planner uses financial formulas and the assumptions
              you enter. These tools do not use generative AI or predict market
              prices. Your results are calculated scenarios, with methods and
              detailed schedules you can review.
            </p>
          </details>
          <details>
            <summary>How can I explore a different financial future?</summary>
            <p>
              Change your monthly investment, expected return, inflation or
              future expenses. Compare the resulting projections to see how each
              assumption affects your plan.
            </p>
          </details>
          <details>
            <summary>Can I keep my plan and return later?</summary>
            <p>
              Your inputs are saved in this browser when storage is available.
              Download an original HTML report or JSON plan to keep a portable
              copy, then import it into the matching calculator to continue
              editing.
            </p>
          </details>
        </section>
        <p className="welcome-foot">
          Private by design. Calculations run in your browser. No sign-up.
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
