import { createRoot } from "react-dom/client";

import { AppBoundary } from "../components/AppBoundary";

import { LoanPage } from "../pages/LoanPage";

import "../styles/loans.css";

import "../../bkp/planner-header.css";
import "../styles/design-system.css";

createRoot(document.getElementById("root")!).render(
  <AppBoundary>
    <LoanPage />
  </AppBoundary>,
);
