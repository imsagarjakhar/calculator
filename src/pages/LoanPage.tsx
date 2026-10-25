import { PlannerNavigation } from "../components/PlannerNavigation";
import { DateInput } from "../components/DateInput";
import {
  originalLoanSchedule,
  resolveLoanPlan as resolveLoanInputs,
} from "../loans/origination";
import { preferredCurrency, usePlanCurrency } from "../runtime/currency";
import { PlannerHeader } from "../components/PlannerHeader";
import { LoanDecisionLab } from "../components/LoanDecisionLab";
import { compareDecisions, netRent } from "../loans/decisions";
import { assetValueAt, assetIncomeYield } from "../loans/assets";
import { loanPaymentTimeline } from "../loans/paymentTimeline";
import { downloadReport, readPortablePlan } from "../runtime/portableReport";
import { useEffect, useId, useMemo, useState } from "react";
import {
  cashFlow,
  loanComparisonHorizon,
  withRepaymentBudget,
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
  type LoanAsset,
} from "../loans/model";
const storageKey = "intimetec-loan-payoff-v1";
const yieldText = (value: number | null) =>
  value === null ? "—" : `${value.toFixed(2)}%`;
function resolveLoanPlan(plan: LoanPlan): LoanPlan {
  const resolved = resolveLoanInputs(plan);
  return { ...resolved, horizon: loanComparisonHorizon(resolved) };
}
function example() {
  const p = structuredClone(initialLoanPlan);
  const d = new Date();
  p.start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return resolveLoanPlan(
    withRepaymentBudget({
      ...p,
      fundingMode: "manual",
      repaymentBudget: 25000,
      loans: p.loans.map((loan) => {
        const end = new Date(
          d.getFullYear(),
          d.getMonth() + loan.months - 1,
          1,
        );
        return {
          ...loan,
          inputMode: "original",
          originalAmount: loan.balance,
          firstEmiMonth: p.start,
          lastEmiMonth: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}`,
        };
      }),
    }),
  );
}
function load() {
  try {
    const p = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (!validateLoanPlan(p).length) {
      const manual = resolveLoanPlan(withRepaymentBudget(p as LoanPlan));
      return {
        ...manual,
        repaymentBudget: p.useSalaryInvestment ? 0 : manual.repaymentBudget,
        useSalaryInvestment: false,
      };
    }
  } catch {}
  return {
    ...example(),
    loans: [],
    fundingMode: "manual" as const,
    salary: 0,
    expenses: 0,
    reserve: 0,
    buffer: 0,
    emergency: 0,
    extra: 0,
    repaymentBudget: 0,
    returns: 12,
    lumpSum: 0,
    cashReturn: 0,
    assets: [],
  };
}
function Numeric({
  label,
  value,
  onChange,
  min = 0,
  max = 1e9,
  hint,
  step = "any",
  wholeAmount = false,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  hint?: string;
  step?: string;
  wholeAmount?: boolean;
}) {
  const hintId = useId();
  return (
    <label className="budget-field">
      <span>{label}</span>
      <input
        aria-label={label}
        aria-describedby={hint ? hintId : undefined}
        type="number"
        inputMode={wholeAmount ? "numeric" : "decimal"}
        min={min}
        max={max}
        step={wholeAmount ? "1" : step}
        value={value === 0 ? "" : wholeAmount ? Math.round(value) : value}
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
  const [plan, setPlan] = useState<LoanPlan>(() => {
    const saved = load();
    return { ...saved, currency: preferredCurrency() ?? saved.currency };
  });
  usePlanCurrency(plan, setPlan);
  const [view, setView] = useState<"setup" | "compare" | "guide">("setup");
  const [selected, setSelected] = useState<Strategy>("avalanche");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState("");
  const [visibleMonths, setVisibleMonths] = useState(12);
  useEffect(() => setVisibleMonths(12), [selected, plan.horizon]);
  const comparison = useMemo(() => compare(plan), [plan]);
  const valid = validateLoanPlan(plan).length === 0;
  const cash = valid ? cashFlow(plan) : null;
  const monthlyGap = cash
    ? Math.max(
        cash.fundingGap,
        plan.fundingMode === "manual" ? 0 : -cash.unassigned,
      )
    : 0;
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
    new Intl.NumberFormat(plan.currency === "INR" ? "en-IN" : "en-US", {
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
    setPlan((p) => resolveLoanPlan({ ...p, [key]: value }));
  }
  function patchLoan(id: string, key: keyof Loan, value: string | number) {
    setPlan((p) =>
      resolveLoanPlan({
        ...p,
        loans: p.loans.map((l) => (l.id === id ? { ...l, [key]: value } : l)),
      }),
    );
  }
  function patchAsset(
    id: string,
    key: keyof LoanAsset,
    value: string | number | boolean,
  ) {
    setPlan((p) => ({
      ...p,
      assets: (p.assets ?? []).map((a) =>
        a.id === id ? { ...a, [key]: value } : a,
      ),
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
  function exportPlan() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              plan,
              results: comparison.results.map(({ rows, ...r }) => r),
              decisions: compareDecisions(plan).map(
                ({ rows, ...scenario }) => scenario,
              ),
            },
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
      const value = await readPortablePlan(file, "loan");
      const errors = validateLoanPlan(value);
      if (errors.length) throw Error(errors[0]);
      setPlan(
        resolveLoanPlan({
          ...withRepaymentBudget(value as LoanPlan),
          useSalaryInvestment: false,
        }),
      );
      setNotice("Your loan plan was restored.");
      setView("setup");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not read this plan.");
    }
  }
  function resetPlan() {
    if (
      window.confirm("Replace your current loan plan with the example plan?")
    ) {
      setPlan(example());
      setNotice("");
      setView("setup");
      setSelected("avalanche");
    }
  }
  function report() {
    if (!valid) return;
    downloadReport(
      "Loan repayment, savings & asset comparison",
      "money-planner-loan-payoff.html",
      "loan",
      plan,
      [
        {
          title: "Your monthly budget & assumptions",
          headers: ["Setting", "Value"],
          rows: [
            ["Currency", plan.currency],
            ["Emergency saving", money(plan.reserve)],
            ["Protected emergency savings", money(plan.emergency)],
            ["Funding mode", "Manually entered total repayment budget"],
            ["Extra monthly budget", money(cash?.availableExtra ?? plan.extra)],
            [
              "Total monthly repayment budget",
              money(plan.repaymentBudget ?? 0),
            ],
            [
              "Additional monthly net earnings",
              money(cash?.additionalRent ?? 0),
            ],
            [
              "Total monthly money including asset earnings",
              money(cash?.totalFunding ?? 0),
            ],
            [
              "Retained asset value today",
              money(assetValueAt(plan.assets ?? [])),
            ],
            ["Spare savings available for scenario", money(plan.lumpSum ?? 0)],
            ["After-tax annual cash return", `${plan.cashReturn ?? 0}%`],
            ["Starting month", plan.start],
            ["Timeline from loan end dates", `${plan.horizon} months`],
            ["Expected return", `${plan.returns}%`],
            ["Investment fee", `${plan.investmentFee}%`],
            ["Tax on gains", `${plan.gainsTax}%`],
            ["Split to loan prepayments", `${plan.split}%`],
          ],
        },
        {
          title:
            "Repayment, investment and asset scenarios (same starting wealth)",
          headers: [
            "Scenario",
            "Interest",
            "Fees",
            "Ending cash",
            "Retained assets",
            "Debt",
            "Net wealth",
            "Debt-free month",
            "Funding gap / issue",
          ],
          rows: compareDecisions(plan).map((s) => {
            const end = s.rows.at(-1)!;
            return [
              s.name,
              money(s.interest),
              money(s.fees),
              money(end.liquid),
              money(end.assetValue),
              money(end.debt),
              money(end.net),
              s.debtFree === 0 ? "Cleared at start" : when(s.debtFree),
              s.error ?? money(s.fundingGap),
            ];
          }),
        },
        {
          title: "Asset inputs",
          headers: [
            "Asset",
            "Current value",
            "Monthly earnings",
            "Monthly costs/taxes",
            "Vacancy",
            "Value growth",
            "Earnings growth",
            "Selling cost",
            "Sale tax",
            "Linked loan",
            "Net earnings already in budget",
            "Replacement monthly cost if sold",
            "Annual gross income yield",
            "Annual net income yield",
          ],
          rows: (plan.assets ?? []).map((a) => [
            a.name,
            money(a.value),
            money(a.rent),
            money(a.costs),
            `${a.vacancy}%`,
            `${a.appreciation}%`,
            `${a.rentGrowth}%`,
            `${a.sellingCost}%`,
            money(a.saleTax),
            plan.loans.find((l) => l.id === a.linkedLoanId)?.name ?? "None",
            a.rentIncluded ? "Yes" : "No",
            money(a.replacementCost ?? 0),
            yieldText(assetIncomeYield(a).gross),
            yieldText(assetIncomeYield(a).net),
          ]),
        },
        {
          title: "Your loans",
          headers: [
            "Loan",
            "Balance",
            "Rate",
            "EMI",
            "Months",
            "Prepayment fee",
            "Lock months",
            "Interest tax relief",
            "Original amount",
            "First EMI month",
            "Final EMI month",
          ],
          rows: plan.loans.map((l) => [
            l.name,
            money(l.balance),
            `${l.rate}%`,
            money(payment(l)),
            l.inputMode === "original"
              ? originalLoanSchedule(l, plan.start).remainingMonths
              : l.months,
            `${l.fee}%`,
            l.lock,
            `${l.taxRelief}%`,
            l.inputMode === "original"
              ? money(l.originalAmount ?? 0)
              : "From lender balance",
            l.inputMode === "original" ? (l.firstEmiMonth ?? "") : "—",
            l.inputMode === "original" ? (l.lastEmiMonth ?? "") : "—",
          ]),
        },
        {
          title: "Scheduled loan payments from first EMI to final EMI",
          headers: [
            "Loan",
            "First EMI month",
            "Payments shown",
            "Starting principal",
            "Monthly EMI",
            "Total interest",
            "Total paid",
          ],
          rows: plan.loans.map((loan) => {
            const timeline = loanPaymentTimeline(loan, plan.start);
            return [
              loan.name,
              timeline.firstMonth,
              timeline.points.length - 1,
              money(timeline.principal),
              money(timeline.emi),
              money(timeline.totalInterest),
              money(timeline.totalPaid),
            ];
          }),
        },
        {
          title: "Investment outlook after regular EMIs",
          headers: ["Setting", "Amount"],
          rows: [
            ["First month invested", money(base?.rows[0]?.invested ?? 0)],
            ["Total money invested", money(base?.contributed ?? 0)],
            ["Projected investment value", money(base?.portfolio ?? 0)],
            ["Estimated tax at the finish", money(base?.investmentTax ?? 0)],
          ],
        },
        {
          title:
            "Investment and repayment alternatives (assets retained and asset earnings included)",
          headers: [
            "Path",
            "Interest",
            "Fees",
            "Portfolio",
            "Debt",
            "Net position",
            "Debt free",
          ],
          rows: comparison.results.map((r) => [
            label(r.strategy),
            money(r.interest),
            money(r.fees),
            money(r.portfolio),
            money(r.debt),
            money(r.net),
            when(r.debtFree),
          ]),
        },
        ...comparison.results.map((r) => ({
          title: `${label(r.strategy)} — monthly schedule`,
          headers: [
            "Month",
            "Required payments",
            "Extra repayments",
            "Invested",
            "Debt",
            "Portfolio",
            "Net position",
            "Monthly money including net earnings",
            "Net asset earnings",
            "Retained asset value",
            "Spare cash",
            "Unfunded payments/costs",
          ],
          rows: r.rows.map((m) => [
            m.month,
            money(m.required),
            money(m.extra),
            money(m.invested),
            money(m.debt),
            money(m.portfolio),
            money(m.net),
            money(m.budget),
            money(m.rent),
            money(m.assetValue),
            money(m.spareCash),
            money(m.shortfall),
          ]),
        })),
      ],
      "Fixed assumptions, not instructions to sell, keep or invest. Main repayment/investment paths include net asset earnings, retained assets and spare cash. Optional cash-only sale decisions are separate comparisons. Asset sales remove their value and rental cash flow, settle the linked loan and deduct entered sale costs/taxes. Emergency savings stay protected; spare savings must exclude them. Retained asset values exclude future liquidation costs/taxes. Imports restore inputs and recalculate.",
    );
  }
  const totalDebt = plan.loans.reduce((s, l) => s + Math.max(0, l.balance), 0);
  const nonAmortizing = valid
    ? plan.loans.filter(
        (l) => l.balance > 0 && payment(l) <= (l.balance * l.rate) / 1200,
      )
    : [];
  return (
    <main className="planner-page budget-app loan-app">
      <PlannerNavigation />
      <PlannerHeader
        kind="loan"
        controls={{
          currency: plan.currency,
          onCurrency: (c) => update("currency", c),
          onImport: (file) => {
            void importFile(file);
          },
          onReport: report,
          onReset: resetPlan,
          onSaveJSON: exportPlan,
          disabled: !valid,
        }}
      />
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
                    <h2 id="loan-budget-title">
                      Set your monthly repayment money.
                    </h2>
                  </div>
                  <span className="budget-step" aria-hidden="true">
                    01
                  </span>
                </div>
                <p className="budget-help">
                  Enter the total amount you can pay toward your loans each
                  month. Required EMIs come first; the rest funds extra
                  payments.
                </p>
                <Numeric
                  label="Monthly repayment budget"
                  wholeAmount
                  value={plan.repaymentBudget ?? 0}
                  onChange={(n) => update("repaymentBudget", n)}
                  hint="Include your regular EMIs and any extra repayments. Exclude asset earnings entered separately below."
                />
                <dl className="loan-funding-summary">
                  <div>
                    <dt>Required EMIs</dt>
                    <dd>{cash ? money(cash.emis) : "—"}</dd>
                  </div>
                  <div>
                    <dt>Extra available to allocate</dt>
                    <dd data-testid="loan-declared-extra">
                      {cash ? money(cash.availableExtra) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Total monthly money</dt>
                    <dd data-testid="loan-total-monthly-funding">
                      {cash ? money(cash.totalFunding) : "—"}
                    </dd>
                  </div>
                </dl>
                {(plan.assets ?? []).length > 0 && (
                  <p className="budget-help">
                    Your entered budget plus{" "}
                    {cash ? money(cash.additionalRent) : "—"} additional net
                    rent, after running costs and vacancy. Rent marked as
                    included is counted once.
                  </p>
                )}
              </section>
              <section
                className="budget-panel"
                aria-labelledby="loan-list-title"
              >
                <div className="budget-panel-heading">
                  <div>
                    <h2 id="loan-list-title">Know what you owe.</h2>
                  </div>
                  <span className="budget-step" aria-hidden="true">
                    02
                  </span>
                </div>
                <p className="budget-help">
                  Add your loans one at a time. We’ll estimate each EMI and
                  what’s left to repay.
                </p>
                <label className="budget-field loan-asof">
                  <span>Calculate balances as of</span>
                  <DateInput
                    aria-label="Calculate balances as of"
                    type="month"
                    min="2000-01"
                    max="2149-12"
                    value={plan.start}
                    onChange={(e) => update("start", e.target.value)}
                  />
                  <small>
                    Before this month’s EMI. Used for every loan below.
                  </small>
                </label>
                {plan.loans.length === 0 && (
                  <div className="loan-empty">
                    <h3>Start with your first loan.</h3>
                    <p>
                      Use the original amount, interest rate and first / final
                      EMI months. We’ll do the calculations.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setPlan(example());
                        setNotice(
                          "Example plan loaded. Replace its loans and budget with your own values.",
                        );
                      }}
                    >
                      Load example plan
                    </button>
                  </div>
                )}
                {plan.loans.map((l, index) => {
                  const schedule =
                    l.inputMode === "original"
                      ? originalLoanSchedule(l, plan.start)
                      : null;
                  return (
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
                      <label className="budget-field loan-input-method">
                        <span>Loan details available</span>
                        <select
                          aria-label="Loan details available"
                          value={l.inputMode ?? "balance"}
                          onChange={(e) =>
                            patchLoan(l.id, "inputMode", e.target.value)
                          }
                        >
                          <option value="original">
                            Original amount &amp; EMI dates
                          </option>
                          <option value="balance">
                            Current lender balance
                          </option>
                        </select>
                      </label>
                      <div className="budget-fields">
                        {l.inputMode === "original" ? (
                          <Numeric
                            label="Original loan amount"
                            wholeAmount
                            value={l.originalAmount ?? 0}
                            onChange={(n) =>
                              patchLoan(l.id, "originalAmount", n)
                            }
                          />
                        ) : (
                          <Numeric
                            label="Outstanding balance"
                            wholeAmount
                            value={l.balance}
                            onChange={(n) => patchLoan(l.id, "balance", n)}
                          />
                        )}
                        <Numeric
                          label="Annual loan interest (%)"
                          value={l.rate}
                          max={120}
                          onChange={(n) => patchLoan(l.id, "rate", n)}
                        />
                        {l.inputMode === "original" ? (
                          <>
                            <label className="budget-field loan-month-field">
                              <span>First EMI month</span>
                              <DateInput
                                aria-label="First EMI month"
                                type="month"
                                min="1900-01"
                                max={plan.start || "2149-12"}
                                value={l.firstEmiMonth ?? ""}
                                onChange={(e) =>
                                  patchLoan(
                                    l.id,
                                    "firstEmiMonth",
                                    e.target.value,
                                  )
                                }
                              />
                            </label>
                            <label className="budget-field loan-month-field">
                              <span>Final EMI month (loan end)</span>
                              <DateInput
                                aria-label="Final EMI month (loan end)"
                                type="month"
                                min={l.firstEmiMonth || "1900-01"}
                                max="2149-12"
                                value={l.lastEmiMonth ?? ""}
                                onChange={(e) =>
                                  patchLoan(
                                    l.id,
                                    "lastEmiMonth",
                                    e.target.value,
                                  )
                                }
                              />
                            </label>
                          </>
                        ) : (
                          <>
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
                              wholeAmount
                              value={l.emi}
                              onChange={(n) => patchLoan(l.id, "emi", n)}
                              hint="Leave 0 to calculate from balance, rate and term."
                            />
                          </>
                        )}
                      </div>
                      {schedule ? (
                        <>
                          <dl
                            className="loan-calculated"
                            aria-label={`Calculated details for loan ${index + 1}`}
                          >
                            <div>
                              <dt>Estimated monthly EMI</dt>
                              <dd data-testid="loan-calculated-emi">
                                {schedule.error ? "—" : money(schedule.emi)}
                              </dd>
                            </div>
                            <div>
                              <dt>Months remaining</dt>
                              <dd data-testid="loan-calculated-months">
                                {schedule.error
                                  ? "—"
                                  : schedule.remainingMonths}
                              </dd>
                            </div>
                            <div>
                              <dt>Estimated outstanding</dt>
                              <dd data-testid="loan-calculated-balance">
                                {schedule.error ? "—" : money(schedule.balance)}
                              </dd>
                            </div>
                          </dl>
                          <p className="budget-help" role="status">
                            {schedule.error ||
                              (schedule.remainingMonths === 0
                                ? "This loan is already complete as of the comparison month."
                                : `${schedule.paidMonths} of ${schedule.originalMonths} scheduled EMIs assumed paid before the comparison month.`)}
                          </p>
                          <details className="loan-terms">
                            <summary>How is this estimated?</summary>
                            <p>
                              First and final EMI months are included in the
                              original term. We assume one month-end EMI every
                              month, a fixed rate on a reducing balance, and no
                              missed payments, extra payments or fees before the
                              comparison month. Interest is the annual rate
                              divided by 12. If your repayment history or rate
                              changed, choose “Current lender balance” and use
                              your latest statement.
                            </p>
                          </details>
                        </>
                      ) : (
                        <p className="loan-emi">
                          Required monthly payment{" "}
                          <strong>
                            {valid ? money(payment(l)) : "Complete the inputs"}
                          </strong>
                          {l.emi > 0 && (
                            <small>
                              Actual EMI overrides the remaining term.
                            </small>
                          )}
                        </p>
                      )}
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
                            hint="Use 0 unless eligible. Enter effective relief after limits, not your tax bracket."
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
                  );
                })}
                <button
                  className="budget-add"
                  disabled={plan.loans.length >= 20}
                  onClick={() =>
                    update("loans", [
                      ...plan.loans,
                      {
                        id: crypto.randomUUID(),
                        name: `Loan ${plan.loans.length + 1}`,
                        inputMode: "original",
                        originalAmount: 0,
                        firstEmiMonth: "",
                        lastEmiMonth: "",
                        balance: 0,
                        rate: 0,
                        months: 1,
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
                className="budget-panel loan-assets-panel"
                aria-labelledby="loan-assets-title"
              >
                <h2 id="loan-assets-title">
                  What else could change the picture?
                </h2>
                <p className="budget-help">
                  Optional: compare using spare savings or selling an asset with
                  keeping them.
                </p>
                <div className="budget-fields">
                  <Numeric
                    label="Spare savings available now"
                    wholeAmount
                    value={plan.lumpSum ?? 0}
                    onChange={(n) => update("lumpSum", n)}
                    hint="Exclude your emergency fund and reserved bills."
                  />
                  <Numeric
                    label="Annual cash return after tax (%)"
                    value={plan.cashReturn ?? 0}
                    min={-99}
                    max={100}
                    onChange={(n) => update("cashReturn", n)}
                    hint="Return on idle cash; 0% keeps its value flat."
                  />
                  {plan.fundingMode === "manual" && (
                    <Numeric
                      label="Protected emergency savings"
                      wholeAmount
                      value={plan.emergency}
                      onChange={(n) => update("emergency", n)}
                      hint="Included in wealth; kept out of loan payments."
                    />
                  )}
                </div>
                <h3>Your income-producing or other assets</h3>
                <p className="budget-help">
                  Keep asset earnings separate from your repayment budget, or
                  mark them as already included to avoid counting it twice.
                </p>
                {(plan.assets ?? []).map((asset, index) => (
                  <fieldset
                    className="budget-bill loan-asset-editor"
                    key={asset.id}
                  >
                    <legend>Asset {index + 1}</legend>
                    <label className="budget-field">
                      <span>Asset name</span>
                      <input
                        value={asset.name}
                        maxLength={80}
                        onChange={(e) =>
                          patchAsset(asset.id, "name", e.target.value)
                        }
                      />
                    </label>
                    <div className="budget-fields">
                      <Numeric
                        label="Current asset market value"
                        wholeAmount
                        value={asset.value}
                        onChange={(n) => patchAsset(asset.id, "value", n)}
                      />
                      <Numeric
                        label="Monthly earnings"
                        wholeAmount
                        hint="Before running costs and taxes."
                        value={asset.rent}
                        onChange={(n) => patchAsset(asset.id, "rent", n)}
                      />
                      <Numeric
                        label="Monthly running costs & taxes"
                        wholeAmount
                        value={asset.costs}
                        onChange={(n) => patchAsset(asset.id, "costs", n)}
                      />
                      <label className="budget-field">
                        <span>Loan secured against this asset</span>
                        <select
                          aria-label="Loan secured against this asset"
                          value={asset.linkedLoanId}
                          onChange={(e) =>
                            patchAsset(asset.id, "linkedLoanId", e.target.value)
                          }
                        >
                          <option value="">No secured loan</option>
                          {plan.loans.map((loan) => (
                            <option key={loan.id} value={loan.id}>
                              {loan.name}
                            </option>
                          ))}
                        </select>
                        <small>A sale pays off this linked loan first.</small>
                      </label>
                    </div>
                    <label className="loan-funding-toggle">
                      <input
                        type="checkbox"
                        checked={asset.rentIncluded}
                        onChange={(e) =>
                          patchAsset(asset.id, "rentIncluded", e.target.checked)
                        }
                      />
                      This asset’s net earnings are already in my monthly income
                      or repayment budget
                    </label>
                    <dl
                      className="loan-calculated loan-asset-yield"
                      aria-label={`Income and yield for asset ${index + 1}`}
                    >
                      <div>
                        <dt>Net monthly earnings</dt>
                        <dd>{money(netRent(asset))}</dd>
                      </div>
                      <div>
                        <dt>Annual yield · net</dt>
                        <dd data-testid="asset-net-yield">
                          {yieldText(assetIncomeYield(asset).net)}
                        </dd>
                      </div>
                      <div>
                        <dt>Annual yield · gross</dt>
                        <dd data-testid="asset-gross-yield">
                          {yieldText(assetIncomeYield(asset).gross)}
                        </dd>
                      </div>
                    </dl>
                    {asset.value <= 0 && (
                      <p className="budget-help">
                        Enter the asset’s current market value to see annual
                        yield.
                      </p>
                    )}
                    <details className="loan-terms">
                      <summary>How is annual yield calculated?</summary>
                      <p>
                        Annual income yield = monthly earnings × 12 ÷ current
                        asset value × 100. Net yield deducts the entered
                        vacancy, unpaid earnings, running costs and taxes first.
                        This is income yield, before loan payments; asset price
                        changes are separate.
                      </p>
                    </details>
                    <details className="loan-terms">
                      <summary>
                        Vacancy, value growth & selling assumptions
                      </summary>
                      <div className="budget-fields">
                        <Numeric
                          label="Vacancy / unpaid earnings (%)"
                          value={asset.vacancy}
                          max={100}
                          onChange={(n) => patchAsset(asset.id, "vacancy", n)}
                        />
                        <Numeric
                          label="Annual asset value growth (%)"
                          value={asset.appreciation}
                          min={-99}
                          max={100}
                          onChange={(n) =>
                            patchAsset(asset.id, "appreciation", n)
                          }
                        />
                        <Numeric
                          label="Annual earnings growth (%)"
                          value={asset.rentGrowth}
                          min={-99}
                          max={100}
                          onChange={(n) =>
                            patchAsset(asset.id, "rentGrowth", n)
                          }
                        />
                        <Numeric
                          label="Selling costs (% of value)"
                          value={asset.sellingCost}
                          max={30}
                          onChange={(n) =>
                            patchAsset(asset.id, "sellingCost", n)
                          }
                        />
                        <Numeric
                          label="Estimated tax payable on sale"
                          wholeAmount
                          value={asset.saleTax}
                          onChange={(n) => patchAsset(asset.id, "saleTax", n)}
                          hint="Your cash estimate; no tax rate is assumed."
                        />
                        <Numeric
                          label="Replacement monthly cost if sold"
                          wholeAmount
                          value={asset.replacementCost ?? 0}
                          onChange={(n) =>
                            patchAsset(asset.id, "replacementCost", n)
                          }
                          hint="For example, replacement rent. Applies only if this asset is sold."
                        />
                      </div>
                    </details>
                    <button
                      type="button"
                      className="budget-text-button"
                      aria-label={`Remove asset ${index + 1}`}
                      onClick={() =>
                        update(
                          "assets",
                          (plan.assets ?? []).filter((a) => a.id !== asset.id),
                        )
                      }
                    >
                      Remove asset
                    </button>
                  </fieldset>
                ))}
                <button
                  type="button"
                  className="budget-add"
                  disabled={(plan.assets ?? []).length >= 8}
                  onClick={() =>
                    update("assets", [
                      ...(plan.assets ?? []),
                      {
                        id: crypto.randomUUID(),
                        name: `Asset ${(plan.assets ?? []).length + 1}`,
                        value: 0,
                        rent: 0,
                        costs: 0,
                        vacancy: 0,
                        appreciation: 0,
                        rentGrowth: 0,
                        sellingCost: 3,
                        saleTax: 0,
                        linkedLoanId: "",
                        rentIncluded: false,
                      },
                    ])
                  }
                >
                  Add an asset to compare
                </button>
              </section>
              <div className="loan-compare-action">
                <button
                  className="budget-primary"
                  onClick={() => {
                    setView("compare");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Compare my options ↗
                </button>
              </div>
            </>
          )}
          {comparison.errors.length > 0 &&
            (plan.loans.length > 0 || view !== "setup") && (
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
              <LoanDecisionLab
                plan={plan}
                money={money}
                when={when}
                onReturnChange={(n) => update("returns", n)}
              />
              <details className="loan-terms">
                <summary>
                  Investment alternatives: return, fees and split (optional)
                </summary>
                <div className="budget-fields">
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
              </details>
              <details className="loan-investment-alternatives">
                <summary>Explore four repayment and investment paths</summary>
                <div className="loan-investment-boundary">
                  <h2>Optional: compare investing the monthly extra</h2>
                  <p>
                    These four paths include your entered monthly budget and net
                    rent. Assets stay owned, and spare savings stay in cash. The
                    optional sale scenarios above use different asset and rental
                    cash flows.
                  </p>
                </div>
                <section className="loan-insight">
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
                        {
                          strategies.find((s) => s.id === r.strategy)!
                            .description
                        }
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
                    <h2>Two balances. One honest picture.</h2>
                    <p className="budget-help">
                      Net position = investments after estimated gains tax +
                      retained assets + spare cash + protected savings −
                      remaining debt and unpaid operating costs. Protected
                      savings at month {plan.horizon}:{" "}
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
                      difference in interest and fees versus investing the
                      extra, measured over the same {plan.horizon} months.
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
                      Compares investing the extra with highest-interest-first
                      at your chosen horizon, including entered fees and taxes.
                      Scans 5-point intervals, then refines detected crossings.
                      It is a scenario threshold, not a forecast; complex cases
                      may have additional crossings.
                    </p>
                  </div>
                </section>
              </details>
            </>
          )}
          {view === "guide" && current && !comparison.errors.length && (
            <>
              <section className="budget-panel">
                <h2>Your next payment, made clear.</h2>
                <p className="budget-help">
                  Includes the monthly budget and net earnings. Savings and
                  asset-sale schedules are in Compare paths.
                </p>
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
                      {money(cash!.emis)} in the first month. Check lender due
                      dates and payment instructions.
                    </span>
                  </li>
                  <li>
                    <strong>
                      Give the extra {money(cash?.availableExtra ?? plan.extra)}{" "}
                      its job.
                    </strong>
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
                      Released EMIs fund the next payments or investments.{" "}
                      {when(current.debtFree) === "Beyond this horizon"
                        ? "Some debt remains at the end of this horizon."
                        : `All modeled debt clears ${when(current.debtFree)}.`}
                    </span>
                  </li>
                  <li>
                    <strong>Review after each statement.</strong>
                    <span>
                      Update balances, rates and fees. This plan isn’t linked to
                      your bank.
                    </span>
                  </li>
                </ol>
              </section>
              <section className="budget-panel">
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
                <h2>Know exactly where it goes.</h2>
                <p className="budget-help">
                  Open a month for each loan’s payments. Month-end amounts in{" "}
                  {plan.currency}, after interest.
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
            <h2>A plan that fits real life.</h2>
            <dl className="budget-breakdown">
              {(plan.fundingMode === "manual"
                ? [
                    ["Entered monthly budget", cash?.baseBudget ?? 0],
                    ...((plan.assets ?? []).length
                      ? [
                          [
                            "Additional net earnings",
                            cash?.additionalRent ?? 0,
                          ],
                        ]
                      : []),
                    ["Total monthly money", cash?.totalFunding ?? 0],
                    ["Required EMIs", cash?.emis ?? 0],
                  ]
                : [
                    ["Take-home income", plan.salary],
                    ["Living costs & goals", plan.expenses],
                    ["Emergency saving", plan.reserve],
                    ["Cash buffer", plan.buffer],
                    ["Required EMIs", cash?.emis ?? 0],
                    ["Chosen extra", cash?.availableExtra ?? plan.extra],
                  ]
              ).map(([text, value]) => (
                <div key={text}>
                  <dt>{text}</dt>
                  <dd>{money(Number(value))}</dd>
                </div>
              ))}
            </dl>
            <div
              className={`budget-balance ${cash && monthlyGap > 0 ? "is-short" : ""}`}
            >
              <span>
                {!cash
                  ? "COMPLETE YOUR INPUTS"
                  : monthlyGap > 0
                    ? "MONTHLY SHORTFALL"
                    : plan.fundingMode === "manual"
                      ? "LEFT AFTER EMIs"
                      : "LEFT UNASSIGNED"}
              </span>
              <strong data-testid="loan-monthly-room">
                {cash
                  ? money(
                      monthlyGap > 0
                        ? monthlyGap
                        : plan.fundingMode === "manual"
                          ? cash.availableExtra
                          : cash.unassigned,
                    )
                  : "—"}
              </strong>
              <p>
                {plan.fundingMode === "manual"
                  ? monthlyGap > 0
                    ? "Your monthly money does not cover all required EMIs."
                    : "Available for extra loan payments, repayment fees or investing."
                  : "Your monthly money covers debt, fees and investing."}
              </p>
            </div>
            {(plan.assets ?? []).length > 0 && (
              <div className="loan-summary-assets">
                <span>Assets you own</span>
                <strong>{money(assetValueAt(plan.assets ?? []))}</strong>
                <p>Market value, separate from your monthly money.</p>
              </div>
            )}
          </section>
          {nonAmortizing.length > 0 && (
            <p className="loan-warning" role="status">
              Check {nonAmortizing.map((l) => l.name).join(", ")}: the required
              EMI does not exceed first-month interest. Without enough extra
              payments, the balance may grow.
            </p>
          )}
          <details className="budget-guideline">
            <summary>About the investment-only alternatives</summary>
            <p>
              These notes describe the four repayment and investment paths,
              including retained assets and rental income. Sale scenarios
              explain their own assumptions beneath their charts.
            </p>
            <p>
              Same starting loans, monthly budget, assets and horizon. Required
              EMIs are paid first. Extra payments reduce tenure; scheduled EMIs
              stay unchanged. Fees come from the same cash budget. Surplus
              blocked by lock-ins is invested.
            </p>
            <p>
              Loan interest uses annual nominal rate ÷ 12. Investment returns
              are effective annual rates, net of the annual fee, converted to
              monthly growth. Deposits arrive at month end. The overall timeline
              ends at the latest regular loan payoff, with a 600-month model
              limit. Each loan graph uses its own regular-payment timeline.
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
        className={`budget-mobile-balance ${cash && monthlyGap > 0 ? "is-short" : ""}`}
      >
        <div>
          <span>
            {cash && monthlyGap > 0
              ? "Monthly shortfall"
              : plan.fundingMode === "manual"
                ? "Monthly repayment money"
                : "Left unassigned"}
          </span>
          <strong>
            {cash
              ? money(
                  monthlyGap > 0
                    ? monthlyGap
                    : plan.fundingMode === "manual"
                      ? cash.totalFunding
                      : cash.unassigned,
                )
              : "Check inputs"}
          </strong>
        </div>
        <a href="#loan-monthly-snapshot">Monthly breakdown ↑</a>
      </div>
      <details className="loan-reading planner-explanation">
        <summary>Repayment methods & further reading</summary>
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
      </details>
      <footer className="budget-foot">
        <span>Financial AI Planner / LESS GUESSWORK, MORE DIRECTION</span>
        <p>
          Educational estimates, not guaranteed returns or tax advice. Resource
          authors do not endorse this tool. Plans save in this browser when
          available; download a report to keep a backup.
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
