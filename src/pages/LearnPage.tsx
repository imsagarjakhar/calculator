import { useEffect, useMemo, useRef, useState } from "react";
import { PlannerNavigation } from "../components/PlannerNavigation";
import {
  currencies,
  currencyMoney,
  selectCurrency,
  useCurrency,
} from "../runtime/currency";
import { plannerHref } from "../runtime/routes";
import {
  categories,
  lessons,
  lessonDefaults,
  lessonTimeline,
  terms,
  type Topic,
  type Category,
} from "../content/financeBasics";

function MoneyScene({ topic, playing }: { topic: Topic; playing: boolean }) {
  return (
    <svg
      className={`learn-scene${playing ? " is-playing" : ""}`}
      viewBox="0 0 340 190"
      role="img"
      aria-label={
        topic === "inflation"
          ? "A grocery basket with a changing price tag"
          : topic === "emi"
            ? "A loan payment splits into interest and principal"
            : topic === "swp"
              ? "Money leaving an investment jar"
              : "Coins going into a growing investment jar"
      }
    >
      <ellipse cx="174" cy="171" rx="112" ry="10" fill="#dce7d5" />
      {topic === "inflation" ? (
        <g stroke="#426a4c" strokeWidth="3" strokeLinejoin="round" fill="none">
          <path d="m71 91 18 72h153l19-72H71Zm29 0 42-56m91 56-42-56M119 108l9 39m42-39v39m44-39-9 39" />
          <path
            d="M135 72c-12-38 3-51 13-26m27 29c-11-32 12-49 22-15"
            stroke="#91a568"
          />
          <path d="m237 46 42 15-12 34-42-15 12-34Z" fill="#f3e4bf" />
          <circle cx="244" cy="58" r="3" fill="#426a4c" />
          <path d="m248 70 14 5" />
        </g>
      ) : topic === "emi" ? (
        <g
          stroke="#426a4c"
          strokeWidth="2.5"
          strokeLinejoin="round"
          fill="none"
        >
          <rect x="35" y="66" width="96" height="71" rx="9" fill="#e4eddb" />
          <path d="m39 71 43 32 45-32M154 103h31m0 0 18-35h25m-43 35 18 35h25" />
          <rect x="232" y="45" width="77" height="46" rx="7" fill="#f1dfb9" />
          <rect x="232" y="115" width="77" height="46" rx="7" fill="#cbdcc0" />
          <path d="M56 154h52m139-85h47m-47 70h47" />
        </g>
      ) : (
        <g stroke="#426a4c" strokeWidth="2.5" strokeLinejoin="round">
          <path
            d="M117 62h111v17l10 17v58q0 10-11 10H117q-10 0-10-10V96l10-17V62Z"
            fill="#edf4e4"
          />
          <path
            d="M111 116h122v38q0 6-6 6H118q-7 0-7-6v-38Z"
            fill="#cadab9"
            stroke="none"
          />
          <rect x="113" y="54" width="119" height="15" rx="5" fill="#91a568" />
          <path d="M136 96h69m-69 13h34" fill="none" stroke="#b6c9a7" />
          <g className="learn-coin" fill="#e9ce83">
            <circle cx="174" cy="26" r="16" />
            <path d="M174 16v20m-5-15h8m-8 10h8" strokeWidth="1.8" />
          </g>
          <path
            d={
              topic === "swp"
                ? "M256 119v-52m-8 10 8-10 8 10"
                : "M83 38v52m-8-10 8 10 8-10"
            }
            fill="none"
            stroke="#9e783c"
          />
          <path
            d="M270 160v-32m0 16c-25 0-24-23-24-23 20 0 24 23 24 23Zm0-5c25 0 24-24 24-24-21 0-24 24-24 24Z"
            fill="#a5bb80"
          />
        </g>
      )}
    </svg>
  );
}
export function LearnPage() {
  const currency = useCurrency(),
    money = (n: number) => currencyMoney(n, currency);
  const [topic, setTopic] = useState<Topic>("sip"),
    [settings, setSettings] = useState({ ...lessonDefaults.sip });
  const [cursor, setCursor] = useState<number | null>(null),
    [playing, setPlaying] = useState(false),
    [answer, setAnswer] = useState<number | null>(null);
  const [query, setQuery] = useState(() =>
      typeof window === "undefined"
        ? ""
        : new URLSearchParams(window.location.search).get("term") || "",
    ),
    [category, setCategory] = useState<Category>("All terms");
  const chart = useRef<SVGSVGElement>(null),
    [chartWidth, setChartWidth] = useState(550);
  useEffect(() => {
    const el = chart.current;
    if (!el) return;
    const measure = () =>
      setChartWidth(
        Math.max(230, Math.round(el.getBoundingClientRect().width)),
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const lesson = lessons[topic],
    simulation = useMemo(
      () => lessonTimeline(topic, settings),
      [topic, settings],
    );
  const months = simulation.rows.length - 1,
    active = Math.min(cursor ?? months, months),
    row = simulation.rows[active];
  useEffect(() => {
    setCursor(null);
    setPlaying(false);
  }, [settings, topic]);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(
      () =>
        setCursor((m) =>
          Math.min(months, (m ?? 0) + Math.max(1, Math.ceil(months / 60))),
        ),
      90,
    );
    return () => window.clearInterval(id);
  }, [playing, months]);
  useEffect(() => {
    if (playing && active >= months) setPlaying(false);
  }, [active, months, playing]);
  const shown = terms.filter(
    (t) =>
      (category === "All terms" || t.category === category) &&
      `${t.name} ${t.full ?? ""} ${t.meaning}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const max = Math.max(1, ...simulation.rows.map((r) => r.balance)),
    x = (m: number) => 40 + (m / months) * (chartWidth - 62),
    y = (n: number) => 150 - (n / max) * 120;
  const path = (rows: typeof simulation.rows) =>
    rows
      .map((r, i) => `${i ? "L" : "M"}${x(r.month)},${y(r.balance)}`)
      .join(" ");
  function choose(next: Topic) {
    setTopic(next);
    setSettings({ ...lessonDefaults[next] });
    setAnswer(null);
  }
  function change(key: keyof typeof settings, value: number) {
    setSettings((s) => ({ ...s, [key]: value }));
  }
  return (
    <main className="planner-page learn-page">
      <PlannerNavigation>
        <label className="learn-currency">
          Example currency
          <select
            aria-label="Example currency"
            value={currency}
            onChange={(e) => selectCurrency(e.target.value)}
          >
            {currencies.map(([c, s]) => (
              <option key={c} value={c}>
                {c} — {s}
              </option>
            ))}
          </select>
        </label>
      </PlannerNavigation>
      <header className="learn-hero">
        <div>
          <h1>
            Money words.
            <br />
            <em>Made simple.</em>
          </h1>
          <p>
            No finance background needed. See what the words mean, move a
            slider, and watch the idea click.
          </p>
          <a href="#term-library">
            Looking for a word? Find it below <span aria-hidden="true">↓</span>
          </a>
        </div>
        <div className="learn-welcome-art">
          <MoneyScene topic="sip" playing={false} />
          <span>Small steps. Clearer choices.</span>
        </div>
      </header>
      <section className="learn-playground" aria-labelledby="learn-play-title">
        <div className="learn-section-heading">
          <h2 id="learn-play-title">Five ideas. Try them for yourself.</h2>
          <p>Start anywhere. There’s no wrong question.</p>
        </div>
        <div
          className="learn-topics"
          role="group"
          aria-label="Choose a finance lesson"
        >
          {(Object.keys(lessons) as Topic[]).map((t) => (
            <button
              key={t}
              aria-pressed={topic === t}
              onClick={() => choose(t)}
            >
              {lessons[t].name}
            </button>
          ))}
        </div>
        <div className="learn-workbench">
          <div className="learn-explanation">
            <span className="learn-full-name">{lesson.full}</span>
            <h3>{lesson.title}</h3>
            <p>{lesson.explanation}</p>
            <details className="learn-analogy">
              <summary>Picture it another way</summary>
              <p>{lesson.analogy}</p>
            </details>
            <div className="learn-controls">
              <label>
                {lesson.amountLabel}
                <output>{money(settings.amount)}</output>
                <input
                  aria-label={lesson.amountLabel}
                  type="range"
                  min={
                    topic === "inflation" ? 10 : topic === "swp" ? 10000 : 100
                  }
                  max={
                    topic === "inflation"
                      ? 1000
                      : topic === "swp"
                        ? 500000
                        : 50000
                  }
                  step={topic === "inflation" ? 10 : 100}
                  value={settings.amount}
                  onChange={(e) => change("amount", Number(e.target.value))}
                />
              </label>
              {topic === "swp" && (
                <label>
                  Take out each month
                  <output>{money(settings.withdrawal)}</output>
                  <input
                    aria-label="Take out each month"
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    value={settings.withdrawal}
                    onChange={(e) =>
                      change("withdrawal", Number(e.target.value))
                    }
                  />
                </label>
              )}
              <label>
                {topic === "emi"
                  ? "Yearly loan interest"
                  : topic === "inflation"
                    ? "Yearly inflation"
                    : "Assumed annual return"}
                <output>{settings.rate}%</output>
                <input
                  aria-label={
                    topic === "emi"
                      ? "Yearly loan interest"
                      : topic === "inflation"
                        ? "Yearly inflation"
                        : "Assumed annual return"
                  }
                  type="range"
                  min={topic === "inflation" || topic === "emi" ? 0 : -10}
                  max={topic === "emi" ? 30 : 20}
                  step="1"
                  value={settings.rate}
                  onChange={(e) => change("rate", Number(e.target.value))}
                />
              </label>
              <label>
                Explore over
                <output>
                  {settings.years} {settings.years === 1 ? "year" : "years"}
                </output>
                <input
                  aria-label="Years to explore"
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={settings.years}
                  onChange={(e) => change("years", Number(e.target.value))}
                />
              </label>
            </div>
          </div>
          <div className="learn-visual">
            <MoneyScene topic={topic} playing={playing} />
            <div className="learn-visual-heading">
              <h4>{lesson.resultLabel}</h4>
              <button
                type="button"
                onClick={() => {
                  if (playing) setPlaying(false);
                  else {
                    if (active >= months) setCursor(0);
                    setPlaying(true);
                  }
                }}
              >
                {playing ? "Pause" : "Play the story"}
              </button>
            </div>
            <svg
              ref={chart}
              className="learn-chart"
              viewBox={`0 0 ${chartWidth} 180`}
              role="img"
              aria-label={`${lesson.resultLabel} across ${settings.years} years. At month ${active}: ${money(row.balance)}.`}
            >
              {[0, 0.5, 1].map((f) => (
                <g key={f}>
                  <line
                    x1="40"
                    x2={chartWidth - 22}
                    y1={y(max * f)}
                    y2={y(max * f)}
                    stroke="#d6e2ce"
                  />
                  <text x="35" y={y(max * f) + 4} textAnchor="end">
                    {new Intl.NumberFormat(
                      currency === "INR" ? "en-IN" : "en-US",
                      { notation: "compact", maximumFractionDigits: 1 },
                    ).format(max * f)}
                  </text>
                </g>
              ))}
              <path d={path(simulation.rows)} className="learn-path-ghost" />
              <path
                d={path(simulation.rows.slice(0, active + 1))}
                className="learn-path"
              />
              <circle cx={x(active)} cy={y(row.balance)} r="5" fill="#176b52" />
              <text x="40" y="173">
                Today
              </text>
              <text x={chartWidth - 22} y="173" textAnchor="end">
                Year {settings.years} · {currency}
              </text>
            </svg>
            <label className="learn-timeline">
              Move through time{" "}
              <span>
                Month {active} of {months}
              </span>
              <input
                aria-label="Explore example month"
                type="range"
                min="0"
                max={months}
                step="1"
                value={active}
                onChange={(e) => {
                  setPlaying(false);
                  setCursor(Number(e.target.value));
                }}
              />
            </label>
            <div className="learn-results" aria-live="polite">
              <div>
                <span>{lesson.resultLabel}</span>
                <strong data-testid="lesson-value">{money(row.balance)}</strong>
              </div>
              <div>
                <span>
                  {topic === "emi"
                    ? "Fixed monthly payment"
                    : topic === "swp"
                      ? "Total withdrawn"
                      : topic === "inflation"
                        ? "Same basket today"
                        : "Your own contributions"}
                </span>
                <strong>
                  {money(
                    topic === "emi"
                      ? simulation.emi
                      : topic === "swp"
                        ? row.withdrawn
                        : topic === "inflation"
                          ? settings.amount
                          : row.added,
                  )}
                </strong>
              </div>
            </div>
            {topic === "swp" && row.balance === 0 && (
              <p className="learn-caution">
                The pot is empty at this point. Later planned withdrawals can’t
                be paid.
              </p>
            )}
            {topic === "emi" && (
              <p className="learn-microcopy">
                Interest paid so far: {money(row.interest)}. A longer term can
                lower the EMI while increasing total interest.
              </p>
            )}
            {(topic === "sip" || topic === "return") && (
              <p className="learn-microcopy">
                Growth or loss beyond your own contributions:{" "}
                <strong>{money(row.balance - row.added)}</strong>.
              </p>
            )}
            <p className="learn-microcopy">
              {topic === "inflation"
                ? "Prices compound at the entered annual inflation rate."
                : "Simplified example: annual rate ÷ 12; growth or interest first, deposits and payments at month-end."}{" "}
              {topic !== "emi" && topic !== "inflation"
                ? "Returns can be negative. "
                : ""}
              Taxes, fees and changing rates are excluded.
            </p>
          </div>
        </div>
        <div className="learn-check">
          <div>
            <h3>A quick check</h3>
            <p>{lesson.question}</p>
          </div>
          <div className="learn-answers">
            {lesson.answers.map((a, i) => (
              <button
                key={a}
                aria-pressed={answer === i}
                onClick={() => setAnswer(i)}
                className={
                  answer === i
                    ? i === lesson.correct
                      ? "is-correct"
                      : "try-again"
                    : ""
                }
              >
                {a}
              </button>
            ))}
          </div>
          {answer !== null && (
            <p className="learn-feedback" role="status">
              <strong>
                {answer === lesson.correct
                  ? "You’ve got it. "
                  : "Let’s look again. "}
              </strong>
              {lesson.feedback}
            </p>
          )}
          <a href={plannerHref(lesson.route)}>
            Try this in the real planner <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>
      <section
        className="learn-library"
        id="term-library"
        aria-labelledby="term-library-title"
      >
        <div className="learn-section-heading">
          <div>
            <h2 id="term-library-title">A little dictionary for your money.</h2>
            <p>
              Everyday explanations for the words you’ll meet in our planners.
            </p>
          </div>
          <label className="learn-search">
            Find a term
            <input
              type="search"
              placeholder="Try SIP, interest, corpus…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <div
          className="learn-filters"
          role="group"
          aria-label="Filter finance terms"
        >
          {categories.map((c) => (
            <button
              key={c}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <p className="learn-result-count" role="status">
          {shown.length} {shown.length === 1 ? "term" : "terms"}
          {query ? ` matching “${query}”` : " to explore"}
        </p>
        <div className="learn-term-grid">
          {shown.map((term) => (
            <article className="learn-term" key={term.name}>
              <h3>{term.name}</h3>
              {term.full && (
                <span className="learn-term-full">{term.full}</span>
              )}
              <p>{term.meaning}</p>
              <details>
                <summary>Show me an example</summary>
                <p>{term.example(money)}</p>
                <a href={plannerHref(term.route)}>See it in a planner →</a>
              </details>
            </article>
          ))}
        </div>
        {shown.length === 0 && (
          <div className="learn-empty">
            <h3>That word isn’t here yet.</h3>
            <p>Try a shorter word, or look in all categories.</p>
            <button
              onClick={() => {
                setQuery("");
                setCategory("All terms");
              }}
            >
              Show all terms
            </button>
          </div>
        )}
      </section>
      <aside className="learn-sources">
        <h2>Keep learning, at your pace.</h2>
        <p>
          These examples explain ideas, not which investment to choose. Product
          terms and tax rules vary. For deeper reading:
        </p>
        <a href="https://www.investor.gov/introduction-investing/investing-basics/glossary">
          Investor.gov’s investment glossary
        </a>
        <a href="https://www.consumerfinance.gov/ask-cfpb/how-does-compound-interest-work-en-1683/">
          CFPB: compounding explained
        </a>
        <a href="https://investor.sebi.gov.in/inv_aware_edu_videos.html">
          SEBI’s investor education videos
        </a>
        <a href="https://www.consumerfinance.gov/ask-cfpb/what-is-amortization-and-how-could-it-affect-my-auto-loan-en-771/">
          CFPB: how loan payments work
        </a>
      </aside>
    </main>
  );
}
