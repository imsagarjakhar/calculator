import { createRoot } from "react-dom/client";
import { AppBoundary } from "../components/AppBoundary";
import { MarketsPage } from "../pages/MarketsPage";
import "../../bkp/custom-plan.css";
import "../styles/design-system.css";
import "../styles/markets.css";
createRoot(document.getElementById("root")!).render(
  <AppBoundary>
    <MarketsPage />
  </AppBoundary>,
);
