# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static resident portal for the 555 McLean Ave co-op building (Yonkers, NY), deployed to GitHub Pages. No framework, no backend — all forms (waitlist, newsletter, maintenance requests) compose `mailto:` links. Content is data-driven through JSON files that a build script injects into the HTML.

## Commands

```bash
npm run build        # node build.js — generates dist/ from index.html + data/*.json
npm test             # vitest run — all tests
npm run test:watch   # vitest in watch mode
npm run coverage     # coverage report (only main.js is measured)

npx vitest run -t "renders one filled slot"   # run a single test by name
node scripts/check-stale.mjs                  # exits 1 if no upcoming meeting has an isoDate
node scripts/check-placeholders.mjs           # exits 1 if placeholder contacts remain in index.html
```

There is no dev server; open `dist/index.html` (after a build) or `index.html` directly in a browser.

## Architecture

Three layers, all in the repo root:

1. **`data/*.json`** — the content source of truth. `meetings.json`, `updates.json`, `waitlist.json`, `notices.json`. **Routine content changes happen here, not in HTML.**
2. **`build.js`** — reads the JSON files and patches `index.html` and `main.js` between HTML-comment markers, writing the results to `dist/` (gitignored). It exits non-zero if any marker is missing.
3. **`index.html` + `main.js`** — the source templates. `index.html` is a single ~2500-line file containing all CSS (in one `<style>` block) and an inline `<script type="module">` with UI-only behaviors (theme toggle, FAQ accordion, filters, toasts, calendar export, etc.). `main.js` holds the logic worth unit-testing (waitlist rendering, form validation, maintenance wizard), exported as ES module functions that the inline script imports and attaches to `window` for `onclick` handlers.

### Build markers — do not remove

`build.js` replaces these regions in `index.html`; keep the comment markers intact when editing nearby HTML:

- `<!-- MEETINGS-LIST-START/END -->`, `<!-- UPDATES-LIST-START/END -->`, `<!-- FILTERS-START/END -->`, `<!-- NEXT-MEETING-START/END -->` — content between markers is committed but regenerated on every build
- `<!-- NOTICE-BAR -->` and `<!-- LAST-UPDATED -->` — single-point replacements

In `main.js`, the `export const WL_DATA = {...};` block is rewritten from `data/waitlist.json` at build time — edit the JSON, not the placeholder values in `main.js`.

### Data conventions

- **meetings.json**: optional `isoDate` (YYYY-MM-DD) + `calendar` (`location`, `startTime`, `endTime`) enable the Add-to-Calendar button, the next-meeting tile, and the countdown chip. The weekly health check opens a GitHub issue if no meeting has a future `isoDate`. The `detail` field is inserted as raw HTML (entities like `&amp;` must be pre-escaped); `title` is escaped by the build.
- **updates.json**: `category` drives the filter buttons (labels in `CATEGORY_LABELS` in build.js). Optional `eventDate` (YYYY-MM-DD) renders a date-aware badge (Today/Tomorrow/"Jun 12") recomputed client-side; otherwise optional static `badge`.
- **notices.json**: `active: true` + `message` shows the site-wide notice bar; optional `expires` (e.g. `2026-06-10T14:00`) auto-hides it both at build time and client-side.

## CI / Deployment

- **deploy.yml**: every push to `main` runs tests, then builds and deploys `dist/` to GitHub Pages, then runs a Lighthouse audit (warn-only thresholds in `.lighthouserc.json`). Tests must pass for deploy to happen.
- **health-check.yml**: weekly (Mondays) — runs tests, and runs the two `scripts/check-*.mjs` checks, auto-filing GitHub issues for stale meeting dates or leftover placeholder contact info.

## Testing

Vitest with jsdom (`vitest.config.js`, globals enabled). All tests live in `__tests__/main.test.js` and build DOM fixtures via `document.body.innerHTML`. Tests mutate `WL_DATA` directly and assert on `window.location.href` for the `mailto:` submissions. New testable logic belongs in `main.js` (exported), not the inline script — coverage only includes `main.js`.

## Known placeholders

The portal is pre-launch; `board@example.com`, `info@example.com`, `(914) 555-0000`, and the managing-agent name are intentional placeholders tracked in `TODO.md` and monitored by `check-placeholders.mjs`. Don't "fix" them with invented values.

## docs/ folder

PDFs in `docs/` are served publicly from GitHub Pages. Only public-appropriate documents belong there (house rules, move policy, insurance requirements); sensitive documents (lease, bylaws, sublet application) stay in a private Drive folder. See `docs/README.md` for the card-markup steps to publish a PDF.
