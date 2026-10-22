import { plannerHref, type PlannerRoute } from "../runtime/routes";

type Tool = {
  route: PlannerRoute | "blog";
  style: string;
  title: string;
  copy: string;
  action: string;
  icon: string;
};
const tools: Tool[] = [
  {
    route: "salary-budget",
    style: "salary",
    title: "Give your salary a plan.",
    copy: "Make room for bills, everyday life and the goals ahead.",
    action: "Plan my monthly budget",
    icon: "M3 7h16v14H3V7Zm0 0V4h13v3m-2 5h7v5h-7v-5Zm3 2.5h.01",
  },
  {
    route: "loan-payoff",
    style: "loan",
    title: "Find a better way out of debt.",
    copy: "See each loan clearly. Compare paying extra with investing.",
    action: "Compare my loan options",
    icon: "M4 4v16h16M7 8l4 4 4-3 5 7m-5 0h5v-5",
  },
  {
    route: "growth",
    style: "growth",
    title: "SIP growth",
    copy: "Turn a monthly habit into a long-term investment outlook.",
    action: "Open SIP planner",
    icon: "M3 20h18M6 16v-4m6 4V9m6 7V5M5 8l6-4 4 2 5-4",
  },
  {
    route: "survival",
    style: "survival",
    title: "Retirement withdrawals",
    copy: "Explore how long your savings could support your spending.",
    action: "Explore corpus survival",
    icon: "M8 3h8M8 21h8M7 3v4l10 10v4M17 3v4L7 17v4M9 18h6",
  },
  {
    route: "custom-plan",
    style: "custom",
    title: "Custom Plan",
    copy: "Map monthly investments, bonuses and loan payments your way.",
    action: "Build a monthly plan",
    icon: "M4 5h16M4 12h16M4 19h16M8 3v4m8 3v4m-6 3v4",
  },
  {
    route: "freedom",
    style: "freedom",
    title: "Financial freedom",
    copy: "Connect your future corpus with the monthly income you want.",
    action: "Find my freedom age",
    icon: "M12 3v3m0 12v3M3 12h3m12 0h3M6 6l2 2m8 8 2 2M6 18l2-2m8-8 2-2M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0",
  },
  {
    route: "bucket-plan",
    style: "retirement",
    title: "Retirement buckets",
    copy: "Separate daily living, emergencies and long-term growth.",
    action: "Plan my retirement buckets",
    icon: "M3 9h5l-1 12H4L3 9Zm7-4h5l-1 16h-3L10 5Zm7 7h5l-1 9h-3l-1-9ZM4 6V4m8-2V1m7 8V7",
  },
  {
    route: "blog",
    style: "vlog",
    title: "Blog & ideas",
    copy: "Fresh perspectives and practical ways to think about money.",
    action: "View all blogs",
    icon: "M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3V4Zm9 2v16M6 8h2m-2 4h2m8-4h2m-2 4h2",
  },
];

function ToolIcon({ path }: { path: string }) {
  return (
    <svg
      className="tool-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}
function Arrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  );
}
function BudgetPreview() {
  return (
    <span className="tool-budget-preview" aria-hidden="true">
      <span>One salary. A little more clarity.</span>
      <span className="tool-budget-track">
        <i />
        <i />
        <i />
      </span>
      <span className="tool-preview-key">
        <span>
          <i /> Living
        </span>
        <span>
          <i /> Goals
        </span>
        <span>
          <i /> Room to grow
        </span>
      </span>
    </span>
  );
}
function LoanPreview() {
  return (
    <span className="tool-loan-preview" aria-hidden="true">
      <span>Your extra money</span>
      <span className="tool-loan-paths">
        <span>
          Pay loans faster
          <Arrow />
        </span>
        <span>
          Invest instead
          <Arrow />
        </span>
      </span>
    </span>
  );
}
export function PlannerDirectory() {
  return (
    <section className="tool-directory" aria-labelledby="toolDirectoryTitle">
      <div className="planner-directory-heading" id="planners">
        <h2 id="toolDirectoryTitle">A tool for every chapter.</h2>
        <p>Start with today. Make room for tomorrow.</p>
      </div>
      <div className="planner-choices has-custom has-freedom tool-directory-grid">
        {tools.map((tool, index) => (
          <a
            key={tool.route}
            href={tool.route === "blog" ? "#vlogs" : plannerHref(tool.route)}
            data-screen={
              tool.route === "growth" || tool.route === "survival"
                ? tool.route
                : undefined
            }
            className={`choice ${tool.style}-choice tool-card${index < 2 ? " tool-feature" : ""}`}
          >
            <span className="tool-card-heading">
              <ToolIcon path={tool.icon} />
              <strong>{tool.title}</strong>
            </span>
            <span className="choice-copy">{tool.copy}</span>
            {index === 0 ? (
              <BudgetPreview />
            ) : index === 1 ? (
              <LoanPreview />
            ) : null}
            <span className="choice-link">
              {tool.action}
              <span className="tool-open-arrow">
                <Arrow />
              </span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
