import { createRoot } from "react-dom/client";
import { AppBoundary } from "../components/AppBoundary";
import { GuidesPage } from "../pages/GuidesPage";
import "../../bkp/custom-plan.css";
import "../styles/design-system.css";
import "../styles/worked-guides.css";
createRoot(document.getElementById("root")!).render(
  <AppBoundary>
    <GuidesPage />
  </AppBoundary>,
);
