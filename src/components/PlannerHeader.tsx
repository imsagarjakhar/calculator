import type { ReactNode } from "react";
import { useRef } from "react";
import { currencies } from "../runtime/currency";

import { budgetHeading, headerConfig, type PlannerKind } from "./headerConfig";

type HeaderControls = {
  currency: string;

  onImport: (file: File | undefined) => void;

  onReport: () => void;

  onReset: () => void;

  onSaveJSON: () => void;

  disabled?: boolean;
};

export function PlannerHeader({
  kind,
  controls,
  children,
}: {
  kind: PlannerKind;
  controls?: HeaderControls;
  children?: ReactNode;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  const config = headerConfig[kind];

  const [importButton, reportButton, resetButton, ...utilities] =
    config.buttons;

  const compact = kind === "growth" || kind === "survival";
  return (
    <header
      className={
        "planner-header" +
        (compact ? " projection-heading" : "") +
        (kind === "survival" ? " survival-header" : "")
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
          ) : kind === "budget" ? (
            budgetHeading(controls?.currency)
          ) : (
            config.title
          )}
        </h1>

        <p className="planner-header-description">{config.description}</p>

        <span className="planner-header-badge">
          Private calculations · No account needed
        </span>
      </div>

      {children}
      {/* Older planner controllers read and restore this form field by ID. */}
      {!controls && (
        <div className="planner-currency" hidden>
          <select
            id={config.currencyId}
            form={config.currencyForm ?? undefined}
            aria-label="Stored plan currency"
          >
            {currencies.map(([code]) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
      )}
      {!compact && (
        <div
          className="planner-toolbar"
          role="group"
          aria-label={`${kind} plan controls`}
        >
          <h2 className="report-actions-title">Plan reports</h2>
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
          </div>

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

          {config.resetNote && (
            <p id={config.resetNote.id} className="planner-reset-note">
              {config.resetNote.text}
            </p>
          )}

          <details className="planner-currency-info">
            <summary>About currency</summary>

            <p id={config.detailsId ?? undefined}>
              {config.note} {config.details}
            </p>
          </details>
        </div>
      )}
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
    </header>
  );
}
