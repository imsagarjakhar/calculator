# Security and deployment

This is a static, browser-only calculator. It has no application server, database, login, payment flow, remotely loaded third-party scripts or analytics. Inputs are stored in the browser's local storage and exported files. Those files and browser data are not encrypted by this app. Someone with access to the browser profile, a privileged extension, or compromised same-origin code can read them. Do not publish real plan/report files in this repository or upload them to hosting.

## React production build

The React application is compiled with `npm run build`; deploy only `dist/` through the main-only GitHub Pages workflow. `scripts/secure-build.cjs` generates CSP before any script, hashes inline JSON metadata, and adds SHA-384 integrity to entry scripts, stylesheets and module preloads. Bundled module imports are restricted by `script-src 'self'`; the entry/preload integrity attributes do not independently hash every transitive module import. The policy retains `connect-src 'none'`, no inline event attributes and no `unsafe-eval`. Development uses Vite's local dev server and its development-time module/HMR connections; it does not represent production CSP enforcement.

Run `npm run check` before publishing. It includes Chromium tests against the production build with console/runtime/CSP errors treated as failures, plus calculation and import validation tests. Production dependencies are recorded in `package-lock.json`; keep them reviewed and updated. React itself is not a security guarantee. The workflow runs on the migration branch and PRs, and deploys only `main` after tests pass. It publishes no test files, original source HTML, node_modules or source maps.

The remaining direct-file hash commands below apply to the retained legacy reference pages and their regression tests in `bkp/`. Run those commands with `bkp/` as the working directory (`Push-Location bkp`, then `Pop-Location` when finished). If changing those source scripts, regenerate their legacy metadata too with `node security-policy.js` and `node bucket-security.js` so compatibility/security tests remain current. The React `dist` build uses its own generated metadata.

## Protections implemented

- All app pages declare a Content Security Policy early in the document. Scripts must be local or explicitly hash-authorized. Inline event attributes and dynamic code evaluation are not permitted. The policy blocks fetch/XHR/WebSocket connections, embedded frames/objects/workers, form submissions, and changes to the document base URL. Existing inline styles remain permitted for the interface.
- Every external production script has a SHA-384 integrity attribute. Inline script blocks have SHA-256 CSP hashes. This detects unexpected changes to an individual script when its referencing HTML remains trusted. It does not protect against an attacker who can replace the HTML and scripts together.
- Referrer metadata prevents outgoing links from sending this page's URL. External links opened in another tab use `noopener`.
- Imported JSON and report data are validated before replacing a calculator’s saved inputs; Custom Plan retains its replacement preview. Reports are accepted only by their matching calculator. Saved result tables are ignored and recalculated from validated inputs. Imported HTML is never inserted into the document, opened, or executed by the import feature. Only the bounded embedded JSON block is read. User-entered text is escaped in HTML lists/reports or assigned through DOM text/value properties. Input lengths, amounts, dates, references, file sizes and array sizes are constrained.
- Generated reports are self-contained, escape user text, and carry a policy blocking scripts and external resources. A report supplied by someone else can still be malicious when opened directly in a browser; importing it through this app only reads its validated embedded data.
- Growth CSV exports neutralize formula prefixes, including after leading whitespace/control characters. Other schedule CSV exports contain fixed labels, validated month keys and numeric amounts.

Run `node security-policy.js` after editing any production JavaScript or inline script. Commit the regenerated page files with the changed scripts; `.gitattributes` keeps line endings stable for hashes. Run `node security-policy.js --check` and `node security.test.js` before deployment. Deploy the matching files together to avoid stale integrity hashes blocking scripts. These checks verify the generated policy and code behavior, not browser enforcement or the live hosting configuration.

Serve app pages over HTTPS, or use a local server for preview (`python -m http.server 8000 --bind 127.0.0.1`). File URLs have browser-dependent opaque origins and can fail script-integrity/CORS checks. The app still needs no backend, internet APIs or account; a localhost server can serve it offline. Standalone exported reports use no executable scripts or external files and can be opened directly.

## Hosting protections still required

The repository alone cannot enforce HTTPS, secure the domain/account, provide traffic filtering, or add arbitrary HTTP response headers on GitHub Pages.

1. Enable **Enforce HTTPS** in GitHub Pages, and verify HTTP redirects and the certificate for `intimetec.org` and any alternate host. Verify ownership of the custom domain in GitHub Pages and remove stale DNS records if hosting changes.
2. Protect GitHub, the domain registrar, DNS provider and any hosting/CDN accounts with passkeys or two-factor authentication. Limit repository write access and deployment tokens. Use branch protection and review production changes. An account takeover can replace a static site.
3. If your host/CDN supports response headers, configure `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`, and `X-Frame-Options: DENY`. Add the current generated CSP as a response header, with `frame-ancestors 'none'`. Do not attempt to configure `frame-ancestors` or X-Frame-Options through HTML meta tags; they require HTTP headers. Do not assume a file named `_headers` configures GitHub Pages.
4. After confirming the domain consistently supports HTTPS, configure `Strict-Transport-Security: max-age=31536000` where response headers are supported. Add subdomain coverage/preloading only after confirming all affected subdomains support HTTPS.
5. For denial-of-service/abuse protection or response-header controls beyond the host's offerings, configure the hosting/CDN service. No client-side JavaScript can stop network-level traffic attacks.

No production hosting/account settings were changed or verified in this review. A request from the development environment to the live domain did not succeed, so this work is not a live penetration test or a guarantee that the site is attack-proof.

## Checks

`node security.test.js` checks policy/integrity freshness, script restrictions, referrer metadata, CSV formula escaping, prototype-key handling, inert report imports and rejected invalid inputs. `node custom-ui.test.js` also checks malicious-looking names and notes remain escaped in entry lists. Existing calculator, report, calendar and chart tests check functional regressions. No browser preview was available for this review; CSP enforcement, downloads and live headers should be verified after deployment.

References: [OWASP HTML5 security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html), [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy), [MDN frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors), [GitHub Pages HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).
