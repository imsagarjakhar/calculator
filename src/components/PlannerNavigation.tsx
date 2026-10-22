import type { ReactNode } from "react";
import { plannerHref } from "../runtime/routes";

export function PlannerNavigation({
  children,
  hidden = false,
  id,
  homeHref,
}: {
  children?: ReactNode;
  hidden?: boolean;
  id?: string;
  homeHref?: string;
}) {
  return (
    <nav
      id={id}
      className="planner-navigation"
      aria-label="Financial planners"
      hidden={hidden}
    >
      <a
        href={homeHref ?? plannerHref("home")}
        data-screen={homeHref === undefined ? "home" : undefined}
        className="planner-home-link back-to-planners"
      >
        ← All planners
      </a>
      <span className="planner-site-name">Financial AI Planner</span>
      {children}
    </nav>
  );
}
