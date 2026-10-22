import { createRoot } from "react-dom/client";
import { AppBoundary } from "../components/AppBoundary";
import { LearnPage } from "../pages/LearnPage";
import "../../bkp/custom-plan.css";
import "../styles/design-system.css";
import "../styles/learn.css";
createRoot(document.getElementById("root")!).render(
  <AppBoundary>
    <LearnPage />
  </AppBoundary>,
);
