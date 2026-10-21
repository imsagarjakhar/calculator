import { useEffect, useState, type CSSProperties } from "react";
import {
  calculateBudget,
  initialBudget,
  monthlyReserve,
  validBudget,
  type Budget,
} from "../budget/model";
import { plannerHref } from "../runtime/routes";

const storageKey = "intimetec-salary-budget-v1";
function load(): Budget {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (validBudget(saved)) return saved;
  } catch {
    /* Storage can be unavailable. */
  }
  return structuredClone(initialBudget);
}
function NumberField({
  label,
  value,
  onChange,
  max = 1e9,
  min = 0,
  integer = false,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max?: number;
  min?: number;
  integer?: boolean;
  hint?: string;
}) {
  return (
    <label className="budget-field">
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={integer ? 1 : "any"}
        value={value === 0 ? "" : value}
        placeholder="0"
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n))
            onChange(Math.max(min, Math.min(max, integer ? Math.floor(n) : n)));
        }}
      />
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function BudgetPage() {
  const [plan, setPlan] = useState<Budget>(load);
  const [saved, setSaved] = useState("");
  const [tab, setTab] = useState<"plan" | "outlook" | "actual">("plan");
  const result = calculateBudget(plan);
  const money = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: plan.currency,
      maximumFractionDigits: 0,
    }).format(n);
  const percent = (n: number) =>
    result.income > 0 ? Math.round((n / result.income) * 100) : 0;
  function update<K extends keyof Budget>(key: K, value: Budget[K]) {
    setPlan((p) => ({ ...p, [key]: value }));
  }
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(plan));
      setSaved("Saved in this browser");
    } catch {
      setSaved("Browser saving unavailable · export a copy to keep your plan");
    }
  }, [plan]);
  function exportPlan() {
    const data = JSON.stringify(
      {
        plan,
        monthlySummary: result,
        assumptions:
          "12 month-end contributions; effective annual return; no tax, fees or inflation.",
      },
      null,
      2,
    );
    const url = URL.createObjectURL(
      new Blob([data], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "intimetec-monthly-budget.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function patchExpense(
    id: string,
    key: "planned" | "actual",
    value: number | null,
  ) {
    setPlan((p) => ({
      ...p,
      expenses: p.expenses.map((e) =>
        e.id === id ? { ...e, [key]: value } : e,
      ),
    }));
  }
  const buckets = [
    { label: "Essential living", value: result.needs, color: "#67d8c0" },
    { label: "Enjoyment & extras", value: result.wants, color: "#b3a5f5" },
    { label: "Upcoming bills", value: result.bills, color: "#ecc58a" },
    { label: "Savings & investments", value: result.future, color: "#7cbbef" },
    { label: "Cash buffer", value: plan.buffer, color: "#8296a9" },
    {
      label: "Unassigned",
      value: Math.max(0, result.remainder),
      color: "#28404d",
    },
  ];
  const chartTotal = Math.max(result.income, result.allocated, 1);
  let offset = 0;
  const gradient = buckets
    .map((b) => {
      const start = offset;
      offset += (b.value / chartTotal) * 100;
      return `${b.color} ${start}% ${offset}%`;
    })
    .join(",");
  const rowScale = Math.max(
    ...result.projection.map((r) => Math.max(r.corpus, r.invested)),
    1,
  );
  return (
    <main className="budget-app">
      <nav className="budget-nav" aria-label="Planner navigation">
        <a href={plannerHref("home")}>← All planners</a>
        <a className="budget-brand" href={plannerHref("home")}>
          INTIMETEC <span>/ MONEY, WITH PURPOSE</span>
        </a>
        <span className="budget-preview">Standalone preview</span>
      </nav>
      <header className="budget-hero">
        <div>
          <p className="budget-eyebrow">THE MONTHLY MONEY PLAN</p>
          <h1>
            A place for every rupee.
            <br />
            <em>A plan for what’s next.</em>
          </h1>
          <p className="budget-intro">
            From payday to everyday. Give your salary a purpose, make room for
            life, and see what a year of investing could become.
          </p>
          <div className="budget-pills">
            <span>Private by design</span>
            <span>Live calculations</span>
            <span>Your numbers, your choices</span>
          </div>
        </div>
        <div className="budget-payday">
          <span className="budget-payday-icon" aria-hidden="true">
            ↗
          </span>
          <p>YOUR MONTHLY TAKE-HOME</p>
          <strong>{money(result.income)}</strong>
          <span>
            Small monthly choices.
            <br />A clearer year ahead.
          </span>
          <div className="budget-payday-line">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
      </header>
      <div className="budget-toolbar">
        <div className="budget-tabs" role="group" aria-label="Budget views">
          {(
            [
              ["plan", "01", "Monthly plan"],
              ["outlook", "02", "One-year outlook"],
              ["actual", "03", "Spending check-in"],
            ] as const
          ).map(([key, number, label]) => (
            <button
              key={key}
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
            >
              <span>{number}</span>
              {label}
            </button>
          ))}
        </div>
        <div className="budget-tools">
          <button onClick={exportPlan}>Export plan ↓</button>
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Replace your current budget with the example plan?",
                )
              )
                setPlan(structuredClone(initialBudget));
            }}
          >
            Reset example
          </button>
        </div>
      </div>
      <p className="budget-save" role="status">
        {saved}
      </p>
      <div className="budget-workspace">
        <div className="budget-editor">
          {tab === "plan" && (
            <>
              <section
                className="budget-panel"
                aria-labelledby="budget-income-title"
              >
                <div className="budget-panel-heading">
                  <div>
                    <p className="budget-eyebrow">
                      01 / START WITH WHAT COMES IN
                    </p>
                    <h2 id="budget-income-title">Your payday, on paper.</h2>
                  </div>
                  <span className="budget-step" aria-hidden="true">
                    01
                  </span>
                </div>
                <p className="budget-help">
                  Use income received after tax and payroll deductions. For
                  variable income, enter an amount you can reasonably count on.
                </p>
                <div className="budget-fields">
                  <NumberField
                    label={`Take-home salary (${plan.currency})`}
                    value={plan.salary}
                    onChange={(n) => update("salary", n)}
                  />
                  <NumberField
                    label={`Other monthly income (${plan.currency})`}
                    value={plan.otherIncome}
                    onChange={(n) => update("otherIncome", n)}
                  />
                  <label className="budget-field">
                    <span>Plan currency</span>
                    <select
                      value={plan.currency}
                      onChange={(e) => update("currency", e.target.value)}
                    >
                      {["INR", "SAR", "USD", "AED", "EUR", "GBP"].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <small>
                      Changes the currency label; amounts are not converted.
                    </small>
                  </label>
                  <NumberField
                    label="Monthly cash buffer"
                    value={plan.buffer}
                    onChange={(n) => update("buffer", n)}
                    hint="Money kept aside for small surprises."
                  />
                </div>
              </section>
              <section
                className="budget-panel"
                aria-labelledby="budget-expenses-title"
              >
                <div className="budget-panel-heading">
                  <div>
                    <p className="budget-eyebrow">
                      02 / MAKE ROOM FOR REAL LIFE
                    </p>
                    <h2 id="budget-expenses-title">Where your money goes.</h2>
                  </div>
                  <span className="budget-step" aria-hidden="true">
                    02
                  </span>
                </div>
                <p className="budget-help">
                  Enter a monthly plan. Keep minimum debt payments here; don’t
                  count purchases again when paying a credit-card bill.
                </p>
                {(["needs", "wants"] as const).map((group) => (
                  <div className="budget-expense-group" key={group}>
                    <div className="budget-group-title">
                      <h3>
                        {group === "needs"
                          ? "The essentials"
                          : "Life & the little extras"}
                      </h3>
                      <span>
                        {money(group === "needs" ? result.needs : result.wants)}{" "}
                        / mo
                      </span>
                    </div>
                    {plan.expenses
                      .filter((e) => e.group === group)
                      .map((e) => (
                        <div className="budget-expense-row" key={e.id}>
                          <span
                            className={`budget-category-dot ${group}`}
                            aria-hidden="true"
                          />
                          <NumberField
                            label={e.name}
                            value={e.planned}
                            onChange={(n) => patchExpense(e.id, "planned", n)}
                          />
                        </div>
                      ))}
                  </div>
                ))}
              </section>
              <section
                className="budget-panel"
                aria-labelledby="budget-bills-title"
              >
                <div className="budget-panel-heading">
                  <div>
                    <p className="budget-eyebrow">
                      03 / NO MORE SURPRISE BILLS
                    </p>
                    <h2 id="budget-bills-title">
                      Future bills. Monthly pieces.
                    </h2>
                  </div>
                  <span className="budget-step" aria-hidden="true">
                    03
                  </span>
                </div>
                <p className="budget-help">
                  School fees, insurance renewals or a repair. Divide the
                  remaining bill by the months until it’s due. Don’t also
                  include the same bill in expenses above.
                </p>
                {plan.bills.map((bill, index) => {
                  const patch = (key: string, value: string | number) =>
                    update(
                      "bills",
                      plan.bills.map((b) =>
                        b.id === bill.id ? { ...b, [key]: value } : b,
                      ),
                    );
                  return (
                    <fieldset className="budget-bill" key={bill.id}>
                      <legend>Upcoming bill {index + 1}</legend>
                      <label className="budget-field">
                        <span>Bill name</span>
                        <input
                          value={bill.name}
                          maxLength={80}
                          onChange={(e) => patch("name", e.target.value)}
                        />
                      </label>
                      <div className="budget-fields">
                        <NumberField
                          label="Bill amount"
                          value={bill.amount}
                          onChange={(n) => patch("amount", n)}
                        />
                        <NumberField
                          label="Already reserved"
                          value={bill.reserved}
                          onChange={(n) => patch("reserved", n)}
                        />
                        <NumberField
                          label="Months until due"
                          value={bill.months}
                          onChange={(n) => patch("months", n)}
                          min={1}
                          max={120}
                          integer
                        />
                        <div className="budget-bill-total">
                          <small>SET ASIDE EACH MONTH</small>
                          <strong>
                            {money(
                              monthlyReserve(
                                bill.amount,
                                bill.reserved,
                                bill.months,
                              ),
                            )}
                          </strong>
                        </div>
                      </div>
                      <button
                        className="budget-text-button"
                        onClick={() =>
                          update(
                            "bills",
                            plan.bills.filter((b) => b.id !== bill.id),
                          )
                        }
                        aria-label={`Remove bill ${index + 1}`}
                      >
                        Remove bill
                      </button>
                    </fieldset>
                  );
                })}
                <button
                  className="budget-add"
                  disabled={plan.bills.length >= 20}
                  onClick={() =>
                    update("bills", [
                      ...plan.bills,
                      {
                        id: crypto.randomUUID(),
                        name: "",
                        amount: 0,
                        reserved: 0,
                        months: 12,
                      },
                    ])
                  }
                >
                  ＋ Add an upcoming bill
                </button>
              </section>
              <section
                className="budget-panel"
                aria-labelledby="budget-future-title"
              >
                <div className="budget-panel-heading">
                  <div>
                    <p className="budget-eyebrow">04 / PAY YOUR FUTURE SELF</p>
                    <h2 id="budget-future-title">
                      Protection. Progress. Possibility.
                    </h2>
                  </div>
                  <span className="budget-step" aria-hidden="true">
                    04
                  </span>
                </div>
                <div className="budget-subsection">
                  <h3>Your emergency cushion</h3>
                  <p className="budget-help">
                    Target based on essentials plus monthly bill reserves.
                    Existing savings are kept separate from new monthly
                    contributions.
                  </p>
                  <div className="budget-fields">
                    <NumberField
                      label="Emergency savings today"
                      value={plan.emergencySaved}
                      onChange={(n) => update("emergencySaved", n)}
                    />
                    <NumberField
                      label="Months of essentials to cover"
                      min={1}
                      max={120}
                      integer
                      value={plan.emergencyMonths}
                      onChange={(n) => update("emergencyMonths", n)}
                    />
                    <NumberField
                      label="Monthly emergency saving"
                      value={plan.emergencyMonthly}
                      onChange={(n) => update("emergencyMonthly", n)}
                    />
                  </div>
                </div>
                <div className="budget-subsection">
                  <h3>A goal worth making room for</h3>
                  <label className="budget-field">
                    <span>Goal name</span>
                    <input
                      value={plan.goalName}
                      maxLength={80}
                      onChange={(e) => update("goalName", e.target.value)}
                    />
                  </label>
                  <div className="budget-fields">
                    <NumberField
                      label="Goal amount"
                      value={plan.goalAmount}
                      onChange={(n) => update("goalAmount", n)}
                    />
                    <NumberField
                      label="Already saved for goal"
                      value={plan.goalSaved}
                      onChange={(n) => update("goalSaved", n)}
                    />
                    <NumberField
                      label="Months to reach goal"
                      min={1}
                      max={120}
                      integer
                      value={plan.goalMonths}
                      onChange={(n) => update("goalMonths", n)}
                    />
                    <div className="budget-bill-total">
                      <small>MONTHLY GOAL SAVING</small>
                      <strong>{money(result.goal)}</strong>
                    </div>
                  </div>
                </div>
                <div className="budget-subsection">
                  <h3>Let consistency do its part.</h3>
                  <div className="budget-fields">
                    <NumberField
                      label="Monthly investment"
                      value={plan.investment}
                      onChange={(n) => update("investment", n)}
                    />
                    <NumberField
                      label="Expected annual return (%)"
                      min={-99}
                      max={100}
                      value={plan.annualReturn}
                      onChange={(n) => update("annualReturn", n)}
                      hint="An assumption, not a guaranteed return."
                    />
                  </div>
                  <button
                    className="budget-primary"
                    onClick={() => {
                      setTab("outlook");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Explore my one-year outlook ↗
                  </button>
                </div>
              </section>
            </>
          )}
          {tab === "outlook" && (
            <section
              className="budget-panel"
              aria-labelledby="budget-outlook-title"
            >
              <div className="budget-panel-heading">
                <div>
                  <p className="budget-eyebrow">
                    12 MONTHS / ONE CONSISTENT HABIT
                  </p>
                  <h2 id="budget-outlook-title">
                    What a year could look like.
                  </h2>
                </div>
                <span className="budget-step" aria-hidden="true">
                  ↗
                </span>
              </div>
              <p className="budget-help">
                Explore 12 equal monthly investments starting from zero. The
                expense plan, bill reserves and cash savings are not part of
                this investment corpus.
              </p>
              <div className="budget-fields">
                <NumberField
                  label="Monthly investment"
                  value={plan.investment}
                  onChange={(n) => update("investment", n)}
                />
                <NumberField
                  label="Expected annual return (%)"
                  value={plan.annualReturn}
                  min={-99}
                  max={100}
                  onChange={(n) => update("annualReturn", n)}
                />
              </div>
              {result.remainder < 0 && (
                <p className="budget-warning" role="status">
                  Your budget is short by {money(-result.remainder)} per month.
                  This projection assumes every investment is made; adjust the
                  plan to make it affordable.
                </p>
              )}
              <div className="budget-outlook-stats">
                <div>
                  <span>YOU INVEST</span>
                  <strong data-testid="year-invested">
                    {money(result.end.invested)}
                  </strong>
                  <small>Across 12 months</small>
                </div>
                <div>
                  <span>
                    PROJECTED {result.end.gain < 0 ? "LOSS" : "GROWTH"}
                  </span>
                  <strong data-testid="year-gain">
                    {money(result.end.gain)}
                  </strong>
                  <small>At {plan.annualReturn}% annual return</small>
                </div>
                <div>
                  <span>PROJECTED CORPUS</span>
                  <strong data-testid="year-corpus">
                    {money(result.end.corpus)}
                  </strong>
                  <small>At the end of month 12</small>
                </div>
              </div>
              <div className="budget-chart-title">
                <h3>Your year, building month by month.</h3>
                <span>
                  <i />
                  Invested <i />
                  Projected corpus
                </span>
              </div>
              <div
                className="budget-projection-chart"
                role="img"
                aria-label={`12-month investment projection. Invested ${money(result.end.invested)}, projected corpus ${money(result.end.corpus)}.`}
              >
                {result.projection.map((row) => (
                  <div className="budget-chart-column" key={row.month}>
                    <div className="budget-bar-pair">
                      <i
                        style={{
                          height: `${(row.invested / rowScale) * 100}%`,
                        }}
                      />
                      <i
                        style={{ height: `${(row.corpus / rowScale) * 100}%` }}
                      />
                    </div>
                    <span>M{row.month}</span>
                  </div>
                ))}
              </div>
              <details className="budget-schedule">
                <summary>See the month-by-month numbers</summary>
                <div className="budget-table-scroll">
                  <table>
                    <caption>Investment projection · {plan.currency}</caption>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Added</th>
                        <th>Total invested</th>
                        <th>Growth this month</th>
                        <th>Corpus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.projection.map((r) => (
                        <tr key={r.month}>
                          <th>{r.month}</th>
                          <td>{money(r.contribution)}</td>
                          <td>{money(r.invested)}</td>
                          <td>{money(r.growth)}</td>
                          <td>{money(r.corpus)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <div className="budget-method">
                <h3>The assumptions behind the picture</h3>
                <p>
                  Contributions arrive at the end of each month. Monthly return
                  = (1 + annual return)^(1/12) − 1. The first contribution has
                  11 months of growth; the last has none. Returns are constant
                  in this illustration. Taxes, fees and inflation are excluded;
                  actual markets vary and losses are possible.
                </p>
                <p>
                  Monthly allocations stay unchanged in this scenario. Review
                  your budget after a bill is paid or a goal is funded.
                  Emergency and goal savings earn no assumed interest here.
                </p>
              </div>
            </section>
          )}
          {tab === "actual" && (
            <section
              className="budget-panel"
              aria-labelledby="budget-check-title"
            >
              <div className="budget-panel-heading">
                <div>
                  <p className="budget-eyebrow">A MOMENT TO CHECK IN</p>
                  <h2 id="budget-check-title">The plan meets real life.</h2>
                </div>
                <span className="budget-step" aria-hidden="true">
                  ✓
                </span>
              </div>
              <p className="budget-help">
                Track this month’s expenses against your plan. Leave unrecorded
                amounts blank; enter 0 to mark no spending. This compares
                spending only, not investment transfers or savings.
              </p>
              <div className="budget-actual-summary">
                <div>
                  <small>RECORDED SPENDING</small>
                  <strong>{money(result.actual)}</strong>
                </div>
                <div>
                  <small>VS PLAN FOR RECORDED CATEGORIES</small>
                  <strong>
                    {result.actual > result.recordedPlan ? "+" : ""}
                    {money(result.actual - result.recordedPlan)}
                  </strong>
                </div>
              </div>
              <p className="budget-help">
                {result.recordedCount} of {plan.expenses.length} categories
                recorded. Totals are incomplete until every category is entered.
              </p>
              <div className="budget-actual-head">
                <span>Expense category</span>
                <span>Planned</span>
                <span>Actual</span>
              </div>
              {plan.expenses.map((e) => (
                <div className="budget-actual-row" key={e.id}>
                  <div>
                    <strong>{e.name}</strong>
                    <div className="budget-mini-bars" aria-hidden="true">
                      <i
                        style={{
                          width: `${(e.planned / Math.max(e.planned, e.actual || 0, 1)) * 100}%`,
                        }}
                      />
                      <i
                        style={{
                          width: `${((e.actual || 0) / Math.max(e.planned, e.actual || 0, 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span>{money(e.planned)}</span>
                  <label>
                    <span className="budget-sr-only">Actual {e.name}</span>
                    <input
                      type="number"
                      min={0}
                      max={1e9}
                      step="any"
                      inputMode="decimal"
                      placeholder="Not entered"
                      value={e.actual ?? ""}
                      onChange={(event) =>
                        patchExpense(
                          e.id,
                          "actual",
                          event.target.value === ""
                            ? null
                            : Math.max(
                                0,
                                Math.min(1e9, Number(event.target.value) || 0),
                              ),
                        )
                      }
                    />
                  </label>
                </div>
              ))}
              <p className="budget-chart-key">
                <i />
                Planned <i />
                Actual recorded
              </p>
            </section>
          )}
        </div>
        <aside
          id="budget-snapshot"
          className="budget-sidebar"
          aria-label="Live monthly budget summary"
        >
          <section className="budget-summary">
            <p className="budget-eyebrow">YOUR MONTHLY SNAPSHOT</p>
            <h2>Every bit, accounted for.</h2>
            <div
              className="budget-donut"
              role="img"
              aria-label="Monthly allocations. Details listed below."
              style={
                {
                  "--budget-ring": `conic-gradient(${gradient})`,
                } as CSSProperties
              }
            >
              <div>
                <span>TAKE-HOME</span>
                <strong>{money(result.income)}</strong>
                <small>per month</small>
              </div>
            </div>
            <dl className="budget-breakdown">
              {buckets
                .filter((b) => b.value > 0 || b.label !== "Unassigned")
                .map((b) => (
                  <div key={b.label}>
                    <dt>
                      <i style={{ background: b.color }} />
                      {b.label}
                    </dt>
                    <dd>
                      {money(b.value)}
                      <small>{percent(b.value)}%</small>
                    </dd>
                  </div>
                ))}
            </dl>
            <div
              className={`budget-balance ${result.remainder < 0 ? "is-short" : ""}`}
              role="status"
            >
              <span>
                {result.remainder < 0
                  ? "MONTHLY SHORTFALL"
                  : result.remainder === 0
                    ? "A FULLY ASSIGNED PLAN"
                    : "STILL YOURS TO ASSIGN"}
              </span>
              <strong data-testid="budget-remainder">
                {money(Math.abs(result.remainder))}
              </strong>
              <p>
                {result.remainder < 0
                  ? "Your plan exceeds your income. Explore a smaller optional spend, a longer goal timeline, or a lower allocation."
                  : result.remainder > 0
                    ? "Give this a job: an extra saving, a goal, or a little breathing room."
                    : "Every part of your income has a purpose, including your cash buffer."}
              </p>
            </div>
          </section>
          <section className="budget-cushion">
            <p className="budget-eyebrow">YOUR SAFETY NET</p>
            <h3>A cushion for the unexpected.</h3>
            <div className="budget-cushion-value">
              <strong>{money(plan.emergencySaved)}</strong>
              <span>of {money(result.emergencyTarget)}</span>
            </div>
            <progress
              aria-label="Emergency fund progress"
              value={Math.min(plan.emergencySaved, result.emergencyTarget)}
              max={Math.max(1, result.emergencyTarget)}
            />
            <p>
              {result.emergencyGap === 0 ? (
                "Your chosen emergency target is covered."
              ) : (
                <>
                  {money(result.emergencyGap)} to go.{" "}
                  {result.emergencyTime === null
                    ? "Add a monthly contribution to estimate the time needed."
                    : `About ${result.emergencyTime} months at your planned contribution.`}
                </>
              )}
            </p>
          </section>
          <details className="budget-guideline">
            <summary>A starting point, not a rule.</summary>
            <p>
              The 50 / 30 / 20 template splits take-home income into needs,
              wants, and saving or extra debt repayment. Your rent, family
              commitments and goals may need a different balance.
            </p>
            <dl>
              <div>
                <dt>50% needs</dt>
                <dd>{money(result.income * 0.5)}</dd>
              </div>
              <div>
                <dt>30% wants</dt>
                <dd>{money(result.income * 0.3)}</dd>
              </div>
              <div>
                <dt>20% saving</dt>
                <dd>{money(result.income * 0.2)}</dd>
              </div>
            </dl>
            <p>
              Comparison only. It does not change your allocations
              automatically. Bill reserves and your buffer remain separate in
              this planner.
            </p>
          </details>
        </aside>
      </div>
      <div
        className={`budget-mobile-balance ${result.remainder < 0 ? "is-short" : ""}`}
      >
        <div>
          <span>
            {result.remainder < 0 ? "Monthly shortfall" : "Left to assign"}
          </span>
          <strong>{money(Math.abs(result.remainder))}</strong>
        </div>
        <a href="#budget-snapshot">View breakdown ↑</a>
      </div>
      <footer className="budget-foot">
        <span>INTIMETEC / MAKE ROOM FOR YOUR FUTURE</span>
        <p>
          A planning illustration using your inputs. No account or bank
          connection. Your plan is stored in this browser when available;
          clearing browser data removes it. The JSON export keeps a portable
          copy.
        </p>
      </footer>
    </main>
  );
}
