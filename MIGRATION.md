# React migration: local testing and GitHub Pages

The `react` branch runs all five calculators through React, TypeScript and Vite, without a calculator database. Existing browser storage keys, report formats, calculation engines and public URLs are preserved. The optional runtime vlog feature uses a separate public content repository and a Cloudflare publishing API; it never stores calculator plans.

## 1. Prepare your computer

### Loan payoff preview

`/loan-payoff/` is a standalone, `noindex` preview with a standard homepage card. `src/loans/model.ts` implements the comparison and `src/pages/LoanPage.tsx` provides the UI. The isolated local storage key is `intimetec-loan-payoff-v1`; JSON exports can be imported again. Reading an existing salary budget excludes its EMI category from living costs and clears sample loans, so users enter real lender balances without double-counting debt payments.

Every strategy uses the initial required EMIs plus the chosen extra monthly amount. Fixed monthly interest accrues first, required payments follow, then extra principal and any proportional prepayment fees; unused cash and tax credits are invested at month end. Paid-off EMIs remain in the commitment. Prepayments reduce tenure, not scheduled EMI size. Lock-ins block extra payments for their entered duration. Interest tax relief uses an effective user-entered percentage and is modeled as a monthly cash refund. Investment fees reduce the effective annual return multiplicatively; investment tax is applied to positive total gains at the chosen horizon. No jurisdiction-specific tax rules or guaranteed returns are built in.

Results compare after-tax investments plus protected emergency cash minus outstanding debt, at the same horizon. The highest-interest heuristic uses interest rate times `(1 - effective tax relief)`; it does not claim global optimality with fees or restrictions. The break-even scan covers annual returns from -50% to +50% at 5-point intervals, then bisects detected crossings. The UI identifies ties and multiple detected crossings and explains the scan's limits. Revolving minimums, floating rates, fixed prepayment charges, lender payment caps, tax caps/timing, inflation and changing salary/expenses are outside this first version.

The model is covered by `npm run test:loans`, including independent amortization, fee budgets, lock-ins, break-even and 60 mixed cash-flow reconciliations. `e2e/loans.spec.ts` checks desktop/mobile comparisons, the monthly guide, affordability blocking, JSON restoration, salary import and unavailable storage. The page links original method explanations from Ramsey Solutions, Ramit Sethi, the CFPB and Investor.gov; these are references, not endorsements.

The **Monthly Salary & Budget Planner** is a standalone preview at `/salary-budget/`, linked from the homepage. Its React UI is `src/pages/BudgetPage.tsx`; calculations and saved-plan validation are in `src/budget/model.ts`. It uses the isolated browser key `intimetec-salary-budget-v1` and exports a JSON snapshot. It has no bank connection or server storage. Currency changes relabel amounts without converting them.

The monthly budget counts essential and optional expenses, bill reserves, emergency contributions, goal contributions, investments and the cash buffer once each. A bill reserve is the unfunded amount divided by months until due. The emergency target includes essential expenses and bill reserves. Recorded actual spending is a separate comparison and does not replace planned allocations.

The one-year projection assumes twelve equal month-end contributions, starting at zero, and converts the effective annual return to `(1 + return / 100)^(1/12) - 1`. Cash savings, taxes, fees and inflation are excluded from that investment corpus. Allocations are held constant; users should review them after a goal or bill is funded. The preview is `noindex` and excluded from the sitemap. `npm run test:budget` checks the model; `e2e/budget.spec.ts` covers desktop/mobile editing, persistence, projections, bill reserves and export.

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

The calculators use clean directory routes:

| Calculator         | Local URL       |
| ------------------ | --------------- |
| Planner selection  | `/`             |
| Growth             | `/growth/`      |
| Survival           | `/survival/`    |
| Custom Plan        | `/custom-plan/` |
| Financial Freedom  | `/freedom/`     |
| Retirement Buckets | `/bucket-plan/` |

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
git push -u new-account react
```

The new account repository is `https://github.com/imsagarjakhar/calculator.git`, configured locally as `new-account`. The `origin` remote retains the previous repository for reference. Push this migration with `git push -u new-account react`.

Open the repository's **Actions** tab and check **Test and deploy planners**. Pushes to `react` and pull requests into `main` run tests/builds. By default, they do **not** deploy over the live website. Setting the repository Actions variable `PAGES_DEPLOY_BRANCH=react` intentionally enables deployment from `react` to the existing live domain, as described below. This workflow does not create a public preview URL for the branch; use the local preview while reviewing.

## 5. Change GitHub Pages when ready to release

1. Open `imsagarjakhar/calculator` on GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**, replacing the branch/root publishing mode. Do this when you are ready for the migration release; keep the existing publishing setup during branch review.
4. Keep the existing **Custom domain** as `intimetec.org` and keep **Enforce HTTPS** enabled. No GoDaddy DNS changes are required when the domain and GitHub Pages repository remain the same.
5. Create a pull request from `react` into `main`, wait for the checks, review and merge it.
6. In **Actions → Test and deploy planners**, wait for both **Tests and production build** and **Deploy selected branch to GitHub Pages** to succeed. The deployment uploads only `dist/`, which contains the six built directory-index HTML entry points, bundled assets, `CNAME`, `robots.txt`, `sitemap.xml` and favicon.
7. If GitHub reports an environment protection error, open **Settings → Environments → github-pages** and ensure the selected deployment branch is allowed to deploy. Keep any existing approval requirements you want for production.
8. Visit the live domain and all calculator links. Test a saved report import, change an input, reload, download a report and check a reset with a disposable plan. Confirm that the domain still uses HTTPS.

Only the branch selected by `PAGES_DEPLOY_BRANCH` deploys; when unset, this defaults to `main`. A failed test/build blocks deployment. Pull requests never deploy, and manual runs must also match the configured branch. There is no PAT, database password or other application secret to configure.

The build supports both a custom-domain root (`/`) and a GitHub project path such as `/calculator/`. Set the repository Actions variable `PAGES_BASE_PATH` to the required path, including its leading and trailing slashes. The workflow passes this as `VITE_BASE_PATH` to the build and browser tests. Script/style integrity is generated against the same path.

References: [Vite GitHub Pages deployment](https://vite.dev/guide/static-deploy.html), [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Set up Pages in the new repository without moving the domain

Use this first to verify the React application at **https://imsagarjakhar.github.io/calculator/**. The existing `intimetec.org` site stays attached to the old repository during this test.

1. In `imsagarjakhar/calculator`, open **Settings → Pages** and set **Build and deployment → Source → GitHub Actions**. Do not choose branch/root publishing for the React source.
2. Leave **Custom domain empty** in this new repository for now. The `CNAME` file in the built artifact does not configure a custom domain for an Actions-based Pages deployment; the repository's Pages settings control it.
3. Open **Settings → Secrets and variables → Actions → Variables** and create these **repository variables** (not secrets):

   | Name                  | Value          |
   | --------------------- | -------------- |
   | `PAGES_DEPLOY_BRANCH` | `react`        |
   | `PAGES_BASE_PATH`     | `/calculator/` |

4. If **Settings → Environments → github-pages → Deployment branches and tags** restricts deployments, allow the `react` branch. Preserve any review/approval requirements you want.
5. Push the commit that adds project-path support to `react`, or rerun **all jobs** of that latest workflow after saving the settings. A run from the older code cannot build the project path correctly. If deployment remains skipped after changing variables, trigger a fresh push so the new run receives the settings.
6. In **Actions → Test and deploy planners**, wait for **Tests and production build** and **Deploy selected branch to GitHub Pages** to finish successfully. Then use the deployment URL shown by GitHub or visit the project URL above. Browser tests in this run use the `/calculator/` path too.
7. Verify all five calculators, imports, downloads and reload persistence before moving the existing domain.

Later, moving `intimetec.org` to the new repository is a separate release step: change `PAGES_BASE_PATH` back to `/`, transfer the custom-domain association from the old repository to the new one, verify domain ownership for the new account where required, and update the `www` DNS CNAME to `imsagarjakhar.github.io` when switching. The root GitHub Pages A records do not change simply because the account changed. Rebuild with the `/` base for that domain. Keep the original site running until this switch is planned.

To test the project path locally in PowerShell:

```powershell
$env:VITE_BASE_PATH = "/calculator/"
npm run build
npm run preview
```

Open `http://127.0.0.1:4173/calculator/`. Stop any existing preview first so the server loads the matching base configuration. To return to the normal root build, run `Remove-Item Env:VITE_BASE_PATH` and rebuild. The base-path variable is a per-terminal environment setting, not a secret.

## Test `react` on the live domain without merging

This replaces the site currently served at **https://intimetec.org/** with the React version after checks pass. It does not create a separate preview URL, and it does not merge or change `main`.

1. In **Settings → Pages → Source**, select **GitHub Actions**. Do not simply change the old branch dropdown to `react`: this application needs Vite to build `dist/` first.
2. Keep **Custom domain: intimetec.org** and **Enforce HTTPS** unchanged.
3. Open **Settings → Secrets and variables → Actions → Variables → New repository variable**. Set the name to `PAGES_DEPLOY_BRANCH` and the value to `react`. This is a repository variable, not an environment variable or secret.
4. If **Settings → Environments → github-pages → Deployment branches and tags** restricts branches, allow `react` while preserving any intended approval requirements. Keep `main` allowed too if you plan to merge later.
5. Commit and push the updated workflow and documentation to `react`. A push runs this branch's workflow without requiring it to be merged into the default branch. Watch **Actions → Test and deploy planners**. Tests/build/browser checks must pass before **Deploy selected branch to GitHub Pages** runs. If the workflow version containing this selector is already pushed, a new push can trigger it again; do not depend on the manual Run workflow button appearing before the workflow exists on the default branch.
6. Test the live site, ideally from the phone/network that can access it. The laptop's Infoblox certificate issue is separate from deployment.

While `PAGES_DEPLOY_BRANCH=react`, subsequent pushes to `react` can update the live website after checks; pushes to `main` do not deploy through this workflow. Change the variable back to `main` before merging the migration when you want normal production releases from `main`.

The variable is evaluated on a workflow run. Changing it alone does not immediately republish another version. To undo this live test **while `main` still contains the original static site**, restore **Settings → Pages → Deploy from a branch → main → / (root)** and set `PAGES_DEPLOY_BRANCH` back to `main` (or delete the variable). Once `main` itself contains the React migration, keep GitHub Actions and use the normal revert/redeploy procedure below instead.

## 6. Roll back a release if needed

For an ordinary application change, revert the release commit/merge with a new Git commit and push to `main`; the workflow rebuilds and deploys the reverted source after checks. Do not force-push shared history. To roll back the **initial migration** to the old deployment system, first restore the pre-migration version through a reviewed revert/rollback commit, including putting the original HTML/JS/CSS back at the repository root. Then restore Pages **Deploy from a branch → main → / (root)**. The retained originals now live under `bkp/`; GitHub Pages branch publishing cannot select an arbitrary `/bkp` folder. Keep the domain and HTTPS settings. Export any plans you want to keep before testing resets or other destructive plan edits.

## Source layout and compatibility boundary

| Location                         | Responsibility                                                         |
| -------------------------------- | ---------------------------------------------------------------------- |
| `web/**/index.html`              | Vite HTML entry points with existing metadata and public filenames     |
| `src/entries/`                   | React application roots and page-specific stylesheet imports           |
| `src/pages/`                     | React calculator layouts and home navigation                           |
| `src/components/`                | Shared typed header/currency/actions and startup error boundary        |
| `src/runtime/`                   | Controller lifetime/cleanup and responsive table observer hook         |
| `bkp/*-engine.js`                | Existing tested financial calculations; reused without formula changes |
| `bkp/` controller/report scripts | Existing tested form/result behavior and import/export validation      |
| `vite.config.mts`                | Multi-page build and compatibility-module bundling                     |
| `scripts/secure-build.cjs`       | CSP and script/style/preload integrity for built pages                 |
| `e2e/`                           | Real production-browser regression tests                               |
| `.github/workflows/pages.yml`    | Branch/PR checks and selected-branch deployment                        |

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

## Clean URLs and landing-page copy

The homepage uses smart-planning language and an AI FAQ that explicitly describes the calculation-based model. No AI service, AI-generated advice, or market-price prediction is introduced.

Canonical routes are `/`, `/growth/`, `/survival/`, `/custom-plan/`, `/freedom/` and `/bucket-plan/`, all relative to the configured base path. Each calculator has a real directory index in the build, so direct visits and reloads work on GitHub Pages without server rewrite rules. Old `.html` calculator bookmarks remain available and normalize to the clean route after JavaScript loads; old `/#growth` and `/#survival` links normalize too. Saved plans and report formats are unchanged. Canonical metadata and the sitemap use the new URLs.

## AdSense connection and review

Publisher account: `ca-pub-7696234797118425`. Vite adds the public `google-adsense-account` verification meta tag to every entry, including the pre-rendered homepage. `public/ads.txt` is copied unchanged to `/ads.txt` with the matching `pub-7696234797118425` direct-seller record. Production checks verify both identifiers. These identifiers are public, not credentials.

After pushing and waiting for a successful Pages deployment:

1. Open `https://intimetec.org/ads.txt` and confirm the publisher line appears.
2. In **AdSense → Sites → intimetec.org**, choose **Meta tag** as the connection method, confirm installation, click **Verify**, then **Request review**. The **Ads.txt snippet** method is also supported by this release. Do not select **AdSense code snippet**, because this release uses the supported non-script verification method.
3. Complete privacy disclosures and consent configuration, review ad placements, and integrate ad serving separately once ready. Verification alone does not display ads or guarantee approval.

The supplied ad-serving snippet is:

```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7696234797118425" crossorigin="anonymous"></script>
```

It is retained here for the ad-serving stage; it is not executed by this connection-only release. Google's current AdSense CSP guidance supports a nonce-based strict policy. GitHub Pages serves static files and cannot generate a fresh per-response nonce. Do not insert a reusable build-time nonce, disable CSP silently, or assume an ad-domain allowlist is supported indefinitely. The existing calculator policy and offline reports remain unchanged during verification.

References: [Google's connection methods](https://support.google.com/adsense/answer/12169212), [ads.txt guide](https://support.google.com/adsense/answer/12171612), and [AdSense CSP requirements](https://support.google.com/adsense/answer/16283098).

## Styled calendars

Date and month fields in the React Custom and Bucket planners use the shared `DateInput` / `CalendarProvider` components. Their styled calendar supports selection, keyboard navigation, date bounds, Escape, Cancel, Close and backdrop dismissal, returning focus to its trigger. The original editable date/month input remains available, and selections dispatch the normal input/change events to the calculation controllers. The `bkp/` calendar and native-date tests describe the retained legacy pages; the active React picker is covered by desktop/mobile Playwright tests.

## Search visibility and release checks

The preferred brand is **INTIMETEC Money Planner**, with INTIMETEC and intimetec.org as site-name alternatives. It describes this financial planning site; do not copy another company's profile, reviews, address or social accounts into structured data.

`src/content/search.mts` is the shared source of titles, descriptions, canonical URLs and JSON-LD. Vite applies it to every HTML entry in development and production. The browser updates Growth/Survival metadata when their history-based navigation changes the screen. The homepage uses real links to calculators, including when JavaScript is disabled.

`npm run build` pre-renders the public homepage from its actual React component and creates short, relevant calculator introductions. A shared visible footer provides calculator links and method/privacy information on every page. This needs no database, browser download or server at deployment. Financial inputs and saved browser plans are never used for pre-rendering. CSP and resource integrity are applied after pre-rendering. The experimental bucket page stays `noindex` and out of the sitemap.

After deploying to intimetec.org:

1. Add the **Domain property** `intimetec.org` in [Google Search Console](https://search.google.com/search-console). Copy the exact Google-provided TXT verification record into GoDaddy DNS. Keep the existing GitHub Pages DNS records.
2. After verification, submit `https://intimetec.org/sitemap.xml` under **Sitemaps**.
3. Inspect `https://intimetec.org/` using **URL inspection**, run **Test live URL**, then **Request indexing**. Inspect `/growth/`, `/survival/`, `/custom-plan/` and `/freedom/` as well. Do this after the new deployment has succeeded.
4. Review **Page indexing** for crawl/canonical problems and **Performance** for queries containing `intimetec`. Track impressions, clicks and average position over time rather than relying on one personalised search.

Google decides what it indexes and how it ranks results. These changes improve crawlability and brand clarity; they cannot guarantee first place or a particular indexing date. Earn relevant mentions and links from real users or sites; avoid paid link schemes, keyword stuffing and fake review/rating markup.

References: [Google's JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [site-name guidance](https://developers.google.com/search/docs/appearance/site-names), and [Search Console setup](https://developers.google.com/search/docs/monitor-debug/search-console-start).

## Runtime vlogs: one-time setup

The homepage has a **Login** button, a publisher editor, and a public vlog feed. Posts are individual JSON files in [imsagarjakhar/vlog](https://github.com/imsagarjakhar/vlog), with a small index at `vlogs/index.json`. Publishing, editing and removal run at runtime: the Worker commits the post file and index together, without triggering this website's deployment. Visitors do not need an account. Video posts use an optional HTTPS link; this version does not upload or embed video files.

The code is prepared locally, but the API is not deployed and no credentials have been created. Do not paste credentials into chat, source files, `.env` variables prefixed `VITE_`, or repository files. GitHub Secrets are transferred only to the Worker by a separate workflow. The only publishing configuration built into the website is the API's public HTTPS origin.

### 1. Initialize the content repository

Open `https://github.com/imsagarjakhar/vlog`. If it is empty, add `README.md` and commit it to **main**. This establishes a branch for atomic Git updates. The first published vlog creates the `vlogs/` files automatically. Keep this repository public and separate from `calculator`; do not add a Pages build workflow to the content repository.

### 2. Prepare Cloudflare

Create or sign in to a Cloudflare account and finish setting up its Workers `workers.dev` subdomain. The app can stay on GitHub Pages and GoDaddy DNS does not need to change. The API will use `https://intimetec-vlogs.YOUR-SUBDOMAIN.workers.dev`.

Create a Cloudflare API token using the **Edit Cloudflare Workers** template and restrict it to your account. Record the **Account ID** from the Cloudflare dashboard. Keep both for the GitHub secrets in the next step. Account limits and charges are governed by your Cloudflare plan; no billing changes are made by this repository.

### 3. Create a restricted GitHub content token

In the `imsagarjakhar` GitHub account, open **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**. Choose an expiration, select **Only select repositories → vlog**, and set **Repository permissions → Contents → Read and write**. Metadata read access is included automatically. Do not grant access to `calculator` or Workflows.

This token allows the Worker to change public vlog content. It is not the publisher password and never enters the React build or browser.

### 4. Store secrets in the application repository

In **imsagarjakhar/calculator → Settings → Environments**, create **vlog-api** and allow deployment from your selected application branch (`react` for the current setup). Add these **environment secrets**:

| Secret name | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | The restricted Cloudflare Workers token |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID |
| `GH_VLOG_TOKEN` | The fine-grained token restricted to `vlog` |
| `VLOG_ADMIN_PASSWORD` | A new, random publisher password, 20–256 characters; use a password manager |
| `VLOG_SESSION_SECRET` | A cryptographically random signing key of at least 64 characters |

The publisher username is **imsagarjakhar**, configured in `worker/wrangler.jsonc`. There is no built-in/default password. Use a separate password from your GitHub and Cloudflare passwords.

To generate a random 64-character hexadecimal session key locally in PowerShell:

```powershell
$vlogKeyBytes = New-Object byte[] 32
$vlogKeyGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
$vlogKeyGenerator.GetBytes($vlogKeyBytes)
[BitConverter]::ToString($vlogKeyBytes).Replace('-', '').ToLowerInvariant()
$vlogKeyGenerator.Dispose()
```

Copy that result into `VLOG_SESSION_SECRET`; do not commit it. Protect both hosting accounts with two-factor authentication and limit who can edit workflows or environment secrets.

### 5. Enable and deploy the publishing API

In **Settings → Secrets and variables → Actions → Variables**, add the repository variable **`VLOG_API_ENABLED` = `true`**. Keep **`PAGES_DEPLOY_BRANCH` = `react`** for the current release branch.

Push the prepared code to `imsagarjakhar/calculator` on `react`. The separate **Deploy vlog publishing API** workflow runs only when enabled and on the selected deployment branch. It runs the API tests, deploys `worker/index.ts`, and binds the three private Worker secrets. The normal Pages job never receives these secrets. A push to the `vlog` repository does not run either application workflow.

When the API job succeeds, copy its deployed `https://intimetec-vlogs.YOUR-SUBDOMAIN.workers.dev` origin. Do not include a path. A manually dispatched run is also supported once the workflow exists on the repository's default branch.

### 6. Connect the homepage once

Add the application repository **Actions variable** **`VLOG_API_ORIGIN`** with that public API origin. Re-run **Test and deploy planners** on `react` after setting it. This builds the origin into the client and its CSP. Nothing secret goes into this variable.

The Worker allows requests from **`https://intimetec.org`** only. Open the actual custom domain for publisher login; project previews and localhost are intentionally not authorized by the production Worker. If you intentionally change the public site origin, update `SITE_ORIGIN` in `worker/wrangler.jsonc` and redeploy the API.

### 7. Publish without deployment

Open **intimetec.org → Login**. Use publisher username **imsagarjakhar** and the password you stored as `VLOG_ADMIN_PASSWORD`. Click **Add vlog**, enter a title, short introduction, body and optional HTTPS video link, then **Publish vlog**. Use **Edit** or **Remove** on your posts later.

The browser holds only a signed 15-minute publishing session in memory, not the GitHub token. Reload or logout clears it. There is no database, signup, or default password. The editor keeps unpublished text in the current tab only; closing/reloading can lose it. All committed content and Git history are public, including older versions of edited/removed posts. Never include private financial plans or credentials in a vlog.

Visitors load the feed from GitHub at runtime. It refreshes while the homepage is visible and has a **Refresh vlogs** button for a fresh API read. GitHub's CDN may briefly cache the raw feed; its API has request limits. Publishing is not a real-time streaming service. The current index supports up to 500 posts and 500 KB of metadata. Updating website code, rotating Worker credentials, or changing configuration still requires the corresponding deployment; ordinary vlog publishing does not.

### Validation and remaining checks

`npm run test:vlogs` tests the actual Worker handler and GitHub update logic using mocked GitHub responses: origin restrictions, missing credentials, rate limiting, bad passwords, signed/expired sessions, atomic commits, stale edits, lost-response retries and bounded content. Desktop/mobile browser tests cover public reads and the publisher workflow with a mocked publishing endpoint. They do not prove that live credentials, branch protections, Cloudflare bindings or a deployed service are correctly configured.

After setup, publish one non-sensitive test vlog, verify it in a separate logged-out browser, edit it, and remove it. No live post or repository write has been performed by the local tests. See [SECURITY.md](SECURITY.md) for the trust boundary.

References: [GitHub repository contents](https://docs.github.com/en/rest/repos/contents), [Git database API](https://docs.github.com/en/rest/git), [Cloudflare rate-limit bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), and [Cloudflare deployment action](https://github.com/cloudflare/wrangler-action).
