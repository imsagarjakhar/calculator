# Financial AI Planner — React migration

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
Restart the runner service after changing its environment, and keep the Actions
runner software updated for the pinned actions.

After pushing this workflow, select **Actions → Test and deploy planners → Run
workflow** on the branch selected by `PAGES_DEPLOY_BRANCH` (default: `main`).
GitHub Pages must use **GitHub Actions** as its publishing source. Existing
branch selection, base path, custom domain and deployment permissions still
apply. The separate optional Cloudflare vlog API workflow remains on Ubuntu.

The homepage also supports runtime vlogs stored as files in `imsagarjakhar/vlog`. A separate Cloudflare Worker authenticates the publisher and writes posts using server-side secrets. **Never embed a GitHub token in the website build.** Follow the [one-time runtime vlog setup](MIGRATION.md#runtime-vlogs-one-time-setup); posts require no website deployment after setup.

## Repository layout

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
