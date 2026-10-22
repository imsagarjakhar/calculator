export type PlannerRoute =
  | "home"
  | "learn"
  | "growth"
  | "survival"
  | "custom-plan"
  | "freedom"
  | "bucket-plan"
  | "salary-budget"
  | "loan-payoff";
export function plannerHref(route: PlannerRoute): string {
  return import.meta.env.BASE_URL + (route === "home" ? "" : route + "/");
}

export function normalizePlannerUrl() {
  const base = import.meta.env.BASE_URL;
  const localPath = location.pathname.slice(base.length);
  let route: PlannerRoute | undefined;
  let hash = location.hash;
  if (localPath === "index.html") route = "home";
  if (localPath === "" || localPath === "index.html") {
    if (hash === "#growth" || hash === "#survival") {
      route = hash.slice(1) as "growth" | "survival";
      hash = "";
    }
  }
  for (const name of [
    "growth",
    "survival",
    "custom-plan",
    "freedom",
    "bucket-plan",
  ] as const) {
    if (localPath === name + ".html" || localPath === name + "/index.html")
      route = name;
  }
  if (route)
    history.replaceState(null, "", plannerHref(route) + location.search + hash);
}

export function homeScreenFromLocation(): "home" | "growth" | "survival" {
  const localPath = location.pathname.slice(import.meta.env.BASE_URL.length);
  if (localPath === "growth/") return "growth";
  if (localPath === "survival/") return "survival";
  return "home";
}
