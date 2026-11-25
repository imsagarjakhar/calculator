import { plannerHref, type PlannerRoute } from "../runtime/routes";
import { ToolScene } from "./ToolScene";
import "../styles/topic-directory.css";

type TopicLink = {
  label: string;
  route: PlannerRoute;
  hash?: string;
  className?: string;
};
type Topic = {
  name: string;
  scene: string;
  tone: string;
  description: string;
  links: TopicLink[];
};

const topics: Topic[] = [
  {
    name: "Investment",
    scene: "growth",
    tone: "sage",
    description:
      "See how monthly contributions build over time and follow the markets you invest in.",
    links: [
      {
        label: "SIP growth planner",
        route: "growth",
        className: "growth-choice",
      },
      {
        label: "Global markets",
        route: "markets",
        className: "markets-choice",
      },
    ],
  },
  {
    name: "Retirement",
    scene: "freedom",
    tone: "sand",
    description:
      "Set an income goal, then plan which savings to draw from and when.",
    links: [
      { label: "Custom Retirement Plan", route: "freedom" },
      { label: "Bucket Strategy", route: "bucket-plan" },
      {
        label: "Withdrawal planner",
        route: "survival",
        className: "survival-choice",
      },
    ],
  },
  {
    name: "Learning & Blog",
    scene: "vlog",
    tone: "mint",
    description:
      "Understand a finance term, work through an example or read a fresh perspective.",
    links: [
      { label: "Learn finance", route: "learn" },
      { label: "Worked examples", route: "guides" },
      {
        label: "Blog",
        route: "home",
        hash: "#vlogs",
        className: "vlog-choice",
      },
    ],
  },
  {
    name: "Calculators & Currency Converter",
    scene: "currency",
    tone: "sage",
    description:
      "Find a calculator for a specific question or convert an amount between currencies.",
    links: [
      { label: "All calculators", route: "all-calculators" },
      {
        label: "Currency converter",
        route: "currency-converter",
        className: "currency-choice",
      },
    ],
  },
  {
    name: "Loan Repayment",
    scene: "loan",
    tone: "sand",
    description:
      "Compare repayment schedules and see what an extra payment could save.",
    links: [
      { label: "Loan payoff planner", route: "loan-payoff" },
      {
        label: "Home loan EMI",
        route: "all-calculators",
        hash: "#home-loan-emi",
      },
    ],
  },
  {
    name: "Salary Planning",
    scene: "salary",
    tone: "mint",
    description:
      "Split take-home pay between bills, spending and savings before your next payday.",
    links: [
      { label: "Salary Plan", route: "salary-budget" },
      {
        label: "Monthly plan",
        route: "custom-plan",
        className: "custom-choice",
      },
    ],
  },
];

export function ExploreDirectory() {
  return (
    <section
      id="explore"
      className="topic-directory tool-directory"
      aria-labelledby="explore-title"
    >
      <h2 id="explore-title">Explore money</h2>
      <div className="topic-grid" id="planners">
        {topics.map(({ name, scene, tone, description, links }) => (
          <article className="topic-tile" key={name}>
            <div className={"topic-art " + tone}>
              <ToolScene kind={scene} />
            </div>
            <div className="topic-copy">
              <h3>{name}</h3>
              <p>{description}</p>
              <div className="topic-links">
                {links.map(({ label, route, hash, className }) => (
                  <a
                    key={label}
                    className={className}
                    href={plannerHref(route) + (hash ?? "")}
                    data-screen={
                      route === "growth" || route === "survival"
                        ? route
                        : undefined
                    }
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
