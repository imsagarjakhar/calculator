# React migration: local testing and GitHub Pages

The `react` branch runs all five calculators through React, TypeScript and Vite. There is no database, login, server API or cloud storage. Existing browser storage keys, report formats, calculation engines and public URLs are preserved.

## 1. Prepare your computer

Install Node.js **22.12 or newer** (Node 22 or 24 LTS) from [nodejs.org](https://nodejs.org/en/download), then close and reopen the VS Code terminal. The old Node 18 installation cannot run this build toolchain.

From the project directory:

```powershell
node --version
npm --version
git branch --show-current
npm ci
npx playwright install chromium --no-shell
```

The branch should be `react`. `npm ci` installs the exact dependency versions recorded in `package-lock.json`. The Chromium download is needed once for automated browser tests, not for normal development.

## 2. Run the React application locally

```powershell
npm run dev
```

Open the URL printed by Vite, usually **http://127.0.0.1:5173/**. Use the same hostname and port to retain your local saved plans. Stop with Ctrl+C. Do not use Live Server, `file://`, or the Python server for the React application: they do not compile the React application. The old reference pages are now inside `bkp/`.

The routes remain:

| Calculator         | Local URL           |
| ------------------ | ------------------- |
| Planner selection  | `/`                 |
| Growth             | `/#growth`          |
| Survival           | `/#survival`        |
| Custom Plan        | `/custom-plan.html` |
| Financial Freedom  | `/freedom.html`     |
| Retirement Buckets | `/bucket-plan.html` |

Localhost and the live domain have separate browser storage. To test a live plan locally, download its original HTML report or JSON file from the live site and import it locally. Moving to React on the **same production HTTPS domain** preserves browser storage; switching domains, browsers or profiles does not move that storage.

## 3. Check the production build before pushing

```powershell
npm run check
```

This runs the existing calculation/controller/security tests, strict TypeScript checks, the Vite production build, production CSP/SRI generation, and real Chromium tests for desktop and mobile. Browser tests target the **built application**, including imports, downloads, persistent data, split investment records, resets, bucket playback/history, native dates, responsive widths and storage-unavailable behavior. Browser runtime, React, resource and CSP errors fail the tests.

To inspect the same production files yourself:

```powershell
npm run build
npm run preview
```

Open **http://127.0.0.1:4173/**. Stop the preview with Ctrl+C when done. `dist/` is generated and ignored by Git; GitHub Actions rebuilds it. Playwright screenshots/traces and its HTML report are ignored too. After a failed browser test, run `npx playwright show-report` to inspect the results.

For an individual check:

```powershell
npm test
npm run typecheck
npm run test:e2e
```

Run `npm run build` before `npm run test:e2e` when source files have changed. The test runner starts its own preview server on port 4173 if none is already running. If you start a preview yourself, it must serve this branch's latest `dist` folder.

## 4. Push and review the migration branch

After reviewing the changed files and passing the checks:

```powershell
git add .
git commit -m "Migrate calculator pages to React and Vite"
git push -u origin react
```

Open the repository's **Actions** tab and check **Test and deploy planners**. Pushes to `react` and pull requests into `main` run tests/builds. They do **not** deploy over the live website. This workflow does not create a public preview URL for the branch; use the local preview while reviewing.

## 5. Change GitHub Pages when ready to release

1. Open `sagarjat/Calculator` on GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**, replacing the branch/root publishing mode. Do this when you are ready for the migration release; keep the existing publishing setup during branch review.
4. Keep the existing **Custom domain** as `intimetec.org` and keep **Enforce HTTPS** enabled. No GoDaddy DNS changes are required when the domain and GitHub Pages repository remain the same.
5. Create a pull request from `react` into `main`, wait for the checks, review and merge it.
6. In **Actions → Test and deploy planners**, wait for both **Tests and production build** and **Deploy main to GitHub Pages** to succeed. The deployment uploads only `dist/`, which contains the four built HTML entry points, bundled assets, `CNAME`, `robots.txt`, `sitemap.xml` and favicon.
7. If GitHub reports an environment protection error, open **Settings → Environments → github-pages** and ensure `main` is allowed to deploy. Keep any existing approval requirements you want for production.
8. Visit the live domain and all calculator links. Test a saved report import, change an input, reload, download a report and check a reset with a disposable plan. Confirm that the domain still uses HTTPS.

Only `main` deploys. A failed test/build blocks deployment. Manual workflow runs also deploy only when the selected branch is `main`. There is no PAT, database password or other application secret to configure.

The app uses Vite's `/` base because production uses a custom domain. Deploying it instead at `username.github.io/Calculator/` would require adjusting the base, resource-integrity path handling and public URLs; it is not the deployment configured here.

References: [Vite GitHub Pages deployment](https://vite.dev/guide/static-deploy.html), [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## 6. Roll back a release if needed

For an ordinary application change, revert the release commit/merge with a new Git commit and push to `main`; the workflow rebuilds and deploys the reverted source after checks. Do not force-push shared history. To roll back the **initial migration** to the old deployment system, first restore the pre-migration version through a reviewed revert/rollback commit, including putting the original HTML/JS/CSS back at the repository root. Then restore Pages **Deploy from a branch → main → / (root)**. The retained originals now live under `bkp/`; GitHub Pages branch publishing cannot select an arbitrary `/bkp` folder. Keep the domain and HTTPS settings. Export any plans you want to keep before testing resets or other destructive plan edits.

## Source layout and compatibility boundary

| Location                         | Responsibility                                                         |
| -------------------------------- | ---------------------------------------------------------------------- |
| `web/*.html`                     | Vite HTML entry points with existing metadata and public filenames     |
| `src/entries/`                   | React application roots and page-specific stylesheet imports           |
| `src/pages/`                     | React calculator layouts and home navigation                           |
| `src/components/`                | Shared typed header/currency/actions and startup error boundary        |
| `src/runtime/`                   | Controller lifetime/cleanup and responsive table observer hook         |
| `bkp/*-engine.js`                | Existing tested financial calculations; reused without formula changes |
| `bkp/` controller/report scripts | Existing tested form/result behavior and import/export validation      |
| `vite.config.mts`                | Multi-page build and compatibility-module bundling                     |
| `scripts/secure-build.cjs`       | CSP and script/style/preload integrity for built pages                 |
| `e2e/`                           | Real production-browser regression tests                               |
| `.github/workflows/pages.yml`    | Branch/PR checks and main-only deployment                              |

This migration makes every calculator available through React, but does not pretend every original JavaScript function has been rewritten into TypeScript or React state. The financial engines and existing event-driven form/result controllers are deliberately reused as bundled, isolated modules. React owns the page layout; controllers own mutable inputs/result containers. Memoized page boundaries prevent React navigation from reconciling those mutable subtrees. The adapters install no engine APIs on `window`, inject no scripts and use no `eval`.

The `bkp/` HTML pages remain compatibility references used by existing regression tests; edit `src/pages/` for the React UI. The Growth controller is still extracted from `bkp/index.html` inline script by the build adapter. If changing that controller, edit its original script and rerun the checks. Shared CSS is reused from `bkp/`; the former home-page inline CSS lives in `src/styles/growth.css`. Future controller changes can be moved to React state incrementally without changing the calculation engines, storage formats or deployment process.

Do not add a build-time secret to a client environment variable: browser bundles are public. Future cloud storage will require its own authentication, data-access policies and an intentional change to the current network-blocking CSP. It is outside this migration.

All 25 original regression suites also live in `bkp/`. `npm test` runs them with that folder as their working directory so their existing relative paths remain valid. For manual legacy security regeneration after changing a compatibility script:

```powershell
Push-Location bkp
node security-policy.js
node bucket-security.js
Pop-Location
npm run check
```

`bkp/` is a compatibility source folder, not disposable build output. Its files are bundled into the React application when needed, but the folder and raw source files are not published to GitHub Pages. Active production metadata lives in `public/`; the matching files in `bkp/` are legacy snapshots.
