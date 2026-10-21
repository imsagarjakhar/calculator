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
          <div className="eyebrow">INTIMETEC / SMART FINANCIAL PLANNING</div>
          <VlogAccountButton />
        </div>
        <div className="welcome-intro">
          <span className="welcome-kicker">INTIMETEC Money Planner</span>
          <h1 id="welcomeTitle" tabIndex={-1}>
            Smarter money moves.
            <br />A clearer future.
          </h1>
          <p>
            Turn “what if?” into a plan you can see with INTIMETEC's free
            financial calculators. Explore your SIP, investments, loans and
            retirement together—with instant projections that respond to your
            assumptions.
          </p>
          <div className="welcome-benefits" aria-label="Planner features">
            <span>Instant insights</span>
            <span>Interactive scenarios</span>
            <span>Private by design</span>
          </div>
          <div className="welcome-actions">
            <a
              href={plannerHref("growth")}
              className="primary"
              data-screen="growth"
            >
              Explore my future <span aria-hidden="true">↗</span>
            </a>
            <a href={plannerHref("custom-plan")}>
              Build my monthly plan <span aria-hidden="true">→</span>
            </a>
          </div>
          <small className="welcome-assumption">
            Your inputs set the direction. Financial formulas calculate the
            possibilities.
          </small>
        </div>
        <div className="planner-choices has-custom has-freedom">
          <a
            href={plannerHref("growth")}
            className="choice growth-choice"
            data-screen="growth"
          >
            <span className="choice-icon" aria-hidden="true">
              ↗
            </span>
            <span className="eyebrow">01 / BUILD YOUR WEALTH</span>
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
            <span className="choice-icon" aria-hidden="true">
              ◷
            </span>
            <span className="eyebrow">02 / MAKE IT LAST</span>
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
            <span className="choice-icon" aria-hidden="true">
              ✎
            </span>
            <span className="eyebrow">03 / YOUR PLAN, YOUR WAY</span>
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
            <span className="choice-icon" aria-hidden="true">
              ◎
            </span>
            <span className="eyebrow">04 / MAKE WORK A CHOICE</span>
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
            <span className="choice-icon" aria-hidden="true">
              <svg
                viewBox="0 0 48 48"
                width="34"
                height="34"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13 17C13 2 35 2 35 17M9 17l5 24q10 5 20 0l5-24"></path>
                <ellipse cx="24" cy="17" rx="15" ry="4"></ellipse>
                <path d="M13 30q11 5 22 0"></path>
              </svg>
            </span>
            <span className="eyebrow">05 / PLAN YOUR RETIREMENT</span>
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
            <span className="choice-icon" aria-hidden="true">
              ▤
            </span>
            <span className="eyebrow">06 / PLAN YOUR PAYDAY</span>
            <strong>Monthly Salary &amp; Budget Planner</strong>
            <span className="choice-copy">
              Balance your salary, bills and savings. See what a year of
              investing could become.
            </span>
            <span className="choice-link">
              Plan my monthly budget <span aria-hidden="true">↗</span>
            </span>
          </a>
          <a className="choice vlog-choice" href="#vlogs">
            <span className="choice-icon" aria-hidden="true">
              ▷
            </span>
            <span className="eyebrow">07 / IDEAS &amp; PERSPECTIVE</span>
            <strong>Vlogs</strong>
            <span className="choice-copy">
              Money conversations, practical ideas and the latest updates, all
              in one place.
            </span>
            <span className="choice-link">
              View all vlogs <span aria-hidden="true">↗</span>
            </span>
          </a>
        </div>
        <section className="planner-guide" aria-labelledby="plannerGuideTitle">
          <h2 id="plannerGuideTitle">
            Financial clarity, one scenario at a time
          </h2>
          <p>
            Choose a calculator to explore your next money decision. Each tool
            lets you adjust assumptions and see how they affect your projected
            finances.
          </p>
          <h3>SIP and investment growth calculator</h3>
          <p>
            <a href={plannerHref("growth")}>Use the SIP growth calculator</a> to
            estimate future investment value from a monthly SIP, annual
            increases and one-time deposits. Include existing assets, loans and
            planned life expenses to explore projected net wealth.
          </p>
          <h3>Retirement withdrawals and savings calculator</h3>
          <p>
            <a href={plannerHref("survival")}>
              Use the retirement withdrawal calculator
            </a>{" "}
            to estimate how long your current savings may support regular
            withdrawals. Adjust inflation, expected returns and future expenses
            to compare scenarios.
          </p>
          <h3>Financial freedom age calculator</h3>
          <p>
            <a href={plannerHref("freedom")}>
              Explore your financial freedom age
            </a>{" "}
            using your current corpus, monthly SIP, yearly step-up and desired
            monthly income. Change expected return and inflation to explore the
            modelled freedom age, including future expenses.
          </p>
          <h3>Loan EMI and monthly planning calculator</h3>
          <p>
            <a href={plannerHref("custom-plan")}>Open Intimetec Custom Plan</a>{" "}
            to enter an original loan amount, interest rate, total tenure and
            loan dates. Calculate paid months, remaining EMIs and estimated
            outstanding principal, then plan extra repayments alongside monthly
            investments.
          </p>
          <p className="helper">
            These tools provide educational illustrations using your
            assumptions. Actual returns, lender balances and payment schedules
            may differ. Calculations run in your browser; no account is needed.
          </p>
        </section>
        <section className="welcome-faq" aria-labelledby="planningQuestions">
          <div className="eyebrow">UNDERSTAND YOUR INSIGHTS</div>
          <h2 id="planningQuestions">Smart planning, explained.</h2>
          <details>
            <summary>Is this an AI financial planner?</summary>
            <p>
              INTIMETEC uses financial formulas and the assumptions you enter.
              These tools do not use generative AI or predict market prices.
              Your results are calculated scenarios, with methods and detailed
              schedules you can review.
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
        <section className="welcome vlog-directory" aria-label="Vlogs">
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
