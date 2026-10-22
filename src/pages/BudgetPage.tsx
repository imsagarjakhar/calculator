import { PlannerNavigation } from "../components/PlannerNavigation";
import { preferredCurrency, usePlanCurrency } from "../runtime/currency";
import { PlannerHeader } from "../components/PlannerHeader";
import { BudgetGrowthChart } from "../components/BudgetGrowthChart";
import { downloadReport, readPortablePlan } from "../runtime/portableReport";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import {
  calculateBudget,
  initialBudget,
  emptyBudget,
  monthlyReserve,
  validBudget,
  upgradeBudget,
  type Budget,
} from "../budget/model";

const storageKey = "intimetec-salary-budget-v1";
function load(): Budget {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (validBudget(saved)) return upgradeBudget(saved);
  } catch {
    /* Storage can be unavailable. */
  }
  return emptyBudget();
}
function NumberField({
  label,
  value,
  onChange,
  max = 1e9,
  min = 0,
  integer = false,
  hint,
  info,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max?: number;
  min?: number;
  integer?: boolean;
  hint?: string;
  info?: string;
}) {
  const id = useId();
  const [infoOpen, setInfoOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const field = (
    <label className="budget-field">
      <span id={`${id}-label`}>{label}</span>
      <input
        aria-labelledby={`${id}-label`}
        aria-describedby={
          [hint ? `${id}-hint` : "", info ? `${id}-info` : ""]
            .filter(Boolean)
            .join(" ") || undefined
        }
        type="number"
        inputMode={integer ? "numeric" : "decimal"}
        min={min}
        max={max}
        step={integer ? 1 : "any"}
        value={draft ?? (value === 0 ? "" : value)}
        placeholder={min > 0 ? undefined : "0"}
        onChange={(e) => {
          const raw = e.target.value;
          const n = Number(raw);
          if (
            min > 0 &&
            (raw === "" ||
              n < min ||
              n > max ||
              (integer && !Number.isInteger(n)))
          ) {
            // Keep unfinished input visible without using it as a divisor in the plan.
            setDraft(raw);
            return;
          }
          setDraft(null);
          if (Number.isFinite(n))
            onChange(Math.max(min, Math.min(max, integer ? Math.floor(n) : n)));
        }}
        onBlur={() => {
          if (draft !== null && draft !== "") {
            const n = Number(draft);
            if (Number.isFinite(n))
              onChange(
                Math.max(min, Math.min(max, integer ? Math.floor(n) : n)),
              );
          }
          // An empty field returns to the last valid value when editing ends.
          setDraft(null);
        }}
      />
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </label>
  );
  if (!info) return field;
  return (
    <div className="budget-field-with-info">
      {field}
      <span
        className="budget-field-info"
        onMouseLeave={() => setInfoOpen(false)}
      >
        <button
          type="button"
          className="budget-info-button"
          aria-label="About cash set aside"
          aria-describedby={`${id}-info`}
          onMouseEnter={() => setInfoOpen(true)}
          onFocus={() => setInfoOpen(true)}
          onClick={() => setInfoOpen(true)}
          onBlur={() => setInfoOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setInfoOpen(false);
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 10v7" />
            <circle cx="12" cy="7" r=".8" fill="currentColor" stroke="none" />
          </svg>
        </button>
        <span
          id={`${id}-info`}
          role="tooltip"
          className="budget-info-tooltip"
          hidden={!infoOpen}
        >
          {info}
        </span>
      </span>
    </div>
  );
}
export function BudgetPage() {
  const [plan, setPlan] = useState<Budget>(() => {
    const saved = load();
    return { ...saved, currency: preferredCurrency() ?? saved.currency };
  });
  usePlanCurrency(plan, setPlan);
  const [saved, setSaved] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"plan" | "outlook" | "actual">("plan");
  const result = calculateBudget(plan);
  const expenseTotal = result.needs + result.wants;
  const expensesOverSalary = expenseTotal - plan.salary > 1e-7;
  const warningKind =
    result.income <= 0
      ? null
      : expensesOverSalary
        ? "expenses"
        : result.remainder < 0
          ? "plan"
          : null;
  const expenseAlert = useRef<HTMLDialogElement>(null);
  const expenseWarningShown = useRef<string | null>(null);
  useEffect(() => {
    if (!warningKind) {
      expenseWarningShown.current = null;
      expenseAlert.current?.close();
      return;
    }
    if (expenseWarningShown.current === warningKind) return;
    // Wait for a pause in typing; warn once per active kind of shortfall.
    const timer = window.setTimeout(() => {
      if (expenseAlert.current && !expenseAlert.current.open) {
        expenseWarningShown.current = warningKind;
        expenseAlert.current.showModal();
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [expenseTotal, plan.salary, result.allocated, result.income, warningKind]);
  const money = (n: number) =>
    new Intl.NumberFormat(plan.currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: plan.currency,
      maximumFractionDigits: 0,
    }).format(n);
  const percent = (n: number) =>
    result.income > 0 ? Math.round((n / result.income) * 100) : 0;
  function update<K extends keyof Budget>(key: K, value: Budget[K]) {
    setPlan((p) => ({ ...p, [key]: value }));
  }
  function updateExpectedReturn(value: number) {
    setPlan((p) => ({ ...p, annualReturn: value, goalAnnualReturn: value }));
  }
  function updateInvestment(value: number) {
    setPlan((p) => ({ ...p, investment: value, investmentMode: "custom" }));
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
          "One-year outlook: 12 month-end contributions from zero. Goal: existing savings and the same monthly investment grow over the goal timeline, using one effective annual return. Annual contribution step-ups start in month 13 and need extra future income. The goal is not a second allocation. No tax, fees or inflation.",
      },
      null,
      2,
    );
    const url = URL.createObjectURL(
      new Blob([data], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "money-planner-monthly-budget.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function resetPlan() {
    if (
      window.confirm(
        "Clear your budget and start again with all amounts at zero?",
      )
    ) {
      setPlan(emptyBudget(plan.currency));
      setNotice("");
      setTab("plan");
    }
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      const value = await readPortablePlan(file, "budget");
      if (!validBudget(value))
        throw Error("Choose a valid salary budget report or JSON plan.");
      setPlan(upgradeBudget(value));
      setTab("plan");
      setNotice("Your salary budget was restored.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not read this plan.");
    }
  }
  function report() {
    downloadReport(
      "Monthly salary & budget report",
      "money-planner-monthly-budget.html",
      "budget",
      plan,
      [
        {
          title: "Monthly overview",
          headers: ["Setting", `Amount (${plan.currency})`],
          rows: [
            ["Take-home salary", money(plan.salary)],
            ["Other income", money(plan.otherIncome)],
            ["Allocated", money(result.allocated)],
            ["Unassigned / shortfall", money(result.remainder)],
            ["Available after expenses and reserves", money(result.available)],
            ["Monthly investment", money(result.monthlyInvestment)],
            ["Cash buffer", money(plan.buffer)],
            ["Emergency saving per month", money(plan.emergencyMonthly)],
            [
              "Required monthly investment for goal (constant contributions)",
              money(result.goal),
            ],
            ["Projected goal balance", money(result.goalEnd.corpus)],
            ["Goal shortfall at deadline", money(result.goalGap)],
            ["Annual contribution step-up", `${plan.goalStepUp ?? 0}%`],
            [
              "Goal timeline",
              `${Math.floor(plan.goalMonths / 12)} years, ${plan.goalMonths % 12} months`,
            ],
            ["Expected annual return", `${plan.annualReturn}%`],
          ],
        },
        {
          title: "Expenses",
          headers: ["Category", "Planned", "Actual"],
          rows: plan.expenses.map((e) => [
            e.name,
            money(e.planned),
            e.actual === null ? "Not recorded" : money(e.actual),
          ]),
        },
        {
          title: "Upcoming bills",
          headers: [
            "Bill",
            "Amount per payment",
            "Reserved",
            "Next Payment after (Months)",
            "Payment frequency",
          ],
          rows: plan.bills.map((b) => [
            b.name,
            money(b.amount),
            money(b.reserved),
            b.months,
            b.intervalMonths
              ? b.intervalMonths === 1
                ? "Monthly"
                : `Every ${b.intervalMonths} months`
              : "One-time payment",
          ]),
        },
        {
          title: "One-year investment outlook",
          headers: [
            "Month",
            "Contribution",
            "Total invested",
            "Growth / loss",
            "Corpus",
          ],
          rows: result.projection.map((r) => [
            r.month,
            money(r.contribution),
            money(r.invested),
            money(r.gain),
            money(r.corpus),
          ]),
        },
      ],
      "One-year outlook: 12 month-end contributions from zero. Goal: existing savings and the same monthly investment grow over the goal timeline, using one effective annual return. Annual step-ups start in month 13 and need extra future income; a goal is not a second allocation. No tax, fees or inflation. Returns are assumptions, not guarantees. Amounts are in the selected currency without conversion.",
    );
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
    {
      label: "Monthly investment",
      value: result.monthlyInvestment,
      color: "#7cbbef",
    },
    {
      label: "Emergency saving",
      value: plan.emergencyMonthly,
      color: "#738474",
    },
    { label: "Cash buffer", value: plan.buffer, color: "#8296a9" },
    {
      label: "Unassigned",
      value: Math.max(0, result.remainder),
      color: "#28404d",
    },
  ];
  const chartTotal = Math.max(result.income, result.allocated, 1);
  let offset = 0;
  const gradient =
    result.income === 0 && result.allocated === 0
      ? "#e1e9df 0% 100%"
      : buckets
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
    <main className="planner-page budget-app">
      <PlannerNavigation />
      <PlannerHeader
        kind="budget"
        controls={{
          currency: plan.currency,
          onCurrency: (c) => update("currency", c),
          onImport: (file) => {
            void importFile(file);
          },
          onReport: report,
          onReset: resetPlan,
          onSaveJSON: exportPlan,
        }}
      />
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
        <button
          type="button"
          className="budget-example-button"
          onClick={() => {
            if (
              (result.income > 0 ||
                result.allocated > 0 ||
                plan.emergencySaved > 0 ||
                plan.goalSaved > 0) &&
              !window.confirm(
                "Replace your current budget with an example plan?",
              )
            )
              return;
            setPlan({
              ...structuredClone(initialBudget),
              currency: plan.currency,
            });
            setTab("plan");
            setNotice(
              "Example plan loaded. Replace these amounts with your own, or choose Reset to start from zero.",
            );
          }}
        >
          Load example plan
        </button>
      </div>
      {notice && (
        <p className="budget-save" role="status">
          {notice}
        </p>
      )}
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
                  <NumberField
                    label="Keep some Cash aside from Salary"
                    value={plan.buffer}
                    onChange={(n) => update("buffer", n)}
                    hint="Money kept available for small, unexpected expenses."
                    info="Isn’t included in the investment growth projection."
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
                <div
                  className={`budget-expense-total${expensesOverSalary ? " is-over" : ""}`}
                  aria-live="polite"
                >
                  <div>
                    <span>Total monthly expenses</span>
                    <strong data-testid="budget-expense-total">
                      {money(expenseTotal)}
                    </strong>
                  </div>
                  <div>
                    <span>Take-home salary</span>
                    <span>{money(plan.salary)}</span>
                  </div>
                  <p>
                    {expensesOverSalary
                      ? `Expenses exceed your salary by ${money(expenseTotal - plan.salary)}.`
                      : `${money(Math.max(0, plan.salary - expenseTotal))} of your salary remains after these expenses.`}
                  </p>
                  <small>
                    Essentials and extras above only. Bills, savings and cash
                    set aside are separate.
                  </small>
                </div>
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
                  Plan for gym fees, school fees, renewals or a one-time repair.
                  Choose how often you pay and when the next payment is due.
                  Don’t also include the same bill in expenses above.
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
                      <label className="budget-field">
                        <span>Payment frequency</span>
                        <select
                          aria-label="Payment frequency"
                          value={bill.intervalMonths ?? 0}
                          onChange={(e) => {
                            const intervalMonths = Number(e.target.value);
                            update(
                              "bills",
                              plan.bills.map((b) =>
                                b.id === bill.id
                                  ? {
                                      ...b,
                                      intervalMonths,
                                      months: intervalMonths || b.months,
                                    }
                                  : b,
                              ),
                            );
                          }}
                        >
                          <option value={0}>One-time payment</option>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(
                            (months) => (
                              <option key={months} value={months}>
                                {months === 1
                                  ? "Monthly"
                                  : months === 12
                                    ? "Yearly (every 12 months)"
                                    : `Every ${months} months`}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      <div className="budget-fields">
                        <NumberField
                          label="Bill amount"
                          hint="Amount for one payment."
                          value={bill.amount}
                          onChange={(n) => patch("amount", n)}
                        />
                        <NumberField
                          label="Already reserved"
                          value={bill.reserved}
                          onChange={(n) => patch("reserved", n)}
                        />
                        <NumberField
                          label="Next Payment after (Months)"
                          hint="Adjust if the next payment is sooner."
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
                      <p className="budget-help">
                        {bill.intervalMonths
                          ? `Next payment: set aside ${money(monthlyReserve(bill.amount, bill.reserved, bill.months))} each month for ${bill.months} ${bill.months === 1 ? "month" : "months"}. After that, budget ${money(bill.amount / bill.intervalMonths)} per month for repeat payments.`
                          : "A one-time bill: the monthly amount covers the next payment only."}{" "}
                        Already reserved applies to the next payment only.
                      </p>
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
                        intervalMonths: 12,
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
                      hint="Money you already have saved. Enter your current balance."
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
                    <div className="budget-bill-total" aria-live="polite">
                      <small>EMERGENCY FUND TARGET</small>
                      <strong data-testid="emergency-fund-target">
                        {money(result.emergencyTarget)}
                      </strong>
                      <p className="budget-help">
                        ({money(result.needs)} essentials +{" "}
                        {money(result.bills)} bill reserves) ×{" "}
                        {plan.emergencyMonths} months.
                      </p>
                      <p
                        className="budget-help"
                        data-testid="emergency-fund-gap"
                      >
                        {result.emergencyGap === 0
                          ? "Your current savings cover this target."
                          : `${money(result.emergencyGap)} still to save after your current savings.`}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              <section
                className="budget-panel budget-goal-planner"
                aria-labelledby="budget-growth-title"
                id="budget-growth"
              >
                <div
                  className={`budget-investable${result.available < 0 ? " is-short" : ""}`}
                >
                  <div>
                    <h2 id="budget-growth-title">
                      {result.available < 0
                        ? "Your expenses need attention first."
                        : "You have room to grow."}
                    </h2>
                    <p>
                      {result.available < 0
                        ? "Monthly gap before investing"
                        : "Available to invest each month"}
                    </p>
                    <strong data-testid="available-to-invest">
                      {money(Math.abs(result.available))}
                    </strong>
                  </div>
                  <p>
                    Income − living expenses − bill reserves − emergency saving
                    − cash set aside.
                  </p>
                  <details>
                    <summary>See how this is calculated</summary>
                    <dl>
                      <div>
                        <dt>Monthly income</dt>
                        <dd>{money(result.income)}</dd>
                      </div>
                      <div>
                        <dt>Living expenses</dt>
                        <dd>− {money(expenseTotal)}</dd>
                      </div>
                      <div>
                        <dt>Bill reserves</dt>
                        <dd>− {money(result.bills)}</dd>
                      </div>
                      <div>
                        <dt>Emergency saving</dt>
                        <dd>− {money(plan.emergencyMonthly)}</dd>
                      </div>
                      <div>
                        <dt>Cash set aside</dt>
                        <dd>− {money(plan.buffer)}</dd>
                      </div>
                    </dl>
                  </details>
                </div>
                <div className="budget-investment-controls">
                  {result.remainder < 0 && (
                    <p className="budget-warning">
                      Your budget is short by {money(-result.remainder)} per
                      month. The graph assumes the contributions are made;
                      adjust income, expenses or the investment amount before
                      relying on it.
                    </p>
                  )}
                  <label className="budget-use-remaining">
                    <input
                      type="checkbox"
                      checked={plan.investmentMode !== "custom"}
                      onChange={(e) =>
                        update(
                          "investmentMode",
                          e.target.checked ? "available" : "custom",
                        )
                      }
                    />
                    Invest the full available amount
                  </label>
                  <div className="budget-fields">
                    {plan.investmentMode === "custom" ? (
                      <NumberField
                        label="Monthly investment"
                        value={Number(plan.investment.toFixed(2))}
                        onChange={updateInvestment}
                      />
                    ) : (
                      <div className="budget-auto-investment">
                        <span>Monthly investment</span>
                        <strong data-testid="automatic-monthly-investment">
                          {money(result.monthlyInvestment)}
                        </strong>
                        <small>Updates with your income and expenses.</small>
                      </div>
                    )}
                    <NumberField
                      label="Expected annual return (%)"
                      min={-99}
                      max={100}
                      value={plan.annualReturn}
                      onChange={updateExpectedReturn}
                      hint="Starts at 12%. An assumption, not a guaranteed return."
                    />
                  </div>
                </div>
                <div className="budget-goal-inputs">
                  <h3>Will it get you to your goal?</h3>
                  <p className="budget-help">
                    Enter a target and timeline. We’ll check it against this
                    same monthly investment, without adding another expense.
                  </p>
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
                      label="Years to reach goal"
                      max={50}
                      integer
                      value={Math.floor(plan.goalMonths / 12)}
                      onChange={(n) =>
                        update(
                          "goalMonths",
                          Math.max(
                            1,
                            Math.min(600, n * 12 + (plan.goalMonths % 12)),
                          ),
                        )
                      }
                    />
                    <NumberField
                      label="Additional months"
                      max={Math.floor(plan.goalMonths / 12) === 50 ? 0 : 11}
                      integer
                      value={plan.goalMonths % 12}
                      onChange={(n) =>
                        update(
                          "goalMonths",
                          Math.max(
                            1,
                            Math.floor(plan.goalMonths / 12) * 12 + n,
                          ),
                        )
                      }
                      hint="0–11 months, in addition to years. Minimum total: 1 month."
                    />
                  </div>
                </div>
                <div className="budget-growth-results" aria-live="polite">
                  <div>
                    <span>Projected balance</span>
                    <strong data-testid="goal-projected-balance">
                      {money(result.goalEnd.corpus)}
                    </strong>
                    <small>
                      After {plan.goalMonths} months at {plan.annualReturn}%
                    </small>
                  </div>
                  <div>
                    <span>Your money contributed</span>
                    <strong>{money(result.goalEnd.invested)}</strong>
                    <small>
                      Includes {money(plan.goalSaved)} already saved
                    </small>
                  </div>
                  <div>
                    <span>
                      Projected {result.goalEnd.gain < 0 ? "loss" : "growth"}
                    </span>
                    <strong>{money(result.goalEnd.gain)}</strong>
                    <small>Separate from your contributions</small>
                  </div>
                </div>
                <BudgetGrowthChart
                  rows={result.goalProjection}
                  flatRows={result.flatGoalProjection}
                  goal={plan.goalAmount}
                  currency={plan.currency}
                  money={money}
                  stepUp={plan.goalStepUp ?? 0}
                />
                {plan.goalAmount > 0 ? (
                  <div
                    className={`budget-goal-verdict${result.goalGap > 1e-7 ? " is-behind" : ""}`}
                    role="status"
                    data-testid="goal-verdict"
                  >
                    <h3>
                      {result.goalGap > 1e-7
                        ? "Your goal needs a little more."
                        : "You’re on track for your goal."}
                    </h3>
                    <p>
                      {result.goalGap > 1e-7
                        ? `At month ${plan.goalMonths}, the projected balance is ${money(result.goalGap)} below your ${money(plan.goalAmount)} target.`
                        : `Your projected balance covers the ${money(plan.goalAmount)} target by month ${plan.goalMonths}.${result.goalReachedMonth !== null ? ` First reached at month ${result.goalReachedMonth}.` : ""}`}
                    </p>
                    {result.goalExtraMonthly > 1e-7 &&
                      result.goalGap > 1e-7 && (
                        <div className="budget-goal-alternatives">
                          <p>
                            <strong>
                              Add {money(result.goalExtraMonthly)} more each
                              month
                            </strong>
                            <br />
                            Invest {money(result.goal)} per month in total, with
                            no annual step-up. This extra amount needs room in
                            your budget.
                          </p>
                          {result.goalStepUpNeeded !== null &&
                          result.goalStepUpNeeded > 0 ? (
                            <p>
                              <strong>
                                Or increase contributions by{" "}
                                {Math.ceil(result.goalStepUpNeeded * 10) / 10}%
                                each year
                              </strong>
                              <br />
                              Start at {money(result.monthlyInvestment)} per
                              month; increase after every 12 contributions. This
                              needs extra future income.
                              <br />
                              <button
                                type="button"
                                className="budget-text-button"
                                onClick={() =>
                                  update(
                                    "goalStepUp",
                                    Math.ceil(
                                      (result.goalStepUpNeeded ?? 0) * 10,
                                    ) / 10,
                                  )
                                }
                              >
                                Preview this annual step-up
                              </button>
                            </p>
                          ) : (
                            <p>
                              A yearly step-up alone won’t close this gap within
                              the selected timeline (up to 100% a year). Try a
                              larger starting amount, a lower goal, or more
                              time.
                            </p>
                          )}
                        </div>
                      )}
                  </div>
                ) : (
                  <p className="budget-help">
                    Add a goal amount above to see whether this plan reaches it
                    and how to close any gap.
                  </p>
                )}
                <details className="budget-stepup-settings">
                  <summary>Try an annual step-up</summary>
                  <p className="budget-help">
                    Increase the monthly contribution once a year, starting in
                    month 13. Future increases aren’t deducted from today’s
                    salary.
                  </p>
                  <NumberField
                    label="Annual contribution step-up (%)"
                    value={plan.goalStepUp ?? 0}
                    max={100}
                    onChange={(n) => update("goalStepUp", n)}
                  />
                  <p className="budget-help">
                    Monthly investment in the final year:{" "}
                    {money(result.goalEnd.contribution)}. Check that future
                    income can cover it.
                  </p>
                </details>
                <details className="budget-growth-method">
                  <summary>How this projection works</summary>
                  <p>
                    Existing goal savings grow from today. New investments
                    arrive at month end. The effective annual return is
                    converted to a monthly rate. A 0% return gives a cash-saving
                    plan; negative returns are supported. Taxes, fees and
                    inflation aren’t included. Returns vary and losses are
                    possible. A goal is a target for this investment, not a
                    second budget allocation.
                  </p>
                  <p>
                    Existing plans start this redesigned forecast at 12%; check
                    and adjust the assumption to suit your plan.
                  </p>
                </details>
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
                  value={Number(result.monthlyInvestment.toFixed(2))}
                  onChange={updateInvestment}
                />
                <NumberField
                  label="Expected annual return (%)"
                  value={plan.annualReturn}
                  min={-99}
                  max={100}
                  onChange={updateExpectedReturn}
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
                {result.income <= 0
                  ? "START WITH YOUR INCOME"
                  : result.remainder < 0
                    ? "MONTHLY SHORTFALL"
                    : result.remainder === 0
                      ? "A FULLY ASSIGNED PLAN"
                      : "STILL YOURS TO ASSIGN"}
              </span>
              <strong data-testid="budget-remainder">
                {money(Math.abs(result.remainder))}
              </strong>
              <p>
                {result.income <= 0
                  ? "Enter your take-home pay and any other income to check your budget. All new plans start with money amounts at zero."
                  : result.remainder < 0
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
              {result.emergencyTarget === 0 ? (
                "Add your essential expenses to calculate an emergency savings target."
              ) : result.emergencyGap === 0 ? (
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
      <dialog
        ref={expenseAlert}
        className="budget-expense-alert"
        aria-labelledby="expenseAlertTitle"
        aria-describedby="expenseAlertDescription"
      >
        <svg
          viewBox="0 0 32 32"
          width="36"
          height="36"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <circle cx="16" cy="16" r="13" />
          <path d="M16 8v10" />
          <circle cx="16" cy="23" r="1" fill="currentColor" stroke="none" />
        </svg>
        <h2 id="expenseAlertTitle">
          {warningKind === "expenses"
            ? "Expenses exceed your salary"
            : "Your monthly plan has a shortfall"}
        </h2>
        <p id="expenseAlertDescription">
          {warningKind === "expenses" ? (
            <>
              Your monthly expenses total <strong>{money(expenseTotal)}</strong>
              , which is{" "}
              <strong>{money(Math.max(0, expenseTotal - plan.salary))}</strong>{" "}
              more than your take-home salary of{" "}
              <strong>{money(plan.salary)}</strong>.
            </>
          ) : (
            <>
              You’ve allocated <strong>{money(result.allocated)}</strong> per
              month from an income of <strong>{money(result.income)}</strong>{" "}
              (salary plus other income). That leaves a monthly shortfall of{" "}
              <strong>{money(Math.max(0, -result.remainder))}</strong>.
            </>
          )}
        </p>
        {warningKind === "expenses" ? (
          <p>
            Review your expenses or update your take-home salary. This
            comparison uses salary only; other income is separate.
          </p>
        ) : (
          <>
            <p>
              Your plan includes {money(expenseTotal)} in expenses,{" "}
              {money(result.bills)} for bills, {money(result.future)} for
              savings and investments, and {money(plan.buffer)} in cash set
              aside.
            </p>
            {plan.bills
              .filter((bill) => bill.amount > bill.reserved)
              .map((bill) => (
                <p key={bill.id}>
                  <strong>{bill.name || "Unnamed bill"}</strong>:{" "}
                  {money(Math.max(0, bill.amount - bill.reserved))} still needed
                  ÷ {bill.months} {bill.months === 1 ? "month" : "months"} ={" "}
                  <strong>
                    {money(
                      monthlyReserve(bill.amount, bill.reserved, bill.months),
                    )}{" "}
                    per month
                  </strong>
                  .
                </p>
              ))}
            <p>
              Check the bill amount, money already reserved and “Next Payment
              after (Months)”. A sooner payment needs a larger monthly reserve.
              Use the actual due time; if it’s correct, reduce other planned
              amounts or update your income to cover the gap.
            </p>
          </>
        )}
        <button
          type="button"
          className="primary"
          autoFocus
          onClick={() => expenseAlert.current?.close()}
        >
          {warningKind === "expenses" ? "Review expenses" : "Review my plan"}
        </button>
      </dialog>
      <footer className="budget-foot">
        <span>Financial AI Planner / MAKE ROOM FOR YOUR FUTURE</span>
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
