import { plannerHref } from "../runtime/routes";
import { memo } from "react";
import { PlannerHeader } from "../components/PlannerHeader";
import { usePlanner } from "../runtime/usePlanner";
import mount from "planner:controller:freedom";
export const FreedomPage = memo(function FreedomPage() {
  const ref = usePlanner(mount);
  return (
    <div ref={ref}>
      <main>
        <nav className="custom-planner-nav" aria-label="Financial planners">
          <a className="back-to-planners" href={plannerHref("home")}>
            ← All planners
          </a>
          <span>LEARN WITH INTIMETEC</span>
        </nav>
        <PlannerHeader kind="freedom" />
        <p className="freedom-intro">
          Financial freedom here means your investment returns could support the
          monthly amount you want, with room for inflation and your scheduled
          future expenses. It is an estimate using fixed assumptions, not a
          guarantee or a recommendation to resign.
        </p>
        <div className="freedom-layout">
          <section className="card">
            <p className="eyebrow">01 / WHERE YOU ARE TODAY</p>
            <h2>Your starting point</h2>
            <form id="freedomForm" noValidate>
              <div className="fields">
                <label htmlFor="f-age">
                  Your current age
                  <input
                    id="f-age"
                    type="number"
                    min="18"
                    max="100"
                    step="1"
                    required
                  />
                </label>
                <label htmlFor="f-monthlyInvestment">
                  How much will you invest each month? (
                  <span className="f-code">INR</span>)
                  <input
                    id="f-monthlyInvestment"
                    type="number"
                    min="0"
                    max="1000000000"
                    step="any"
                    required
                    aria-describedby="investmentHelp"
                  />
                  <span id="investmentHelp" className="helper">
                    Enter your planned monthly SIP or retirement investment,
                    separate from your living expenses. Enter 0 if you will not
                    add new investments.
                  </span>
                </label>
                <label htmlFor="f-corpus">
                  How much have you already saved or invested? (
                  <span className="f-code">INR</span>)
                  <input
                    id="f-corpus"
                    type="number"
                    min="0"
                    max="1000000000000000"
                    step="any"
                    required
                    aria-describedby="corpusHelp"
                  />
                  <span id="corpusHelp" className="helper">
                    Enter today’s total value of savings, mutual funds, stocks
                    and deposits you can use after stopping work. Exclude your
                    home and money reserved for other needs.
                  </span>
                </label>
              </div>
              <p className="helper">
                Your monthly investment is added to the existing corpus. The
                estimate assumes you can fund the SIP and its future step-ups.
                Future one-off expenses draw from this investment pot.{" "}
                <a href="#freedomEvents">Add future expenses below ↓</a>
              </p>
              <p className="eyebrow freedom-step">02 / THE LIFE YOU WANT</p>
              <h2>Your freedom goal</h2>
              <div className="fields">
                <label htmlFor="f-retirementExpense">
                  How much do you want each month, at today’s prices? (
                  <span className="f-code">INR</span>)
                  <input
                    id="f-retirementExpense"
                    type="number"
                    min="0"
                    max="1000000000"
                    step="any"
                    required
                  />
                </label>
              </div>
              <p className="helper">
                Enter what you want to spend each month in today’s money. We
                increase that amount with inflation and find when your corpus
                could support it.
              </p>
              <section className="freedom-simple-assumptions">
                <h3>Play with just three assumptions</h3>
                <div className="fields">
                  <label htmlFor="f-investmentGrowth">
                    Yearly investment step-up (%)
                    <input
                      id="f-investmentGrowth"
                      type="number"
                      min="0"
                      max="30"
                      step="any"
                      required
                    />
                    <span className="helper">
                      The annual increase in your monthly SIP. Use 0 for a fixed
                      SIP.
                    </span>
                  </label>
                  <label htmlFor="f-inflation">
                    Inflation (%)
                    <input
                      id="f-inflation"
                      type="number"
                      min="0"
                      max="30"
                      step="any"
                      required
                    />
                  </label>
                  <label htmlFor="f-expectedReturn">
                    Expected annual return (%)
                    <input
                      id="f-expectedReturn"
                      type="number"
                      min="-50"
                      max="40"
                      step="any"
                      required
                      aria-describedby="returnHelp"
                    />
                  </label>
                </div>
                <label htmlFor="returnSlider">
                  Try a different expected return
                  <input
                    id="returnSlider"
                    className="return-slider"
                    type="range"
                    min="-50"
                    max="40"
                    step="0.5"
                  />
                </label>
                <p id="returnHelp" className="helper">
                  One expected return applies throughout the plan. Change it to
                  see your freedom age and monthly support update. Use an
                  assumption after taxes and fees; returns are not guaranteed
                  monthly interest payments.
                </p>
              </section>
              <section
                className="investment-schedule"
                aria-labelledby="investmentScheduleTitle"
              >
                <div className="investment-schedule-heading">
                  <h3 id="investmentScheduleTitle">
                    Your monthly investment over time
                  </h3>
                  <div
                    className="investment-view"
                    role="group"
                    aria-label="Investment schedule view"
                  >
                    <button
                      id="investmentMonthly"
                      type="button"
                      aria-pressed="false"
                      aria-controls="investmentScheduleTable"
                    >
                      Monthly
                    </button>
                    <button
                      id="investmentYearly"
                      type="button"
                      aria-pressed="true"
                      aria-controls="investmentScheduleTable"
                    >
                      Yearly
                    </button>
                  </div>
                </div>
                <p
                  id="investmentScheduleNote"
                  className="helper"
                  aria-live="polite"
                ></p>
                <div
                  className="table-wrap investment-schedule-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="Monthly investment step-up schedule"
                >
                  <table id="investmentScheduleTable">
                    <caption className="sr-only">
                      Monthly SIP amounts with annual step-ups through the final
                      contribution month
                    </caption>
                    <thead id="investmentScheduleHead"></thead>
                    <tbody id="investmentScheduleRows"></tbody>
                  </table>
                </div>
                <p id="investmentScheduleTotal" className="helper"></p>
              </section>
              <details className="freedom-assumptions">
                <summary>Optional budget check and extra settings</summary>
                <p className="helper">
                  Salary and expenses check today’s affordability only. The
                  projection uses your entered SIP and step-up, assuming future
                  contributions are funded; it does not forecast your salary.
                </p>
                <div className="fields">
                  <label htmlFor="f-salary">
                    Monthly take-home salary (
                    <span className="f-code">INR</span>)
                    <input
                      id="f-salary"
                      type="number"
                      min="0"
                      max="1000000000"
                      step="any"
                    />
                  </label>
                  <label htmlFor="f-expenses">
                    Monthly spending while working (
                    <span className="f-code">INR</span>)
                    <input
                      id="f-expenses"
                      type="number"
                      min="0"
                      max="1000000000"
                      step="any"
                    />
                  </label>
                </div>
                <p
                  id="surplusHint"
                  className="freedom-surplus"
                  aria-live="polite"
                ></p>
                <div className="fields">
                  <label htmlFor="f-targetAge">
                    Age you would like to stop working
                    <input
                      id="f-targetAge"
                      type="number"
                      min="18"
                      max="119"
                      step="1"
                      required
                    />
                  </label>
                  <label htmlFor="f-endAge">
                    Search for freedom up to age
                    <input
                      id="f-endAge"
                      type="number"
                      min="19"
                      max="120"
                      step="1"
                      required
                    />
                  </label>
                  <label htmlFor="f-minCorpus">
                    Minimum corpus you want at freedom, at today’s prices (
                    <span className="f-code">INR</span>)
                    <input
                      id="f-minCorpus"
                      type="number"
                      min="0"
                      max="1000000000000000"
                      step="any"
                      required
                    />
                  </label>
                  <label htmlFor="f-buffer">
                    Extra savings cushion (%)
                    <input
                      id="f-buffer"
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      aria-describedby="bufferHint"
                      required
                      defaultValue="0"
                    />
                    <small id="bufferHint" className="helper">
                      Adds extra savings to your calculated target. Keep 0% for
                      no extra cushion; 10% adds 10% to the target.
                    </small>
                  </label>
                </div>
                <p className="helper">
                  The search age limits how far ahead we look and which one-off
                  expenses are included. It does not stop the regular-income
                  calculation at that age. Minimum corpus and buffer are
                  optional additional targets.
                </p>
              </details>
              <div className="actions">
                <button className="primary" type="submit">
                  Check my freedom age
                </button>
                <button id="freedomReset" type="button">
                  Reset inputs
                </button>
              </div>
              <p className="helper">
                Reset inputs keeps your saved future expenses.
              </p>
            </form>
            <p id="freedomError" className="error" role="alert"></p>
            <p id="freedomSave" className="helper"></p>
          </section>
          <section
            className="card freedom-result"
            aria-labelledby="freedomResultTitle"
          >
            <p className="eyebrow">03 / YOUR POSSIBLE NEXT CHAPTER</p>
            <h2 id="freedomResultTitle">Your financial freedom estimate</h2>
            <div id="freedomOutput" aria-live="polite"></div>
            <details className="freedom-extra">
              <summary>Compare with your preferred age</summary>
              <div id="freedomTarget"></div>
            </details>
            <details className="freedom-extra">
              <summary>What if returns or inflation change?</summary>
              <div id="freedomScenarios" className="freedom-scenarios"></div>
              <p className="helper">
                Each comparison changes one assumption. These are scenarios, not
                probabilities.
              </p>
            </details>
          </section>
        </div>
        <section id="freedomEvents"></section>
        <section className="card">
          <p className="eyebrow">04 / YOUR PATH TO FREEDOM</p>
          <h2>Your investments and monthly-income goal</h2>
          <div id="freedomChart"></div>
        </section>
        <section className="card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">05 / SEE THE NUMBERS</p>
              <h2>Year-by-year plan</h2>
            </div>
            <button id="freedomCsv" type="button">
              Download monthly CSV
            </button>
          </div>
          <p className="helper">
            New investments stop after the estimated freedom month; withdrawals
            for living costs begin the following month. If freedom is not
            reached, the planned investments continue through the search
            horizon. Mixed years can contain both working and retired months.
          </p>
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Financial freedom yearly schedule"
          >
            <table>
              <thead>
                <tr>
                  <th>Age at year start</th>
                  <th>Invested</th>
                  <th>Living costs</th>
                  <th>Future expenses</th>
                  <th>Investment growth / loss</th>
                  <th>Unfunded costs</th>
                  <th>End investments</th>
                  <th>Retired months</th>
                </tr>
              </thead>
              <tbody id="freedomRows"></tbody>
            </table>
          </div>
        </section>
        <details className="card">
          <summary>How this estimate works</summary>
          <p>
            The regular-income target is a growing monthly withdrawal stream
            under a constant-return illustration. If r is the monthly growth
            factor from your expected annual return and i is the monthly
            inflation factor, the spending corpus required at a candidate date
            is the next month’s desired spending divided by (r − i). This allows
            the income pot’s purchasing power to keep pace with inflation. With
            positive spending and return at or below inflation, there is no
            finite target under this model. This does not mean retirement is
            impossible; it means this ongoing-income assumption is not
            supported.
          </p>
          <p>
            We separately reserve the present value of included future one-off
            expenses. The optional buffer is added to the combined requirement.
            If larger, an optional minimum corpus inflated to the candidate
            month becomes the target. Each month’s investment is your SIP
            increased by the yearly step-up, added after investment growth.
            Future expenses are paid at month-end. We do not invest all salary
            left after expenses or subtract regular working expenses again from
            the entered SIP.
          </p>
          <p>
            The first month with enough corpus and no earlier unpaid future
            expense becomes the estimated freedom date. New SIPs stop the
            following month. The expected return is unchanged, and the portfolio
            pays your inflation-adjusted monthly spending and later expenses.
            The chart and table stop at the search end age; the income target
            itself assumes continuing spending beyond it. Only scheduled one-off
            expenses within that horizon are included.
          </p>
          <p>
            Monthly support is estimated after setting aside the remaining
            one-off expense reserve, the optional buffer, and the amount needed
            to maintain the income pot’s purchasing power. Salary is used only
            for today’s budget check. You need to fund the planned investment
            step-ups from your future income. Future expenses are paid from the
            investment pot rather than unspecified spare salary.
          </p>
          <p>
            This is not a guaranteed yield, a probability of success or a
            recommendation to leave work. Real returns fluctuate; withdrawing
            from investments may require selling units. Sequence risk, taxes,
            pensions, fees and borrowing are not separately modelled. Use an
            expected return after relevant costs and review the plan as
            circumstances change.
          </p>
          <p>
            Planning background:{" "}
            <a
              href="https://www.investor.gov/introduction-investing/investing-basics/glossary/purchasing-power"
              target="_blank"
              rel="noopener noreferrer"
            >
              Investor.gov: inflation and purchasing power
            </a>
            . Inputs and future expenses stay in this browser, separate from the
            other planners.
          </p>
        </details>
        <footer>
          EDUCATIONAL ILLUSTRATION · NOT INVESTMENT ADVICE · NO RETURN GUARANTEE
        </footer>
      </main>
    </div>
  );
});
