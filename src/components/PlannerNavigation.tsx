import type { ReactNode } from "react";
import { plannerHref } from "../runtime/routes";

export function PlannerNavigation({
  children,
  hidden = false,
  id,
}: {
  children?: ReactNode;
  hidden?: boolean;
  id?: string;
}) {
  return (
    <nav
      id={id}
      className="planner-navigation"
      aria-label="Financial planners"
      hidden={hidden}
    >
      <a
        href={plannerHref("home")}
        data-screen="home"
        className="planner-home-link back-to-planners"
      >
        ← All planners
      </a>
      <span className="planner-site-name">Money Planner</span>
      {children}
    </nav>
  );
}
