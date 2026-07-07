# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## What this is

The **555 McLean Ave Resident Portal** — a static website for a Yonkers, NY
co-op building. It gives shareholders board-meeting schedules, a building
updates/news feed, parking/storage waiting lists, a maintenance-request form,
document links, an FAQ, and a client-side "Ask the portal" assistant.

It is deployed to **GitHub Pages** and installable as a **PWA** (works offline).

### Guiding principles

- **No runtime dependencies, no framework, no bundler.** The site is plain
  HTML + CSS + vanilla JavaScript ES modules loaded directly by the browser.
  `node_modules` exists only for the test runner. Keep it that way — do not add
  React/Vue/Tailwind/a bundler or any client-side npm dependency.
- **Content is data, not code.** Board-editable content lives in `data/*.json`.
  A build step injects it into the HTML. Non-technical board members are
  expected to edit JSON, not markup.
- **Everything works without a backend.** Forms fall back to `mailto:` links
  when no form-service URL is configured. There is no server, no database, no
  API keys, no secrets required for the core site to function.
- **Graceful degradation.** `localStorage`, `fetch`, and optional DOM elements
  are all guarded so a missing feature never breaks the page.

## Layout

```
index.html          Single-page app. Sections: Updates, Meetings, Documents,
                    Waitlist, Contact, FAQ, plus the assistant panel. Contains
                    two inline <script>s (module wiring + service-worker reg).
styles.css          All styling (light/dark theme via CSS variables).
main.js             Waitlist queue rendering, sign-up wizard, maintenance-request
                    wizard, localStorage prefill. Exports WL_DATA (patched at build).
ui.js               Pure UI helpers extracted for testability: date labels,
                    countdown, .ics generation, filter predicates, theme default.
assistant.js        Client-side FAQ/topic search ("Ask the portal"). No backend.
build.js            Build entry point (I/O). Reads data/*.json, injects HTML into
                    index.html marker regions, patches main.js WL_DATA, writes dist/.
build-lib.js        Pure render helpers used by build.js (HTML string builders).
sw.js               Service worker (network-first HTML, stale-while-revalidate assets).
manifest.webmanifest  PWA manifest.

data/               Board-editable content (the source of truth for site content):
  meetings.json       Board-meeting list.
  updates.json        Building updates / news feed.
  notices.json        Site-wide notice bar (single object; active/type/message/expires).
  waitlist.json       Parking queue (apartment identifiers only). Auto-synced.

docs/               Publicly-served HTML document pages (house rules, move policy,
                    insurance, emergency contacts, ClickPay guide, waitlist automation).
                    See docs/README.md — some documents are private and must NOT go here.

scripts/            Node maintenance scripts (ESM .mjs):
  check-lib.mjs         Pure predicates: stale-meeting + placeholder detection.
  check-stale.mjs       CI: fail if no upcoming confirmed meetings.
  check-placeholders.mjs CI: fail if placeholder contact info remains in index.html.
  sync-lib.mjs          Pure CSV → waitlist.json parsing/queue-building logic.
  sync-waitlist.mjs     Fetches published responses CSV, rewrites data/waitlist.json.

__tests__/          Vitest tests (jsdom). One file per source module.
icons/              PWA icons. build.js copies these to dist/icons/.
TODO.md             Board-facing to-do list (remaining content/config tasks).
```

## Build

```
npm run build      # node build.js → outputs ./dist
```

`build.js` is the only build step. It:

1. Loads `data/*.json`.
2. Replaces marker regions in `index.html` (`<!-- MEETINGS-LIST-START -->` …
   `-END -->`, and likewise `UPDATES-LIST`, `FILTERS`, `NOTICE-BAR`,
   `NEXT-MEETING`, `LAST-UPDATED`) with generated HTML.
3. Patches `main.js`'s `export const WL_DATA = { ... }` block from
   `data/waitlist.json`.
4. **Cache-busts** `styles.css`/`main.js`/`ui.js`/`assistant.js` URLs with a
   per-build `?v=` version, and stamps that version into `sw.js`'s cache name
   (`__BUILD_VERSION__`).
5. Copies static assets, `docs/*.html`, PWA manifest/icons into `dist/`.

Do **not** hand-edit the generated regions in `index.html` — edit the matching
`data/*.json` and rebuild. The marker comments must stay intact; `build.js`
exits non-zero if any marker is missing.

The site is served directly from source in development (open `index.html`), but
`dist/` is what actually deploys.

## Testing

```
npm test           # vitest run (jsdom). Requires: npm ci first (dev deps only).
npm run test:watch
npm run coverage
```

- Test runner is **Vitest** with the **jsdom** environment, `globals: true`.
- Coverage targets the hand-written logic modules only: `main.js`,
  `build-lib.js`, `ui.js`, `scripts/check-lib.mjs` (see `vitest.config.js`).
  `build.js` and the `scripts/*.mjs` wrappers are thin I/O around the tested
  `-lib` modules and run side effects on import, so logic is factored into the
  pure `-lib` files that the tests import directly.
- **Pattern to follow:** when adding logic, put the pure/testable part in a
  `-lib` module (`build-lib.js`, `sync-lib.mjs`, `check-lib.mjs`) or `ui.js`,
  keep file/DOM/network I/O in the thin wrapper, and add a matching test in
  `__tests__/`. Prefer pure functions that take `now = new Date()` as a
  parameter so date logic is deterministic in tests.

## CI / CD (GitHub Actions)

- **ci.yml** — on every PR: `npm ci`, `npm test`, `npm run build`.
- **deploy.yml** — on push to `main` (and `workflow_dispatch`): run tests, then
  build and deploy `dist/` to GitHub Pages, then a non-blocking Lighthouse
  audit (`.lighthouserc.json` thresholds).
- **health-check.yml** — weekly (Mon ~9am ET): runs tests, and opens a labeled
  GitHub issue if meetings are stale (`check-stale.mjs`) or placeholder contact
  info remains (`check-placeholders.mjs`).
- **sync-waitlist.yml** — every 15 min (+ manual): runs `sync-waitlist.mjs` to
  refresh `data/waitlist.json` from the board's published responses CSV, commits
  if changed, and triggers a deploy. Safe no-op until the `WAITLIST_CSV_URL`
  secret is set.
- **dependabot.yml** — weekly npm + github-actions update PRs.

## Data & content conventions

- **Meetings** (`data/meetings.json`): array of `{ day, month, title, detail }`,
  optional `next`, `badge`, `isoDate` (YYYY-MM-DD), and `calendar`
  `{ location, startTime, endTime }`. An `isoDate` enables the "Add to Calendar"
  button and the next-meeting countdown; `check-stale.mjs` flags the schedule as
  stale when no `isoDate` is today-or-later.
- **Updates** (`data/updates.json`): array of `{ date, category, title, body }`,
  optional `badge` or `eventDate` (relative "Today/Tomorrow/Mon D" badge, and
  filterable by date range). `category` drives the filter buttons and its label
  comes from `CATEGORY_LABELS` in `build-lib.js`.
- **Notices** (`data/notices.json`): single object `{ active, type, message,
  dismissible, expires }`. `type` ∈ `info|warning|urgent`. `expires`
  (e.g. `2026-07-06T21:00`) hides the bar after that time — at build if already
  past, otherwise client-side.
- **Waitlist** (`data/waitlist.json`): `{ parking: ["P55501", ...] }`. **Only
  apartment/spot identifiers are ever public** — names, emails and phone numbers
  stay in the board's private responses sheet. This file is normally
  machine-managed by the sync workflow.
- Text in JSON that lands in HTML content is escaped by the build helpers;
  values already containing entities like `&amp;` are pre-escaped by convention.

## Working in this repo

- **Content change** (meeting date, new update, notice, document link): edit the
  relevant `data/*.json` or `docs/*.html` / the `<a class="doc-row">` in
  `index.html`. No JS changes needed.
- **Behavior change**: put pure logic in a `-lib`/`ui.js` module with a test;
  wire DOM/exports in `main.js`/`index.html`. Functions used by inline `onclick`
  handlers are exported from `main.js` and attached to `window` in the inline
  module script — keep both sides in sync.
- **Contact info**: real values live in `index.html` and `main.js`
  (`BOARD_EMAIL`, `MAINT_EMAIL`). Never reintroduce the placeholder strings
  tracked in `check-lib.mjs` (`board@example.com`, `(914) 555-0000`, etc.) — CI
  will open an issue.
- **PWA**: if you add a shell asset, update the `SHELL` list in `sw.js`.
- **Do not** add client dependencies, commit `dist/`/`node_modules/`/`coverage/`
  (all gitignored), or hand-edit build-generated HTML regions.
- Run `npm test` and `npm run build` before pushing; both are enforced in CI.

## Git workflow

- Default branch is `main`; deploys happen automatically from `main`.
- Develop on a feature branch and open a PR — CI must be green before merge.
- Do not create a PR unless explicitly asked.
