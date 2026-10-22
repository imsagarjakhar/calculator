import { memo } from "react";
import { PlannerHeader } from "../components/PlannerHeader";
import { usePlanner } from "../runtime/usePlanner";
import mount from "planner:controller:growth";
export const GrowthPage = memo(function GrowthPage() {
  const ref = usePlanner(mount);
  return (
    <div ref={ref}>
      <div id="growthScreen">
        <PlannerHeader kind="growth" />
        <nav className="tabs" aria-label="Choose an investment scenario">
          <button type="button" data-type="FD" aria-pressed="false">
            Fixed Deposit
          </button>
          <button type="button" data-type="Gold" aria-pressed="false">
            Gold
          </button>
          <button type="button" data-type="MF" aria-pressed="true">
            Equity Mutual Fund
          </button>
        </nav>
        <div id="error" className="error alert" role="alert" hidden></div>
        <section id="growthHoldings"></section>
        <div className="layout">
          <section className="panel" aria-labelledby="heading">
            <div className="section-top">
              <div>
                <div className="eyebrow">01 / SET YOUR PLAN</div>
                <h2 id="heading" style={{ marginTop: "7px" }}>
                  Equity Mutual Fund Calculator
                </h2>
              </div>
              <button
                id="pptExample"
                className="tiny ghost"
                type="button"
                title="Restore the presentation inputs and clear extra investments"
              >
                PPT example: 5%
              </button>
            </div>
            <div className="controls">
              <label htmlFor="monthly">
                Starting monthly investment (
                <span className="currency-code">INR</span>)
                <input
                  id="monthly"
                  type="number"
                  min="0"
                  max="100000000"
                  step="1"
                  inputMode="decimal"
                  defaultValue="2000"
                />
              </label>
              <label htmlFor="stepup">
                Annual SIP step-up (%)
                <input
                  id="stepup"
                  type="number"
                  min="0"
                  max="30"
                  step="0.1"
                  inputMode="decimal"
                  defaultValue="10"
                />
              </label>
              <label htmlFor="years">
                Investment duration (years)
                <input
                  id="years"
                  type="number"
                  min="1"
                  max="60"
                  step="1"
                  inputMode="numeric"
                  defaultValue="30"
                />
              </label>
              <label htmlFor="rate">
                Annual rate input (%)
                <input
                  id="rate"
                  type="number"
                  min="-20"
                  max="40"
                  step="0.01"
                  inputMode="decimal"
                  defaultValue="12"
                />
              </label>
              <label htmlFor="goal">
                Net wealth goal (<span className="currency-code">INR</span>)
                <input
                  id="goal"
                  type="number"
                  min="1"
                  max="100000000000"
                  step="1"
                  inputMode="decimal"
                  defaultValue="10000000"
                />
              </label>
              <label htmlFor="inflation">
                Inflation assumption (%)
                <input
                  id="inflation"
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  inputMode="decimal"
                  defaultValue="5"
                />
              </label>
            </div>
            <div className="hint calculated" id="stepHint"></div>
            <p className="helper">
              Step-up starts in month 13 and applies once a year. Keep future
              contributions affordable.
            </p>
          </section>
          <section
            className="panel result-panel calculated"
            aria-label="Projection results"
          >
            <div className="result-top">
              <div className="result-label" id="resultLabel">
                ILLUSTRATIVE VALUE AFTER 30 YEARS
              </div>
              <span className="badge">Assets minus remaining debt</span>
            </div>
            <div id="value" className="amount"></div>
            <div id="exactValue" className="exact-value amount"></div>
            <div className="stats">
              <div className="stat">
                <span>Regular SIP deposited</span>
                <strong id="regularTotal"></strong>
              </div>
              <div className="stat extra-stat">
                <span>Extra money deposited</span>
                <strong id="extraTotal"></strong>
              </div>
              <div className="stat">
                <span>Starting asset value + deposits</span>
                <strong id="invested"></strong>
              </div>
              <div className="stat">
                <span>Modelled gain / loss</span>
                <strong id="gain"></strong>
              </div>
            </div>
            <div className="result-bottom">
              <div>
                <span id="lastLabel">Monthly SIP in year 30</span>
                <strong id="last"></strong>
              </div>
              <div>
                <span>Net wealth in today's money</span>
                <strong id="real"></strong>
              </div>
            </div>
            <div id="wealthSummary" className="wealth-summary"></div>
            <div className="goal" id="goalResult"></div>
            <p className="helper" id="goalNote"></p>
          </section>
        </div>
        <div className="layout secondary">
          <section
            className="panel"
            id="extrasPanel"
            aria-labelledby="extraTitle"
          >
            <div className="section-top">
              <div>
                <div className="eyebrow">02 / ADD MONEY ALONG THE WAY</div>
                <h2 id="extraTitle" style={{ marginTop: "7px" }}>
                  Bonus? Gift? Extra savings?
                </h2>
              </div>
              <span className="count-badge" id="extraCount">
                0 extra entries
              </span>
            </div>
            <p className="subtitle">
              Add a one-time deposit alongside your regular SIP.
            </p>
            <form id="extraForm" className="extra-form" noValidate>
              <label htmlFor="extraYear">
                Investment year
                <select
                  id="extraYear"
                  aria-label="Year for new extra investment"
                ></select>
              </label>
              <label htmlFor="extraMonth">
                Month within year
                <select
                  id="extraMonth"
                  aria-label="Month within investment year"
                ></select>
              </label>
              <label className="extra-amount" htmlFor="extraAmount">
                Extra amount (<span className="currency-code">INR</span>)
                <input
                  id="extraAmount"
                  type="number"
                  min="0.01"
                  max="100000000000"
                  step="0.01"
                  placeholder="e.g. 50,000"
                  inputMode="decimal"
                />
              </label>
              <label className="extra-note" htmlFor="extraNote">
                Note (optional)
                <input
                  id="extraNote"
                  type="text"
                  maxLength={80}
                  placeholder="Annual bonus, extra savings..."
                />
              </label>
              <button
                id="addExtra"
                className="primary add-button"
                type="submit"
              >
                + Add extra
              </button>
              <div id="extraError" className="error" role="alert"></div>
            </form>
            <details className="planner-explanation">
              <summary>When does an extra deposit start growing?</summary>
              <p>
                Year 3, Month 6 means investment month 30, not June. A deposit
                is added at month-end and starts growing the following month.
              </p>
            </details>
            <div id="extrasEmpty" className="empty">
              <strong>No extra amounts added yet.</strong>Add an amount above,
              or use the + Add buttons in the monthly table.
            </div>
            <div id="extrasList" className="extra-list"></div>
            <div
              id="extraStatus"
              className="status"
              role="status"
              aria-live="polite"
            ></div>
            <div className="impact calculated">
              <div className="eyebrow">WHAT YOUR EXTRA MONEY CHANGES</div>
              <strong id="extraImpact"></strong>
              <p id="extraImpactNote"></p>
            </div>
          </section>
          <section
            className="panel chart calculated"
            aria-labelledby="chartHeading"
          >
            <div className="eyebrow">03 / WATCH THE DIFFERENCE</div>
            <h2 id="chartHeading" style={{ marginTop: "7px" }}>
              Your money over time
            </h2>
            <svg
              id="chart"
              viewBox="0 0 640 320"
              role="img"
              aria-label="Projected balance, balance without extras, and total contributions"
            ></svg>
            <div className="legend">
              <span>
                <i className="swatch"></i>Assets with extras
              </span>
              <span>
                <i className="swatch base"></i>Assets without extras
              </span>
              <span>
                <i className="swatch deposits"></i>Starting assets + deposits
              </span>
            </div>
            <p className="helper">
              Tap a point or use arrow keys for amounts. The chart shows assets
              before debt; the headline shows net wealth. Actual returns will
              vary.
            </p>
            <h3 style={{ marginTop: "17px" }}>
              Net wealth at reference SIP rates
            </h3>
            <div className="compare">
              <div className="cmp" data-scenario="FD">
                <span>FD / 6.05% input</span>
                <strong id="cFD"></strong>
              </div>
              <div className="cmp" data-scenario="Gold">
                <span>Gold / 10.41% input</span>
                <strong id="cGold"></strong>
              </div>
              <div className="cmp" data-scenario="MF">
                <span>Equity MF / 12% input</span>
                <strong id="cMF"></strong>
              </div>
            </div>
            <details className="planner-explanation">
              <summary>What changes in these comparisons?</summary>
              <p>
                Only the return on new SIP deposits changes. Existing assets,
                loans, life expenses and contributions stay the same. These
                reference rates stay fixed; your selected rate updates the main
                result, chart and tables.
              </p>
            </details>
            <div id="risk"></div>
          </section>
        </div>
        <section id="growthLifeEvents"></section>
        <section
          className="panel schedule calculated"
          aria-labelledby="scheduleTitle"
        >
          <div className="schedule-head">
            <div className="eyebrow">04 / EVERY DEPOSIT, CLEARLY LAID OUT</div>
            <h2 id="scheduleTitle" style={{ marginTop: "7px" }}>
              Your assets, loans &amp; investment schedule
            </h2>
            <p className="subtitle">
              See exactly when the SIP increases and where extra amounts enter
              the plan.
            </p>
            <div className="journey" id="journey"></div>
            <div className="schedule-toolbar">
              <div className="view-switch" role="group" aria-label="Table view">
                <button id="yearlyView" type="button" aria-pressed="true">
                  Yearly summary
                </button>
                <button id="monthlyView" type="button" aria-pressed="false">
                  Monthly breakdown
                </button>
              </div>
              <div className="export-group">
                <button id="exportYearly" className="ghost" type="button">
                  Download yearly CSV
                </button>
                <button id="exportMonthly" className="ghost" type="button">
                  Download monthly CSV
                </button>
              </div>
            </div>
          </div>
          <div className="filter-bar">
            <div className="filter-note" id="tableInfo"></div>
            <div className="filters" id="monthlyFilters" hidden>
              <label htmlFor="yearFilter">
                Investment year
                <select id="yearFilter">
                  <option value="all">All years</option>
                </select>
              </label>
              <label htmlFor="pageSize">
                Rows per page
                <select id="pageSize" defaultValue="12">
                  <option value="12">12 months</option>
                  <option value="24">24 months</option>
                  <option value="60">60 months</option>
                  <option value="all">All months</option>
                </select>
              </label>
            </div>
          </div>
          <div
            className="table-wrap"
            id="tableWrap"
            tabIndex={0}
            role="region"
            aria-label="Scrollable investment schedule"
          >
            <table id="scheduleTable">
              <caption className="sr-only" id="tableCaption">
                Yearly investment summary
              </caption>
              <thead id="tableHead"></thead>
              <tbody id="tableBody"></tbody>
              <tfoot id="tableFoot"></tfoot>
            </table>
          </div>
          <div className="pagination">
            <span id="rowCount"></span>
            <div className="page-buttons" id="paginationButtons" hidden>
              <button id="prevPage" className="tiny" type="button">
                Previous
              </button>
              <span id="pageInfo"></span>
              <button id="nextPage" className="tiny" type="button">
                Next
              </button>
            </div>
          </div>
          <p className="schedule-foot" id="roundingNote">
            Amounts are rounded to the nearest whole unit of the selected
            currency for display. Calculations use full precision, so displayed
            totals can differ slightly from the sum of rounded rows. CSV files
            contain the complete schedule, not just the current page.
          </p>
        </section>
        <div className="details">
          <details>
            <summary>
              How the calculation works, source references &amp; limitations
            </summary>
            <p>
              Reference: the uploaded <strong>SIP with 10K.xlsx</strong>,
              Results and Cal sheets. FD 6.05%, Gold 10.41%, yearly increase 5%
              and inflation 5% are workbook inputs. This updated planner starts
              with a 10% annual step-up at your request; use the 5% PPT example
              button to restore the original presentation scenario. Their
              historical source and period were not specified. The video uses a
              separately chosen equity-fund illustration of 12%, rather than the
              workbook's 21.762% weighted equity input. None is a verified
              current offer or guaranteed future rate.
            </p>
            <p>
              The original workbook lists a 20,000 salary, a 50% investment
              share, and a hardcoded 40,000 investment amount. This teaching
              example resets salary to 10,000 and starting investment to 2,000;
              the original file is unchanged. Income must grow to sustain larger
              contributions at the same savings share.
            </p>
            <p>
              For month m: payment = starting payment × (1 + step-up) ^ floor((m
              - 1) / 12). Closing balance before life expenses = previous
              closing balance × (1 + annual input / 12) + regular payment +
              extra payment. Life expenses are then deducted, up to the
              available corpus. Today’s expense costs are inflated by (1 +
              inflation / 100) ^ (payment month / 12), matching their month-end
              payment time. Unfunded costs are reported separately; they do not
              create debt. Growth / loss is investment return only, excluding
              withdrawals. Pausing an expense removes it from the scenario. Each
              calculator and currency has its own saved life expenses; the Reset
              button clears the complete Growth calculator, including assets,
              loans and life expenses in all its currencies. The PPT example
              button only restores the example inputs and clears extra deposits.
              Both payments are added at the end of the selected month; they
              first earn modelled growth in the following month. Extras are
              one-time payments and are not increased by the annual SIP step-up.
              Goal timing is the first closing balance at or above the target,
              searching up to 100 years. Beyond the selected duration, this
              search assumes regular SIPs, annual step-ups, existing asset
              growth and loan repayments continue, with no new extra investments
              or life expenses. Extras outside the selected duration are
              excluded from all calculations. The first crossing does not
              guarantee the balance will stay above the goal. It is not a
              forecast.
            </p>
            <p>
              Annual input / 12 is a nominal-rate convention matching the
              workbook. For example, a 12% input compounds at 1% monthly, which
              is 12.6825% effective annually. This is not a 12% CAGR model.
              Actual returns are uneven and negative periods are possible.
            </p>
            <p>
              The FD SIP illustration is a monthly-deposit and reinvestment
              proxy, not an actual 30-year FD product; real tenures and
              compounding vary. Gold illustrations exclude purchase spreads and
              product costs. Equity mutual funds carry market risk. Taxes,
              expense ratios and transaction costs are not separately deducted;
              use an appropriately adjusted return assumption for your purpose.
            </p>
            <p>
              Investor education:{" "}
              <a
                href="https://investor.sebi.gov.in/pdf/reference-material/MFunds.pdf"
                target="_blank"
                rel="noopener"
              >
                SEBI mutual fund guidance
              </a>{" "}
              ·{" "}
              <a
                href="https://investor.sebi.gov.in/investment_risk_managment.html"
                target="_blank"
                rel="noopener"
              >
                SEBI risk management
              </a>{" "}
              ·{" "}
              <a
                href="https://www.dicgc.org.in/guide-to-deposit-insurance"
                target="_blank"
                rel="noopener"
              >
                DICGC deposit insurance
              </a>
              .
            </p>
            <p>
              <strong>Extras:</strong> multiple extras in the same month are
              added together. Editing or removing an extra updates all results
              immediately. Shortening the duration keeps later entries for
              editing, but excludes them from projections. An extra is not a
              recurring SIP increase. The extra-money impact equals final net
              wealth with extras minus final net wealth without extras, after
              applying the same life-expense schedule. When expenses are
              unfunded, extra deposits may fund those costs instead of
              increasing the final balance.
            </p>
            <p>
              <strong>Tables:</strong> regular SIP increases at the start of
              each investment year after year 1. Monthly growth is opening
              balance multiplied by the monthly rate, before either end-month
              deposit. Yearly growth is the sum of monthly growth during that
              year. Calendar dates are not assumed: Year 2, Month 1 is
              investment month 13. Displayed amounts are rounded; CSV values are
              in your selected currency, to two decimal places.
            </p>
            <p>
              <strong>Currency selector:</strong> enter amounts in your selected
              currency; no exchange-rate conversion is applied. Changing
              currency resets the monthly investment and goal to their default
              amounts, clears the extra amount and scheduled extra investments,
              and keeps the percentage and duration assumptions unchanged.
            </p>
            <p id="storageNote">
              Inputs and extras are saved locally when browser storage is
              available. This file sends no information to any server. Keep
              downloaded CSV copies of important schedules; local browser
              storage is not a permanent backup.
            </p>
            <p>
              <strong>No return guarantee:</strong> tax, product costs and
              charges are not deducted. These are illustrative assumptions, not
              current rates or product recommendations. The SIP uses annual rate
              input / 12; existing assets use their own effective annual return
              and loans use annual interest / 12; a 12% input implies 12.6825%
              effective annual growth, not 12% CAGR.
            </p>
          </details>
        </div>
        <footer>
          EDUCATIONAL ILLUSTRATION / NOT INVESTMENT ADVICE / NO RETURN GUARANTEE
        </footer>
      </div>
    </div>
  );
});
