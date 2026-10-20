# Legacy calculators and compatibility source

This folder groups the original HTML, CSS and JavaScript calculators, their regression tests, security generators and metadata snapshots.

**Some files here are still used by the React application.** Vite bundles the existing financial engines, form/report controllers and shared styles from this folder. Do not delete it as if it were disposable backup output.

- Edit the React layouts in `../src/pages/` and shared components in `../src/components/`.
- Run `npm test` or `npm run check` from the repository root; the test runner sets this folder as the legacy tests' working directory.
- The Growth compatibility controller still lives in this folder's `index.html` inline script.
- After changing legacy scripts, run `node security-policy.js` and `node bucket-security.js` from this folder to update the reference HTML integrity metadata.
- `../public/` holds the active domain and SEO metadata. Copies here preserve the original static-site setup.
- Only the built `../dist/` is deployed; raw backup pages and test files are not published.

See [model notes](MODEL-NOTES.md) for the original calculator documentation and [migration guide](../MIGRATION.md) for local development and deployment.
