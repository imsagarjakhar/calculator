import { createRoot } from "react-dom/client";
import { AppBoundary } from "../components/AppBoundary";
import { TrustPage, type TrustRoute } from "../pages/TrustPage";
import "../../bkp/custom-plan.css";
import "../styles/design-system.css";
import "../styles/trust.css";

const page = document.documentElement.dataset.page as TrustRoute;
createRoot(document.getElementById("root")!).render(
  <AppBoundary>
    <TrustPage page={page} />
  </AppBoundary>,
);
