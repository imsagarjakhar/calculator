import type { ReactNode } from "react";
import {
  PlannerReportNavigation,
  type ReportControls,
} from "./PlannerReportNavigation";
import { currencies } from "../runtime/currency";

import { budgetHeading, headerConfig, type PlannerKind } from "./headerConfig";

export function PlannerHeader({
  kind,
  controls,
  active = true,
  children,
}: {
  kind: PlannerKind;
  controls?: ReportControls;
  active?: boolean;
  children?: ReactNode;
}) {
  const config = headerConfig[kind];
  return (
    <>
      <PlannerReportNavigation
        kind={kind}
        active={active}
        controls={controls}
      />
      <header
        className={
          "planner-header projection-heading" +
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
    </>
  );
}
