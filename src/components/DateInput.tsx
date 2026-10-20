import {
  createContext,
  useContext,
  useRef,
  type InputHTMLAttributes,
} from "react";

export type CalendarTarget = {
  input: HTMLInputElement;
  trigger: HTMLButtonElement;
};
export const CalendarContext = createContext<(target: CalendarTarget) => void>(
  () => {},
);

export function DateInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const input = useRef<HTMLInputElement>(null);
  const open = useContext(CalendarContext);
  return (
    <span className="planner-date-field">
      <input {...props} ref={input} />
      <button
        type="button"
        className="planner-date-open"
        aria-label={`Choose ${props.type === "month" ? "month" : "date"}`}
        aria-haspopup="dialog"
        aria-controls="plannerCalendar"
        aria-expanded="false"
        disabled={props.disabled}
        onClick={(event) => {
          if (
            input.current &&
            !input.current.disabled &&
            !input.current.readOnly
          )
            open({ input: input.current, trigger: event.currentTarget });
        }}
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M7 2v6M17 2v6M3 11h18" />
        </svg>
      </button>
    </span>
  );
}
