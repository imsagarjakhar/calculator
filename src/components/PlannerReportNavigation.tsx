import { useEffect, useRef } from "react";
import { PlannerNavigation } from "./PlannerNavigation";
import { headerConfig, type PlannerKind } from "./headerConfig";

export type ReportControls = {
  currency: string;

  onImport: (file: File | undefined) => void;

  onReport: () => void;

  onReset: () => void;

  onSaveJSON: () => void;

  disabled?: boolean;
};

const names: Record<PlannerKind, string> = {
  growth: "Investment growth",
  survival: "Retirement withdrawals",
  bucket: "Retirement buckets",
  custom: "Custom plan",
  freedom: "Financial freedom",
  loan: "Loan payoff",
  budget: "Salary & budget",
};
export function PlannerReportNavigation({
  kind,
  active,
  controls,
}: {
  kind: PlannerKind;
  active: boolean;
  controls?: ReportControls;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const projection = kind === "growth" || kind === "survival";
  const options = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const menu = options.current;
    if (!menu) return;
    if (!active) {
      menu.open = false;
      return;
    }
    function dismissOutside(event: Event) {
      if (menu?.open && !event.composedPath().includes(menu)) menu.open = false;
    }
    function dismissEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && menu?.open) {
        menu.open = false;
        menu.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", dismissOutside, true);
    document.addEventListener("focusin", dismissOutside);
    document.addEventListener("keydown", dismissEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside, true);
      document.removeEventListener("focusin", dismissOutside);
      document.removeEventListener("keydown", dismissEscape);
    };
  }, [active]);
  const config = headerConfig[kind];
  const [upload, download, reset, ...utilities] = config.buttons;
  return (
    <PlannerNavigation
      current={names[kind]}
      id={projection && active ? "plannerNav" : undefined}
      showCurrency={active}
    >
      <div className="projection-tools">
        {projection && (
          <div className="view-switch" role="group" aria-label="Planner view">
            <button
              type="button"
              data-screen="growth"
              aria-pressed={kind === "growth"}
            >
              Growth
            </button>
            <button
              type="button"
              data-screen="survival"
              aria-pressed={kind === "survival"}
            >
              Survival
            </button>
          </div>
        )}
        <div
          className="projection-files"
          role="group"
          aria-label="Plan reports"
        >
          {[upload, download].map((action, i) => (
            <button
              key={action.id}
              id={action.id}
              type="button"
              aria-label={action.text}
              title={action.text}
              disabled={i === 1 && controls?.disabled}
              onClick={
                controls
                  ? i === 0
                    ? () => fileInput.current?.click()
                    : controls.onReport
                  : undefined
              }
              className={i === 1 ? "download" : undefined}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
                <path
                  d={
                    i === 0 ? "M12 15V4m-5 5 5-5 5 5" : "M12 4v11m-5-5 5 5 5-5"
                  }
                />
              </svg>
            </button>
          ))}
          <input
            type="file"
            id={config.fileId}
            ref={fileInput}
            onChange={
              controls
                ? (e) => {
                    controls.onImport(e.target.files?.[0]);
                    e.target.value = "";
                  }
                : undefined
            }
            accept=".html,.htm,.json,text/html,application/json"
            aria-label={`Choose saved ${kind} report`}
            hidden
          />
          <details ref={options} className="projection-options">
            <summary aria-label="Plan options" title="Plan options">
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                {[5, 12, 19].map((x) => (
                  <circle key={x} cx={x} cy="12" r="1.7" />
                ))}
              </svg>
            </summary>
            <div
              className="projection-popover"
              onClick={(e) => {
                if (
                  e.target instanceof Element &&
                  e.target.closest("button") &&
                  options.current
                ) {
                  options.current.open = false;
                  options.current.querySelector("summary")?.focus();
                }
              }}
            >
              <strong>About currency</strong>
              <p id={config.detailsId ?? undefined} title={config.details}>
                {config.note}
              </p>
              {utilities.map((button) => (
                <button
                  key={button.id}
                  type="button"
                  id={button.id}
                  disabled={controls?.disabled}
                  onClick={controls?.onSaveJSON}
                >
                  {button.text}
                </button>
              ))}
              <button
                type="button"
                id={reset.id}
                onClick={controls?.onReset}
                title={reset.title ?? undefined}
                aria-describedby={reset.description ?? undefined}
              >
                Reset
              </button>
              {config.resetNote && (
                <small id={config.resetNote.id}>{config.resetNote.text}</small>
              )}
            </div>
          </details>
        </div>
      </div>
    </PlannerNavigation>
  );
}
