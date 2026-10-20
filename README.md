# Intimetec Money Planner — React migration

All five calculators now have React layouts, shared TypeScript components and a Vite multi-page build, without a database. Existing financial engines and form/result controllers are reused through compatibility modules, preserving calculations, browser storage and report formats. See [MIGRATION.md](MIGRATION.md) for the architecture, local testing, GitHub Pages setup, branch review and rollback steps.

Use Node.js **22.12+** (Node 22 or 24 LTS):

```powershell
npm ci
npm run dev
```

Open the Vite URL, usually `http://127.0.0.1:5173/`. For a production preview, run `npm run build` then `npm run preview` and open `http://127.0.0.1:4173/`.

Before pushing, install the browser once with `npx playwright install chromium --no-shell`, then run `npm run check`. It runs calculation/controller tests, TypeScript, the production build and desktop/mobile browser tests. The workflow checks the `react` branch and pull requests; only `main` deploys by default. To test `react` on the live domain without merging, set the repository Actions variable `PAGES_DEPLOY_BRANCH` to `react`; see the migration guide. In GitHub Pages, select **GitHub Actions** when ready to release. Keep the current custom domain and GoDaddy DNS.

Deploy **only `dist/`**. The build adds CSP and script/style integrity automatically. No database or application secrets are needed. Legacy HTML/CSS/JS and their regression tests are grouped in `bkp/`; edit the React pages in `src/pages/`. Original model documentation is in [bkp/MODEL-NOTES.md](bkp/MODEL-NOTES.md). Some legacy scripts and styles still power the React compatibility layer; `bkp/` remains required for builds.

## Repository layout

- `src/` — React pages, shared components and runtime hooks.
- `web/` — Vite HTML entry points.
- `public/` — production domain, sitemap, robots and favicon.
- `bkp/` — legacy calculators, reused engines/controllers/styles, and regression tests.
- `e2e/` — production browser tests.
- `scripts/` — test runner and build security checks.
- `.github/workflows/` — checks and deployment.

Generated `dist/`, `node_modules/`, `test-results/` and `playwright-report/` are ignored by Git.

For the new repository preview at `https://imsagarjakhar.github.io/calculator/`, use GitHub Actions with repository variables `PAGES_DEPLOY_BRANCH=react` and `PAGES_BASE_PATH=/calculator/`. Leave the new repository’s custom domain empty during testing. Follow [the Pages setup guide](MIGRATION.md#set-up-pages-in-the-new-repository-without-moving-the-domain).
