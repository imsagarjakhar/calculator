import { PlannerNavigation } from "../components/PlannerNavigation";
import { DateInput } from "../components/DateInput";
import { memo } from "react";
import { PlannerHeader } from "../components/PlannerHeader";
import { usePlanner } from "../runtime/usePlanner";
import mount from "planner:controller:bucket";
export const BucketPage = memo(function BucketPage() {
  const ref = usePlanner(mount);
  return (
    <div ref={ref}>
      <main className="planner-page">
        <PlannerNavigation />
        <PlannerHeader kind="bucket" />
        <div className="bucket-workspace">
          <section className="card setup-card" aria-labelledby="setupTitle">
            <p className="eyebrow">01 / YOUR RETIREMENT STARTS HERE</p>
            <h2 id="setupTitle">Set your starting point</h2>
            <p className="helper">
              Start withdrawals now. No new investments are added in this plan.
            </p>
            <form id="bucketForm" noValidate>
              <div className="fields">
                <label className="wide" htmlFor="b-startMonth">
                  When do withdrawals start?
                  <DateInput
                    id="b-startMonth"
                    type="month"
                    min="1900-01"
                    max="2150-12"
                    required
                    placeholder="YYYY-MM"
                  />
                </label>
                <label className="wide" htmlFor="b-corpus">
                  Total retirement savings (<span className="b-code">INR</span>)
                  <input
                    id="b-corpus"
                    type="number"
                    min="0"
                    max="1000000000000"
                    step="any"
                    required
                  />
                </label>
                <label className="wide" htmlFor="b-monthly">
                  How much will you spend each month? (
                  <span className="b-code">INR</span>)
                  <input
                    id="b-monthly"
                    type="number"
                    min="0"
                    max="1000000000"
                    step="any"
                    required
                  />
                </label>
                <label htmlFor="b-age">
                  Your current age
                  <input
                    id="b-age"
                    type="number"
                    min="18"
                    max="119"
                    step="1"
                    required
                  />
                </label>
                <label htmlFor="b-endAge">
                  Plan until age
                  <input
                    id="b-endAge"
                    type="number"
                    min="19"
                    max="120"
                    step="1"
                    required
                  />
                </label>
                <label htmlFor="b-inflation">
                  Yearly inflation (%)
                  <input
                    id="b-inflation"
                    type="number"
                    min="0"
                    max="30"
                    step="any"
                    required
                  />
                </label>
                <label htmlFor="b-emergency">
                  Emergency reserve (<span className="b-code">INR</span>)
                  <input
                    id="b-emergency"
                    type="number"
                    min="0"
                    max="1000000000000"
                    step="any"
                    required
                  />
                </label>
              </div>
              <details className="assumption-drawer">
                <summary>
                  Returns, refill rules &amp; a market-fall scenario
                </summary>
                <p className="helper">
                  Illustrative assumptions you can change. Enter returns after
                  expected taxes and costs.
                </p>
                <p className="helper">
                  Returns are credited at the end of every 12 plan months,
                  measured from your withdrawal start month. Each bucket uses
                  its average of the 12 monthly balances after withdrawals and
                  transfers. Uncredited returns cannot be spent and do not
                  compound within the year. Negative returns are limited to the
                  available bucket balance at year end.
                </p>
                <div className="fields">
                  <label htmlFor="b-spendingReturn">
                    Bucket 1 annual return (%)
                    <input
                      id="b-spendingReturn"
                      type="number"
                      min="-50"
                      max="40"
                      step="any"
                      required
                    />
                  </label>
                  <label htmlFor="b-emergencyReturn">
                    Bucket 2 annual return (%)
                    <input
                      id="b-emergencyReturn"
                      type="number"
                      min="-50"
                      max="40"
                      step="any"
                      required
                    />
                  </label>
                  <label htmlFor="b-equityReturn">
                    Bucket 3 annual return (%)
                    <input
                      id="b-equityReturn"
                      type="number"
                      min="-50"
                      max="40"
                      step="any"
                      required
                    />
                  </label>
                  <label htmlFor="b-refillMonths">
                    Review and refill
                    <select id="b-refillMonths">
                      <option value="1">Every month</option>
                      <option value="12">Every year</option>
                      <option value="24">Every 2 years</option>
                      <option value="36">Every 3 years</option>
                      <option value="48">Every 4 years</option>
                      <option value="60">Every 5 years</option>
                    </select>
                  </label>
                  <label htmlFor="b-shockPercent">
                    One-off equity market fall (%)
                    <input
                      id="b-shockPercent"
                      type="number"
                      min="0"
                      max="80"
                      step="any"
                      required
                    />
                    <span className="helper">0 means no additional fall.</span>
                  </label>
                  <label htmlFor="b-shockYear">
                    Market fall in plan year
                    <input
                      id="b-shockYear"
                      type="number"
                      min="1"
                      max="102"
                      step="1"
                      required
                    />
                  </label>
                </div>
                <p className="helper">
                  Review intervals run from your withdrawal start month. For
                  example, every 3 years means the first scheduled refill is at
                  the start of plan year 4, after 36 months. This fixed schedule
                  does not check market performance. Refills can sell equity
                  even after a market fall. Bucket 2 is reserved for emergencies
                  and does not cover regular living costs.
                </p>
              </details>
              <button className="primary calculate-button" type="submit">
                Build my bucket plan <span aria-hidden="true">↗</span>
              </button>
              <p className="helper">
                Your plan saves in this browser under its own storage key.
                Changing currency changes units without converting amounts.
              </p>
            </form>
            <p id="bucketError" className="error" role="alert"></p>
          </section>
          <section
            className="bucket-allocation"
            aria-labelledby="allocationTitle"
          >
            <div className="allocation-heading">
              <div>
                <p className="eyebrow">02 / THE MONEY MAP</p>
                <h2 id="allocationTitle">Your buckets through time</h2>
              </div>
              <span className="pill">5-year spending buffer</span>
            </div>
            <div
              id="allocationSummary"
              className="allocation-summary"
              aria-live="polite"
            ></div>
            <section
              id="bucketNavigator"
              className="bucket-navigator"
              aria-labelledby="navigatorTitle"
            >
              <div className="navigator-top">
                <div>
                  <p className="eyebrow">EXPLORE A MONTH</p>
                  <h3 id="navigatorTitle">
                    Watch withdrawals and refills happen
                  </h3>
                </div>
                <label htmlFor="bucketDate">
                  Calendar month
                  <DateInput
                    id="bucketDate"
                    type="month"
                    placeholder="YYYY-MM"
                  />
                </label>
              </div>
              <div className="playback-controls">
                <button
                  id="bucketPrevious"
                  type="button"
                  aria-label="Previous month"
                >
                  ← Previous month
                </button>
                <button
                  id="bucketPlay"
                  className="primary"
                  type="button"
                  aria-pressed="false"
                >
                  ▶ Play
                </button>
                <button id="bucketStep" type="button">
                  Next step →
                </button>
                <button id="bucketNext" type="button" aria-label="Next month">
                  Next month →
                </button>
                <button id="bucketNextRefill" type="button">
                  Jump to refill ↗
                </button>
              </div>
              <label className="timeline-slider-label" htmlFor="bucketSlider">
                <span id="bucketTimelineLabel">Plan month 1</span>
                <input
                  id="bucketSlider"
                  type="range"
                  min="0"
                  max="419"
                  step="1"
                  defaultValue="0"
                />
              </label>
              <div
                id="bucketStages"
                className="bucket-stages"
                role="group"
                aria-label="Steps within the selected month"
              ></div>
              <p
                id="bucketStageStatus"
                className="helper"
                aria-live="polite"
              ></p>
              <p id="bucketDateError" className="error" role="alert"></p>
            </section>
            <div id="bucketCards" className="bucket-cards"></div>
            <section
              id="extraWithdrawalPanel"
              className="extra-withdrawal-panel"
              aria-labelledby="extraWithdrawalTitle"
              hidden
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">BUCKET 02 · EXTRA SPENDING</p>
                  <h3 id="extraWithdrawalTitle">Extra withdrawal</h3>
                </div>
                <button
                  id="extraWithdrawalClose"
                  type="button"
                  aria-label="Close extra withdrawal form"
                >
                  Close ×
                </button>
              </div>
              <p className="helper">
                A one-off payment from your emergency bucket. Your regular
                monthly SWP stays the same.
              </p>
              <form id="extraWithdrawalForm" noValidate>
                <div className="fields">
                  <label htmlFor="extraReason">
                    Reason
                    <input
                      id="extraReason"
                      maxLength={80}
                      placeholder="e.g. Home repair"
                      required
                    />
                  </label>
                  <label htmlFor="extraAmount">
                    Amount (<span className="b-code">INR</span>)
                    <input
                      id="extraAmount"
                      type="number"
                      min="0.01"
                      max="1000000000000"
                      step="any"
                      required
                    />
                  </label>
                  <label htmlFor="extraDate">
                    Withdrawal month
                    <DateInput
                      id="extraDate"
                      type="month"
                      required
                      placeholder="YYYY-MM"
                    />
                  </label>
                  <label htmlFor="extraRefill">
                    Refill Bucket 2
                    <select id="extraRefill">
                      <option value="scheduled">
                        At next scheduled review
                      </option>
                      <option value="immediate">
                        Immediately after withdrawal
                      </option>
                    </select>
                  </label>
                </div>
                <p className="helper">
                  Enter the amount you will withdraw in that month; no inflation
                  is added. If Bucket 2 cannot cover it, a top-up from Bucket 3
                  is attempted. The refill choice controls restoring the reserve
                  after payment.
                </p>
                <button className="primary" type="submit">
                  Add withdrawal
                </button>
                <p id="extraWithdrawalError" className="error" role="alert"></p>
              </form>
              <p id="extraWithdrawalSaved" className="helper" role="status"></p>
            </section>
            <section
              id="bucketHistory"
              className="bucket-history"
              aria-labelledby="bucketHistoryTitle"
              hidden
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">BUCKET TRANSACTION HISTORY</p>
                  <h3 id="bucketHistoryTitle">Bucket history</h3>
                </div>
                <button
                  id="bucketHistoryClose"
                  type="button"
                  aria-label="Close bucket history"
                >
                  Close ×
                </button>
              </div>
              <div className="history-toolbar">
                <div
                  id="bucketHistoryTabs"
                  className="schedule-view"
                  role="group"
                  aria-label="Choose bucket"
                >
                  <button type="button" data-history-bucket="spending">
                    01 · Living
                  </button>
                  <button type="button" data-history-bucket="emergency">
                    02 · Emergency
                  </button>
                  <button type="button" data-history-bucket="equity">
                    03 · Long term
                  </button>
                </div>
                <div
                  className="schedule-view"
                  role="group"
                  aria-label="Bucket history period"
                >
                  <button
                    id="bucketHistoryMonthly"
                    type="button"
                    aria-pressed="true"
                  >
                    Monthly
                  </button>
                  <button
                    id="bucketHistoryYearly"
                    type="button"
                    aria-pressed="false"
                  >
                    Yearly
                  </button>
                </div>
              </div>
              <p className="helper">
                Opening + refills in − refills out − withdrawals + market change
                + year-end return = closing. Returns are credited every 12 plan
                months; scheduled refills happen at the start of the next review
                period. Select a period to inspect its playback movements below.
              </p>
              <p
                id="bucketHistoryStatus"
                className="helper"
                aria-live="polite"
              ></p>
              <div
                className="table-wrap history-table"
                role="region"
                aria-label="Selected bucket opening and closing balances"
                tabIndex={0}
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Period / events</th>
                      <th scope="col">Opening</th>
                      <th scope="col">Refills in</th>
                      <th scope="col">Refills out</th>
                      <th scope="col">Withdrawals</th>
                      <th scope="col">Market change</th>
                      <th scope="col">Year-end return</th>
                      <th scope="col">Closing</th>
                    </tr>
                  </thead>
                  <tbody id="bucketHistoryRows"></tbody>
                </table>
              </div>
              <h4 id="bucketHistoryDetailTitle">Playback movements</h4>
              <p className="helper">
                This follows the selected month and step as you play. Amounts
                show this bucket only.
              </p>
              <div
                className="table-wrap"
                role="region"
                aria-label="Selected bucket playback movements"
                tabIndex={0}
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Movement</th>
                      <th scope="col">Change</th>
                      <th scope="col">Balance</th>
                    </tr>
                  </thead>
                  <tbody id="bucketHistoryDetails"></tbody>
                </table>
              </div>
            </section>
            <section
              className="refill-visual"
              aria-labelledby="refillVisualTitle"
            >
              <div className="refill-visual-header">
                <div>
                  <h3 id="refillVisualTitle">How your next refill works.</h3>
                </div>
                <button
                  id="refillMotion"
                  type="button"
                  aria-pressed="false"
                  aria-label="Pause refill animation"
                >
                  Ⅱ Pause animation
                </button>
              </div>
              <p className="refill-intro">
                Your long-term bucket tops up living costs and your emergency
                reserve at each scheduled review.
              </p>
              <div className="refill-visual-meta">
                <span id="refillRule" className="pill"></span>
                <span className="pill">Fixed schedule</span>
                <span id="refillDate" className="pill"></span>
              </div>
              <div id="refillDiagram"></div>
              <div className="refill-visual-footer">
                <span
                  id="refillVisualStatus"
                  className="helper"
                  role="status"
                ></span>
                <button id="refillInspect" type="button">
                  See this refill ↗
                </button>
              </div>
              <details className="refill-help">
                <summary>Refill rules</summary>
                <p className="helper">
                  Transfers use available Bucket 3 money. Bucket 1 is topped up
                  to the next 60 months of inflation-adjusted spending; Bucket 2
                  to its inflation-adjusted emergency target. Reviews follow
                  your chosen interval, regardless of market performance. An
                  immediate top-up may happen earlier if a withdrawal cannot be
                  covered. This animation previews a scheduled review; it does
                  not change your balances.
                </p>
              </details>
            </section>
            <section className="rolling-reserve" aria-labelledby="rollingTitle">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">THE FIVE-YEAR WINDOW MOVES WITH YOU</p>
                  <h3 id="rollingTitle">What do the next 5 years cost?</h3>
                </div>
              </div>
              <div
                id="rollingSummary"
                className="rolling-summary"
                aria-live="polite"
              ></div>
              <p id="rollingWindow" className="helper"></p>
              <details className="five-year-details">
                <summary>See all 60 inflation-adjusted withdrawals</summary>
                <p className="helper">
                  The window starts with the next unpaid living withdrawal at
                  the selected step. Inflation increases on each plan
                  anniversary. Amounts are future spending costs, without
                  deducting expected fund returns. The 60-month reserve can
                  extend beyond your projection end date.
                </p>
                <div
                  className="table-wrap"
                  role="region"
                  aria-label="Rolling five-year spending costs"
                >
                  <table>
                    <thead>
                      <tr>
                        <th>Withdrawal period</th>
                        <th>Months</th>
                        <th>Monthly spending</th>
                        <th>Period cost</th>
                      </tr>
                    </thead>
                    <tbody id="fiveYearRows"></tbody>
                    <tfoot id="fiveYearTotal"></tfoot>
                  </table>
                </div>
              </details>
            </section>
            <details className="month-ledger" open>
              <summary>Money movements in the selected month</summary>
              <p className="helper">
                Opening and closing rows are balances. The other rows show money
                moving in or out. A refill adds to one bucket and subtracts the
                same amount from Bucket 3.
              </p>
              <div
                className="table-wrap"
                role="region"
                aria-label="Selected month cash movements"
              >
                <table>
                  <thead>
                    <tr>
                      <th>Movement</th>
                      <th>Living costs</th>
                      <th>Emergency</th>
                      <th>Long term</th>
                      <th>Combined</th>
                    </tr>
                  </thead>
                  <tbody id="bucketMonthLedger"></tbody>
                </table>
              </div>
            </details>
            <div
              id="bucketOutcome"
              className="bucket-outcome"
              aria-live="polite"
            ></div>
          </section>
        </div>
        <section
          className="card emergency-section"
          aria-labelledby="emergencyTitle"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                03 / LIFE DOES NOT FOLLOW A STRAIGHT LINE
              </p>
              <h2 id="emergencyTitle">Plan a medical or one-off expense</h2>
              <p className="helper">
                Optional. Paid from Bucket 2, with the option to replenish from
                Bucket 3 immediately or at the next scheduled review.
              </p>
            </div>
            <span className="pill">Separate from monthly spending</span>
          </div>
          <form id="emergencyForm" noValidate>
            <div className="event-inputs">
              <label htmlFor="eventName">
                Expense name
                <input
                  id="eventName"
                  maxLength={80}
                  placeholder="e.g. Medical treatment"
                  required
                />
              </label>
              <label htmlFor="eventAmount">
                Cost (<span className="b-code">INR</span>)
                <input
                  id="eventAmount"
                  type="number"
                  min="0.01"
                  max="1000000000000"
                  step="any"
                  placeholder="500000"
                  required
                />
              </label>
              <label htmlFor="eventYear">
                Plan year
                <input
                  id="eventYear"
                  type="number"
                  min="1"
                  max="102"
                  step="1"
                  required
                  defaultValue="5"
                />
              </label>
              <label htmlFor="eventMonth">
                Month in that year
                <input
                  id="eventMonth"
                  type="number"
                  min="1"
                  max="12"
                  step="1"
                  required
                  defaultValue="1"
                />
              </label>
              <label htmlFor="eventBasis">
                Amount is in
                <select id="eventBasis">
                  <option value="today">Today’s prices</option>
                  <option value="future">Future prices</option>
                </select>
              </label>
              <label htmlFor="eventRefill">
                Refill Bucket 2
                <select id="eventRefill">
                  <option value="immediate">Immediately</option>
                  <option value="scheduled">At next scheduled review</option>
                </select>
              </label>
              <button className="primary" type="submit">
                Add expense
              </button>
            </div>
            <p id="eventError" className="error" role="alert"></p>
          </form>
          <div id="bucketEvents" className="bucket-events"></div>
        </section>
        <section className="card projection-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">04 / WATCH THE BUCKETS WORK</p>
              <h2>Three buckets, one retirement timeline</h2>
            </div>
            <span className="pill">Projected future values</span>
          </div>
          <div className="bucket-legend">
            <span className="legend-spending">Living costs</span>
            <span className="legend-emergency">Emergency</span>
            <span className="legend-equity">Long term</span>
          </div>
          <div id="bucketChart"></div>
          <p className="helper">
            Hover, tap or use arrow keys for exact amounts. The chart stacks the
            three bucket balances; refilling moves money between buckets and
            does not create a return.
          </p>
        </section>
        <section className="card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">05 / EVERY WITHDRAWAL, EVERY REFILL</p>
              <h2>Follow your money</h2>
            </div>
            <div
              className="schedule-view"
              role="group"
              aria-label="Projection schedule view"
            >
              <button id="bucketYearly" type="button" aria-pressed="true">
                Yearly
              </button>
              <button id="bucketMonthly" type="button" aria-pressed="false">
                Monthly
              </button>
            </div>
          </div>
          <p className="helper">
            Balances are after that period’s withdrawals, transfers and returns.
            Unfunded amounts remain unpaid; they do not create debt.
          </p>
          <div
            className="table-wrap"
            role="region"
            aria-label="Bucket projection schedule"
          >
            <table>
              <thead id="bucketTableHead"></thead>
              <tbody id="bucketTableRows"></tbody>
            </table>
          </div>
          <details className="transfer-details">
            <summary>See transfers from Bucket 3</summary>
            <div
              className="table-wrap"
              role="region"
              aria-label="Bucket refill transfers"
            >
              <table>
                <thead>
                  <tr>
                    <th>Plan month</th>
                    <th>Reason</th>
                    <th>To living costs</th>
                    <th>To emergency</th>
                  </tr>
                </thead>
                <tbody id="transferRows"></tbody>
              </table>
            </div>
          </details>
        </section>
        <details className="card model-notes">
          <summary>Understand the model before using the result</summary>
          <p>
            Bucket 1 is labelled hybrid funds, Bucket 2 bonds / hybrid funds,
            and Bucket 3 equity, following this prototype’s chosen strategy.
            These are model labels, not product recommendations. Hybrid, bond
            and equity funds can lose value. Emergency money also needs suitable
            liquidity.
          </p>
          <p>
            The month explorer shows projected balances at individual steps
            within the chosen calendar month. Opening balances are before that
            month’s transactions. Once the living withdrawal has been processed,
            the rolling five-year window advances to the following month. The
            ledger separates transfers from external withdrawals and investment
            growth. Playback pauses when you edit inputs, choose another date or
            leave the tab.
          </p>
          <p>
            At the start, savings fill Bucket 1 with 60 months of
            inflation-adjusted spending, then Bucket 2 with your emergency
            amount. Any remainder goes into Bucket 3. If the savings cannot fund
            both targets, the allocation shortfall is shown. No extra capital is
            invented.
          </p>
          <p>
            Each month: apply any selected equity fall first; perform a
            scheduled refill; pay emergency expenses and regular living costs;
            replenish a used emergency reserve where requested; then accrue
            returns on the remaining balances, crediting them only at the end of
            every 12 plan months. A refill always draws from Bucket 3. Living
            costs take priority in a scheduled review. If a bucket cannot meet a
            withdrawal, an immediate transfer from Bucket 3 is attempted. Bucket
            2 never automatically funds regular living costs.
          </p>
          <p>
            A scheduled review tops Bucket 1 up to the following 60 months’
            undiscounted spending and Bucket 2 up to its inflation-adjusted
            target. Monthly spending and the emergency target rise once per
            year. Emergency expenses entered at today’s prices inflate to the
            start of their event month. Returns are credited at the end of every
            12 plan months, measured from your withdrawal start month. Each
            bucket uses its average of the 12 monthly balances after withdrawals
            and transfers. Uncredited returns cannot be spent and do not
            compound within the year. Negative returns are limited to the
            available bucket balance at year end. Transfers cannot exceed Bucket
            3’s available balance and balances cannot become negative.
          </p>
          <p>
            There is no salary, new SIP, tax calculation, transaction cost,
            insurance payout or automatic borrowing. A positive balance at the
            end only covers the selected horizon under these assumptions.
            Constant returns and a single optional market fall do not model all
            market paths or establish that retirement is safe.
          </p>
          <p>
            Planning background:{" "}
            <a
              href="https://www.investor.gov/introduction-investing/getting-started/asset-allocation"
              target="_blank"
              rel="noopener noreferrer"
            >
              Investor.gov: asset allocation, time horizon and risk
            </a>
            .
          </p>
        </details>
        <footer>
          Financial AI Planner retirement lab · Independent prototype · No
          changes to your other plans
        </footer>
      </main>
    </div>
  );
});
