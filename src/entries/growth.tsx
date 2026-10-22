import { normalizePlannerUrl } from "../runtime/routes";
import { createRoot } from "react-dom/client";
import { AppBoundary } from "../components/AppBoundary";
import { HomePage } from "../pages/HomePage";
import "../styles/growth.css";
import "../../bkp/planner.css";
import "../../bkp/chart-hover.css";
import "../../bkp/table-layout.css";
import "../../bkp/planner-header.css";
import "../styles/design-system.css";
normalizePlannerUrl();
createRoot(document.getElementById("root")!).render(
  <AppBoundary>
    <HomePage />
  </AppBoundary>,
);
