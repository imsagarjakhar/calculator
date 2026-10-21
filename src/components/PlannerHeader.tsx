import { useRef } from "react";

import { headerConfig, type PlannerKind } from "./headerConfig";

const currencies = [
  ["INR", "₹"],

  ["SAR", "ر.س"],

  ["USD", "$"],

  ["AED", "د.إ"],

  ["EUR", "€"],

  ["GBP", "£"],
] as const;

type HeaderControls = {
  currency: string;

  onCurrency: (currency: string) => void;

  onImport: (file: File | undefined) => void;

  onReport: () => void;

  onReset: () => void;

  onSaveJSON: () => void;

  disabled?: boolean;
};

export function PlannerHeader({
  kind,
  controls,
}: {
  kind: PlannerKind;
  controls?: HeaderControls;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  const config = headerConfig[kind];

  const [importButton, reportButton, resetButton, ...utilities] =
    config.buttons;

  return (
    <header
      className={
        "planner-header" + (kind === "survival" ? " survival-header" : "")
      }
    >
      <div className="planner-header-copy">
        <p className="eyebrow">{config.eyebrow}</p>

        <h1
          id={kind === "survival" ? "survivalTitle" : undefined}
          tabIndex={-1}
        >
          {kind === "bucket" ? (
            <>
              One retirement.
              <br />
              <em>Three purposeful buckets.</em>
            </>
          ) : (
            config.title
          )}
        </h1>

        <p className="planner-header-description">{config.description}</p>

        <span className="planner-header-badge">
          Private calculations · No account needed
        </span>
      </div>

      <div
        className="planner-toolbar"
        role="group"
        aria-label={`${kind} plan controls`}
      >
        <div className="planner-toolbar-top">
          <label className="planner-currency" htmlFor={config.currencyId}>
            Plan currency
            <select
              id={config.currencyId}
              value={controls?.currency}
              onChange={
                controls
                  ? (e) => controls.onCurrency(e.target.value)
                  : undefined
              }
              form={config.currencyForm ?? undefined}
              aria-describedby={config.currencyDescription ?? undefined}
            >
              {currencies.map(([code, symbol]) => (
                <option key={code} value={code}>
                  {code} — {symbol}
                </option>
              ))}
            </select>
          </label>

          <span className="planner-toolbar-label">YOUR PLAN</span>
        </div>

        <p className="planner-currency-note">{config.note}</p>

        <div className="planner-toolbar-actions">
          <button
            id={importButton.id!}
            onClick={controls ? () => fileInput.current?.click() : undefined}
            type="button"
            title={importButton.title ?? undefined}
          >
            Import report
          </button>

          <input
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
            type="file"
            accept=".html,.htm,.json,text/html,application/json"
            aria-label={`Choose saved ${kind} report`}
            hidden
          />

          <button
            id={reportButton.id!}
            type="button"
            className="primary"
            onClick={controls?.onReport}
            disabled={controls?.disabled}
          >
            Download report
          </button>

          <button
            id={resetButton.id!}
            onClick={controls?.onReset}
            type="button"
            className="planner-reset"
            title={resetButton.title ?? undefined}
            aria-describedby={resetButton.description ?? undefined}
          >
            Reset
          </button>
        </div>

        {utilities.length > 0 && (
          <div className="planner-toolbar-utilities">
            {utilities.map((button) => (
              <button
                key={button.id}
                id={button.id!}
                type="button"
                onClick={controls?.onSaveJSON}
                disabled={controls?.disabled}
              >
                {button.text}
              </button>
            ))}
          </div>
        )}

        {config.resetNote && (
          <p id={config.resetNote.id} className="planner-reset-note">
            {config.resetNote.text}
          </p>
        )}

        <details className="planner-currency-info">
          <summary>About currency</summary>

          <p id={config.detailsId ?? undefined}>{config.details}</p>
        </details>

        {config.statuses.map((status) => (
          <p
            key={status.id}
            id={status.id}
            className="planner-header-status helper"
            role="status"
            aria-live="polite"
          >
            {status.text}
          </p>
        ))}
      </div>
    </header>
  );
}
