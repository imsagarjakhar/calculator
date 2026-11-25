import { InvestmentHero } from "../components/InvestmentHero";
import { JourneyHeader } from "../components/JourneyHeader";
import {
  ExploreDirectory,
  PlannerDirectory,
} from "../components/PlannerDirectory";
import { FinancialPlanningGuide } from "../components/FinancialPlanningGuide";
import { PlannerNavigation } from "../components/PlannerNavigation";
import { plannerHref } from "../runtime/routes";
import { useEffect, useState } from "react";
import { VlogProvider, VlogAccountButton, VlogFeed } from "../components/Vlogs";
export function HomeContent({ active = true }: { active?: boolean }) {
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
        <JourneyHeader home showCurrency account={<VlogAccountButton />} />
        <InvestmentHero />
        <nav className="money-shortcuts" aria-label="Quick start">
          <a href={plannerHref("salary-budget")}>
            <small>Budget</small>
            <strong>Plan my payday</strong>
          </a>
          <a href={plannerHref("growth")}>
            <small>Invest</small>
            <strong>Project my savings</strong>
          </a>
          <a href={plannerHref("guides")} aria-label="Start with an example">
            <small>Learn</small>
            <strong>Start with an example</strong>
          </a>
        </nav>
        <ExploreDirectory />
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
          <div data-nosnippet="">
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
          <PlannerNavigation current="Blog" homeHref="#" account={<VlogAccountButton />} />
          <VlogFeed />
        </section>
      )}
    </VlogProvider>
  );
}

