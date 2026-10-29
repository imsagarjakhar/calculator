import { plannerHref, type PlannerRoute } from "../runtime/routes";
import { guideChapters } from "../content/planningExamples";
import "../styles/worked-example-links.css";

export function WorkedExampleLink({ route }: { route: PlannerRoute }) {
  const chapter =
    guideChapters.find((c) => c.route === route) ?? guideChapters[4];
  return (
    <section
      className="planner-worked-example"
      aria-label="Worked example for this planner"
    >
      <span aria-hidden="true">↗</span>
      <div>
        <h2>Understand the result</h2>
        <p>{chapter.summary}</p>
        <a href={plannerHref("guides") + "#" + chapter.id}>{chapter.title} →</a>
      </div>
    </section>
  );
}
export function WorkedGuidesPreview() {
  return (
    <section
      className="home-worked-guides"
      aria-labelledby="worked-guides-home-title"
    >
      <div>
        <p className="eyebrow">BEFORE YOU CHOOSE A NUMBER</p>
        <h2 id="worked-guides-home-title">See a plan worked through.</h2>
        <p>Real questions, invented examples, visible calculations.</p>
      </div>
      <div className="home-worked-grid">
        {guideChapters.slice(0, 3).map((chapter, i) => (
          <a key={chapter.id} href={plannerHref("guides") + "#" + chapter.id}>
            <span>0{i + 1}</span>
            <h3>{chapter.title}</h3>
            <p>{chapter.summary}</p>
            <strong>Read the worked example ↗</strong>
          </a>
        ))}
      </div>
      <a className="home-worked-all" href={plannerHref("guides")}>
        All five worked examples →
      </a>
    </section>
  );
}
