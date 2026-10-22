import { useEffect, useId, useRef, useState } from "react";
import type { projectSavings } from "../budget/model";

type Row = ReturnType<typeof projectSavings>[number];
export function BudgetGrowthChart({
  rows,
  flatRows,
  goal,
  currency,
  money,
  stepUp,
}: {
  rows: Row[];
  flatRows: Row[];
  goal: number;
  currency: string;
  money: (value: number) => string;
  stepUp: number;
}) {
  const id = useId();
  const chart = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const element = chart.current;
    if (!element) return;
    const measure = () =>
      setWidth(
        Math.max(240, Math.round(element.getBoundingClientRect().width)),
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const [explore, setExplore] = useState<number | null>(null);
  const months = rows.length - 1;
  const ticks = [
    ...new Set(
      (width < 400 ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1]).map((fraction) =>
        Math.round(months * fraction),
      ),
    ),
  ];
  const active = rows[Math.min(explore ?? months, months)];
  const max =
    Math.max(
      goal,
      ...rows.map((row) => Math.max(row.corpus, row.invested)),
      1,
    ) * 1.1;
  const x = (month: number) => 76 + (month / months) * (width - 92);
  const y = (value: number) => 242 - (value / max) * 212;
  const path = (data: Row[], field: "corpus" | "invested") =>
    data
      .map(
        (row, index) =>
          `${index ? "L" : "M"}${x(row.month).toFixed(2)},${y(row[field]).toFixed(2)}`,
      )
      .join(" ");
  const compact = (value: number) =>
    new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  return (
    <figure className="budget-growth-chart">
      <div className="budget-growth-chart-heading">
        <h3>Your money over time</h3>
        <span>
          {months} months · {currency}
        </span>
      </div>
      <svg
        ref={chart}
        viewBox={`0 0 ${width} 282`}
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
      >
        <title id={`${id}-title`}>Investment growth over {months} months</title>
        <desc id={`${id}-description`}>
          At month {months}: {money(rows[months].invested)} contributed
          including existing savings, {money(rows[months].corpus)} projected
          balance.{goal > 0 ? ` Goal ${money(goal)}.` : ""} Explore individual
          months using the slider below.
        </desc>
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
          <g key={fraction}>
            <line
              x1="76"
              x2={width - 16}
              y1={y(max * fraction)}
              y2={y(max * fraction)}
              className="budget-growth-grid"
            />
            <text x="66" y={y(max * fraction) + 4} textAnchor="end">
              {compact(max * fraction)}
            </text>
          </g>
        ))}
        {ticks.map((month) => (
          <text key={month} x={x(month)} y="270" textAnchor="middle">
            M{month}
          </text>
        ))}
        {goal > 0 && (
          <line
            x1="76"
            x2={width - 16}
            y1={y(goal)}
            y2={y(goal)}
            className="budget-growth-goal"
          />
        )}
        <path
          d={path(rows, "invested")}
          className="budget-growth-contributed"
        />
        {stepUp > 0 && (
          <path d={path(flatRows, "corpus")} className="budget-growth-flat" />
        )}
        <path d={path(rows, "corpus")} className="budget-growth-value" />
        <line
          x1={x(active.month)}
          x2={x(active.month)}
          y1="30"
          y2="242"
          className="budget-growth-cursor"
        />
        <circle
          cx={x(active.month)}
          cy={y(active.corpus)}
          r="5"
          className="budget-growth-dot"
        />
      </svg>
      <div className="budget-growth-legend">
        <span>
          <i />
          Projected balance{stepUp > 0 ? ` · ${stepUp}% annual step-up` : ""}
        </span>
        <span>
          <i />
          Money contributed
        </span>
        {goal > 0 && (
          <span className="is-goal">
            <i />
            Goal · {money(goal)}
          </span>
        )}
        {stepUp > 0 && (
          <span className="is-flat">
            <i />
            Without step-up
          </span>
        )}
      </div>
      <label className="budget-growth-explore">
        <span>Explore projection month</span>
        <input
          type="range"
          min={0}
          max={months}
          step={1}
          value={active.month}
          aria-valuetext={`Month ${active.month}: projected ${money(active.corpus)}, contributed ${money(active.invested)}`}
          onChange={(e) => setExplore(Number(e.target.value))}
        />
      </label>
      <figcaption aria-live="polite">
        <strong>Month {active.month}</strong>
        <span>
          Contributed <b>{money(active.invested)}</b>
        </span>
        <span>
          Projected balance <b>{money(active.corpus)}</b>
        </span>
      </figcaption>
    </figure>
  );
}
