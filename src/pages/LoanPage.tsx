import { useEffect, useId, useMemo, useState } from "react";
import {
  cashFlow,
  compare,
  breakEven,
  initialLoanPlan,
  payment,
  simulate,
  strategies,
  validateLoanPlan,
  type Loan,
  type LoanPlan,
  type Strategy,
  type Simulation,
} from "../loans/model";
import { calculateBudget, validBudget } from "../budget/model";
import { plannerHref } from "../runtime/routes";
const storageKey = "intimetec-loan-payoff-v1";
function example() {
  const p = structuredClone(initialLoanPlan);
  const d = new Date();
  p.start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return p;
}
function load() {
  try {
    const p = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (!validateLoanPlan(p).length) return p as LoanPlan;
  } catch {}
  return example();
}
function Numeric({
  label,
  value,
  onChange,
  min = 0,
  max = 1e9,
  hint,
  step = "any",
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  hint?: string;
  step?: string;
}) {
  const hintId = useId();
  return (
    <label className="budget-field">
      <span>{label}</span>
      <input
        aria-label={label}
        aria-describedby={hint ? hintId : undefined}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value === 0 ? "" : value}
        placeholder="0"
        onChange={(e) =>
          onChange(
            Number.isFinite(e.target.valueAsNumber)
              ? e.target.valueAsNumber
              : 0,
          )
        }
      />
      {hint && <small id={hintId}>{hint}</small>}
    </label>
  );
}
export function LoanPage() {
  const [plan, setPlan] = useState<LoanPlan>(load);
  const [view, setView] = useState<"setup" | "compare" | "guide">("setup");
  const [selected, setSelected] = useState<Strategy>("avalanche");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState("");
  const [visibleMonths, setVisibleMonths] = useState(12);
  useEffect(() => setVisibleMonths(12), [selected, plan.horizon]);
  const comparison = useMemo(() => compare(plan), [plan]);
  const valid = validateLoanPlan(plan).length === 0;
  const cash = valid ? cashFlow(plan) : null;
  const current = comparison.results.find((r) => r.strategy === selected);
  const base = comparison.results.find((r) => r.strategy === "invest");
  const best = comparison.results.reduce<Simulation | undefined>(
    (a, b) => (!a || b.net > a.net + 0.01 ? b : a),
    undefined,
  );
  const efficient = comparison.results.reduce<Simulation | undefined>(
    (a, b) =>
      !a ||
      b.interest + b.fees - b.taxCredit <
        a.interest + a.fees - a.taxCredit - 0.01
        ? b
        : a,
    undefined,
  );
  const winners = best
    ? comparison.results.filter((r) => Math.abs(r.net - best.net) < 0.01)
    : [];
  const crossing = useMemo(
    () =>
      view !== "setup" && !comparison.errors.length ? breakEven(plan) : null,
    [plan, view, comparison.errors.length],
  );
  const stress = useMemo(
    () =>
      view !== "setup" && !comparison.errors.length
        ? [-10, 0, Math.max(-99, plan.returns - 5), plan.returns]
            .filter((v, i, a) => a.indexOf(v) === i)
            .sort((a, b) => a - b)
            .map((rate) => ({
              rate,
              results: strategies.map((s) => simulate(plan, s.id, rate)),
            }))
        : [],
    [plan, view, comparison.errors.length],
  );
  const money = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: plan.currency,
      maximumFractionDigits: 0,
    }).format(n);
  const label = (id: Strategy) => strategies.find((s) => s.id === id)!.name;
  const when = (month: number | null) => {
    if (month === null) return "Beyond this horizon";
    if (month === 0) return "Already clear";
    const [y, m] = plan.start.split("-").map(Number);
    return new Intl.DateTimeFormat("en", {
      month: "short",
      year: "numeric",
    }).format(new Date(y, m + month - 2, 1));
  };
  function update<K extends keyof LoanPlan>(key: K, value: LoanPlan[K]) {
    setPlan((p) => ({ ...p, [key]: value }));
  }
  function patchLoan(id: string, key: keyof Loan, value: string | number) {
    setPlan((p) => ({
      ...p,
      loans: p.loans.map((l) => (l.id === id ? { ...l, [key]: value } : l)),
    }));
  }
  useEffect(() => {
    if (!valid) {
      setSaved("Complete the inputs to save this plan.");
      return;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(plan));
      setSaved("Saved in this browser");
    } catch {
      setSaved("Browser saving unavailable · export a copy");
    }
  }, [plan, valid]);
  function importBudget() {
    try {
      const source = JSON.parse(
        localStorage.getItem("intimetec-salary-budget-v1") || "null",
      );
      if (!validBudget(source)) {
        setNotice(
          "No saved salary budget found in this browser. Open the Monthly Salary & Budget Planner first.",
        );
        return;
      }
      const r = calculateBudget(source),
        emiCategory = source.expenses
          .filter((e) => e.id === "debt")
          .reduce((s, e) => s + e.planned, 0);
      setPlan((p) => ({
        ...p,
        currency: source.currency,
        salary: r.income,
        expenses: r.needs + r.wants + r.bills + r.goal - emiCategory,
        reserve: source.emergencyMonthly,
        buffer: source.buffer,
        emergency: source.emergencySaved,
        coverMonths: Math.min(24, source.emergencyMonths),
        extra: source.investment + Math.max(0, r.remainder),
        loans: [],
      }));
      setNotice(
        "Budget imported. The budget’s EMI category was excluded from living costs. Sample loans were cleared: add each real loan below so its EMI is counted once.",
      );
      setView("setup");
    } catch {
      setNotice(
        "The saved budget could not be read. Enter your income and expenses manually.",
      );
    }
  }
  function exportPlan() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { plan, results: comparison.results.map(({ rows, ...r }) => r) },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "money-planner-loan-payoff.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 1000000)
        throw Error("Choose a plan file smaller than 1 MB.");
      const data = JSON.parse(await file.text()),
        errors = validateLoanPlan(data.plan);
      if (errors.length) throw Error(errors[0]);
      setPlan(data.plan);
      setNotice("Your loan plan was restored.");
      setView("setup");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not read this plan.");
    }
  }
  const totalDebt = plan.loans.reduce((s, l) => s + Math.max(0, l.balance), 0);
  const nonAmortizing = valid
    ? plan.loans.filter(
        (l) => l.balance > 0 && payment(l) <= (l.balance * l.rate) / 1200,
      )
    : [];
  return (
    <main className="budget-app loan-app">
      <nav className="budget-nav" aria-label="Planner navigation">
        <a href={plannerHref("home")}>← All planners</a>
        <a className="budget-brand" href={plannerHref("home")}>
          Money Planner <span>/ THE DEBT & WEALTH LAB</span>
        </a>
        <span className="budget-preview">Standalone preview</span>
      </nav>
      <header className="loan-hero">
        <div>
          <p className="budget-eyebrow">LESS DEBT. MORE DIRECTION.</p>
          <h1>
            Pay it down.
            <br />
            <em>Or build it up?</em>
          </h1>
          <p>
            Give your extra money a clear job. Compare paying loans faster with
            investing, using your actual budget and one fair timeline.
          </p>
        </div>
        <div className="loan-hero-stat">
          <span>YOUR STARTING DEBT</span>
          <strong>{money(totalDebt)}</strong>
          <p>
            {plan.loans.length} loans · {plan.horizon} months compared
          </p>
          <small>Same monthly commitment. Different paths.</small>
        </div>
      </header>
      <div className="budget-toolbar">
        <div
          className="budget-tabs"
          role="group"
          aria-label="Loan planner views"
        >
          {(
            [
              ["setup", "01", "Your money & loans"],
              ["compare", "02", "Compare paths"],
              ["guide", "03", "Your payoff guide"],
            ] as const
          ).map(([id, num, text]) => (
            <button
              key={id}
              aria-pressed={view === id}
              onClick={() => setView(id)}
            >
              <span>{num}</span>
              {text}
            </button>
          ))}
        </div>
        <div className="budget-tools">
          <button onClick={importBudget}>Use my salary budget</button>
          <button onClick={exportPlan} disabled={!valid}>
            Export ↓
          </button>
          <label className="loan-file">
            Import
            <input
              className="budget-sr-only"
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                void importFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
      <p className="budget-save" role="status">
        {saved}
      </p>
      {notice && (
        <p className="loan-notice" role="status">
          {notice}
        </p>
      )}
      <div className="budget-workspace loan-workspace">
        <div className="budget-editor">
          {view === "setup" && (
            <>
              <section
                className="budget-panel"
                aria-labelledby="loan-budget-title"
              >
                <div className="budget-panel-heading">
                  <div>
                    <p className="budget-eyebrow">
                      01 / KEEP THE PLAN AFFORDABLE
                    </p>
                    <h2 id="loan-budget-title">What can your month support?</h2>
                  </div>
                  <span className="budget-step" aria-hidden="true">
                    01
                  </span>
                </div>
                <p className="budget-help">
                  Living costs exclude loan EMIs. Reserve savings and a cash
                  buffer stay protected in every strategy. Extra money is an
                  allocation you choose, not a requirement to use every spare
                  rupee.
                </p>
                <div className="budget-fields">
                  <Numeric
                    label="Monthly take-home income"
                    value={plan.salary}
                    onChange={(n) => update("salary", n)}
                  />
                  <Numeric
                    label="Living costs, bills & other goals"
                    value={plan.expenses}
                    onChange={(n) => update("expenses", n)}
                  />
                  <Numeric
                    label="Monthly emergency saving"
                    value={plan.reserve}
                    onChange={(n) => update("reserve", n)}
                  />
                  <Numeric
                    label="Monthly cash buffer"
                    value={plan.buffer}
                    onChange={(n) => update("buffer", n)}
                  />
                  <Numeric
                    label="Emergency savings today"
                    value={plan.emergency}
                    onChange={(n) => update("emergency", n)}
                  />
                  <Numeric
                    label="Emergency cover (months)"
                    value={plan.coverMonths}
                    min={1}
                    max={24}
                    step="1"
                    onChange={(n) => update("coverMonths", n)}
                  />
                  <Numeric
                    label="Extra monthly budget"
                    value={plan.extra}
                    onChange={(n) => update("extra", n)}
                    hint="This amount goes toward prepayments, investing, or both."
                  />
                  <label className="budget-field">
                    <span>Currency</span>
                    <select
                      value={plan.currency}
                      onChange={(e) => update("currency", e.target.value)}
                    >
                      {["INR", "SAR", "USD", "AED", "EUR", "GBP"].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <small>
                      Currency labels change; amounts are not converted.
                    </small>
                  </label>
                </div>
              </section>
              <section
                className="budget-panel"
                aria-labelledby="loan-list-title"
              >
                <div className="budget-panel-heading">
                  <div>
                    <p className="budget-eyebrow">
                      02 / EVERY LOAN, IN ONE PLACE
                    </p>
                    <h2 id="loan-list-title">Know what you owe.</h2>
                  </div>
                  <span className="budget-step" aria-hidden="true">
                    02
                  </span>
                </div>
                <p className="budget-help">
                  Example figures are provided on first use. Replace them with
                  current balances from your lender statements. Fixed monthly
                  reducing-balance interest is modeled; revolving credit-card
                  minimums and changing rates need a separate approximation.
                </p>
                {plan.loans.map((l, index) => (
                  <fieldset className="budget-bill loan-editor" key={l.id}>
                    <legend>Loan {index + 1}</legend>
                    <div className="loan-editor-heading">
                      <label className="budget-field">
                        <span>Loan name</span>
                        <input
                          value={l.name}
                          maxLength={80}
                          onChange={(e) =>
                            patchLoan(l.id, "name", e.target.value)
                          }
                        />
                      </label>
                      <button
                        className="budget-text-button"
                        aria-label={`Remove loan ${index + 1}`}
                        onClick={() =>
                          update(
                            "loans",
                            plan.loans.filter((x) => x.id !== l.id),
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                    <div className="budget-fields">
                      <Numeric
                        label="Outstanding balance"
                        value={l.balance}
                        onChange={(n) => patchLoan(l.id, "balance", n)}
                      />
                      <Numeric
                        label="Annual loan interest (%)"
                        value={l.rate}
                        max={120}
                        onChange={(n) => patchLoan(l.id, "rate", n)}
                      />
                      <Numeric
                        label="Remaining term (months)"
                        value={l.months}
                        min={1}
                        max={600}
                        step="1"
                        onChange={(n) => patchLoan(l.id, "months", n)}
                      />
                      <Numeric
                        label="Actual monthly EMI (optional)"
                        value={l.emi}
                        onChange={(n) => patchLoan(l.id, "emi", n)}
                        hint="Leave 0 to calculate from the balance, rate and term."
                      />
                    </div>
                    <p className="loan-emi">
                      Required monthly payment{" "}
                      <strong>
                        {valid ? money(payment(l)) : "Complete the inputs"}
                      </strong>
                      {l.emi > 0 && (
                        <small>Actual EMI overrides the remaining term.</small>
                      )}
                    </p>
                    <details className="loan-terms">
                      <summary>
                        Prepayment restrictions & tax assumptions
                      </summary>
                      <div className="budget-fields">
                        <Numeric
                          label="Fee on extra principal (%)"
                          value={l.fee}
                          max={20}
                          onChange={(n) => patchLoan(l.id, "fee", n)}
                        />
                        <Numeric
                          label="No extra payments for (months)"
                          value={l.lock}
                          max={360}
                          step="1"
                          onChange={(n) => patchLoan(l.id, "lock", n)}
                        />
                        <Numeric
                          label="Effective interest tax relief (%)"
                          value={l.taxRelief}
                          max={60}
                          onChange={(n) => patchLoan(l.id, "taxRelief", n)}
                          hint="Use 0 unless you qualify. Effective relief after your eligibility limits; not your tax bracket automatically."
                        />
                      </div>
                      <p className="budget-help">
                        Fees apply to extra principal only, including early
                        closure. Enter any applicable tax/charges in the fee
                        rate. Lock-in blocks extra payments for the entered
                        months. Lender caps, fixed fees and special closure
                        rules are not modeled.
                      </p>
                    </details>
                  </fieldset>
                ))}
                <button
                  className="budget-add"
                  disabled={plan.loans.length >= 20}
                  onClick={() =>
                    update("loans", [
                      ...plan.loans,
                      {
                        id: crypto.randomUUID(),
                        name: `Loan ${plan.loans.length + 1}`,
                        balance: 0,
                        rate: 10,
                        months: 36,
                        emi: 0,
                        fee: 0,
                        lock: 0,
                        taxRelief: 0,
                      },
                    ])
                  }
                >
                  ＋ Add another loan
                </button>
              </section>
              <section
                className="budget-panel"
                aria-labelledby="loan-assumptions-title"
              >
                <p className="budget-eyebrow">03 / ONE FAIR COMPARISON</p>
                <h2 id="loan-assumptions-title">Set the same finish line.</h2>
                <div className="budget-fields">
                  <label className="budget-field">
                    <span>First payment month</span>
                    <input
                      type="month"
                      min="2000-01"
                      max="2149-12"
                      value={plan.start}
                      onChange={(e) => update("start", e.target.value)}
                    />
                  </label>
                  <Numeric
                    label="Comparison horizon (months)"
                    value={plan.horizon}
                    min={12}
                    max={360}
                    step="1"
                    onChange={(n) => update("horizon", n)}
                  />
                  <Numeric
                    label="Expected annual investment return (%)"
                    value={plan.returns}
                    min={-99}
                    max={100}
                    onChange={(n) => update("returns", n)}
                  />
                  <Numeric
                    label="Annual investment fee (%)"
                    value={plan.investmentFee}
                    max={10}
                    onChange={(n) => update("investmentFee", n)}
                  />
                  <Numeric
                    label="Tax on investment gains at the end (%)"
                    value={plan.gainsTax}
                    max={60}
                    onChange={(n) => update("gainsTax", n)}
                    hint="Simplified tax on positive total gains. Enter your effective assumption."
                  />
                  <Numeric
                    label="Split strategy: extra money to loans (%)"
                    value={plan.split}
                    max={100}
                    onChange={(n) => update("split", n)}
                    hint="The remainder is invested. Released EMIs follow the same split."
                  />
                </div>
                <button
                  className="budget-primary"
                  onClick={() => {
                    setView("compare");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Compare my options ↗
                </button>
              </section>
            </>
          )}
          {comparison.errors.length > 0 && (
            <section className="loan-errors" role="alert">
              <h2>Let’s make the plan workable first.</h2>
              {comparison.errors.map((e) => (
                <p key={e}>{e}</p>
              ))}
              {cash && cash.capacity < 0 && (
                <strong>Monthly shortfall: {money(-cash.capacity)}</strong>
              )}
              {cash && cash.capacity >= 0 && cash.unassigned < 0 && (
                <strong>
                  Extra allocation exceeds your budget by{" "}
                  {money(-cash.unassigned)}
                </strong>
              )}
              {view !== "setup" && (
                <button onClick={() => setView("setup")}>
                  Review my inputs
                </button>
              )}
            </section>
          )}
          {view === "compare" && !comparison.errors.length && best && base && (
            <>
              <section className="loan-insight">
                <p className="budget-eyebrow">YOUR NUMBERS / YOUR TRADE-OFFS</p>
                <h2>
                  {winners.length === 1
                    ? `${label(best.strategy)} leads on projected net position.`
                    : `${winners.length} paths tie for highest projected net position.`}
                </h2>
                <p>
                  At {plan.returns}% assumed annual return, after the entered
                  fees and tax, it ends at <strong>{money(best.net)}</strong>.
                  This is the highest of the four modeled paths at month{" "}
                  {plan.horizon}, not a promise of market performance.
                </p>
                <span>
                  {label(efficient!.strategy)} is among the paths with the
                  lowest modeled borrowing cost in this period.
                </span>
              </section>
              <div className="loan-strategy-grid">
                {comparison.results.map((r) => (
                  <button
                    className={`loan-strategy ${selected === r.strategy ? "is-selected" : ""}`}
                    key={r.strategy}
                    aria-pressed={selected === r.strategy}
                    onClick={() => setSelected(r.strategy)}
                  >
                    <span className="loan-strategy-label">
                      {winners.some((w) => w.strategy === r.strategy)
                        ? "HIGHEST PROJECTED NET"
                        : "EXPLORE THIS PATH"}
                    </span>
                    <h3>{label(r.strategy)}</h3>
                    <p>
                      {strategies.find((s) => s.id === r.strategy)!.description}
                    </p>
                    <strong>{money(r.net)}</strong>
                    <small>Net position at month {plan.horizon}</small>
                    <dl>
                      <div>
                        <dt>Debt-free</dt>
                        <dd>{when(r.debtFree)}</dd>
                      </div>
                      <div>
                        <dt>Interest + prepayment fees</dt>
                        <dd>{money(r.interest + r.fees)}</dd>
                      </div>
                      <div>
                        <dt>Investments after tax</dt>
                        <dd>{money(r.portfolio - r.investmentTax)}</dd>
                      </div>
                      <div>
                        <dt>Debt still owed</dt>
                        <dd>{money(r.debt)}</dd>
                      </div>
                    </dl>
                    <span className="loan-card-action">
                      {selected === r.strategy
                        ? "Selected path ✓"
                        : "Inspect this path →"}
                    </span>
                  </button>
                ))}
              </div>
              {current && (
                <section className="budget-panel">
                  <p className="budget-eyebrow">
                    A CLOSER LOOK / {label(selected).toUpperCase()}
                  </p>
                  <h2>Two balances. One honest picture.</h2>
                  <p className="budget-help">
                    Net position = investments after assumed gains tax +
                    emergency cash − remaining debt. Property values, other
                    assets, the cash buffer and unused salary are excluded
                    equally from every path. Emergency cash at month{" "}
                    {plan.horizon}:{" "}
                    {money(plan.emergency + plan.reserve * plan.horizon)}, the
                    same in every path.
                  </p>
                  <div
                    className="loan-trend"
                    role="img"
                    aria-label={`Debt and investment balances over ${plan.horizon} months. Ending debt ${money(current.debt)}; investments ${money(current.portfolio - current.investmentTax)}.`}
                  >
                    <svg viewBox="0 0 680 220">
                      <defs>
                        <pattern
                          id="loan-grid"
                          width="68"
                          height="44"
                          patternUnits="userSpaceOnUse"
                        >
                          <path
                            d="M 68 0 L 0 0 0 44"
                            fill="none"
                            stroke="#2a4550"
                            strokeWidth="1"
                          />
                        </pattern>
                      </defs>
                      <rect width="680" height="220" fill="url(#loan-grid)" />
                      {(() => {
                        const rows = [
                          { debt: totalDebt, portfolio: 0 },
                          ...current.rows,
                        ];
                        const scale = Math.max(
                          1,
                          ...rows.map((r) => Math.max(r.debt, r.portfolio)),
                        );
                        return (
                          <>
                            <polyline
                              fill="none"
                              stroke="#e6b78c"
                              strokeWidth="3"
                              points={rows
                                .map(
                                  (r, i) =>
                                    `${(i / plan.horizon) * 680},${210 - (r.debt / scale) * 195}`,
                                )
                                .join(" ")}
                            />
                            <polyline
                              fill="none"
                              stroke="#82dfc4"
                              strokeWidth="3"
                              points={rows
                                .map(
                                  (r, i) =>
                                    `${(i / plan.horizon) * 680},${210 - (r.portfolio / scale) * 195}`,
                                )
                                .join(" ")}
                            />
                          </>
                        );
                      })()}
                    </svg>
                    <div className="loan-trend-legend">
                      <span>Month 0</span>
                      <span>
                        <i />
                        Debt <i />
                        Investments before gains tax
                      </span>
                      <span>Month {plan.horizon}</span>
                    </div>
                  </div>
                  <p className="budget-help">
                    {money(
                      base.interest +
                        base.fees -
                        current.interest -
                        current.fees,
                    )}{" "}
                    difference in interest and fees versus investing the extra,
                    measured over the same {plan.horizon} months.
                  </p>
                  <button
                    className="budget-primary"
                    onClick={() => {
                      setView("guide");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Build my monthly guide →
                  </button>
                </section>
              )}
              <section className="budget-panel">
                <p className="budget-eyebrow">WHAT IF RETURNS DISAPPOINT?</p>
                <h2>Test the assumption, not just the upside.</h2>
                <p className="budget-help">
                  Same plan, fees and tax assumptions. Only investment return
                  changes. Values are end-of-horizon net positions; negative
                  returns can change which path leads.
                </p>
                <div className="budget-table-scroll">
                  <table className="loan-table">
                    <caption>
                      Investment return sensitivity · {plan.currency}
                    </caption>
                    <thead>
                      <tr>
                        <th>Annual return</th>
                        {strategies.map((s) => (
                          <th key={s.id}>{s.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stress.map((s) => (
                        <tr key={s.rate}>
                          <th>{s.rate}%</th>
                          {s.results.map((r) => (
                            <td key={r.strategy}>{money(r.net)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="loan-crossover">
                  <h3>Approximate investment break-even</h3>
                  <strong>
                    {crossing?.kind === "crossing"
                      ? `${crossing.rates[0].toFixed(2)}% annual return`
                      : crossing?.kind === "tie"
                        ? "These two paths are tied"
                        : crossing?.kind === "multiple"
                          ? "More than one crossover"
                          : "No crossover found from −50% to +50%"}
                  </strong>
                  <p>
                    Compares investing the extra with highest-interest-first at
                    your chosen horizon, including entered fees and taxes. Scans
                    5-point intervals, then refines detected crossings. It is a
                    scenario threshold, not a forecast; complex cases may have
                    additional crossings.
                  </p>
                </div>
              </section>
            </>
          )}
          {view === "guide" && current && !comparison.errors.length && (
            <>
              <section className="budget-panel">
                <p className="budget-eyebrow">A PLAN YOU CAN FOLLOW</p>
                <h2>Your next payment, made clear.</h2>
                <label className="budget-field">
                  <span>Choose the path for your guide</span>
                  <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value as Strategy)}
                  >
                    {strategies.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <ol className="loan-checklist">
                  <li>
                    <strong>Protect the monthly essentials.</strong>
                    <span>
                      Keep {money(plan.expenses)} for living costs,{" "}
                      {money(plan.reserve)} for emergency saving and{" "}
                      {money(plan.buffer)} as a buffer.{" "}
                      {cash && cash.unassigned > 0
                        ? `${money(cash.unassigned)} remains unassigned and outside this comparison.`
                        : ""}
                    </span>
                  </li>
                  <li>
                    <strong>Cover every required EMI first.</strong>
                    <span>
                      {money(cash!.emis)} across your active loans in the first
                      month. Confirm due dates and lender instructions before
                      arranging transfers.
                    </span>
                  </li>
                  <li>
                    <strong>Give the extra {money(plan.extra)} its job.</strong>
                    <span>
                      {current.rows[0].loans.some((l) => l.extra > 0)
                        ? `First extra payment: ${current.rows[0].loans
                            .filter((l) => l.extra > 0)
                            .map((l) => `${money(l.extra)} to ${l.name}`)
                            .join("; ")}.`
                        : "No extra loan payments in month one; surplus is invested under this path or while prepayments are locked."}{" "}
                      {money(current.rows[0].invested)} is invested in month
                      one, including any modeled tax credit.
                    </span>
                  </li>
                  <li>
                    <strong>Keep the commitment when a loan closes.</strong>
                    <span>
                      Released EMIs are rolled forward automatically in this
                      schedule.{" "}
                      {when(current.debtFree) === "Beyond this horizon"
                        ? "Some debt remains at the end of this horizon."
                        : `All modeled debt clears ${when(current.debtFree)}.`}
                    </span>
                  </li>
                  <li>
                    <strong>Review after each statement.</strong>
                    <span>
                      Update balances, rates and charges when they change. This
                      local plan is not connected to your lender or bank.
                    </span>
                  </li>
                </ol>
              </section>
              <section className="budget-panel">
                <p className="budget-eyebrow">YOUR LOAN MILESTONES</p>
                <h2>One balance at a time.</h2>
                <div className="loan-milestones">
                  {[...plan.loans]
                    .sort(
                      (a, b) =>
                        (current.paidOff[a.id] ?? Infinity) -
                        (current.paidOff[b.id] ?? Infinity),
                    )
                    .map((l) => (
                      <div key={l.id}>
                        <span>{l.name}</span>
                        <strong>
                          {l.balance === 0
                            ? "Already clear"
                            : when(current.paidOff[l.id] ?? null)}
                        </strong>
                        <small>Starting balance {money(l.balance)}</small>
                      </div>
                    ))}
                </div>
              </section>
              <section className="budget-panel">
                <p className="budget-eyebrow">
                  THE MONTH-BY-MONTH PAYMENT PLAN
                </p>
                <h2>Know exactly where it goes.</h2>
                <p className="budget-help">
                  Payments occur at month end, after monthly interest. All
                  amounts are {plan.currency}. Select a month to inspect the
                  payment for each loan.
                </p>
                <div className="loan-schedule">
                  {current.rows.slice(0, visibleMonths).map((r) => (
                    <details key={r.month}>
                      <summary>
                        <span>{when(r.month)}</span>
                        <span>
                          Pay loans {money(r.required + r.extra + r.fees)}
                        </span>
                        <span>Invest {money(r.invested)}</span>
                      </summary>
                      <div className="budget-table-scroll">
                        <table className="loan-table">
                          <caption>
                            Month {r.month}: per-loan payment allocation
                          </caption>
                          <thead>
                            <tr>
                              <th>Loan</th>
                              <th>Interest</th>
                              <th>EMI</th>
                              <th>Extra principal</th>
                              <th>Fee</th>
                              <th>Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.loans.map((l) => (
                              <tr key={l.id}>
                                <th>{l.name}</th>
                                <td>{money(l.interest)}</td>
                                <td>{money(l.required)}</td>
                                <td>{money(l.extra)}</td>
                                <td>{money(l.fee)}</td>
                                <td>{money(l.closing)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p>
                        Portfolio growth this month: {money(r.growth)} · Modeled
                        interest tax credit: {money(r.taxCredit)} · Remaining
                        debt: {money(r.debt)}
                      </p>
                    </details>
                  ))}
                </div>
                {visibleMonths < current.rows.length && (
                  <button
                    className="budget-add"
                    onClick={() => setVisibleMonths((n) => n + 12)}
                  >
                    Show next 12 months
                  </button>
                )}
                <p className="budget-help">
                  Showing {Math.min(visibleMonths, current.rows.length)} of{" "}
                  {current.rows.length} months.
                </p>
              </section>
            </>
          )}
        </div>
        <aside
          className="budget-sidebar"
          id="loan-monthly-snapshot"
          aria-label="Monthly loan budget"
        >
          <section className="budget-summary">
            <p className="budget-eyebrow">YOUR MONTHLY ROOM TO MOVE</p>
            <h2>A plan that fits real life.</h2>
            <dl className="budget-breakdown">
              {[
                ["Take-home income", plan.salary],
                ["Living costs & goals", plan.expenses],
                ["Emergency saving", plan.reserve],
                ["Cash buffer", plan.buffer],
                ["Required EMIs", cash?.emis ?? 0],
                ["Chosen extra", plan.extra],
              ].map(([text, value]) => (
                <div key={text}>
                  <dt>{text}</dt>
                  <dd>{money(Number(value))}</dd>
                </div>
              ))}
            </dl>
            <div
              className={`budget-balance ${cash && cash.unassigned < 0 ? "is-short" : ""}`}
            >
              <span>
                {!cash
                  ? "COMPLETE YOUR INPUTS"
                  : cash.unassigned < 0
                    ? "MONTHLY SHORTFALL"
                    : "LEFT UNASSIGNED"}
              </span>
              <strong data-testid="loan-monthly-room">
                {cash ? money(Math.abs(cash.unassigned)) : "—"}
              </strong>
              <p>
                The comparison uses {cash ? money(cash.commitment) : "—"} a
                month for debt payments, prepayment fees and investing. That
                commitment stays constant as loans close.
              </p>
            </div>
          </section>
          {cash && (
            <section className="budget-cushion">
              <p className="budget-eyebrow">ROOM FOR THE UNEXPECTED</p>
              <h3>Keep an emergency cushion.</h3>
              <div className="budget-cushion-value">
                <strong>{money(plan.emergency)}</strong>
                <span>Target {money(cash.emergencyTarget)}</span>
              </div>
              <progress
                aria-label="Loan planner emergency cushion"
                max={Math.max(1, cash.emergencyTarget)}
                value={Math.min(plan.emergency, cash.emergencyTarget)}
              />
              <p>
                {plan.emergency < cash.emergencyTarget
                  ? `${money(cash.emergencyTarget - plan.emergency)} below your chosen ${plan.coverMonths}-month target. The reserve contribution stays outside the loan/investment budget.`
                  : "Your chosen emergency target is covered."}
              </p>
            </section>
          )}
          {nonAmortizing.length > 0 && (
            <p className="loan-warning" role="status">
              Check {nonAmortizing.map((l) => l.name).join(", ")}: the required
              EMI does not exceed first-month interest. Without enough extra
              payments, the balance may grow.
            </p>
          )}
          <details className="budget-guideline">
            <summary>How the comparison stays fair</summary>
            <p>
              Same starting loans, salary allocation and horizon. Full EMIs are
              paid first. Extra payments reduce tenure; scheduled EMIs stay
              unchanged. Fees come from the same cash budget. Surplus blocked by
              lock-ins is invested.
            </p>
            <p>
              Loan interest uses annual nominal rate ÷ 12. Investment returns
              are effective annual rates, net of the annual fee, converted to
              monthly growth. Deposits arrive at month end.
            </p>
            <p>
              Effective loan interest tax relief is treated as a monthly cash
              refund and invested. Investment tax applies only to positive total
              gains upon liquidation at the horizon. Real eligibility, payment
              dates, tax caps and tax timing vary; enter conservative
              assumptions.
            </p>
            <p>
              Emergency cash earns no modeled interest. No inflation, changing
              rates, missed payments, asset values, insurance premiums or fresh
              borrowing is assumed. Total interest and savings refer only to the
              selected horizon.
            </p>
          </details>
        </aside>
      </div>
      <div
        className={`budget-mobile-balance ${cash && cash.unassigned < 0 ? "is-short" : ""}`}
      >
        <div>
          <span>
            {cash && cash.unassigned < 0
              ? "Monthly shortfall"
              : "Left unassigned"}
          </span>
          <strong>
            {cash ? money(Math.abs(cash.unassigned)) : "Check inputs"}
          </strong>
        </div>
        <a href="#loan-monthly-snapshot">Monthly breakdown ↑</a>
      </div>
      <section className="loan-reading">
        <p className="budget-eyebrow">METHODS & FURTHER READING</p>
        <h2>Useful ideas. Transparent assumptions.</h2>
        <div>
          <article>
            <h3>The Total Money Makeover · Dave Ramsey</h3>
            <p>
              Smallest-balance-first repayment focuses on early payoff
              milestones. The snowball path here follows that ordering; it is
              not assumed to minimize interest.
            </p>
            <a
              href="https://www.ramseysolutions.com/debt/how-the-debt-snowball-method-works"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read Ramsey’s explanation ↗
            </a>
          </article>
          <article>
            <h3>I Will Teach You to Be Rich · Ramit Sethi</h3>
            <p>
              Use a spending plan and deliberate transfers to make progress
              repeatable. The guide separates essentials, reserves, required
              payments and extra allocations.
            </p>
            <a
              href="https://www.iwillteachyoutoberich.com/automate-your-finances/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read the author’s automation guide ↗
            </a>
          </article>
          <article>
            <h3>Check the methods independently</h3>
            <p>
              The CFPB explains both highest-interest and snowball methods.
              Investor.gov discusses the trade-off between high-interest debt
              and uncertain investment returns.
            </p>
            <a
              href="https://www.consumerfinance.gov/archive/blog/how-reduce-your-debt/"
              target="_blank"
              rel="noopener noreferrer"
            >
              CFPB debt repayment methods ↗
            </a>
            <a
              href="https://www.investor.gov/introduction-investing/investing-basics/save-and-invest/pay-credit-cards-or-other-high-interest"
              target="_blank"
              rel="noopener noreferrer"
            >
              Investor.gov on high-interest debt ↗
            </a>
          </article>
        </div>
      </section>
      <footer className="budget-foot">
        <span>Money Planner / LESS GUESSWORK, MORE DIRECTION</span>
        <p>
          An educational scenario model using your inputs. These resources
          inform the methods; the authors do not endorse this tool. No
          guaranteed investment return or jurisdiction-specific tax treatment is
          assumed. Plans stay in this browser when storage is available. Export
          a copy to keep or restore it.
        </p>
        <button
          className="budget-text-button"
          onClick={() => {
            if (confirm("Replace this loan plan with the example?")) {
              setPlan(example());
              setView("setup");
              setNotice("");
            }
          }}
        >
          Reset to example
        </button>
      </footer>
    </main>
  );
}
