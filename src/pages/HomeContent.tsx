import { FinancialPlanningGuide } from "../components/FinancialPlanningGuide";
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
        <div className="welcome-topbar">
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
          <nav className="home-nav" aria-label="Main navigation">
            <a href="#planners">The planners</a>
            <a href="#financial-planning">Planning guide</a>
            <a href="#vlogs">Blog</a>
          </nav>
          <VlogAccountButton />
        </div>
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
        <div className="planner-directory-heading" id="planners">
          <h2>A tool for every chapter.</h2>
          <p>Choose a question. Explore the possibilities.</p>
        </div>
        <div className="planner-choices has-custom has-freedom">
          <a
            href={plannerHref("growth")}
            className="choice growth-choice"
            data-screen="growth"
          >
            <strong>Check Growth</strong>
            <span className="choice-copy">
              See where your SIP can take you, with annual step-ups and extra
              investments along the way.
            </span>
            <span className="choice-link">
              Open SIP planner <span aria-hidden="true">↗</span>
            </span>
          </a>
          <a
            href={plannerHref("survival")}
            className="choice survival-choice"
            data-screen="survival"
          >
            <strong>Check Survival</strong>
            <span className="choice-copy">
              Start with your current corpus. See how withdrawals, inflation and
              returns shape its lifetime.
            </span>
            <span className="choice-link">
              Explore corpus survival <span aria-hidden="true">↗</span>
            </span>
          </a>
          <a className="choice custom-choice" href={plannerHref("custom-plan")}>
            <strong>Custom Plan</strong>
            <span className="choice-copy">
              Adjust any month's SIP, invest a bonus, or pay a loan sooner. Save
              your plan and pick it up later.
            </span>
            <span className="choice-link">
              Build a monthly plan <span aria-hidden="true">↗</span>
            </span>
          </a>
          <a className="choice freedom-choice" href={plannerHref("freedom")}>
            <strong>Financial Freedom</strong>
            <span className="choice-copy">
              Set your monthly SIP and desired monthly income. Adjust step-up,
              inflation and expected return to explore your freedom age.
            </span>
            <span className="choice-link">
              Find my freedom age <span aria-hidden="true">↗</span>
            </span>
          </a>
          <a
            className="choice retirement-choice"
            href={plannerHref("bucket-plan")}
          >
            <strong>Retirement Bucket Planner</strong>
            <span className="choice-copy">
              Plan living costs, emergencies and long-term growth with three
              retirement buckets.
            </span>
            <span className="choice-link">
              Plan my retirement buckets <span aria-hidden="true">↗</span>
            </span>
          </a>
          <a
            className="choice salary-choice"
            href={plannerHref("salary-budget")}
          >
            <strong>Monthly Salary &amp; Budget Planner</strong>
            <span className="choice-copy">
              Balance your salary, bills and savings. See what a year of
              investing could become.
            </span>
            <span className="choice-link">
              Plan my monthly budget <span aria-hidden="true">↗</span>
            </span>
          </a>
          <a className="choice loan-choice" href={plannerHref("loan-payoff")}>
            <strong>Loan Payoff &amp; Investment Planner</strong>
            <span className="choice-copy">
              Pay loans faster or invest the extra? Compare your options and
              build a monthly payoff guide that fits your budget.
            </span>
            <span className="choice-link">
              Compare my loan options <span aria-hidden="true">↗</span>
            </span>
          </a>
          <a className="choice vlog-choice" href="#vlogs">
            <strong>Blog</strong>
            <span className="choice-copy">
              Money conversations, practical ideas and the latest updates, all
              in one place.
            </span>
            <span className="choice-link">
              View all blogs <span aria-hidden="true">↗</span>
            </span>
          </a>
        </div>
        <FinancialPlanningGuide />
        <section className="welcome-faq" aria-labelledby="planningQuestions">
          <h2 id="planningQuestions">A few things worth knowing.</h2>
          <details>
            <summary>Is this an AI financial planner?</summary>
            <p>
              Financial AI Planner uses financial formulas and the assumptions you
              enter. These tools do not use generative AI or predict market
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
          <div className="welcome-topbar">
            <a className="vlog-back" href="#">
              ← All planners
            </a>
            <VlogAccountButton />
          </div>
          <VlogFeed />
        </section>
      )}
    </VlogProvider>
  );
}
