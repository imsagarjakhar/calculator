import { createRoot } from "react-dom/client";
import { AppBoundary } from "../components/AppBoundary";
import { LoanPage } from "../pages/LoanPage";
import "../styles/loans.css";
createRoot(document.getElementById("root")!).render(
  <AppBoundary>
    <LoanPage />
  </AppBoundary>,
);
