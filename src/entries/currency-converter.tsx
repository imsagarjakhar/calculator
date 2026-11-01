import { createRoot } from "react-dom/client";
import { AppBoundary } from "../components/AppBoundary";
import { CurrencyPage } from "../pages/CurrencyPage";
import "../../bkp/custom-plan.css";
import "../styles/design-system.css";
import "../styles/currency-converter.css";
createRoot(document.getElementById("root")!).render(
  <AppBoundary>
    <CurrencyPage />
  </AppBoundary>,
);
