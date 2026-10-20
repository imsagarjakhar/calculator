import { plannerHref } from "../runtime/routes";
import { CalendarProvider } from "./Calendar";
import "../styles/search.css";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTables } from "../runtime/useTables";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Planner could not start", error, info.componentStack);
  }
  render() {
    if (this.state.failed)
      return (
        <main className="card" role="alert">
          <h1>The planner could not start</h1>
          <p>
            Your saved browser data has not been cleared. Reload this page to
            try again.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload planner
          </button>
          <p>
            <a href={plannerHref("home")}>All planners</a>
          </p>
        </main>
      );
    return this.props.children;
  }
}
function TableSupport({ children }: { children: ReactNode }) {
  useTables();
  return children;
}
export function AppBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <CalendarProvider>
        <TableSupport>{children}</TableSupport>
      </CalendarProvider>
    </ErrorBoundary>
  );
}
