# Financial AI Planner — React migration

The loan planner now accepts individually entered loans, one total monthly
repayment budget or the salary planner's saved monthly investment amount, spare savings outside the
emergency fund, and up to eight assets. Cash-only scenarios compare required
EMIs, monthly prepayments, an upfront savings payment, and selling one asset at a
time. They include rent/vacancy/running costs, linked-loan settlement, sale costs
and entered tax estimates, sale-only replacement costs, and retained asset value.
Debt and net-wealth charts, cost bars and monthly schedules explain trade-offs;
there is no buy/sell recommendation. Investment alternatives use their own stated
basis. `test:loans` includes ledger and asset-scenario regression checks. New
fields are optional, so saved plans and exported reports remain restorable.
One checkbox selects the saved investment amount; unchecking it reveals one
editable repayment input. Required EMIs come from that total and are not added
again. Salary import leaves loans, assets and emergency/spare savings untouched.

The salary planner invests the balance after living expenses, bill reserves,
emergency saving and cash set aside. Its goal check evaluates that same investment,
with a 12% editable return assumption, years plus months, a contribution/growth
chart and annual step-up scenarios. A goal recommendation is not another monthly
expense. Older saved plans retain their goal and expense inputs; the redesigned
forecast starts at 12%, and the previous custom investment is available by turning
off “Invest the full available amount”. Reports include the actual investment,
goal projection and step-up assumption.

The calculators have React layouts, shared TypeScript components and a Vite multi-page build, without a database. Existing financial engines and form/result controllers are reused through compatibility modules, preserving calculations, browser storage and report formats. The new standalone Monthly Salary & Budget Planner is available at `/salary-budget/`, with its own TypeScript calculation model. See [MIGRATION.md](MIGRATION.md) for the architecture, local testing, GitHub Pages setup, branch review and rollback steps.

Use Node.js **22.12+** (Node 22 or 24 LTS):

```powershell
npm ci
npm run dev
```

Open the Vite URL, usually `http://127.0.0.1:5173/`. For a production preview, run `npm run build` then `npm run preview` and open `http://127.0.0.1:4173/`.

Before pushing, install the browser once with `npx playwright install chromium --no-shell`, then run `npm run check`. It runs calculation/controller tests, TypeScript, the production build and desktop/mobile browser tests. The workflow checks the `react` branch and pull requests; only `main` deploys by default. To test `react` on the live domain without merging, set the repository Actions variable `PAGES_DEPLOY_BRANCH` to `react`; see the migration guide. In GitHub Pages, select **GitHub Actions** when ready to release. Keep the current custom domain and GoDaddy DNS.

Deploy **only `dist/`**. The build adds CSP and script/style integrity automatically. The calculators need no database or application secrets. Legacy HTML/CSS/JS and their regression tests are grouped in `bkp/`; edit the React pages in `src/pages/`. Original model documentation is in [bkp/MODEL-NOTES.md](bkp/MODEL-NOTES.md). Some legacy scripts and styles still power the React compatibility layer; `bkp/` remains required for builds.

### Windows deployment runner

The Pages workflow uses a self-hosted runner with the labels `self-hosted`,
`Windows`, and `X64` for pushes and manual runs, including the deployment job.
These match the registered `ITT-SAGAR-C` runner. Pull-request checks continue on
GitHub-hosted Ubuntu. If more runners receive the same labels, any matching
runner can receive these jobs.

Keep the runner online while a workflow runs. Its service account needs Git for
Windows and network access to GitHub, npm and the
Playwright browser downloads. The workflow installs Node 22 and Chromium, then
runs the existing tests and production build before uploading `dist/`. The
Windows preparation step locates Git through its executable and standard install
directories, then puts its paired Bash and GNU tar first on `PATH` for the Pages
archive. Git's `usr\bin` does not have to be on the service account's initial PATH.
The Windows job reuses npm's persistent local cache without transferring it to
GitHub Actions cache storage. Hosted Linux checks still use the npm cache action.
This avoids the long `setup-node` restore and post-job archive steps observed on
the Windows runner; all build, browser and deployment checks remain enabled.
Restart the runner service after changing its environment, and keep the Actions
runner software updated for the pinned actions.

After pushing this workflow, select **Actions → Test and deploy planners → Run
workflow** on the branch selected by `PAGES_DEPLOY_BRANCH` (default: `main`).
GitHub Pages must use **GitHub Actions** as its publishing source. Existing
branch selection, base path, custom domain and deployment permissions still
apply. The separate optional Cloudflare vlog API workflow remains on Ubuntu.

The homepage also supports runtime vlogs stored as files in `imsagarjakhar/vlog`. A separate Cloudflare Worker authenticates the publisher and writes posts using server-side secrets. **Never embed a GitHub token in the website build.** Follow the [one-time runtime vlog setup](MIGRATION.md#runtime-vlogs-one-time-setup); posts require no website deployment after setup.

### Private blog repository migration

Keep `imsagarjakhar/vlog` public until both deployments below are verified.

1. Verify the existing `GH_VLOG_TOKEN` has **Contents: Read and write** access to
   that repository, including access after it becomes private. It stays in the
   GitHub Actions/Worker secrets; never put it in a `VITE_*` variable.
2. In the calculator repository's **Settings → Secrets and variables → Actions**,
   verify `VLOG_API_ENABLED=true`, `VLOG_API_ORIGIN` is the existing Worker HTTPS
   origin, and `PAGES_DEPLOY_BRANCH` selects the branch containing this change
   (default: `main`). Preserve the existing Cloudflare and publisher secrets.
3. Push these changes to the deployment branch. Run **Deploy vlog publishing API**
   and wait for success. Its new read routes are `GET /public/posts` and
   `GET /public/posts/<id>`; mutation routes still require a publisher session.
4. After the Worker succeeds, run **Test and deploy planners** on the same branch.
   The site workflow checks the live Worker's health and public feed before
   uploading the new site. If the Worker is not ready, it stops the website
   deployment; run the site workflow again after the Worker succeeds. `VLOG_API_ORIGIN`
   becomes `VITE_VLOG_API_ORIGIN` during the site build.
5. On the live website, log out and open the blog in an incognito window. In the
   browser Network panel, confirm the feed and article requests go to the Worker's
   `/public/posts` routes, return 200, and no blog reads go to `api.github.com` or
   `raw.githubusercontent.com`. Check publishing, editing and deletion while
   logged in, using a temporary test article.
6. Only after those checks, open **imsagarjakhar/vlog → Settings → General →
   Danger Zone → Change repository visibility → Private**. This changes the
   content repository, not the calculator website repository.
7. Repeat the logged-out reading and publisher checks. The website's published
   articles remain public; direct unauthenticated repository access does not.

The Worker reads the index and each article from one Git commit, exposes only
articles listed in `vlogs/index.json`, and returns validated article fields.
It does not expose arbitrary files, history or the repository token. The site
does not fall back to public GitHub when a configured Worker fails. Builds with
no API origin retain the original public-repository reader for local previews;
such builds must not be deployed after the repository becomes private.

## Search visibility and release checks

`npm run build` prerenders all nine public pages with readable fields,
instructions, methods and links before JavaScript runs. Each page has a
topic-specific title and description, canonical URL and sitemap entry;
`robots.txt` points to the sitemap. Keep these aligned when adding routes.
See [Google’s JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

After deploying:

1. [Verify the `intimetec.org` Domain property](https://support.google.com/webmasters/answer/9008080)
   in Google Search Console using its DNS instructions.
2. [Submit the sitemap](https://support.google.com/webmasters/answer/7451001):
   `https://intimetec.org/sitemap.xml`.
3. [Inspect the homepage and main planner URLs](https://support.google.com/webmasters/answer/9012289),
   check Google’s rendered content and selected canonical, then request indexing
   where appropriate.
4. In [Performance](https://support.google.com/webmasters/answer/7576553), filter
   by page and monitor queries, impressions and clicks. Focus content on useful
   questions: SIP step-up, monthly salary budget, loan repayment vs investing,
   SWP, FIRE, retirement buckets and finance terms.

Indexing and rankings are not guaranteed. The blog still uses `#vlogs`;
individual articles need dedicated, crawlable URLs before treating them as
separate search landing pages. [Google discourages fragment-based content URLs](https://developers.google.com/search/docs/crawling-indexing/url-structure).

## Repository layout

The beginner guide at `/learn/` teaches SIP, SWP, returns, inflation and EMI with
interactive illustrations, sliders and quick quizzes. Its searchable glossary
and examples are maintained in `src/content/financeBasics.ts`. Currency follows
the shared site preference. The initial guide is prerendered so definitions can
be read without JavaScript. Run `npm run test:learn` for the example math checks.

The standalone **Loan Payoff & Investment Planner** is at `/loan-payoff/`. It compares highest-interest-first, smallest-balance-first, investing and a configurable split, with a shared monthly commitment and horizon. It supports multiple fixed-rate loans, prepayment fees/lock-ins, explicit tax assumptions, return sensitivity, salary-budget import and an exportable/restorable plan. Method references and assumptions are linked in the page. Run `npm run test:loans` for the model tests.

- `src/` — React pages, shared components and runtime hooks.
- `web/` — Vite HTML entry points.
- `public/` — production domain, sitemap, robots and favicon.
- `bkp/` — legacy calculators, reused engines/controllers/styles, and regression tests.
- `e2e/` — production browser tests.
- `scripts/` — test runner and build security checks.
- `.github/workflows/` — checks and deployment.

Generated `dist/`, `node_modules/`, `test-results/` and `playwright-report/` are ignored by Git.

For the new repository preview at `https://imsagarjakhar.github.io/calculator/`, use GitHub Actions with repository variables `PAGES_DEPLOY_BRANCH=react` and `PAGES_BASE_PATH=/calculator/`. Leave the new repository’s custom domain empty during testing. Follow [the Pages setup guide](MIGRATION.md#set-up-pages-in-the-new-repository-without-moving-the-domain).
