# Financial AI Planner design

A warm light theme presents the product as a calm financial workbook.
The homepage helps visitors choose a calculator; calculators prioritize entering,
comparing and saving a plan. Existing routes, model behavior and integrations are
preserved.

- Newsreader, self-hosted under its SIL Open Font License, supplies the editorial
  headings and wordmark. Segoe UI supplies controls and readable body copy.
- Warm ivory backgrounds, white surfaces, dark forest headings and green actions give the
  homepage and shared calculator shell one visual voice. Chart colors retain their categories with darker strokes for light surfaces.
- Use open sections, fine dividers and compact directory entries. Avoid decorative
  gradients, repeated uppercase labels and icon tiles for the planner directory.
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
