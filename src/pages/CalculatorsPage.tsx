import { PlannerNavigation } from "../components/PlannerNavigation";
import { useEffect, useState } from "react";
import { categories } from "../calculators/catalog";
import type { Calculator, Field } from "../calculators/model";
import { plannerHref } from "../runtime/routes";

const format = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 });
const initial = (f: Field) =>
  f.type === "date"
    ? new Date(f.value).toISOString().slice(0, 10)
    : String(f.value);
const hash = () =>
  typeof window === "undefined" ? "" : window.location.hash.slice(1);

function RentReceipt() {
  const [data, setData] = useState<Record<string, string>>({});
  const [issued, setIssued] = useState(false);
  const fields = [
    ["Tenant", "text"],
    ["Landlord", "text"],
    ["Rental property address", "text"],
    ["Rental period", "text"],
    ["Amount paid (₹)", "number"],
    ["Payment date", "date"],
  ];
  return (
    <div className="ledger-columns">
      <form
        className="ledger-inputs"
        onSubmit={(e) => {
          e.preventDefault();
          setIssued(true);
        }}
      >
        <h2>Payment details</h2>
        {fields.map(([label, type]) => (
          <label key={label}>
            {label}
            <input
              required
              type={type}
              min={type === "number" ? "0.01" : undefined}
              step={type === "number" ? "0.01" : undefined}
              value={data[label] ?? ""}
              onChange={(e) => {
                setData({ ...data, [label]: e.target.value });
                setIssued(false);
              }}
            />
          </label>
        ))}
        <button>Generate receipt</button>
      </form>
      <section className="ledger-receipt" aria-live="polite">
        <h2>Rent receipt</h2>
        {issued ? (
          <>
            <p>
              Received ₹{format.format(Number(data["Amount paid (₹)"]))} from{" "}
              {data.Tenant} for the rental of {data["Rental property address"]}{" "}
              for {data["Rental period"]}.
            </p>
            <p>
              Paid on {data["Payment date"]} to {data.Landlord}.
            </p>
            <p className="signature">Landlord signature __________________</p>
            <button onClick={() => window.print()}>Print receipt</button>
          </>
        ) : (
          <p>Complete the payment details to prepare a printable receipt.</p>
        )}
      </section>
    </div>
  );
}

function WorksheetModes({ calc }: { calc: Calculator }) {
  const [selected, setSelected] = useState(-1);
  const choice = calc.modes?.[selected];
  return (
    <>
      {calc.modes && (
        <label className="ledger-mode">
          Calculation
          <select
            aria-label="Calculation"
            value={selected}
            onChange={(e) => setSelected(Number(e.target.value))}
          >
            <option value={-1}>{calc.title}</option>
            {calc.modes.map((m, i) => (
              <option key={m.title} value={i}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <Worksheet key={selected} calc={choice ? { ...calc, ...choice } : calc} />
    </>
  );
}
function Worksheet({ calc }: { calc: Calculator }) {
  const defaults = () => calc.fields.map(initial);
  const [raw, setRaw] = useState(defaults);
  const [shareMessage, setShareMessage] = useState("");
  const size = calc.repeatFields?.size ?? 0;
  const fields = raw.map(
    (_, i) =>
      calc.fields[i] ??
      calc.fields[
        calc.fields.length - size + ((i - calc.fields.length) % size)
      ],
  );
  let result: Record<string, number | string> = {};
  let source = calc.source;
  let schedule: ReturnType<NonNullable<Calculator["schedule"]>> | undefined;
  let error = "";
  try {
    const values = raw.map((v, i) => {
      const f = fields[i];
      const n = f.type === "date" ? Date.parse(v + "T00:00:00Z") : Number(v);
      if (!v.trim() || !Number.isFinite(n))
        throw Error("Enter " + f.label + ".");
      if (f.min !== undefined && n < f.min)
        throw Error(f.label + " must be at least " + f.min + ".");
      if (f.max !== undefined && n > f.max)
        throw Error(f.label + " must be at most " + f.max + ".");
      if (f.step === 1 && !Number.isInteger(n))
        throw Error("Use a whole number for " + f.label + ".");
      return n;
    });
    result = calc.calculate(values);
    source = calc.sourceFor?.(values) ?? calc.source;
    schedule = calc.schedule?.(values);
    if (
      Object.values(result).some(
        (v) => typeof v === "number" && !Number.isFinite(v),
      )
    )
      throw Error(
        "These inputs do not produce a finite result. Check the amounts, rates and term.",
      );
  } catch (e) {
    error = e instanceof Error ? e.message : "Check the entered values.";
  }
  function change(i: number, value: string) {
    setShareMessage("");
    const next = raw.map((v, j) => (i === j ? value : v));
    const overrides = calc.presetChanges?.(i, next.map(Number));
    for (const [index, n] of Object.entries(overrides ?? {}))
      next[Number(index)] = String(n);
    setRaw(next);
  }
  async function shareResult() {
    const summary = Object.entries(result)
      .map(
        ([label, value]) =>
          label +
          " — " +
          (typeof value === "number" ? format.format(value) : value),
      )
      .join("\n");
    try {
      if (navigator.share)
        await navigator.share({
          title: calc.title,
          text: calc.title + "\n" + summary,
          url: location.href,
        });
      else {
        await navigator.clipboard.writeText(
          calc.title + "\n" + summary + "\n" + location.href,
        );
        setShareMessage("Result copied to clipboard.");
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError"))
        setShareMessage(
          "Sharing is unavailable in this browser. You can print the result.",
        );
    }
  }
  function downloadSchedule() {
    if (!schedule) return;
    const csv = [schedule.columns, ...schedule.rows]
      .map((row) =>
        row
          .map((cell) => '"' + String(cell).replaceAll('"', '""') + '"')
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = calc.id + "-schedule.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <div className="ledger-columns">
        <section className="ledger-inputs">
          <div className="ledger-section-title">
            <h2>Your inputs</h2>
            <button className="text-button" onClick={() => setRaw(defaults())}>
              Reset example
            </button>
          </div>
          {fields.map((f, i) => (
            <label key={i}>
              {f.label}
              {f.options ? (
                <select
                  value={raw[i]}
                  onChange={(e) => change(i, e.target.value)}
                >
                  {f.options.map((option, index) => (
                    <option key={option} value={index}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type ?? "number"}
                  step={f.step ?? "any"}
                  min={f.min}
                  max={f.max}
                  value={raw[i]}
                  onChange={(e) => change(i, e.target.value)}
                />
              )}
            </label>
          ))}
          {calc.repeatFields && (
            <div className="ledger-row-actions">
              <button
                onClick={() =>
                  setRaw([...raw, ...calc.fields.slice(-size).map(initial)])
                }
              >
                Add {calc.repeatFields.label}
              </button>
              {raw.length > calc.fields.length && (
                <button onClick={() => setRaw(raw.slice(0, -size))}>
                  Remove last {calc.repeatFields.label}
                </button>
              )}
            </div>
          )}
        </section>
        <section
          className="ledger-results"
          aria-live="polite"
          aria-atomic="true"
        >
          <h2>Your result</h2>
          {error ? (
            <p>{error}</p>
          ) : (
            <dl>
              {Object.entries(result).map(([name, value]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>
                    {typeof value === "number" ? format.format(value) : value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {source && (
            <a href={source} target="_blank" rel="noreferrer">
              Reference for this estimate
            </a>
          )}
          {!error && (
            <p className="ledger-output-actions">
              <button onClick={() => window.print()}>Print or save PDF</button>
              <button onClick={shareResult}>Share result</button>
              {shareMessage && <span role="status">{shareMessage}</span>}
            </p>
          )}
        </section>
      </div>
      {!error && schedule && (
        <section className="ledger-schedule">
          <div className="ledger-section-title">
            <h2>Schedule</h2>
            <button onClick={downloadSchedule}>Download CSV</button>
          </div>
          <div
            className="ledger-table"
            tabIndex={0}
            aria-label="Calculation schedule"
          >
            <table>
              <thead>
                <tr>
                  {schedule.columns.map((c) => (
                    <th key={c} scope="col">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedule.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((v, j) => (
                      <td key={j}>
                        {typeof v === "number" ? format.format(v) : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

export function CalculatorsPage() {
  const [active, setActive] = useState(hash);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All categories");
  useEffect(() => {
    const sync = () => {
      setActive(hash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const category = categories.find((c) =>
    c.tools.some((t) => "id" in t && t.id === active),
  );
  const calc = category?.tools.find(
    (t): t is Calculator => "id" in t && t.id === active,
  );
  useEffect(() => {
    document.title =
      (calc?.title ?? "Calculator Library for Indian Finance") +
      " | Financial AI Planner";
    if (active)
      document
        .querySelector<HTMLElement>(".ledger h1")
        ?.focus({ preventScroll: true });
  }, [active, calc]);
  const words = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => !["calculator", "calculators"].includes(w));
  const filtered = categories
    .filter((c) => group === "All categories" || group === c.name)
    .map((c) => ({
      ...c,
      tools: c.tools.filter((t) =>
        words.every((w) =>
          (
            c.name +
            " " +
            t.title +
            " " +
            t.description +
            ("id" in t ? " " + t.id.replaceAll("-", " ") : "")
          )
            .toLowerCase()
            .includes(w),
        ),
      ),
    }))
    .filter((c) => c.tools.length);
  const matches = filtered.reduce((sum, c) => sum + c.tools.length, 0);
  return (
    <main className="ledger">
      <PlannerNavigation current={calc?.title ?? "Calculators"} parent={calc ? {label:"All calculators",href:"#directory"} : undefined} />
      {calc ? (
        <>
          <div className="ledger-hero">
            <span>{category?.name}</span>
            <h1 tabIndex={-1}>{calc.title}</h1>
            <p>{calc.description}</p>
          </div>
          {calc.id === "rent-receipt" ? (
            <RentReceipt />
          ) : (
            <WorksheetModes key={calc.id} calc={calc} />
          )}
        </>
      ) : (
        <>
          <div className="ledger-hero ledger-library-hero">
            <div>
              <h1 tabIndex={-1}>Calculator library</h1>
              <p>
                Choose a tool to explore an investment, work through a tax
                question or plan the cost of everyday life.
              </p>
            </div>
            <nav className="ledger-shortcuts" aria-label="Calculator shortcuts">
              <a href="#sip">Project a SIP</a>
              <a href="#old-vs-new-tax-regime">Compare tax regimes</a>
              <a href="#home-loan-emi">Estimate a home loan EMI</a>
            </nav>
          </div>
          <div className="studio-directory-layout">
            <aside className="ledger-filters">
              <label>
                Find a calculator
                <input
                  type="search"
                  placeholder="Search SIP, stamp duty, fuel…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <label>
                Browse by category
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                >
                  {["All categories", ...categories.map((c) => c.name)].map(
                    (n) => (
                      <option key={n}>{n}</option>
                    ),
                  )}
                </select>
              </label>
            </aside>
            <div className="studio-directory-list">
              <p className="ledger-count" role="status">
                {matches} {matches === 1 ? "entry" : "entries"}
              </p>
              {filtered.map((c) => {
                const preview = group === "All categories" && !query.trim();
                return (
                  <section className="ledger-group" key={c.name}>
                    <div className="ledger-section-title">
                      <div>
                        <h2>{c.name}</h2>
                        <p>{c.detail}</p>
                      </div>
                      {preview && c.tools.length > 4 && (
                        <button
                          onClick={() => {
                            setGroup(c.name);
                            window.scrollTo(0, 0);
                          }}
                        >
                          View all {c.tools.length}
                        </button>
                      )}
                    </div>
                    <div className="ledger-grid">
                      {(preview ? c.tools.slice(0, 4) : c.tools).map((t) => (
                        <a
                          key={"id" in t ? t.id : t.title}
                          href={"id" in t ? "#" + t.id : plannerHref(t.route)}
                        >
                          {t.title}
                        </a>
                      ))}
                    </div>
                  </section>
                );
              })}
              {!matches && (
                <div className="ledger-empty">
                  <h2>No matching calculators</h2>
                  <button
                    onClick={() => {
                      setQuery("");
                      setGroup("All categories");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
