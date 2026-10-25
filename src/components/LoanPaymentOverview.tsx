import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { cashFlow, simulate, type LoanPlan } from "../loans/model";
import {
  loanPaymentTimeline,
  type AmountPoint,
} from "../loans/paymentTimeline";

function dateLabel(firstMonth: string, paymentMonth: number) {
  const [year, month] = firstMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + Math.max(0, paymentMonth - 1), 1);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function TimeAmountGraph({
  points,
  firstMonth,
  title,
  lineLabel,
  currency,
  money,
  showInvested = false,
  showInstallments = false,
}: {
  points: AmountPoint[];
  firstMonth: string;
  title: string;
  lineLabel: string;
  currency: string;
  money: (value: number) => string;
  showInvested?: boolean;
  showInstallments?: boolean;
}) {
  const id = useId(),
    svg = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(640),
    [cursor, setCursor] = useState<number | null>(null),
    [showTooltip, setShowTooltip] = useState(false);
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setWidth(Math.max(260, element.getBoundingClientRect().width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const end = points.length - 1,
    active = Math.min(cursor ?? end, end);
  const high =
    Math.max(
      1,
      ...points.flatMap((point) => [point.amount, point.invested ?? 0]),
    ) * 1.08;
  const x = (month: number) => 76 + (month / Math.max(1, end)) * (width - 94);
  const y = (amount: number) => 225 - (amount / high) * 190;
  const explorePoint = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const plotX = ((event.clientX - bounds.left) / bounds.width) * width;
    const plotY = ((event.clientY - bounds.top) / bounds.height) * 294;
    if (plotX < 76 || plotX > width - 18 || plotY < 35 || plotY > 225) {
      setShowTooltip(false);
      return;
    }
    setCursor(
      Math.max(
        0,
        Math.min(end, Math.round(((plotX - 76) / (width - 94)) * end)),
      ),
    );
    setShowTooltip(true);
  };
  const line = (field: "amount" | "invested") =>
    points
      .map(
        (point, index) =>
          `${index ? "L" : "M"}${x(index).toFixed(2)},${y(point[field] ?? 0).toFixed(2)}`,
      )
      .join(" ");
  const short = (value: number) =>
    new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      notation: value >= 1e12 ? "scientific" : "compact",
      maximumFractionDigits: 1,
    }).format(value);
  return (
    <figure className="loan-decision-chart loan-time-chart">
      <h3>{title}</h3>
      <div className="loan-time-plot">
        <svg
          ref={svg}
          viewBox={`0 0 ${width} 294`}
          role="img"
          aria-labelledby={`${id}-title ${id}-description`}
          onPointerMove={explorePoint}
          onPointerDown={explorePoint}
          onPointerLeave={(event) => {
            if (event.pointerType !== "touch") setShowTooltip(false);
          }}
          onPointerCancel={() => setShowTooltip(false)}
        >
          <title id={`${id}-title`}>{title}</title>
          <desc id={`${id}-description`}>
            Time is the horizontal axis and amount in {currency} is the vertical
            axis. {lineLabel} at {dateLabel(firstMonth, end)}:{" "}
            {money(points[end].amount)}.
          </desc>
          <text x="0" y="16" className="loan-axis-name">
            Amount ({currency})
          </text>
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
            <g key={fraction}>
              <line
                x1="76"
                x2={width - 18}
                y1={y(high * fraction)}
                y2={y(high * fraction)}
                className="loan-decision-grid"
              />
              <text x="66" y={y(high * fraction) + 4} textAnchor="end">
                {short(high * fraction)}
              </text>
            </g>
          ))}
          {[...new Set([0, Math.round(end / 2), end])].map((month) => (
            <text
              key={month}
              x={x(month)}
              y="251"
              textAnchor={
                month === 0 ? "start" : month === end ? "end" : "middle"
              }
            >
              {dateLabel(firstMonth, month)}
            </text>
          ))}
          <text
            x={(76 + width - 18) / 2}
            y="280"
            textAnchor="middle"
            className="loan-axis-name"
          >
            Time
          </text>
          {showInvested && (
            <path d={line("invested")} className="loan-decision-baseline" />
          )}
          <path d={line("amount")} className="loan-decision-line" />
          <line
            x1={x(active)}
            x2={x(active)}
            y1="35"
            y2="225"
            className="loan-decision-marker"
          />
          <circle
            cx={x(active)}
            cy={y(points[active].amount)}
            r="4"
            className="loan-decision-dot"
          />
        </svg>
        {showTooltip && (
          <div
            className="loan-time-tooltip"
            role="tooltip"
            style={active > end / 2 ? { right: 8 } : { left: 8 }}
          >
            <strong>
              {active === 0 ? "Before " : ""}
              {dateLabel(firstMonth, active)}
            </strong>
            <div>
              <span>{lineLabel}</span>
              <b>{money(points[active].amount)}</b>
            </div>
            {showInstallments && (
              <div>
                <span>Installments paid</span>
                <b>
                  {points[active].month} of {points[end].month}
                </b>
              </div>
            )}
            {points[active].balance !== undefined && (
              <div>
                <span>Remaining balance</span>
                <b>{money(points[active].balance)}</b>
              </div>
            )}
            {showInvested && (
              <div>
                <span>Money invested</span>
                <b>{money(points[active].invested ?? 0)}</b>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="loan-decision-legend">
        <span>
          <i />
          {lineLabel}
        </span>
        {showInvested && (
          <span>
            <i />
            Money invested
          </span>
        )}
      </div>
      <label className="loan-decision-slider">
        <span>Explore {title} by month</span>
        <input
          type="range"
          min="0"
          max={end}
          step="1"
          value={active}
          aria-valuetext={`${dateLabel(firstMonth, active)}: ${money(points[active].amount)}${showInstallments ? `; ${points[active].month} of ${points[end].month} installments paid` : ""}${points[active].balance !== undefined ? `; remaining balance ${money(points[active].balance)}` : ""}`}
          onChange={(event) => {
            setCursor(Number(event.target.value));
            setShowTooltip(true);
          }}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
        />
      </label>
      <figcaption aria-live="polite">
        {active === 0 ? "Before " : ""}
        {dateLabel(firstMonth, active)}:{" "}
        <strong>{money(points[active].amount)}</strong>
        {showInstallments && (
          <span>
            Installments paid: {points[active].month} of {points[end].month}
          </span>
        )}
        {points[active].balance !== undefined && (
          <span>Remaining balance: {money(points[active].balance)}</span>
        )}
        {showInvested && (
          <span>Money invested: {money(points[active].invested ?? 0)}</span>
        )}
      </figcaption>
    </figure>
  );
}

export function LoanPaymentOverview({
  plan,
  money,
  onReturnChange,
  showInvestmentOutlook = true,
}: {
  plan: LoanPlan;
  money: (value: number) => string;
  onReturnChange: (value: number) => void;
  showInvestmentOutlook?: boolean;
}) {
  const investment = simulate(plan, "invest"),
    cash = cashFlow(plan);
  let invested = 0;
  const investmentPoints: AmountPoint[] = [
    { month: 0, amount: 0, invested: 0 },
    ...investment.rows.map((row) => ({
      month: row.month,
      amount: row.portfolio,
      invested: (invested += row.invested),
    })),
  ];
  return (
    <>
      <div className="loan-decision-intro">
        <h2>Each loan. Every payment. One timeline.</h2>
        <p>
          Time runs along the bottom. The line shows the total paid toward each
          loan, including principal and interest.
        </p>
      </div>
      <section className="loan-per-loan" aria-label="Loan payment timelines">
        <div className="loan-per-loan-grid">
          {plan.loans
            .filter(
              (loan) => loan.balance > 0 || (loan.originalAmount ?? 0) > 0,
            )
            .map((loan) => {
              const timeline = loanPaymentTimeline(loan, plan.start);
              return (
                <article
                  className="budget-panel loan-individual loan-payment-card"
                  key={loan.id}
                >
                  <p className="budget-help">
                    {dateLabel(timeline.firstMonth, 1)} →{" "}
                    {dateLabel(timeline.firstMonth, timeline.points.length - 1)}{" "}
                    · {money(timeline.emi)} per month
                  </p>
                  <TimeAmountGraph
                    points={timeline.points}
                    firstMonth={timeline.firstMonth}
                    title={loan.name}
                    lineLabel="Total paid"
                    showInstallments
                    currency={plan.currency}
                    money={money}
                  />
                  <dl className="loan-calculated">
                    <div>
                      <dt>
                        {timeline.includesEarlierPayments
                          ? "Original loan amount"
                          : "Starting balance"}
                      </dt>
                      <dd>{money(timeline.principal)}</dd>
                    </div>
                    <div>
                      <dt>Interest over this timeline</dt>
                      <dd>{money(timeline.totalInterest)}</dd>
                    </div>
                    <div>
                      <dt>Total paid at the end</dt>
                      <dd>{money(timeline.totalPaid)}</dd>
                    </div>
                  </dl>
                  <p className="budget-help">
                    {timeline.includesEarlierPayments
                      ? "Full scheduled loan: includes earlier EMIs, assuming all payments are made regularly at this rate."
                      : "Payments from the comparison month onward. Earlier payments are not included."}
                  </p>
                  {timeline.remaining > 0 && (
                    <p className="loan-warning">
                      {money(timeline.remaining)} still owed at the 600-month
                      model limit. This EMI does not clear the loan within the
                      timeline.
                    </p>
                  )}
                </article>
              );
            })}
        </div>
      </section>
      {showInvestmentOutlook && (
        <section
          className="budget-panel loan-investment-outlook"
          aria-labelledby="loan-investment-title"
        >
          <h2 id="loan-investment-title">
            What could the money left over become?
          </h2>
          <p className="budget-help">
            From {dateLabel(plan.start, 1)}, pay regular EMIs first, then invest
            the remaining monthly money. As a loan finishes, its released EMI
            becomes available to invest.
          </p>
          <label className="budget-field loan-return-field">
            <span>Expected annual investment return (%)</span>
            <input
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
          </label>
          <dl className="loan-calculated">
            <div>
              <dt>First month invested</dt>
              <dd>{money(investment.rows[0]?.invested ?? 0)}</dd>
            </div>
            <div>
              <dt>Total money invested</dt>
              <dd>{money(investment.contributed)}</dd>
            </div>
            <div>
              <dt>Projected final value</dt>
              <dd data-testid="loan-investment-final">
                {money(investment.portfolio)}
              </dd>
            </div>
          </dl>
          <TimeAmountGraph
            points={investmentPoints}
            firstMonth={plan.start}
            title="Your investments after EMIs"
            lineLabel="Investment value"
            currency={plan.currency}
            money={money}
            showInvested
          />
          <p className="budget-help">
            Initial monthly money: {money(cash.totalFunding)}, including
            additional asset earnings. The projection ends{" "}
            {dateLabel(plan.start, plan.horizon)}, at the latest loan ending.
            Uses {plan.returns}% assumed annual return and {plan.investmentFee}%
            annual investment fees. Estimated final gains tax:{" "}
            {money(investment.investmentTax)}. Returns are not guaranteed.
          </p>
          {investment.fundingGap > 0 && (
            <p className="loan-warning">
              Some future EMIs or asset running costs are not funded. Review
              your budget and earnings assumptions; the loan payment graphs
              assume regular EMIs.
            </p>
          )}
        </section>
      )}
    </>
  );
}
