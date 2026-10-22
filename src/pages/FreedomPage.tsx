import { PlannerNavigation } from "../components/PlannerNavigation";
import { memo, type ReactNode } from "react";
import { PlannerHeader } from "../components/PlannerHeader";
import { usePlanner } from "../runtime/usePlanner";
import mount from "planner:controller:freedom";
function FieldInfo({
  name,
  id,
  children,
}: {
  name: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <details className="freedom-field-info">
      <summary aria-label={`About ${name}`}>
        <span aria-hidden="true">i</span>
      </summary>
      <div id={id}>{children}</div>
    </details>
  );
}
export const FreedomPage = memo(function FreedomPage() {
  const ref = usePlanner(mount);
  return (
    <div ref={ref}>
      <main className="planner-page">
        <PlannerNavigation />
        <PlannerHeader kind="freedom" />
        <p className="freedom-intro">
          Choose a monthly income or a withdrawal rate. See what your savings
          could support.
        </p>
        <div className="freedom-layout">
          <section className="card">
            <h2>Your starting point</h2>
            <form id="freedomForm" noValidate>
              <div className="fields">
                <label htmlFor="f-age">
                  <span className="freedom-field-heading">
                    Your current age
                  </span>
                  <input
                    id="f-age"
                    type="number"
                    min="18"
                    max="100"
                    step="1"
                    required
                  />
                </label>
                <div className="freedom-input-field">
                  <div className="freedom-field-heading">
                    <label htmlFor="f-monthlyInvestment">
                      Monthly investment (<span className="f-code">INR</span>)
                    </label>
                    <FieldInfo name="monthly investment" id="investmentHelp">
                      Money you plan to invest each month, after living costs.
                      Enter 0 for no new investments. Future increases need to
                      come from your income.
                    </FieldInfo>
                  </div>
                  <input
                    id="f-monthlyInvestment"
                    type="number"
                    min="0"
                    max="1000000000"
                    step="any"
                    required
                    aria-describedby="investmentHelp"
                  />
                </div>
                <div className="freedom-input-field">
                  <div className="freedom-field-heading">
                    <label htmlFor="f-corpus">
                      Savings &amp; investments today (
                      <span className="f-code">INR</span>)
                    </label>
                    <FieldInfo name="current savings" id="corpusHelp">
                      Savings, mutual funds, stocks and deposits available after
                      stopping work. Exclude your home and money reserved for
                      other needs.
                    </FieldInfo>
                  </div>
                  <input
                    id="f-corpus"
                    type="number"
                    min="0"
                    max="1000000000000000"
                    step="any"
                    required
                    aria-describedby="corpusHelp"
                  />
                </div>
              </div>
              <p className="helper">
                <a href="#freedomEvents">
                  Have a future one-off cost? Add it below ↓
                </a>
              </p>
              <h2 className="freedom-step">Your freedom goal</h2>
              <input id="f-incomeMode" type="hidden" defaultValue="corpus" />
              <div
                className="freedom-goal-switch"
                role="group"
                aria-label="Choose income goal method"
              >
                <button
                  id="freedomGoalSpending"
                  type="button"
                  aria-pressed="false"
                  aria-controls="spendingGoal"
                >
                  Enter monthly income
                </button>
                <button
                  id="freedomGoalCorpus"
                  type="button"
                  aria-pressed="true"
                  aria-controls="withdrawalGoal"
                >
                  Use corpus percentage
                </button>
              </div>
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
              </div>
              <section
                id="withdrawalGoal"
                className="freedom-withdrawal"
                aria-labelledby="withdrawalTitle"
              >
                <div className="freedom-withdrawal-heading">
                  <div>
                    <h3 id="withdrawalTitle">Choose your annual withdrawal</h3>
                  </div>
                  <output id="withdrawalRateValue" htmlFor="f-withdrawalRate">
                    3%
                  </output>
                </div>
                <label htmlFor="f-withdrawalRate">
                  Annual withdrawal rate (%)
                </label>
                <input
                  id="f-withdrawalRate"
                  type="range"
                  min="2"
                  max="6"
                  step="0.25"
                  defaultValue="3"
                  aria-describedby="withdrawalHelp"
                />
                <div className="freedom-withdrawal-scale" aria-hidden="true">
                  <span>2% · Lower income</span>
                  <span>6% · Higher withdrawals</span>
                </div>
                <p id="withdrawalHelp" className="helper">
                  A share of your projected savings, paid monthly.
                </p>
                <div
                  id="withdrawalPreview"
                  className="freedom-withdrawal-preview"
                  aria-live="polite"
                />
                <FieldInfo
                  name="withdrawal assumptions"
                  id="withdrawalAssumptions"
                >
                  Scheduled future costs and your extra cushion are reserved
                  first. Monthly withdrawals then rise with inflation. This is a
                  withdrawal assumption, not a return or guaranteed income;
                  higher withdrawals can exhaust the corpus sooner.
                </FieldInfo>
              </section>
              <div id="spendingGoal" hidden>
                <div className="fields">
                  <label htmlFor="f-retirementExpense">
                    Monthly income you need, in today’s money (
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
                  Include living costs. We adjust for inflation.
                </p>
                <div
                  id="spendingRatePreview"
                  className="freedom-spending-preview"
                  aria-live="polite"
                />
              </div>
              <section className="freedom-simple-assumptions">
                <h3>Your assumptions</h3>
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
                      Increase your investment each year. 0% keeps it fixed.
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
                <FieldInfo name="expected returns" id="returnHelp">
                  One expected return applies throughout the plan. Change it to
                  see your freedom age and monthly support update. Use an
                  assumption after taxes and fees; returns are not guaranteed
                  monthly interest payments.
                </FieldInfo>
              </section>
              <details className="investment-schedule planner-explanation">
                <summary id="investmentScheduleTitle">
                  See your investment schedule
                </summary>
                <div className="investment-schedule-heading">
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
              </details>
              <details className="freedom-assumptions">
                <summary>Optional budget check and extra settings</summary>
                <p className="helper">
                  Check whether today’s income covers your investment. Future
                  salary is not forecast; you must fund the planned step-ups.
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
                      0% adds no cushion; 10% raises your target by 10%.
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
          <h2>Your investments and monthly-income goal</h2>
          <div id="freedomChart"></div>
        </section>
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Year-by-year plan</h2>
            </div>
            <button id="freedomCsv" type="button">
              Download monthly CSV
            </button>
          </div>
          <details className="planner-explanation">
            <summary>How to read this table</summary>
            <p>
              Investments stop after your estimated freedom month. Living-cost
              withdrawals start the next month. If freedom is not reached,
              investments continue to the search end age. A transition year can
              include both working and retired months.
            </p>
          </details>
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
            In corpus-based mode, savings grow to your selected stop-work age.
            We reserve future one-off costs and your optional cushion, then
            multiply the remaining corpus by your annual withdrawal rate and
            divide by 12. The default is 3%, adjustable from 2–6%. Contributions
            stop at the selected age and withdrawals start the next month,
            rising with inflation. The schedule shows any later shortfall. This
            calculates an income amount; it does not prove that amount covers
            your spending or lasts for life.
          </p>
          <p>
            In monthly-spending mode, the regular-income target is a growing
            monthly withdrawal stream under a constant-return illustration. If r
            is the monthly growth factor from your expected annual return and i
            is the monthly inflation factor, the spending corpus required at a
            candidate date is the next month’s desired spending divided by (r −
            i). This allows the income pot’s purchasing power to keep pace with
            inflation. With positive spending and return at or below inflation,
            there is no finite target under this model. This does not mean
            retirement is impossible; it means this ongoing-income assumption is
            not supported.
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
