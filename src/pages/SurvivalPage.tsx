import { WorkedExampleLink } from "../components/WorkedExampleLink";
import { memo } from "react";
import { PlannerHeader } from "../components/PlannerHeader";
import { usePlanner } from "../runtime/usePlanner";
import mount from "planner:controller:survival";
const survivalFields = [
  {
    key: "corpus",
    label: "Current corpus",
    unit: "money",
    min: 0,
    max: 1e12,
    initial: 10000000,
  },
  {
    key: "age",
    label: "Current age",
    unit: "years",
    min: 18,
    max: 119,
    initial: 45,
  },
  {
    key: "swp",
    label: "Monthly SWP amount",
    unit: "money",
    min: 0,
    max: 1e9,
    initial: 50000,
  },
  {
    key: "inflation",
    label: "Annual inflation",
    unit: "%",
    min: 0,
    max: 30,
    initial: 6,
  },
  {
    key: "returns",
    label: "Expected annual return",
    unit: "%",
    min: -50,
    max: 40,
    initial: 8,
  },
  {
    key: "endAge",
    label: "Plan until age",
    unit: "years",
    min: 19,
    max: 120,
    initial: 100,
  },
] as const;
export const SurvivalPage = memo(function SurvivalPage() {
  const ref = usePlanner(mount);
  return (
    <div ref={ref}>
      <div id="survivalScreen">
        <PlannerHeader kind="survival" />
        <div className="layout">
          <section className="panel">
            <div className="eyebrow">01 / YOUR STARTING POINT</div>
            <h2 style={{ marginTop: "8px" }}>Set your survival plan</h2>
            <p className="helper">
              SWP = the monthly amount you withdraw from savings.
            </p>
            <p id="survivalStartStatus" className="helper"></p>
            <form id="survivalForm" noValidate>
              <div className="controls">
                {survivalFields.map((field) => (
                  <label key={field.key} htmlFor={"s-" + field.key}>
                    {field.label}{" "}
                    {field.unit === "money" ? (
                      <>
                        (<span className="s-currency-code">INR</span>)
                      </>
                    ) : (
                      "(" + field.unit + ")"
                    )}
                    <input
                      id={"s-" + field.key}
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.unit === "years" ? 1 : "any"}
                      inputMode="decimal"
                      defaultValue={field.initial}
                    />
                  </label>
                ))}
              </div>
              <div
                id="survivalError"
                className="error survival-error"
                role="alert"
              ></div>
              <div className="survival-actions">
                <button className="primary" type="submit">
                  Calculate survival
                </button>
                <button id="survivalReset" className="ghost" type="button">
                  Reset example
                </button>
              </div>
            </form>
            <p className="helper">
              Spending rises with inflation yearly. Enter a return after
              expected taxes and costs.
            </p>
          </section>
          <section
            className="panel result-panel survival-results"
            aria-labelledby="survivalResultTitle"
          >
            <div className="result-top">
              <h2 id="survivalResultTitle">Your corpus runway</h2>
              <span className="badge">Daily spending model</span>
            </div>
            <div id="survivalOutput" aria-live="polite"></div>
          </section>
        </div>
        <section id="survivalLifeEvents"></section>
        <section
          className="panel survival-chart"
          aria-labelledby="survivalChartTitle"
        >
          <div className="section-top">
            <div>
              <div className="eyebrow">02 / THE BIG PICTURE</div>
              <h2 id="survivalChartTitle" style={{ marginTop: "8px" }}>
                Your corpus over time
              </h2>
            </div>
            <span className="badge">Future money values</span>
          </div>
          <div id="survivalPlot"></div>
        </section>
        <section
          className="panel schedule"
          aria-labelledby="survivalScheduleTitle"
        >
          <div className="schedule-head">
            <div className="section-top">
              <div>
                <div className="eyebrow">03 / FOLLOW THE NUMBERS</div>
                <h2 id="survivalScheduleTitle" style={{ marginTop: "8px" }}>
                  Year-by-year breakdown
                </h2>
              </div>
              <button id="survivalExport" className="ghost" type="button">
                Download CSV
              </button>
            </div>
            <p className="helper" id="survivalTableNote"></p>
          </div>
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Scrollable corpus survival schedule"
          >
            <table>
              <caption className="sr-only">
                Yearly corpus balances and funded withdrawals in the selected
                currency
              </caption>
              <thead>
                <tr>
                  <th scope="col">Age at start</th>
                  <th scope="col">Opening corpus</th>
                  <th scope="col">Monthly SWP budget</th>
                  <th scope="col">Funded withdrawals</th>
                  <th scope="col">Return / loss</th>
                  <th scope="col">Life expenses funded</th>
                  <th scope="col">Event shortfall</th>
                  <th scope="col">Closing corpus</th>
                </tr>
              </thead>
              <tbody id="survivalRows"></tbody>
            </table>
          </div>
        </section>
        <details className="details survival-method">
          <summary>Calculation method &amp; assumptions</summary>
          <p>
            This is a forward projection from the displayed start date, not a
            historical backtest. The monthly SWP budget is spread evenly across
            each plan month's days. Life expenses are paid at the start of the
            selected plan month, before daily returns and regular spending. The
            plan stops if the corpus is exhausted; future scheduled costs are
            included in the unfunded total. Amounts entered in today’s money are
            inflated to the event month. Each day, the remaining corpus earns
            the daily equivalent of your effective annual return, then that
            day's spending is deducted. Inflation increases the monthly budget
            on each anniversary of the start date. Age is assumed to change on
            those anniversaries because no date of birth is requested.
          </p>
          <p>
            Daily return = (1 + annual return / 100) ^ (1 / days in the current
            plan year) − 1. Spending per day = current monthly budget / days in
            that plan month. Returns continue through the final partially funded
            day. Funded days include the fraction of that day's spending covered
            by the remaining corpus; the headline rounds down to whole days.
            Plan months run between monthly anniversaries of the start date,
            clamped to month-end when necessary, so every full plan year
            includes exactly twelve monthly budgets. Leap days are included. The
            model stops at depletion or your selected end age; a positive ending
            balance only means it lasts through that horizon.
          </p>
          <p>
            Fixed returns do not model volatility or sequence-of-returns risk.
            Actual SWP payments taken as monthly lump sums will give different
            results. All balances are nominal future amounts. This model
            excludes other income and separate tax calculations. The result is
            an illustration, not a guarantee.
          </p>
          <p>
            Inspired by the retirement stress-testing approach at{" "}
            <a
              href="https://tools.amitupadhyaya.com/retirement-corpus/"
              target="_blank"
              rel="noopener"
            >
              Amit Upadhyaya's retirement corpus calculator
            </a>
            .
          </p>
        </details>
        <WorkedExampleLink route="survival" />
      </div>
    </div>
  );
});
