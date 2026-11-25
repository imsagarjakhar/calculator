import type { ReactNode } from "react";
import { plannerHref } from "../runtime/routes";
import { JourneyHeader } from "./JourneyHeader";

export function PlannerNavigation({
  current,
  parent,
  children,
  hidden = false,
  id,
  homeHref,
  account,
  showCurrency = false,
}: {
  current: string;
  parent?: { label: string; href: string };
  children?: ReactNode;
  hidden?: boolean;
  id?: string;
  homeHref?: string;
  account?: ReactNode;
  showCurrency?: boolean;
}) {
  return (
    <div id={id} className="planner-navigation journey-shell" hidden={hidden}>
      <JourneyHeader showCurrency={showCurrency && !hidden} account={account} />
      <div className="planner-context">
        <nav className="planner-crumb" aria-label="Breadcrumb">
          <a
            className="back-to-planners"
            href={homeHref ?? plannerHref("home")}
            data-screen={homeHref === undefined ? "home" : undefined}
          >
            All planners
          </a>
          <span aria-hidden="true">/</span>
          {parent && (
            <>
              <a href={parent.href}>{parent.label}</a>
              <span aria-hidden="true">/</span>
            </>
          )}
          <span aria-current="page">{current}</span>
        </nav>
        {children}
      </div>
    </div>
  );
}
