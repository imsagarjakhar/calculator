import { useId, useState, type CSSProperties } from "react";
import { lessonTimeline } from "../content/financeBasics";
import { currencyMoney, useCurrency } from "../runtime/currency";
import "../styles/investment-hero.css";

function Control({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  change,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (n: number) => string;
  change: (n: number) => void;
}) {
  const id = useId();
  return (
    <div className="inv-control">
      <label htmlFor={id}>{label}</label>
      <output htmlFor={id}>{format(value)}</output>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        style={
          {
            "--progress": ((value - min) / (max - min)) * 100 + "%",
          } as CSSProperties
        }
        onChange={(e) => change(+e.target.value)}
      />
    </div>
  );
}

export function InvestmentHero() {
  const currency = useCurrency();
  const [mode, setMode] = useState<"sip" | "swp">("sip");
  const [deposit, setDeposit] = useState(1000),
    [capital, setCapital] = useState(100000),
    [withdrawal, setWithdrawal] = useState(1000);
  const [years, setYears] = useState(10),
    [rate, setRate] = useState(8);
  const sip = mode === "sip";
  const money = (amount: number) => currencyMoney(amount, currency);
  const { rows } = lessonTimeline(mode, {
    amount: sip ? deposit : capital,
    withdrawal,
    years,
    rate,
  });
  const end = rows[rows.length - 1],
    peak = Math.max(1, ...rows.map((row) => row.balance));
  const points = rows.map((row) => [
    4 + (392 * row.month) / (years * 12),
    94 - (86 * row.balance) / peak,
  ]);
  const path = points
    .map(([x, y], i) => (i ? "L" : "M") + x + " " + y)
    .join(" ");
  const depleted = sip ? undefined : rows.find((row) => row.balance === 0);
  return (
    <section className="investment-hero" aria-label="SIP and SWP calculator">
      <div className="inv-inputs">
        <div className="inv-mode" role="group" aria-label="Calculation type">
          {(["sip", "swp"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
        <h1 id="welcomeTitle" tabIndex={-1}>
          {sip ? "Invest monthly." : "Withdraw monthly."}
          <br />
          <span>{sip ? "See it grow." : "Plan ahead."}</span>
        </h1>
        <p className="inv-deck">
          {sip
            ? "See what regular monthly investments could grow into with a systematic investment plan."
            : "See how long your savings could support a monthly income with a systematic withdrawal plan."}
        </p>
        <div className="inv-controls">
          {!sip && (
            <Control
              label="Starting balance"
              value={capital}
              min={1000}
              max={1000000}
              step={1000}
              format={money}
              change={setCapital}
            />
          )}
          <Control
            label={sip ? "Monthly investment" : "Monthly withdrawal"}
            value={sip ? deposit : withdrawal}
            min={0}
            max={20000}
            step={100}
            format={money}
            change={sip ? setDeposit : setWithdrawal}
          />
          <Control
            label="Annual return"
            value={rate}
            min={0}
            max={20}
            step={0.5}
            format={(n) => n + "%"}
            change={setRate}
          />
          <Control
            label="Time period"
            value={years}
            min={1}
            max={40}
            format={(n) => n + (n === 1 ? " year" : " years")}
            change={setYears}
          />
        </div>
      </div>
      <div className="inv-results">
        <div className="inv-balance">
          <div className="inv-balance-top">
            <span>Portfolio projection</span>
            <span>
              {mode.toUpperCase()} · {currency}
            </span>
          </div>
          <p>
            {sip ? "Estimated future value" : "Estimated remaining balance"}
          </p>
          <strong>{money(end.balance)}</strong>
          <div className="inv-card-foot">
            After {years} {years === 1 ? "year" : "years"}
            <span aria-hidden="true">✳</span>
          </div>
        </div>
        <div className="inv-chart">
          <div className="inv-chart-title">
            <h2>Balance over time</h2>
            <span>{years}Y</span>
          </div>
          <svg
            viewBox="0 0 400 100"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Projected balance from ${money(rows[0].balance)} to ${money(end.balance)} over ${years} years`}
          >
            {[10, 52, 94].map((y) => (
              <path
                key={y}
                d={`M4 ${y}H396`}
                stroke="#d9dfd8"
                strokeDasharray="3 4"
              />
            ))}
            <path d={path + " L396 94 H4Z"} fill="#dff2dc" opacity=".8" />
            <path
              d={path}
              fill="none"
              stroke="#11794c"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="inv-axis">
            <span>Today</span>
            <span>Year {years}</span>
          </div>
          <div className="inv-summary">
            <div>
              {sip ? "Total invested" : "Total withdrawn"}
              <b>{money(sip ? end.added : end.withdrawn)}</b>
            </div>
            <div>
              Estimated earnings
              <b>{money(end.balance + end.withdrawn - end.added)}</b>
            </div>
          </div>
        </div>
        <p className="inv-note">
          {depleted ? `Funds run out in month ${depleted.month}. ` : ""}
          Illustrative return, compounded monthly.{" "}
          {sip ? "Deposits" : "Withdrawals"} occur at month-end. Excludes taxes
          and fees.
        </p>
      </div>
    </section>
  );
}
