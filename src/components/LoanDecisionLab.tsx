import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { compareDecisions, netRent, type Decision } from "../loans/decisions";
import { protectedSavingsAt, type LoanPlan } from "../loans/model";
import { LoanPaymentOverview } from "./LoanPaymentOverview";
import { InfoTooltip } from "./InfoTooltip";

type Field = "net" | "debt" | "liquid";
type Path = { decision: Decision; color: string; label: string };
const colors = ["#176b52", "#467cbd", "#ad7131"];
const chartLabels: Record<Field, string> = {
  net: "Total wealth",
  debt: "Loan balance",
  liquid: "Cash & investments",
};

function ChoiceIcon({ kind }: { kind: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      {kind === 0 ? (
        <>
          <path d="M3 18 9 12l4 3 8-11M15 4h6v6" />
          <path d="M4 21h16" />
        </>
      ) : kind === 1 ? (
        <>
          <path d="m14 3-9 11h6l-1 7 9-12h-6l1-6Z" />
        </>
      ) : (
        <>
          <path d="m3 11 9-8 9 8M6 9v12h12V9M10 21v-7h4v7" />
        </>
      )}
    </svg>
  );
}

function OutcomeChart({
  paths,
  selectedId,
  plan,
  money,
  when,
}: {
  paths: Path[];
  selectedId: string;
  plan: LoanPlan;
  money: (n: number) => string;
  when: (n: number | null) => string;
}) {
  const svg = useRef<SVGSVGElement>(null),
    id = useId();
  const [width, setWidth] = useState(700),
    [field, setField] = useState<Field>("net");
  const [month, setMonth] = useState<number | null>(null),
    [hover, setHover] = useState(false);
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setWidth(Math.max(260, el.getBoundingClientRect().width)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const end = plan.horizon,
    active = Math.min(month ?? end, end);
  const values = paths.flatMap(({ decision }) =>
    decision.rows.map((row) => row[field]),
  );
  const min = Math.min(...values),
    max = Math.max(...values);
  const padding = Math.max(1, (max - min) * 0.08);
  const low = field === "debt" ? 0 : min - padding,
    high = max + padding;
  const x = (m: number) => 76 + (m / Math.max(1, end)) * (width - 98);
  const y = (n: number) => 260 - ((n - low) / Math.max(1, high - low)) * 224;
  const short = (n: number) =>
    new Intl.NumberFormat(plan.currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: plan.currency,
      notation: Math.abs(n) >= 1e12 ? "scientific" : "compact",
      maximumFractionDigits: 1,
    }).format(n);
  const line = (decision: Decision) =>
    decision.rows
      .map(
        (row, i) =>
          `${i ? "L" : "M"}${x(row.month).toFixed(2)},${y(row[field]).toFixed(2)}`,
      )
      .join(" ");
  const explore = (event: PointerEvent<SVGSVGElement>) => {
    const b = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - b.left) / b.width) * width;
    const py = ((event.clientY - b.top) / b.height) * 314;
    if (px < 76 || px > width - 22 || py < 36 || py > 260) {
      setHover(false);
      return;
    }
    setMonth(
      Math.max(0, Math.min(end, Math.round(((px - 76) / (width - 98)) * end))),
    );
    setHover(true);
  };
  const highlighted =
    paths.find((path) => path.decision.id === selectedId) ?? paths[0];
  return (
    <figure className="loan-outcome-chart">
      <div className="loan-outcome-chart-header">
        <div className="loan-chart-heading">
          <h3>Your choices, over time</h3>
          <InfoTooltip label="Explain comparison chart">
            All lines use the same starting wealth, monthly budget and finish
            date. Total wealth includes cash, investments after estimated gains
            tax, retained assets and protected savings, minus loans and unpaid
            costs. Money used to repay loans is not also invested. Asset sales
            remove the asset and its earnings and deduct entered selling costs
            and taxes.
          </InfoTooltip>
        </div>
        <div className="loan-chart-tabs" role="group" aria-label="Chart amount">
          {(["net", "debt", "liquid"] as Field[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={field === key}
              onClick={() => setField(key)}
            >
              {chartLabels[key]}
            </button>
          ))}
        </div>
      </div>
      <p className="budget-help">
        {field === "debt"
          ? "Lower means less debt. Zero means your loans are cleared."
          : field === "net"
            ? "Higher means more projected wealth, after debt and entered costs."
            : "Investments after gains tax, plus spare cash. Property values are separate."}
      </p>
      <div className="loan-time-plot">
        <svg
          ref={svg}
          viewBox={`0 0 ${width} 314`}
          role="img"
          aria-labelledby={`${id}-title ${id}-desc`}
          onPointerMove={explore}
          onPointerDown={explore}
          onPointerLeave={(event) => {
            if (event.pointerType !== "touch") setHover(false);
          }}
          onPointerCancel={() => setHover(false)}
        >
          <title id={`${id}-title`}>
            {chartLabels[field]} for your repayment choices
          </title>
          <desc id={`${id}-desc`}>
            Time runs horizontally and amount in {plan.currency} vertically.{" "}
            {paths
              .map(
                (path) =>
                  `${path.label}: ${money(path.decision.rows.at(-1)![field])} at the finish.`,
              )
              .join(" ")}
          </desc>
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0"
                stopColor={highlighted.color}
                stopOpacity=".16"
              />
              <stop
                offset="1"
                stopColor={highlighted.color}
                stopOpacity=".01"
              />
            </linearGradient>
          </defs>
          <text x="0" y="16" className="loan-axis-name">
            Amount ({plan.currency})
          </text>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line
                x1="76"
                x2={width - 22}
                y1={y(low + (high - low) * f)}
                y2={y(low + (high - low) * f)}
                className="loan-decision-grid"
              />
              <text x="65" y={y(low + (high - low) * f) + 4} textAnchor="end">
                {short(low + (high - low) * f)}
              </text>
            </g>
          ))}
          {[...new Set([0, Math.round(end / 2), end])].map((m) => (
            <text
              key={m}
              x={x(m)}
              y="286"
              textAnchor={m === 0 ? "start" : m === end ? "end" : "middle"}
            >
              {m === 0 ? "Now" : when(m)}
            </text>
          ))}
          <text x={(76 + width - 22) / 2} y="309" textAnchor="middle">
            Time
          </text>
          <path
            d={`${line(highlighted.decision)} L${x(end)},260 L76,260 Z`}
            fill={`url(#${id}-fill)`}
          />
          {paths.map((path) => (
            <path
              key={path.decision.id}
              d={line(path.decision)}
              fill="none"
              stroke={path.color}
              strokeWidth={selectedId === path.decision.id ? 3.5 : 2.2}
              strokeDasharray={
                path.decision.id === selectedId ? undefined : "6 4"
              }
            />
          ))}
          <line
            x1={x(active)}
            x2={x(active)}
            y1="36"
            y2="260"
            className="loan-decision-marker"
          />
          {paths.map((path) => (
            <circle
              key={path.decision.id}
              cx={x(active)}
              cy={y(path.decision.rows[active][field])}
              r="4.5"
              fill={path.color}
              stroke="white"
              strokeWidth="2"
            />
          ))}
        </svg>
        {hover && (
          <div
            className="loan-time-tooltip loan-outcome-tooltip"
            role="tooltip"
            style={active > end / 2 ? { right: 8 } : { left: 8 }}
          >
            <strong>
              {active === 0 ? "At the start" : when(active)} · Month {active}
            </strong>
            {paths.map((path) => (
              <div key={path.decision.id}>
                <span>
                  <i style={{ background: path.color }} />
                  {path.label}
                </span>
                <b>{money(path.decision.rows[active][field])}</b>
              </div>
            ))}
          </div>
        )}
      </div>
      <label className="loan-outcome-scrubber">
        <span>
          Explore month {active} of {end}
        </span>
        <input
          type="range"
          min="0"
          max={end}
          value={active}
          aria-valuetext={`Month ${active}. ${paths.map((path) => `${path.label}: ${money(path.decision.rows[active][field])}`).join(". ")}`}
          onChange={(e) => {
            setMonth(Number(e.target.value));
            setHover(true);
          }}
          onFocus={() => setHover(true)}
          onBlur={() => setHover(false)}
        />
      </label>
      <figcaption className="loan-outcome-readout" aria-live="polite">
        {paths.map((path) => (
          <div key={path.decision.id}>
            <span>
              <i style={{ background: path.color }} />
              {path.label}
            </span>
            <strong>{money(path.decision.rows[active][field])}</strong>
          </div>
        ))}
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
  const [choice, setChoice] = useState("invest"),
    [assetId, setAssetId] = useState("");
  const [visible, setVisible] = useState(12);
  useEffect(() => setVisible(12), [choice, assetId, plan.horizon]);
  const assets = plan.assets ?? [],
    saleId = assets.some((asset) => asset.id === assetId)
      ? assetId
      : assets[0]?.id;
  const invest = scenarios.find((s) => s.id === "invest"),
    repay = scenarios.find((s) => s.id === "repay-invest");
  const sale = scenarios.find((s) => s.id === `sell-${saleId}`);
  if (!invest || !repay) return null;
  const options = [
    {
      key: "invest",
      title: "Pay EMIs + invest",
      label: "Invest surplus",
      description: "Keep regular EMIs. Put extra money into investments.",
      decision: invest,
    },
    {
      key: "repay",
      title: "Clear loans faster",
      label: "Repay faster",
      description: "Pay EMIs + extra. Invest the money released after payoff.",
      decision: repay,
    },
    {
      key: "sell",
      title: "Sell, repay + invest",
      label: "Sell & invest",
      description:
        "Sell one asset, clear eligible debt and invest the remainder.",
      decision: sale,
    },
  ];
  const selectedOption =
    options.find((option) => option.key === choice) ?? options[0];
  const selected = selectedOption.decision;
  const paths: Path[] = options
    .filter((option) => option.decision && !option.decision.error)
    .map((option) => ({
      decision: option.decision!,
      label: option.label,
      color: colors[options.indexOf(option)],
    }));
  const final = selected && !selected.error ? selected.rows.at(-1)! : null;
  const baseline = invest.rows.at(-1)!;
  const valid = paths.filter((path) => path.decision.fundingGap < 1e-7);
  const bestNet = Math.max(
    ...valid.map((path) => path.decision.rows.at(-1)!.net),
  );
  const selectedAsset = assets.find((asset) => asset.id === saleId);
  const cashInvestedFromSale =
    sale?.investment?.contributed !== undefined
      ? sale.rows[0].liquid - (plan.lumpSum ?? 0)
      : 0;
  return (
    <section className="loan-decision-lab loan-choice-workspace">
      <section
        className="budget-panel loan-choice-panel"
        aria-labelledby="loan-choices-title"
      >
        <header className="loan-choice-header">
          <div>
            <p className="budget-eyebrow">YOUR MONEY. THREE POSSIBILITIES.</p>
            <h2 id="loan-choices-title">Choose how your money works.</h2>
            <p className="budget-help">
              Same monthly budget. Same finish date: {when(plan.horizon)}.
            </p>
          </div>
          <div className="loan-choice-return">
            <span className="loan-return-badge">
              Expected investment return
            </span>
            <label>
              <span className="loan-sr-only">Expected annual return (%)</span>
              <input
                aria-label="Expected annual return (%)"
                type="number"
                min={-99}
                max={100}
                step="any"
                inputMode="decimal"
                value={plan.returns}
                onChange={(event) => {
                  if (Number.isFinite(event.target.valueAsNumber))
                    onReturnChange(
                      Math.max(-99, Math.min(100, event.target.valueAsNumber)),
                    );
                }}
              />
              <span>% / year</span>
            </label>
            <InfoTooltip label="Explain expected investment return">
              Starts at 12% for a new plan. Change this assumption for all three
              paths. Growth is applied monthly before month-end contributions,
              after your entered annual investment fee. Money used to repay
              loans earns no investment return. Released money can be invested
              after payoff. Returns are not guaranteed.
            </InfoTooltip>
            <small className="loan-return-effective">
              {Number(
                (
                  (1 + plan.returns / 100) *
                    (1 - plan.investmentFee / 100) *
                    100 -
                  100
                ).toFixed(2),
              )}
              % after annual fees · {plan.gainsTax}% gains tax
            </small>
          </div>
        </header>
        <div
          className="loan-choice-cards"
          role="group"
          aria-label="Choose your money strategy"
        >
          {options.map((option, index) => {
            const end =
              option.decision && !option.decision.error
                ? option.decision.rows.at(-1)!
                : null;
            const projectedBest =
              end &&
              option.decision!.fundingGap < 1e-7 &&
              Math.abs(end.net - bestNet) < 0.5;
            return (
              <button
                type="button"
                key={option.key}
                className={`loan-choice-card ${choice === option.key ? "is-active" : ""}`}
                aria-pressed={choice === option.key}
                onClick={() => setChoice(option.key)}
                style={
                  { "--choice-color": colors[index] } as React.CSSProperties
                }
              >
                <span className="loan-choice-card-top">
                  <span className="loan-choice-icon">
                    <ChoiceIcon kind={index} />
                  </span>
                  <span className="loan-choice-number">0{index + 1}</span>
                </span>
                <h3>{option.title}</h3>
                <p>{option.description}</p>
                {end ? (
                  <>
                    <span className="loan-choice-metric-label">
                      Projected total wealth
                    </span>
                    <strong>{money(end.net)}</strong>
                    <small>
                      {option.decision!.fundingGap > 1e-7
                        ? "Needs more monthly funding"
                        : projectedBest
                          ? "Highest projected wealth"
                          : "At the same finish date"}
                    </small>
                    <small>Assumed return: {plan.returns}% / year</small>
                  </>
                ) : (
                  <span className="loan-choice-unavailable">
                    {option.decision?.error
                      ? "Sale needs review"
                      : "Add an asset to explore"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {choice === "sell" && (
          <div className="loan-sale-settings">
            {!assets.length ? (
              <p>Add an asset in your loan inputs to compare selling it.</p>
            ) : (
              <>
                {assets.length > 1 ? (
                  <label className="budget-field">
                    <span>Which asset would you sell?</span>
                    <select
                      value={saleId}
                      aria-label="Asset to sell"
                      onChange={(event) => setAssetId(event.target.value)}
                    >
                      {assets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <strong>Selling: {selectedAsset?.name}</strong>
                )}
                {sale?.error ? (
                  <p className="loan-warning" role="alert">
                    {sale.error}
                  </p>
                ) : (
                  sale && (
                    <dl className="loan-sale-flow">
                      <div>
                        <dt>Loan principal cleared today</dt>
                        <dd>{money(sale.initialPayment)}</dd>
                      </div>
                      <div>
                        <dt>Invested from sale today</dt>
                        <dd>{money(Math.max(0, cashInvestedFromSale))}</dd>
                      </div>
                      <div>
                        <dt>Asset net earnings stop</dt>
                        <dd>
                          {money(selectedAsset ? netRent(selectedAsset) : 0)} /
                          month
                        </dd>
                      </div>
                    </dl>
                  )
                )}
                <InfoTooltip label="Explain the asset sale">
                  Selling costs and entered sale taxes are deducted first. The
                  linked loan is settled, then proceeds repay other eligible
                  loans. Remaining sale proceeds are invested today. Monthly
                  surplus is invested after regular EMIs. The sold asset no
                  longer counts toward wealth or earns income; replacement costs
                  are included. Spare savings stay separate.
                </InfoTooltip>
              </>
            )}
          </div>
        )}
        {final && selected && (
          <div className="loan-selected-summary">
            <div>
              <span>Loans cleared</span>
              <strong>
                {selected.debtFree === 0
                  ? "Today"
                  : selected.debtFree === null
                    ? "Beyond timeline"
                    : when(selected.debtFree)}
              </strong>
            </div>
            <div>
              <span>Loan interest + fees</span>
              <strong>{money(selected.interest + selected.fees)}</strong>
            </div>
            <div>
              <span>Investments after tax</span>
              <strong>
                {money(
                  (selected.investment?.value ?? 0) -
                    (selected.investment?.tax ?? 0),
                )}
              </strong>
            </div>
            <div>
              <span>
                {choice === "invest"
                  ? "Wealth vs repaying faster"
                  : "Wealth vs investing surplus"}
              </span>
              <strong className="loan-wealth-difference">
                {money(
                  final.net -
                    (choice === "invest"
                      ? repay.rows.at(-1)!.net
                      : baseline.net),
                )}
              </strong>
            </div>
          </div>
        )}
        {selected && selected.fundingGap > 1e-7 && (
          <p className="loan-warning" role="alert">
            This path has {money(selected.fundingGap)} of unfunded payments.
            Increase the budget or review asset earnings and costs before
            treating it as affordable.
          </p>
        )}
        <OutcomeChart
          paths={paths}
          selectedId={selected?.id ?? invest.id}
          plan={plan}
          money={money}
          when={when}
        />
        <p className="loan-choice-footnote">
          Projections include {plan.investmentFee}% annual investment fees and{" "}
          {plan.gainsTax}% gains tax. Returns are assumptions, not guarantees.
        </p>
        <details className="loan-choice-details">
          <summary>See the calculation breakdown</summary>
          <p>
            Both paths use your actual loan rates and the same monthly money.
            Loan interest is included in payments; it is not deducted a second
            time from the final wealth.
          </p>
          <div className="budget-table-scroll">
            <table className="loan-table">
              <caption>
                From payments to projected wealth · {plan.horizon} months
              </caption>
              <thead>
                <tr>
                  <th>Calculation</th>
                  {paths.map((path) => (
                    <th key={path.decision.id}>{path.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Loan interest paid</th>
                  {paths.map((path) => (
                    <td key={path.decision.id}>
                      {money(path.decision.interest)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>Loan prepayment fees</th>
                  {paths.map((path) => (
                    <td key={path.decision.id}>{money(path.decision.fees)}</td>
                  ))}
                </tr>
                <tr>
                  <th>Money invested</th>
                  {paths.map((path) => (
                    <td key={path.decision.id}>
                      {money(path.decision.investment?.contributed ?? 0)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>Investment growth after annual fees</th>
                  {paths.map((path) => (
                    <td key={path.decision.id}>
                      {money(
                        (path.decision.investment?.value ?? 0) -
                          (path.decision.investment?.contributed ?? 0),
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>Tax on investment gains</th>
                  {paths.map((path) => (
                    <td key={path.decision.id}>
                      {money(path.decision.investment?.tax ?? 0)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>Cash + investments after tax</th>
                  {paths.map((path) => (
                    <td key={path.decision.id}>
                      {money(path.decision.rows.at(-1)!.liquid)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>Assets kept</th>
                  {paths.map((path) => (
                    <td key={path.decision.id}>
                      {money(path.decision.rows.at(-1)!.assetValue)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>Protected savings</th>
                  {paths.map((path) => (
                    <td key={path.decision.id}>
                      {money(protectedSavingsAt(plan, plan.horizon))}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>Remaining debt + unpaid costs</th>
                  {paths.map((path) => (
                    <td key={path.decision.id}>
                      {money(
                        path.decision.rows.at(-1)!.debt +
                          path.decision.rows.at(-1)!.arrears,
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>Projected total wealth</th>
                  {paths.map((path) => (
                    <td key={path.decision.id}>
                      <strong>{money(path.decision.rows.at(-1)!.net)}</strong>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </details>
        <details className="loan-choice-details">
          <summary>How the comparison works</summary>
          <p>
            Total wealth = cash + investments after estimated gains tax + assets
            kept + protected savings − debt − unpaid costs. Each path uses the
            same monthly budget and end date. Loan interest saved and investment
            growth are already included; neither is added twice. Retained asset
            prices are before future selling costs. Sale paths deduct the
            entered costs and taxes and remove future earnings. This comparison
            illustrates choices rather than recommending a sale.
          </p>
        </details>
        {selected && !selected.error && (
          <details className="loan-choice-details">
            <summary>Monthly numbers · {selectedOption.title}</summary>
            <div className="budget-table-scroll">
              <table className="loan-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Loan payments</th>
                    <th>Fees</th>
                    <th>Asset earnings</th>
                    <th>Debt left</th>
                    <th>Cash + investments after tax</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.rows.slice(0, visible + 1).map((row) => (
                    <tr key={row.month}>
                      <th>{row.month === 0 ? "Today" : when(row.month)}</th>
                      <td>{money(row.paid)}</td>
                      <td>{money(row.fees)}</td>
                      <td>{money(row.rent)}</td>
                      <td>{money(row.debt)}</td>
                      <td>{money(row.liquid)}</td>
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
                Show 12 more months
              </button>
            )}
          </details>
        )}
      </section>
      <details className="loan-choice-details loan-individual-details">
        <summary>Explore each loan’s payments</summary>
        <LoanPaymentOverview
          plan={plan}
          money={money}
          onReturnChange={onReturnChange}
          showInvestmentOutlook={false}
        />
      </details>
    </section>
  );
}
