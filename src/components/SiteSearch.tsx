import { useEffect, useId, useRef, useState } from "react";
import {
  searchPages,
  isTrustPage,
  isLearningPage,
} from "../content/search.mjs";
import { guideChapters } from "../content/planningExamples";
import { terms } from "../content/financeBasics";
import { plannerHref, type PlannerRoute } from "../runtime/routes";
import type { VlogSummary } from "../vlogs/repository";
import "../styles/site-search.css";

type Entry = {
  title: string;
  description: string;
  href: string;
  kind: string;
  aliases?: string;
};
const aliases: Partial<Record<PlannerRoute, string>> = {
  "salary-budget":
    "spending expenses income paycheck bills cash budget money left emergency savings",
  "loan-payoff":
    "pay off debt pay my loans repay mortgage credit card emi interest debt free",
  freedom:
    "retire early stop working financial independence fire retirement age freedom",
  growth: "grow money invest monthly sip compound interest wealth step up",
  survival:
    "money running out how long savings last withdraw swp pension retirement income",
  "bucket-plan":
    "retirement buckets living costs emergency reserve long term growth refill",
  "custom-plan":
    "custom monthly plan bonus extra deposit assets investments loans",
  learn:
    "what is meaning explain beginner dictionary finance terms learn sip swp return",
  guides:
    "worked examples how calculation budget bill reserve repayment invest inflation retirement income yield",
};
const entries: Entry[] = [
  ...Object.entries(searchPages).map(([route, page]) => ({
    title: page.name,
    description: page.description,
    href: plannerHref(route as PlannerRoute),
    kind: isTrustPage(route)
      ? "Website information"
      : isLearningPage(route)
        ? "Guide"
        : "Planner",
    aliases: aliases[route as PlannerRoute],
  })),
  ...guideChapters.map((chapter) => ({
    title: chapter.title,
    description: chapter.summary,
    href: plannerHref("guides") + "#" + chapter.id,
    kind: "Worked example",
  })),
  {
    title: "Financial planning guide",
    description:
      "A practical starting point for your budget, savings and financial goals.",
    href: plannerHref("home") + "#financial-planning",
    kind: "Guide",
  },
  {
    title: "Blog",
    description: "Money conversations, practical ideas and the latest updates.",
    href: plannerHref("home") + "#vlogs",
    kind: "Blog",
  },
  ...terms.map((term) => ({
    title: term.full ? `${term.name} · ${term.full}` : term.name,
    description: term.meaning,
    href:
      plannerHref("learn") +
      "?term=" +
      encodeURIComponent(term.name) +
      "#term-library",
    kind: "Finance term",
  })),
];
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const ignored = new Set([
  "i",
  "my",
  "the",
  "a",
  "an",
  "to",
  "can",
  "how",
  "do",
  "is",
  "of",
  "with",
  "want",
  "will",
  "me",
]);
export function searchWebsite(
  query: string,
  posts: VlogSummary[] = [],
): Entry[] {
  const q = normalize(query);
  if (!q) return [];
  const words = q.split(" ").filter((word) => !ignored.has(word));
  if (!words.length) return [];
  const all: Entry[] = [
    ...entries,
    ...posts.map((post) => ({
      title: post.title,
      description: post.summary,
      href:
        plannerHref("home") + "?post=" + encodeURIComponent(post.id) + "#vlogs",
      kind: "Blog post",
    })),
  ];
  return all
    .map((entry) => {
      const title = normalize(entry.title);
      const content = normalize(
        `${entry.title} ${entry.description} ${entry.aliases || ""}`,
      );
      const matches = words.filter((word) =>
        content.split(" ").some((token) => token.startsWith(word)),
      );
      const score =
        (matches.length / words.length) * 10 +
        (title.includes(q) ? 12 : 0) +
        words.filter((word) => title.split(" ").includes(word)).length * 3;
      return { entry, score, coverage: matches.length / words.length };
    })
    .filter((row) => row.coverage >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 7)
    .map((row) => row.entry);
}

export function SiteSearch() {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState<VlogSummary[]>([]);
  const [feedState, setFeedState] = useState("idle");
  useEffect(() => {
    if (!open || feedState !== "idle") return;
    setFeedState("loading");
    void import("../vlogs/client")
      .then((client) => client.loadFeed())
      .then((feed) => {
        setPosts(feed.posts);
        setFeedState("ready");
      })
      .catch(() => setFeedState("unavailable"));
  }, [open, feedState]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const results = searchWebsite(query, posts);
  return (
    <div
      className="site-search"
      ref={root}
      role="search"
      aria-label="Search this website"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          root.current?.querySelector("input")?.focus();
          setOpen(false);
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          const controls = [
            ...(root.current?.querySelectorAll<HTMLElement>("input, a") || []),
          ];
          const index = controls.indexOf(document.activeElement as HTMLElement);
          controls[
            (index + (event.key === "ArrowDown" ? 1 : controls.length - 1)) %
              controls.length
          ]?.focus();
          event.preventDefault();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </svg>
      <input
        type="search"
        aria-label="Search website"
        placeholder="Search anything…"
        value={query}
        aria-controls={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && results[0])
            window.location.assign(results[0].href);
        }}
      />
      {open && (
        <div className="site-search-results" id={id}>
          <p className="site-search-hint">
            {query.trim()
              ? "Explore your matches"
              : "What would you like to understand?"}
          </p>
          {!query.trim() ? (
            <div className="site-search-suggestions">
              {["Pay my loans", "Retire early", "What is SIP"].map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => setQuery(phrase)}
                >
                  {phrase}
                </button>
              ))}
            </div>
          ) : results.length ? (
            <ul>
              {results.map((result) => (
                <li key={result.href}>
                  <a href={result.href} onClick={() => setOpen(false)}>
                    <small>{result.kind}</small>
                    <strong>{result.title}</strong>
                    <span>{result.description}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p role="status">No matches yet. Try “budget”, “loan” or “SIP”.</p>
          )}
          <p className="site-search-note">
            Search stays on your device. Planners, guides, finance terms &amp;
            blog titles.
            {feedState === "loading" && " Loading blog titles…"}
            {feedState === "unavailable" &&
              " Blog titles are unavailable; try the Blog page."}
          </p>
        </div>
      )}
    </div>
  );
}
