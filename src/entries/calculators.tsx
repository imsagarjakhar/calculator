import { createRoot } from "react-dom/client";
import { AppBoundary } from "../components/AppBoundary";
import { CalculatorsPage } from "../pages/CalculatorsPage";
import "../styles/design-system.css";
import "../styles/calculators.css";

createRoot(document.getElementById("root")!).render(
  <AppBoundary>
    <CalculatorsPage />
  </AppBoundary>,
);
