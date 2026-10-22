import { createRoot } from "react-dom/client";

import { AppBoundary } from "../components/AppBoundary";

import { BudgetPage } from "../pages/BudgetPage";

import "../styles/budget.css";

import "../../bkp/planner-header.css";
import "../styles/design-system.css";

createRoot(document.getElementById("root")!).render(
  <AppBoundary>
    <BudgetPage />
  </AppBoundary>,
);
