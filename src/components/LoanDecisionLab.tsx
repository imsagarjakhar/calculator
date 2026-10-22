import { useEffect, useId, useRef, useState } from "react";
import { compareDecisions, netRent } from "../loans/decisions";
import { cashFlow, simulate, type LoanPlan } from "../loans/model";

type ChartRow = { month: number; debt: number; net: number };
type ChartPath = { name: string; rows: ChartRow[] };

function ScenarioChart({
  base,
  selected,
  field,
  title,
  currency,
  money,
  baselineLabel = "EMIs only",
  sliderLabel,
}: {
  base: ChartPath;
  selected: ChartPath;
  field: "debt" | "net";
  title: string;
  currency: string;
  money: (n: number) => string;
  baselineLabel?: string;
  sliderLabel?: string;
}) {
  const svg = useRef<SVGSVGElement>(null),
    id = useId();
  const [width, setWidth] = useState(640),
    [month, setMonth] = useState<number | null>(null);
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const measure = () =>
      setWidth(Math.max(240, Math.round(el.getBoundingClientRect().width)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const length = base.rows.length - 1;
  const active = Math.min(month ?? length, length);
  const values = [
    0,
    ...base.rows.map((r) => r[field]),
    ...selected.rows.map((r) => r[field]),
  ];
  const low = Math.min(...values),
    high = Math.max(...values),
    span = Math.max(1, high - low);
  const x = (m: number) => 78 + (m / Math.max(1, length)) * (width - 94),
    y = (n: number) => 220 - ((n - low) / span) * 190;
  const line = (rows: ChartRow[]) =>
    rows
      .map(
        (r, i) =>
          `${i ? "L" : "M"}${x(r.month).toFixed(2)},${y(r[field]).toFixed(2)}`,
      )
      .join(" ");
  const short = (n: number) =>
    new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      notation: Math.abs(n) >= 1e12 ? "scientific" : "compact",
      maximumFractionDigits: 1,
    }).format(n);
  return (
    <figure className="loan-decision-chart">
      <h3>{title}</h3>
      <svg
        ref={svg}
        viewBox={`0 0 ${width} 255`}
        role="img"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-desc`}
      >
        <title id={`${id}-title`}>{title}</title>
        <desc id={`${id}-desc`}>
          {selected.name} compared with {baselineLabel} over {length} months. At
          the end: {money(selected.rows.at(-1)![field])} versus{" "}
          {money(base.rows.at(-1)![field])}.
        </desc>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1="78"
              x2={width - 16}
              y1={y(low + span * f)}
              y2={y(low + span * f)}
              className="loan-decision-grid"
            />
            <text x="68" y={y(low + span * f) + 4} textAnchor="end">
              {short(low + span * f)}
            </text>
          </g>
        ))}
        {[0, 0.5, 1].map((f) => (
          <text
            key={f}
            x={x(Math.round(length * f))}
            y="246"
            textAnchor="middle"
          >
            M{Math.round(length * f)}
          </text>
        ))}
        <path d={line(base.rows)} className="loan-decision-baseline" />
        <path d={line(selected.rows)} className="loan-decision-line" />
        <line
          x1={x(active)}
          x2={x(active)}
          y1="30"
          y2="220"
          className="loan-decision-marker"
        />
        <circle
          cx={x(active)}
          cy={y(selected.rows[active][field])}
          r="4"
          className="loan-decision-dot"
        />
      </svg>
      <div className="loan-decision-legend">
        <span>
          <i /> {selected.name}
        </span>
        <span>
          <i /> {baselineLabel}
        </span>
      </div>
      <label className="loan-decision-slider">
        <span>
          {sliderLabel ??
            `Explore ${field === "debt" ? "debt" : "net wealth"} month`}
        </span>
        <input
          type="range"
          min={0}
          max={length}
          step={1}
          value={active}
          aria-valuetext={`Month ${active}: ${money(selected.rows[active][field])}`}
          onChange={(e) => setMonth(Number(e.target.value))}
        />
      </label>
      <figcaption aria-live="polite">
        Month {active}: <strong>{money(selected.rows[active][field])}</strong>
        <span>
          {baselineLabel}: {money(base.rows[active][field])}
        </span>
      </figcaption>
    </figure>
  );
}
function LoanOverview({
  plan,
  money,
  when,
  onReturnChange,
}: {
  plan: LoanPlan;
  money: (n: number) => string;
  when: (n: number | null) => string;
  onReturnChange: (n: number) => void;
}) {
  const repay = simulate(plan, "avalanche");
  const invest = simulate(plan, "invest");
  const cash = cashFlow(plan);
  const initialNet =
    plan.emergency - plan.loans.reduce((s, l) => s + l.balance, 0);
  const wealthPath = (s: typeof repay, name: string): ChartPath => ({
    name,
    rows: [{ month: 0, debt: 0, net: initialNet }, ...s.rows],
  });
  return (
    <>
      <div className="loan-decision-intro">
        <h2>Your loans. One clear picture at a time.</h2>
        <p>
          Your {money(cash.commitment)} monthly budget pays {money(cash.emis)}{" "}
          in required EMIs first. That leaves {money(cash.extra)} initially to
          repay extra or invest.
        </p>
        <p className="loan-overview-scope">
          The graphs below use this monthly budget only. Spare savings, rental
          income and asset sales have their own optional comparison further
          down.
        </p>
      </div>
      <section
        className="budget-panel loan-invest-or-repay"
        aria-labelledby="invest-or-repay-title"
      >
        <p className="budget-eyebrow">THE SAME MONEY · TWO CHOICES</p>
        <h3 id="invest-or-repay-title">
          Pay loans faster or invest the extra?
        </h3>
        <div className="loan-choice-explainer">
          <div>
            <strong>Pay extra toward loans</strong>
            <p>
              Pay EMIs, then target the highest effective interest rate first.
              Once loans close, invest the released money.
            </p>
          </div>
          <div>
            <strong>Invest instead</strong>
            <p>
              Continue every required EMI. Invest the remaining monthly budget,
              including EMIs released when a loan closes.
            </p>
          </div>
        </div>
        <label className="budget-field loan-return-field">
          <span>Expected annual investment return (%)</span>
          <input
            type="number"
            min={-99}
            max={100}
            step="any"
            inputMode="decimal"
            value={plan.returns}
            onChange={(e) => {
              if (Number.isFinite(e.target.valueAsNumber))
                onReturnChange(
                  Math.max(-99, Math.min(100, e.target.valueAsNumber)),
                );
            }}
          />
        </label>
        <p className="budget-help">
          An assumed return, not a guarantee. Both paths use {plan.returns}%
          annual return, {plan.investmentFee}% annual investment fees and{" "}
          {plan.gainsTax}% tax on positive investment gains at the finish.
          Change fees and tax in your inputs.
        </p>
        <ScenarioChart
          base={wealthPath(invest, "Invest instead")}
          selected={wealthPath(repay, "Pay extra toward loans")}
          baselineLabel="Invest instead"
          field="net"
          title="Your net wealth: investing versus repaying"
          sliderLabel="Explore repayment versus investing month"
          currency={plan.currency}
          money={money}
        />
        <p className="budget-help">
          Net wealth is investments after estimated tax, plus the same protected
          emergency and reserve savings, minus remaining debt. A bigger
          investment balance alone can hide outstanding debt.
        </p>
        <div className="loan-choice-explainer loan-choice-results">
          {[
            { label: "Pay extra toward loans", s: repay },
            { label: "Invest instead", s: invest },
          ].map(({ label, s }) => (
            <div key={label}>
              <strong>{label}</strong>
              <dl>
                <div>
                  <dt>Investments after estimated tax</dt>
                  <dd>{money(s.portfolio - s.investmentTax)}</dd>
                </div>
                <div>
                  <dt>Debt remaining</dt>
                  <dd>{money(s.debt)}</dd>
                </div>
                <div>
                  <dt>Net wealth at month {plan.horizon}</dt>
                  <dd>{money(s.net)}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>
      <section className="loan-per-loan" aria-labelledby="per-loan-title">
        <div className="loan-decision-intro">
          <h2 id="per-loan-title">See each loan separately.</h2>
          <p>
            Solid green shows extra repayments. Dashed amber shows regular EMIs
            while you invest the extra. Extra money is shared across your loans,
            highest effective rate first—it isn’t applied in full to every loan.
          </p>
        </div>
        <div className="loan-per-loan-grid">
          {plan.loans
            .filter((l) => l.balance > 0)
            .map((loan) => {
              const path = (s: typeof repay, name: string): ChartPath => ({
                name,
                rows: [
                  { month: 0, debt: loan.balance, net: 0 },
                  ...s.rows.map((row) => ({
                    month: row.month,
                    debt: row.loans.find((l) => l.id === loan.id)!.closing,
                    net: 0,
                  })),
                ],
              });
              const interest = (s: typeof repay) =>
                s.rows.reduce(
                  (sum, row) =>
                    sum + row.loans.find((l) => l.id === loan.id)!.interest,
                  0,
                );
              return (
                <article className="budget-panel loan-individual" key={loan.id}>
                  <p className="budget-eyebrow">
                    {loan.rate}% ANNUAL INTEREST · {money(loan.balance)} OWED
                  </p>
                  <ScenarioChart
                    base={path(invest, "Regular EMIs")}
                    baselineLabel="Regular EMIs"
                    selected={path(repay, "With extra repayments")}
                    field="debt"
                    title={loan.name}
                    sliderLabel={`Explore ${loan.name} repayment month`}
                    currency={plan.currency}
                    money={money}
                  />
                  <dl className="loan-individual-facts">
                    <div>
                      <dt>With extra: loan cleared</dt>
                      <dd>{when(repay.paidOff[loan.id] ?? null)}</dd>
                    </div>
                    <div>
                      <dt>Regular EMIs: loan cleared</dt>
                      <dd>{when(invest.paidOff[loan.id] ?? null)}</dd>
                    </div>
                    <div>
                      <dt>Interest avoided over {plan.horizon} months</dt>
                      <dd>{money(interest(invest) - interest(repay))}</dd>
                    </div>
                  </dl>
                  {loan.lock > 0 && (
                    <p className="budget-help">
                      Extra repayments start after month {loan.lock}, when this
                      loan’s lock-in ends.
                    </p>
                  )}
                </article>
              );
            })}
        </div>
      </section>
    </>
  );
}
export function LoanDecisionLab({
  plan,
  money,
  when,
  onReturnChange,
}: {
  plan: LoanPlan;
  money: (n: number) => string;
  when: (month: number | null) => string;
  onReturnChange: (n: number) => void;
}) {
  const scenarios = compareDecisions(plan);
  const [choice, setChoice] = useState("monthly");
  const [visible, setVisible] = useState(12);
  useEffect(() => setVisible(12), [choice, plan.horizon]);
  const selected =
    scenarios.find((s) => s.id === choice && !s.error) ?? scenarios[1];
  const base = scenarios[0];
  const ranked = [...plan.loans]
    .filter((l) => l.balance > 0)
    .sort((a, b) => b.rate - a.rate);
  const maxRate = Math.max(1, ...ranked.map((l) => l.rate));
  if (!base || !selected) return null;
  const final = selected.rows.at(-1)!,
    baseline = base.rows.at(-1)!;
  const interestSaved = base.interest - selected.interest,
    feeDifference = selected.fees - base.fees;
  const sale = plan.assets?.find((a) => `sell-${a.id}` === selected.id);
  const maxCost = Math.max(
    1,
    ...scenarios.filter((s) => !s.error).map((s) => s.interest + s.fees),
  );
  return (
    <section className="loan-decision-lab">
      <LoanOverview
        plan={plan}
        money={money}
        when={when}
        onReturnChange={onReturnChange}
      />
      <details className="loan-advanced-scenarios">
        <summary>Optional: use spare savings or compare an asset sale</summary>
        <div className="loan-decision-intro">
          <h2 id="loan-decisions-title">See what each choice changes.</h2>
          <p>
            Same loans, timeline and non-rental monthly commitment. Compare
            interest, debt and wealth—not just a lower EMI.
          </p>
        </div>
        <section className="budget-panel loan-rate-ranking">
          <h3>Your loans, highest to lowest interest</h3>
          <p className="budget-help">
            Annual rates show borrowing cost, not a “good” or “bad” loan.
            Balances, tax relief, fees and lock-ins also matter.
          </p>
          <ol>
            {ranked.map((loan, index) => (
              <li key={loan.id}>
                <div>
                  <strong>
                    {index + 1}. {loan.name}
                  </strong>
                  <b>{loan.rate}%</b>
                </div>
                <div className="loan-rate-track">
                  <span style={{ width: `${(loan.rate / maxRate) * 100}%` }} />
                </div>
                <p>
                  {money(loan.balance)} outstanding · about{" "}
                  {money((loan.balance * loan.rate) / 1200)} interest in the
                  first month
                  {loan.lock > 0
                    ? ` · extra payments locked for ${loan.lock} months`
                    : ""}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="budget-panel">
          <h3>Choose a scenario to explore</h3>
          <label className="budget-field">
            <span>Compare repayment scenario</span>
            <select
              aria-label="Compare repayment scenario"
              value={selected.id}
              onChange={(e) => setChoice(e.target.value)}
            >
              {scenarios
                .filter((s) => !s.error)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <p className="budget-help">{selected.description}</p>
          <div className="loan-decision-stats">
            <div>
              <span>Interest {interestSaved >= 0 ? "avoided" : "added"}</span>
              <strong data-testid="decision-interest-saved">
                {money(Math.abs(interestSaved))}
              </strong>
              <small>Versus EMIs only; extra fees {money(feeDifference)}</small>
            </div>
            <div>
              <span>Debt-free date</span>
              <strong>
                {selected.debtFree === 0
                  ? "Cleared at start"
                  : when(selected.debtFree)}
              </strong>
              <small>
                {selected.debtFree === null
                  ? "Debt remains at the end of the comparison"
                  : `Month ${selected.debtFree} of ${plan.horizon}`}
              </small>
            </div>
            <div>
              <span>Net wealth difference</span>
              <strong data-testid="decision-net-difference">
                {money(final.net - baseline.net)}
              </strong>
              <small>At month {plan.horizon}, versus EMIs only</small>
            </div>
          </div>
          {selected.fundingGap > 1e-7 && (
            <p className="loan-scenario-warning" role="alert">
              This scenario cannot fund every required payment:{" "}
              {money(selected.fundingGap)} cumulative funding gap. Unpaid loan
              amounts remain in the debt balance. Don’t read this as an
              affordable repayment plan.
            </p>
          )}
          {selected.initialPayment > 0 && (
            <p className="loan-decision-note">
              At the start: {money(selected.initialPayment)} applied to
              principal and {money(selected.initialFees)} in closure/prepayment
              fees. Unused cash remains in savings. Locked loans receive no
              optional prepayment.
            </p>
          )}
          {sale && (
            <p className="loan-decision-note">
              Sale proceeds after entered costs, taxes and linked-loan
              settlement: {money(selected.saleProceeds)}. Net rental cash flow
              removed: {money(netRent(sale))} per month initially. The sold
              asset has no remaining value in this scenario. Other assets stay
              held; each sale is modeled independently.
            </p>
          )}
          <div className="loan-decision-charts">
            <ScenarioChart
              base={base}
              selected={selected}
              field="debt"
              title="How quickly does debt fall?"
              currency={plan.currency}
              money={money}
            />
            <ScenarioChart
              base={base}
              selected={selected}
              field="net"
              title="What happens to your net wealth?"
              currency={plan.currency}
              money={money}
            />
          </div>
          <dl className="loan-decision-ledger">
            <div>
              <dt>Liquid cash at the finish</dt>
              <dd>{money(final.liquid)}</dd>
            </div>
            <div>
              <dt>Retained assets, estimated market value</dt>
              <dd>{money(final.assetValue)}</dd>
            </div>
            <div>
              <dt>Protected emergency fund & new reserve savings</dt>
              <dd>{money(plan.emergency + plan.reserve * plan.horizon)}</dd>
            </div>
            <div>
              <dt>Remaining debt</dt>
              <dd>− {money(final.debt)}</dd>
            </div>
            {final.arrears > 0 && (
              <div>
                <dt>Unpaid operating costs</dt>
                <dd>− {money(final.arrears)}</dd>
              </div>
            )}
            <div>
              <dt>Projected net wealth</dt>
              <dd>{money(final.net)}</dd>
            </div>
          </dl>
          <div className="budget-table-scroll">
            <table className="loan-table">
              <caption>Each loan’s projected finish · {selected.name}</caption>
              <thead>
                <tr>
                  <th>Loan</th>
                  <th>First month payment incl. fees</th>
                  <th>Loan cleared</th>
                  <th>Debt at finish</th>
                </tr>
              </thead>
              <tbody>
                {plan.loans.map((loan) => (
                  <tr key={loan.id}>
                    <th>{loan.name}</th>
                    <td>{money(selected.firstPayments[loan.id] ?? 0)}</td>
                    <td>
                      {selected.paidOff[loan.id] === 0
                        ? "At start"
                        : when(selected.paidOff[loan.id] ?? null)}
                    </td>
                    <td>{money(selected.remaining[loan.id])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="budget-panel">
          <h3>Monthly schedule for {selected.name}</h3>
          <p className="budget-help">
            Payments, rental cash flow and remaining debt for this scenario.
            Month 0 shows any upfront principal payment.
          </p>
          <details className="loan-decision-schedule">
            <summary>View scenario’s monthly numbers</summary>
            <div className="budget-table-scroll">
              <table className="loan-table">
                <caption>
                  {selected.name} · {plan.currency}
                </caption>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Paid to loans</th>
                    <th>Fees</th>
                    <th>Net rent</th>
                    <th>Debt</th>
                    <th>Liquid cash</th>
                    <th>Funding gap</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.rows.slice(0, visible + 1).map((row) => (
                    <tr key={row.month}>
                      <th>{row.month}</th>
                      <td>{money(row.paid)}</td>
                      <td>{money(row.fees)}</td>
                      <td>{money(row.rent)}</td>
                      <td>{money(row.debt)}</td>
                      <td>{money(row.liquid)}</td>
                      <td>{money(row.shortfall)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visible < plan.horizon && (
              <button
                type="button"
                onClick={() =>
                  setVisible((v) => Math.min(plan.horizon, v + 12))
                }
              >
                Show 12 more scenario months
              </button>
            )}
          </details>
        </section>
        <section className="budget-panel">
          <h3>Interest and fees over the same timeline</h3>
          <p className="budget-help">
            Borrowing costs only. The net-wealth chart also includes rental
            income, retained asset value and cash. A lower interest bill alone
            does not establish a better overall outcome.
          </p>
          <div
            className="loan-cost-chart"
            role="img"
            aria-label="Borrowing cost comparison; amounts listed for every scenario"
          >
            {scenarios.map((s) => (
              <div key={s.id}>
                <div>
                  <span>{s.name}</span>
                  <strong>
                    {s.error ? "Needs review" : money(s.interest + s.fees)}
                  </strong>
                </div>
                {!s.error && (
                  <div className="loan-cost-track">
                    <span
                      style={{
                        width: `${((s.interest + s.fees) / maxCost) * 100}%`,
                      }}
                    />
                  </div>
                )}
                {s.error && <p>{s.error}</p>}
                {s.fundingGap > 1e-7 && (
                  <p>
                    Unfunded payments: {money(s.fundingGap)}. This scenario
                    needs more cash.
                  </p>
                )}
              </div>
            ))}
          </div>
          <details className="loan-decision-method">
            <summary>Assumptions and what these charts leave out</summary>
            <p>
              All paths start with the same assets, spare savings and debt.
              Spare savings are separate from emergency money. The EMI-only
              baseline retains surplus as cash; other scenarios prepay eligible
              highest effective-rate loans and retain any excess cash. Released
              EMIs continue within the same monthly commitment. Cash earns the
              entered after-tax cash rate; this is separate from
              investment-return alternatives below.
            </p>
            <p>
              Rental income is adjusted for vacancy and entered monthly
              costs/taxes. Rent growth affects gross rent; running costs are
              held constant. Income marked as already included is not counted
              twice and is removed from funding if the asset is sold. Sale
              scenarios settle the selected linked loan first and use only the
              remaining sale proceeds; spare savings remain untouched. A sale is
              blocked if its linked loan is locked or proceeds cannot cover
              settlement.
            </p>
            <p>
              Net wealth = liquid cash + retained asset market values +
              protected emergency/reserve savings − debt − unpaid operating
              costs. Retained asset values are before any future sale
              costs/taxes. Enter sale-tax estimates yourself; no
              country-specific tax rules, changing loan rates or future
              unexpected expenses are inferred. Replacement monthly costs
              entered for an asset apply only if it is sold. Forecasts are
              illustrations, not instructions to sell, keep or invest.
            </p>
          </details>
        </section>
      </details>
    </section>
  );
}
