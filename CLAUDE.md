# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this is

The **555 McLean Ave Portal** — a static, single-page website for a residential
co-op building. It gives shareholders meeting schedules, building updates,
parking/storage waitlists, governing documents, a maintenance-request wizard,
and contact info. It is deployed to **GitHub Pages** and has **no backend** —
all forms work by opening a pre-filled `mailto:` link in the user's email app.

The audience is non-technical building board members, so most "content" changes
are designed to be made by editing small JSON files rather than HTML.

## Tech stack

- **Vanilla HTML/CSS/JS** — no framework. The entire site is one big
  `index.html` (~2500 lines, with inline `<style>` and a bottom `<script type="module">`).
- **ES modules** — `main.js` exports functions; `index.html` imports them and
  attaches the ones used by inline `onclick=` handlers to `window`.
- **Node build script** (`build.js`) — injects JSON data into HTML/JS and writes `dist/`.
- **Vitest + jsdom** for unit tests (`__tests__/main.test.js`, 73 tests).
- **GitHub Actions** for CI, deploy, Lighthouse audit, and weekly health checks.

There is no bundler, no TypeScript, no CSS preprocessor. Keep it that way unless
explicitly asked to change the architecture.

## Repository layout

```
index.html          Entire site: markup + inline <style> + inline bootstrap <script>
main.js             Interactive logic (waitlist, newsletter, maintenance wizard, fade-in init)
build.js            Build step: injects data/*.json into index.html + main.js → dist/
data/               Editable content (the board edits these, not HTML)
  meetings.json     Board meeting schedule
  updates.json      Building news/updates feed
  waitlist.json     Parking & storage waitlist occupants
  notices.json      Site-wide notice bar (banner)
docs/               Published HTML document pages (served publicly via GitHub Pages)
  house-rules.html
  move-policy.html
  insurance-requirements.html
  README.md         How to publish docs / which docs must stay private
scripts/            Health-check scripts run by the weekly workflow
  check-stale.mjs        Fails if no upcoming meetings have confirmed dates
  check-placeholders.mjs Fails if placeholder contact info remains in index.html
__tests__/main.test.js   Vitest unit tests for main.js
.github/workflows/
  deploy.yml        Test → build → deploy to Pages → Lighthouse (on push to main)
  health-check.yml  Weekly: tests + stale/placeholder checks → opens GitHub issues
TODO.md             Board's outstanding to-do list (go-live items, pending PDFs)
vitest.config.js    jsdom env, coverage scoped to main.js
.lighthouserc.json  Lighthouse CI score thresholds (warn-only)
```

## How the build works

`npm run build` (i.e. `node build.js`) is a **string-injection** step, not a
bundler. It:

1. Reads `data/meetings.json`, `updates.json`, `notices.json`, `waitlist.json`.
2. Replaces marker-delimited regions in a copy of `index.html`:
   - `<!-- MEETINGS-LIST-START -->…<!-- MEETINGS-LIST-END -->`
   - `<!-- UPDATES-LIST-START -->…<!-- UPDATES-LIST-END -->`
   - `<!-- FILTERS-START -->…<!-- FILTERS-END -->` (filter buttons derived from update categories)
   - `<!-- NEXT-MEETING-START -->…<!-- NEXT-MEETING-END -->` (next upcoming meeting tile)
   - `<!-- NOTICE-BAR -->` (single marker; replaced with the notice bar or left as-is)
   - `<!-- LAST-UPDATED -->` (build timestamp, America/New_York)
3. Replaces the `export const WL_DATA = {…};` block in a copy of `main.js`
   with the contents of `waitlist.json`.
4. Writes `dist/index.html` and `dist/main.js`, copies `sitemap.xml`,
   `robots.txt`, `.nojekyll`, and all `docs/*.html` into `dist/`.

The build **fails hard** (`process.exit(1)`) if any marker is missing or any
JSON is unparseable — so if you remove or rename a marker comment in
`index.html`, the build breaks. Keep markers intact.

Note: `index.html` and `main.js` in the repo root contain hand-maintained
**default/placeholder** versions of the injected regions (e.g. `Jul · Date TBD`,
the three sample `WL_DATA` slots). The committed source is what you edit; the
real data lives in `data/`, and `build.js` reconciles them into `dist/`. `dist/`
is git-ignored and only produced during deploy.

## Common tasks

### Editing site content (preferred path for most changes)
Edit the JSON in `data/` — do **not** hand-edit the generated regions of
`index.html`:

- **Meetings** → `data/meetings.json`. Each entry: `day`, `month`, `title`,
  `detail`; optional `next` (highlights it), `badge`, `isoDate` (`YYYY-MM-DD`),
  and `calendar` (`{location, startTime, endTime}` for the "+ Add to Calendar"
  button and countdown chip). Entries with a future `isoDate` keep the
  weekly stale-content check happy.
- **Updates / news** → `data/updates.json`. Each entry: `date`, `category`,
  `title`, `body`; optional `badge` or `eventDate` (`YYYY-MM-DD`, renders a
  live Today/Tomorrow/date badge). Categories map to labels in `build.js`
  (`CATEGORY_LABELS`); a new category auto-generates a filter button.
- **Waitlists** → `data/waitlist.json` (`parking` / `storage` arrays of unit IDs).
- **Notice bar** → `data/notices.json`. Set `active: true`, a `type`
  (`info`/`warning`/`urgent`), `message`, `dismissible`, and optional `expires`
  (ISO datetime; auto-hides after that time).

### Editing interactive behavior
Edit `main.js`. If you add a function called from inline HTML (`onclick=`),
you must also export it AND wire it onto `window` in the bootstrap script at
the bottom of `index.html` (see the import/`window.*` block ~line 2132).

### Editing layout, styles, or static copy
Edit `index.html` directly (CSS lives in the inline `<style>`; dark mode via
CSS variables). Preserve the build markers listed above.

### Publishing a document
Document pages live in `docs/*.html` and are public. See `docs/README.md` —
sensitive docs (Proprietary Lease, Bylaws, Sublet/Alteration forms) must NOT
go in `docs/`; they belong in the private Google Drive folder.

## Build, test, and dev commands

```bash
npm install        # or npm ci (CI uses ci)
npm test           # vitest run — run before committing JS changes
npm run test:watch # watch mode
npm run coverage   # coverage report (scoped to main.js)
npm run build      # produce dist/ (what gets deployed)
```

There is no dev server. To preview, run `npm run build` and open
`dist/index.html`, or open the source `index.html` directly (data regions will
show their committed defaults).

## CI / deployment

- **Push to `main`** triggers `.github/workflows/deploy.yml`: run tests →
  build → deploy `dist/` to GitHub Pages → (best-effort) Lighthouse audit.
  Deploy only happens if tests pass.
- **Weekly** (`health-check.yml`, Mondays ~9am ET) runs tests plus
  `check-stale.mjs` and `check-placeholders.mjs`; if either fails it
  auto-opens a labeled GitHub issue prompting the board to update content.
- Lighthouse thresholds are **warn-only** (`.lighthouserc.json`); they won't
  fail the build but keep performance/a11y/SEO/best-practices in mind.

## Conventions & guardrails

- **Escape user/content strings in `build.js`** using the existing `escapeHTML`
  / `escapeAttr` helpers when injecting JSON into markup. Follow the existing
  pattern for any new injected field.
- **Keep markers intact.** Removing/renaming a `<!-- *-START/END -->` comment
  breaks the build.
- **No new dependencies** without a clear reason — this is intentionally a
  zero-framework static site. Don't introduce bundlers/frameworks unprompted.
- **Test JS changes.** `main.js` is fully unit-tested; add/adjust tests in
  `__tests__/main.test.js` (jsdom DOM fixtures, mocked `window.location`).
- **Don't commit `dist/`** — it's git-ignored and rebuilt by CI.
- **Placeholders are tracked.** `board@example.com`, `info@example.com`,
  `(914) 555-0000`, and "Name & contact to be confirmed" are intentional
  pre-go-live placeholders flagged by `check-placeholders.mjs` and `TODO.md`.
  Don't invent real values; replace them only when given the real ones.
- Document figures in `docs/*.html` (deposits, fines, $300k HO-6 minimum) are
  the Board's recommended values; the Proprietary Lease controls on conflict.

## Git workflow

- Active development branch for this work: `claude/claude-md-docs-wu0ejt`.
- Commit with clear messages; push with `git push -u origin <branch>`.
- Do **not** open a pull request unless explicitly asked.
- `main` is the deploy branch — pushing to it triggers a live deploy.
