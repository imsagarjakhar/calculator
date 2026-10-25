import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { compareDecisions, netRent } from "../loans/decisions";
import { simulate, type LoanPlan } from "../loans/model";
import { LoanPaymentOverview } from "./LoanPaymentOverview";
import { InfoTooltip } from "./InfoTooltip";

type ChartRow = { month: number; debt: number; net: number; liquid: number };
type ChartPath = { name: string; rows: ChartRow[] };

function InfoHelp({ label, text }: { label: string; text: string }) {
  return <InfoTooltip label={`Explain ${label}`}>{text}</InfoTooltip>;
}

function ScenarioChart({
  base,
  selected,
  field,
  title,
  currency,
  money,
  baselineLabel = "EMIs + keep surplus as cash",
  sliderLabel,
  when,
}: {
  base: ChartPath;
  selected: ChartPath;
  field: "debt" | "net" | "liquid";
  title: string;
  currency: string;
  money: (n: number) => string;
  baselineLabel?: string;
  sliderLabel?: string;
  when: (month: number | null) => string;
}) {
  const svg = useRef<SVGSVGElement>(null),
    id = useId();
  const [width, setWidth] = useState(640),
    [month, setMonth] = useState<number | null>(null),
    [showTooltip, setShowTooltip] = useState(false);
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
  const explore = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - bounds.left) / bounds.width) * width;
    const py = ((event.clientY - bounds.top) / bounds.height) * 255;
    if (px < 78 || px > width - 16 || py < 30 || py > 220) {
      setShowTooltip(false);
      return;
    }
    setMonth(
      Math.max(
        0,
        Math.min(length, Math.round(((px - 78) / (width - 94)) * length)),
      ),
    );
    setShowTooltip(true);
  };
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
      <div className="loan-chart-heading">
        <h3>{title}</h3>
        <InfoHelp
          label={title}
          text={
            field === "debt"
              ? `The amount still owed on all loans. A lower line means less debt; zero means the loans are cleared. Compare ${selected.name} with ${baselineLabel}, over the same timeline.`
              : field === "liquid"
                ? `Investments after the entered gains tax, plus spare cash. Compare ${selected.name} with ${baselineLabel}. Money paid toward loans does not also earn investment returns. Property values are excluded from this chart.`
                : "Cash plus the value of assets you keep and protected savings, minus debt and unpaid costs. A higher line means more projected wealth. Selling an asset removes its value and future earnings from this path."
          }
        />
      </div>
      <div className="loan-time-plot">
        <svg
          ref={svg}
          viewBox={`0 0 ${width} 255`}
          role="img"
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-desc`}
          onPointerMove={explore}
          onPointerDown={explore}
          onPointerLeave={(event) => {
            if (event.pointerType !== "touch") setShowTooltip(false);
          }}
          onPointerCancel={() => setShowTooltip(false)}
        >
          <title id={`${id}-title`}>{title}</title>
          <desc id={`${id}-desc`}>
            {selected.name} compared with {baselineLabel} over {length} months.
            At the end: {money(selected.rows.at(-1)![field])} versus{" "}
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
          <circle
            cx={x(active)}
            cy={y(base.rows[active][field])}
            r="4"
            className="loan-baseline-dot"
          />
        </svg>
        {showTooltip && (
          <div
            className="loan-time-tooltip"
            role="tooltip"
            style={active > length / 2 ? { right: 8 } : { left: 8 }}
          >
            <strong>
              {active === 0 ? "At the start" : when(active)} · Month {active}
            </strong>
            <div>
              <span>{selected.name}</span>
              <b>{money(selected.rows[active][field])}</b>
            </div>
            <div>
              <span>{baselineLabel}</span>
              <b>{money(base.rows[active][field])}</b>
            </div>
            <div>
              <span>
                {field === "debt"
                  ? "Less debt"
                  : field === "liquid"
                    ? "Amount difference"
                    : "Wealth difference"}
              </span>
              <b>
                {money(
                  field === "debt"
                    ? base.rows[active][field] - selected.rows[active][field]
                    : selected.rows[active][field] - base.rows[active][field],
                )}
              </b>
            </div>
          </div>
        )}
      </div>
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
          onChange={(e) => {
            setMonth(Number(e.target.value));
            setShowTooltip(true);
          }}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
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
  const [reference, setReference] = useState("minimum");
  const [visible, setVisible] = useState(12);
  useEffect(() => setVisible(12), [choice, plan.horizon]);
  const selected =
    scenarios.find((s) => s.id === choice && !s.error) ?? scenarios[1];
  const base =
    scenarios.find(
      (scenario) => scenario.id === reference && !scenario.error,
    ) ?? scenarios[0];
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
  const repay = simulate(plan, "avalanche"),
    invest = simulate(plan, "invest"),
    investmentAdvantage = invest.net - repay.net;
  return (
    <section className="loan-decision-lab">
      <LoanPaymentOverview
        plan={plan}
        money={money}
        onReturnChange={onReturnChange}
      />
      <section
        className="budget-panel loan-direct-comparison"
        aria-labelledby="loan-direct-comparison-title"
      >
        <div className="loan-chart-heading">
          <h2 id="loan-direct-comparison-title">Repay extra or invest it?</h2>
          <InfoHelp
            label="repayment versus investing"
            text="Both paths use the same monthly money, assets and finish date. One prepays eligible highest-interest loans, then invests released money. The other pays regular EMIs and invests the surplus from the start. Values include investment fees, entered gains tax, assets, cash and remaining debt. Interest saved is already reflected in wealth; it is not added again."
          />
        </div>
        <p className="budget-help">
          Same monthly money · {plan.horizon} months · {plan.returns}% assumed
          annual investment return
        </p>
        <dl className="loan-calculated">
          <div>
            <dt>Repay extra, then invest</dt>
            <dd>{money(repay.net)}</dd>
          </div>
          <div>
            <dt>Regular EMIs + invest surplus</dt>
            <dd>{money(invest.net)}</dd>
          </div>
          <div>
            <dt>
              {Math.abs(investmentAdvantage) < 0.5
                ? "Projected difference"
                : investmentAdvantage > 0
                  ? "Investing ends ahead by"
                  : "Extra repayment ends ahead by"}
            </dt>
            <dd>{money(Math.abs(investmentAdvantage))}</dd>
          </div>
        </dl>
        <p className="budget-help">
          Projected net wealth at {when(plan.horizon)}, after{" "}
          {plan.investmentFee}% annual investment fees and {plan.gainsTax}% tax
          on gains. Investment returns are assumptions, not guaranteed earnings.
        </p>
      </section>
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
          <h3>Repay, invest or keep cash?</h3>
          <label className="budget-field">
            <span>Your option</span>
            <select
              aria-label="Compare repayment scenario"
              value={selected.id}
              onChange={(e) => {
                const next = e.target.value;
                setChoice(next);
                setReference(
                  next === "invest"
                    ? "repay-invest"
                    : next === "repay-invest"
                      ? "invest"
                      : "minimum",
                );
              }}
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
          <label className="budget-field loan-reference-choice">
            <span>Compare against</span>
            <select
              aria-label="Comparison baseline"
              value={base.id}
              onChange={(event) => setReference(event.target.value)}
            >
              {scenarios
                .filter((scenario) =>
                  ["minimum", "repay-invest", "invest"].includes(scenario.id),
                )
                .map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </option>
                ))}
            </select>
          </label>
          <p className="budget-help">{selected.description}</p>
          {selected.investment ? (
            <div className="loan-scenario-return">
              <span className="loan-return-badge">
                Expected return · {plan.returns}% / year
              </span>
              <label className="budget-field">
                <span>Expected annual return (%)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={-99}
                  max={100}
                  step="any"
                  value={plan.returns}
                  onChange={(event) => {
                    if (Number.isFinite(event.target.valueAsNumber))
                      onReturnChange(
                        Math.max(
                          -99,
                          Math.min(100, event.target.valueAsNumber),
                        ),
                      );
                  }}
                />
              </label>
              <p className="budget-help">
                {selected.id === "repay-invest"
                  ? "Money paid toward loans earns no investment return. Only leftover money is invested; after payoff, the released monthly budget is invested."
                  : "Regular EMIs stay paid. Surplus is invested at month end instead of paying extra toward loans."}{" "}
                Includes {plan.investmentFee}% annual fees and {plan.gainsTax}%
                tax on gains. Returns are not guaranteed.
              </p>
              <dl className="loan-calculated">
                <div>
                  <dt>Total invested</dt>
                  <dd>{money(selected.investment.contributed)}</dd>
                </div>
                <div>
                  <dt>Projected investment value</dt>
                  <dd>{money(selected.investment.value)}</dd>
                </div>
                <div>
                  <dt>After gains tax</dt>
                  <dd>
                    {money(selected.investment.value - selected.investment.tax)}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="loan-comparison-basis">
              Your option keeps unused money as cash at {plan.cashReturn ?? 0}%
              annually. Comparing against: {base.name}.
            </p>
          )}
          <div className="loan-decision-stats">
            <div>
              <div className="loan-metric-label">
                Interest {interestSaved >= 0 ? "saved" : "added"}
                <InfoHelp
                  label="interest saved"
                  text={`Difference in loan interest compared with ${base.name}. This figure shows borrowing costs only. The wealth difference also accounts for investment growth given up while repaying, fees and entered tax.`}
                />
              </div>
              <strong data-testid="decision-interest-saved">
                {money(Math.abs(interestSaved))}
              </strong>
              <small>
                Loan interest only; extra fees {money(feeDifference)}
              </small>
            </div>
            <div>
              <div className="loan-metric-label">
                When loans finish
                <InfoHelp
                  label="when loans finish"
                  text="When all loans reach zero under this option. Cleared at start means the upfront payment covers all outstanding loans."
                />
              </div>
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
              <div className="loan-metric-label">
                Wealth difference
                <InfoHelp
                  label="wealth difference"
                  text={`Your option's projected net wealth minus ${base.name}, at the same finish date. Positive means your option ends ahead; negative means it ends behind. Money used for extra loan payments is not also invested. When comparing repayment with investing, forgone investment growth is included automatically; interest savings are not added twice.`}
                />
              </div>
              <strong data-testid="decision-net-difference">
                {money(final.net - baseline.net)}
              </strong>
              <small>
                At month {plan.horizon}, versus {base.name.toLowerCase()}
              </small>
              {selected.investment && base.investment && (
                <small>
                  Includes investment growth forgone while repaying loans.
                </small>
              )}
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
          {(selected.initialPayment > 0 || sale) && (
            <details className="loan-scenario-details">
              <summary>
                How upfront money and asset earnings are handled
              </summary>
              {selected.initialPayment > 0 && (
                <p className="loan-decision-note">
                  At the start: {money(selected.initialPayment)} applied to
                  principal and {money(selected.initialFees)} in
                  closure/prepayment fees. Unused cash remains in savings.
                  Locked loans receive no optional prepayment.
                </p>
              )}
              {sale && (
                <p className="loan-decision-note">
                  Sale proceeds after entered costs, taxes and linked-loan
                  settlement: {money(selected.saleProceeds)}. Net asset earnings
                  removed: {money(netRent(sale))} per month initially. The sold
                  asset has no remaining value in this scenario. Other assets
                  stay held; each sale is modeled independently.
                </p>
              )}
            </details>
          )}
          <div className="loan-decision-charts">
            {selected.investment && (
              <ScenarioChart
                base={base}
                selected={selected}
                field="liquid"
                title="Investments and cash over time"
                currency={plan.currency}
                money={money}
                when={when}
                sliderLabel="Explore investment month"
                baselineLabel={base.name}
              />
            )}
            <ScenarioChart
              base={base}
              selected={selected}
              field="debt"
              title="Loan balance over time"
              currency={plan.currency}
              money={money}
              when={when}
              baselineLabel={base.name}
            />
            <ScenarioChart
              base={base}
              selected={selected}
              field="net"
              title="Your total wealth over time"
              currency={plan.currency}
              money={money}
              when={when}
              baselineLabel={base.name}
            />
          </div>
          <dl className="loan-decision-ledger">
            <div>
              <dt>
                {selected.investment
                  ? "Cash & investments after tax at the finish"
                  : "Liquid cash at the finish"}
              </dt>
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
            Payments, asset earnings and remaining debt for this scenario. Month
            0 shows any upfront principal payment.
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
                    <th>Net earnings</th>
                    <th>Debt</th>
                    <th>Cash & investments after tax</th>
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
              baseline retains surplus as cash. The investment option pays
              regular EMIs and invests surplus at the selected expected return,
              after fees and entered gains tax. Other scenarios prepay eligible
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
