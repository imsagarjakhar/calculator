import { useEffect, useState, type MouseEvent } from "react";
import { HomeContent } from "./HomeContent";
import { GrowthPage } from "./GrowthPage";
import { SurvivalPage } from "./SurvivalPage";

type Screen = "home" | "growth" | "survival";
function readScreen(): Screen {
  const hash = location.hash.slice(1);
  return hash === "growth" || hash === "survival" ? hash : "home";
}
export function HomePage() {
  const [screen, setScreen] = useState<Screen>(readScreen);
  useEffect(() => {
    const pop = () => setScreen(readScreen());
    window.addEventListener("popstate", pop);
    window.addEventListener("hashchange", pop);
    return () => {
      window.removeEventListener("popstate", pop);
      window.removeEventListener("hashchange", pop);
    };
  }, []);
  useEffect(() => {
    const colors: Record<string, string> = {
      MF: "#2bdbb0",
      FD: "#56b8f5",
      Gold: "#ffce63",
    };
    const selected =
      document.querySelector<HTMLElement>('[data-type][aria-pressed="true"]')
        ?.dataset.type || "MF";
    document.documentElement.style.setProperty(
      "--accent",
      screen === "home"
        ? "#2bdbb0"
        : screen === "survival"
          ? "#ffce96"
          : colors[selected],
    );
    const selector =
      screen === "home"
        ? "#welcomeTitle"
        : screen === "survival"
          ? "#survivalTitle"
          : "#growthScreen h1";
    const title = document.querySelector<HTMLElement>(selector);
    if (title instanceof HTMLElement) {
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
    }
    window.scrollTo(0, 0);
  }, [screen]);
  function navigate(event: MouseEvent<HTMLElement>) {
    const button = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-screen]",
    );
    const next = button?.dataset.screen;
    if (next !== "home" && next !== "growth" && next !== "survival") return;
    history.pushState(
      null,
      "",
      next === "home" ? location.pathname + location.search : "#" + next,
    );
    setScreen(next);
  }
  return (
    <main onClick={navigate}>
      <nav
        id="plannerNav"
        className="planner-nav"
        aria-label="Financial planners"
        hidden={screen === "home"}
      >
        <button type="button" data-screen="home" className="ghost">
          ← All planners
        </button>
        <div className="view-switch">
          <button
            type="button"
            data-screen="growth"
            aria-pressed={screen === "growth"}
          >
            Growth
          </button>
          <button
            type="button"
            data-screen="survival"
            aria-pressed={screen === "survival"}
          >
            Survival
          </button>
        </div>
      </nav>
      <div hidden={screen !== "home"}>
        <HomeContent />
      </div>
      <div hidden={screen !== "growth"}>
        <GrowthPage />
      </div>
      <div hidden={screen !== "survival"}>
        <SurvivalPage />
      </div>
    </main>
  );
}
