# Financial AI Planner design

A warm light theme presents the product as a calm financial workbook.
The homepage helps visitors choose a calculator; calculators prioritize entering,
comparing and saving a plan. Existing routes, model behavior and integrations are
preserved.

- Newsreader, self-hosted under its SIL Open Font License, supplies the editorial
  headings and wordmark. Segoe UI supplies controls and readable body copy.
- Warm ivory backgrounds, white surfaces, dark forest headings and green actions give the
  homepage and shared calculator shell one visual voice. Chart colors retain their categories with darker strokes for light surfaces.
- The planner directory is a visual shelf: two larger tinted entries for salary
  budgeting and loan decisions, followed by six compact white tool cards. Use
  short descriptions, consistent authored line icons, and clear actions. Budget
  categories and the repay/invest choice provide a conceptual preview without
  invented financial results. Avoid gradients, uppercase labels and icon tiles.
- The homepage pairs an introduction with three real starting questions. All
  planners remain available in the directory, followed by the guide and FAQ.
- At narrow widths, sections stack in reading order. Keep every planner reachable,
  controls touchable, focus visible and data tables independently scrollable.
- Shared styles live in `src/styles/design-system.css`, imported after each
  entry's existing styles. Shared headers and navigation inherit these rules.
- Production CSP permits same-origin fonts only; no third-party font service is
  needed at runtime. Offline reports retain their existing self-contained styles.

Verification: desktop at 1440px and mobile at 390px and 320px; run `npm run check`
for models, security, production build and desktop/mobile browser coverage.

The salary planner follows income → expenses → bill reserves → emergency reserve →
available investment → goal check. An explicit remaining-money banner precedes a
single return assumption, starting at 12%. Goal inputs evaluate that investment;
they never add a second monthly allocation. The snapshot lists emergency saving
and monthly investment separately. An SVG chart distinguishes contributed money,
projected balance, the goal and an optional annual step-up, with an accessible
month slider. Extra monthly funding and yearly step-ups are alternatives, not
automatic salary deductions. The old independent goal-return field is superseded;
saved inputs and custom investment amounts remain recoverable when switching
off automatic investment of the available balance.

Fresh salary budgets and Reset start with all monetary inputs at zero. Existing
saved budgets remain intact. Keep return assumptions and valid time periods;
the worked sample is available only through an explicit Load example plan
action. Suppress shortfall dialogs while total income is zero, and show an
income-entry prompt instead of claiming an empty budget is fully assigned.

The loan planner opens with an empty personal loan list and an optional example.
Its primary task is a neutral decision comparison: declare extra/total repayment
money or import a salary snapshot, list loans, then optionally add spare savings
and rental assets. Rank interest rates without labeling debt morally. Cash-only
debt and net-wealth charts use the same starting wealth and non-rental commitment,
include lost rent and sale/settlement costs, and keep emergency cash protected.
The main comparison shows one balance graph per loan and a two-path net-wealth
graph: repay extra versus invest the surplus while continuing required EMIs.
The investment return can be adjusted beside the graph; fees and tax remain
explicit. Extra payments are allocated across loans once, never duplicated per
loan. These primary graphs use only the declared monthly budget. Spare-savings
and asset-sale scenarios sit under a separate optional disclosure, along with
the original four-strategy detail view. Negative funding is visible rather
than silently financed. Never present a modeled asset sale as a recommendation.

Loan funding is a single total budget, covering required EMIs first. One checkbox
copies the salary planner's saved monthly investment allocation; when unchecked,
one amount input replaces the read-only source value. No second salary form or
extra-versus-total selector is shown. Importing changes only this budget/source
and matching currency, never existing loans, assets or emergency/spare savings.

The home page has a shared currency selector. The browser remembers this choice
across routes; planner selectors update the same preference. Home guide examples,
planner labels, charts and authored examples use that currency, with Indian
digit grouping only for INR. Amounts are not exchange-rate converted. Growth
retains its existing currency-change reset of SIP, goal and extra deposits;
currency-specific asset and expense lists remain separate. Imported reports
keep their stated currency and update the shared preference to match.

Freedom offers two explicit income methods: a monthly spending target or a
2–6% annual withdrawal from the corpus projected at the chosen stop-work age
(3% by default). The spending method displays its annualized percentage of that
age's projected corpus, after inflating the monthly goal. The corpus method
shows eligible corpus × rate ÷ 12, today's purchasing power and later shortfalls;
it must not imply that an automatically derived income covers living costs.
Older saved spending goals keep their method. Field details use accessible,
keyboard- and touch-operable info disclosures instead of long inline help.

The Finance Basics guide lives at `/learn/`, linked from the home navigation,
intro and every page's footer. It combines five interactive lessons (SIP, SWP,
return, inflation and EMI), authored SVG illustrations, optional play/pause,
keyboard-accessible sliders and a short quiz for each idea. A searchable,
category-filtered glossary covers the vocabulary used in the planners. Examples
follow the shared currency and separate contributions, growth and withdrawals.
Animation starts only on request and respects reduced-motion settings. The full
initial guide and glossary are prerendered for reading without JavaScript;
controls enhance them in the browser. Link primary investor education sources.
