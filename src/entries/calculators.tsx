import { createRoot } from "react-dom/client";
import { AppBoundary } from "../components/AppBoundary";
import { CalculatorsPage } from "../pages/CalculatorsPage";
import "../styles/design-system.css";
import "../styles/calculators.css";
import "../styles/money-studio.css";

createRoot(document.getElementById("root")!).render(
  <AppBoundary>
    <CalculatorsPage />
  </AppBoundary>,
);
