import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { CalendarContext, type CalendarTarget } from "./DateInput";
import "../styles/calendar.css";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const pad = (value: number) => String(value).padStart(2, "0");
const key = (year: number, month: number, day?: number) =>
  `${year}-${pad(month + 1)}${day === undefined ? "" : "-" + pad(day)}`;
function today() {
  const date = new Date();
  return key(date.getFullYear(), date.getMonth(), date.getDate());
}

function Calendar({
  target,
  dismiss,
}: {
  target: CalendarTarget;
  dismiss: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const isMonth = target.input.type === "month";
  const min = target.input.min || (isMonth ? "1900-01" : "1900-01-01");
  const max = target.input.max || (isMonth ? "2250-12" : "2250-12-31");
  const minimumYear = Number(min.slice(0, 4));
  const maximumYear = Number(max.slice(0, 4));
  const initial = target.input.value || today().slice(0, isMonth ? 7 : 10);
  const bounded = initial < min ? min : initial > max ? max : initial;
  const [year, setYear] = useState(Number(bounded.slice(0, 4)));
  const [month, setMonth] = useState(Number(bounded.slice(5, 7)) - 1);
  const [draftYear, setDraftYear] = useState(String(year));
  const title =
    target.input.closest("label")?.firstChild?.textContent?.trim() ||
    target.input.getAttribute("aria-label") ||
    (isMonth ? "Choose month" : "Choose date");
  const allowed = (value: string) => value >= min && value <= max;
  const monthAllowed = (y: number, m: number) =>
    key(y, m, isMonth ? undefined : 31) >= min &&
    key(y, m, isMonth ? undefined : 1) <= max;
  function changePeriod(y: number, m: number) {
    setYear(y);
    setDraftYear(String(y));
    const first = y === minimumYear ? Number(min.slice(5, 7)) - 1 : 0;
    const last = y === maximumYear ? Number(max.slice(5, 7)) - 1 : 11;
    setMonth(Math.max(first, Math.min(last, m)));
  }
  useLayoutEffect(() => {
    const element = dialog.current!;
    element.showModal();
    (
      element.querySelector<HTMLButtonElement>(
        '[aria-pressed="true"]:not(:disabled)',
      ) ||
      element.querySelector<HTMLButtonElement>(
        ".planner-calendar-grid button:not(:disabled)",
      )
    )?.focus();
    target.trigger.setAttribute("aria-expanded", "true");
    return () => {
      element.close();
      target.trigger.setAttribute("aria-expanded", "false");
      if (target.trigger.isConnected) target.trigger.focus();
    };
  }, [target]);
  function choose(value: string) {
    if (value && !allowed(value)) return;
    // Preserve the existing financial controllers' normal input/change path.
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    setter.call(target.input, value);
    target.input.dispatchEvent(new Event("input", { bubbles: true }));
    target.input.dispatchEvent(new Event("change", { bubbles: true }));
    dismiss();
  }
  function move(delta: number) {
    const date = new Date(
      Date.UTC(year + (isMonth ? delta : 0), month + (isMonth ? 0 : delta), 1),
    );
    changePeriod(date.getUTCFullYear(), date.getUTCMonth());
  }
  function canMove(delta: number) {
    const date = new Date(
      Date.UTC(year + (isMonth ? delta : 0), month + (isMonth ? 0 : delta), 1),
    );
    return (
      date.getUTCFullYear() >= minimumYear &&
      date.getUTCFullYear() <= maximumYear &&
      (isMonth || monthAllowed(date.getUTCFullYear(), date.getUTCMonth()))
    );
  }
  function gridKeys(event: KeyboardEvent<HTMLDivElement>) {
    const buttons = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
        "button:not(:disabled)",
      ),
    ];
    const current = buttons.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    const stride = isMonth ? 3 : 7;
    const delta = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: stride,
      ArrowUp: -stride,
    }[event.key];
    if (delta === undefined && event.key !== "Home" && event.key !== "End")
      return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : Math.max(0, Math.min(buttons.length - 1, current + delta!));
    buttons[next]?.focus();
  }
  const count = isMonth
    ? 12
    : new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const offset = isMonth
    ? 0
    : (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const now = today().slice(0, isMonth ? 7 : 10);
  return (
    <dialog
      id="plannerCalendar"
      ref={dialog}
      className="planner-calendar"
      aria-labelledby="plannerCalendarTitle"
      aria-describedby="plannerCalendarHelp"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          dismiss();
      }}
    >
      <div className="planner-calendar-heading">
        <div>
          <p className="eyebrow">
            {isMonth ? "CHOOSE A MONTH" : "CHOOSE A DATE"}
          </p>
          <h2 id="plannerCalendarTitle">{title}</h2>
        </div>
        <button
          type="button"
          className="planner-calendar-close"
          aria-label="Close calendar"
          onClick={dismiss}
        >
          ×
        </button>
      </div>
      <p id="plannerCalendarHelp">
        {isMonth
          ? "Choose a year, then select a month."
          : "Choose a month and year, then select a day."}
      </p>
      <div className="planner-calendar-controls">
        <button
          type="button"
          aria-label={isMonth ? "Previous year" : "Previous month"}
          disabled={!canMove(-1)}
          onClick={() => move(-1)}
        >
          ‹
        </button>
        {!isMonth && (
          <label>
            Month
            <select
              aria-label="Calendar month"
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
            >
              {months.map((name, i) => (
                <option key={name} value={i} disabled={!monthAllowed(year, i)}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Year
          <input
            aria-label="Calendar year"
            type="number"
            min={minimumYear}
            max={maximumYear}
            value={draftYear}
            onChange={(event) => {
              setDraftYear(event.target.value);
              const value = Number(event.target.value);
              if (
                /^\d{4}$/.test(event.target.value) &&
                value >= minimumYear &&
                value <= maximumYear
              )
                changePeriod(value, month);
            }}
            onBlur={() => setDraftYear(String(year))}
          />
        </label>
        <button
          type="button"
          aria-label={isMonth ? "Next year" : "Next month"}
          disabled={!canMove(1)}
          onClick={() => move(1)}
        >
          ›
        </button>
      </div>
      <p className="planner-calendar-period" aria-live="polite">
        {isMonth ? year : `${months[month]} ${year}`}
      </p>
      {!isMonth && (
        <div className="planner-calendar-weekdays" aria-hidden="true">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
      )}
      <div
        className={`planner-calendar-grid ${isMonth ? "planner-calendar-months" : "planner-calendar-days"}`}
        onKeyDown={gridKeys}
      >
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank-${i}`} aria-hidden="true" />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const value = isMonth ? key(year, i) : key(year, month, i + 1);
          return (
            <button
              type="button"
              key={value}
              disabled={!allowed(value)}
              aria-label={
                isMonth
                  ? `${months[i]} ${year}`
                  : `${i + 1} ${months[month]} ${year}`
              }
              aria-pressed={value === target.input.value}
              aria-current={value === now ? "date" : undefined}
              onClick={() => choose(value)}
            >
              {isMonth ? months[i].slice(0, 3) : i + 1}
            </button>
          );
        })}
      </div>
      <div className="planner-calendar-footer">
        <button
          type="button"
          className="planner-calendar-today"
          disabled={!allowed(now)}
          onClick={() => choose(now)}
        >
          {isMonth ? "This month" : "Today"}
        </button>
        {!target.input.required && (
          <button type="button" onClick={() => choose("")}>
            Clear
          </button>
        )}
        <button type="button" onClick={dismiss}>
          Cancel
        </button>
      </div>
    </dialog>
  );
}

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<CalendarTarget | null>(null);
  return (
    <CalendarContext.Provider value={setTarget}>
      {children}
      {target && <Calendar target={target} dismiss={() => setTarget(null)} />}
    </CalendarContext.Provider>
  );
}
