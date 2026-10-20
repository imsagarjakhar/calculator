import { createRoot } from "react-dom/client";
import { AppBoundary } from "../components/AppBoundary";
import { BucketPage } from "../pages/BucketPage";
import "../../bkp/custom-plan.css";
import "../../bkp/chart-hover.css";
import "../../bkp/table-layout.css";
import "../../bkp/bucket-plan.css";
import "../../bkp/planner-header.css";
createRoot(document.getElementById("root")!).render(
  <AppBoundary>
    <BucketPage />
  </AppBoundary>,
);
