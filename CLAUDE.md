# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## What this is

The **555 McLean Ave Portal** — a resident/shareholder portal for a Yonkers
co-op building, published as a static site on **GitHub Pages**. It gives
residents building news, board-meeting schedules, parking/storage waiting
lists, a maintenance-request form, payment links (ClickPay), an FAQ, a
client-side "ask the portal" assistant, and a set of resident document pages.

There is **no backend and no database**. All dynamic behaviour is either
client-side JavaScript or a build step that bakes JSON data into the static
HTML. It is also an installable **PWA** that works offline.

Non-technical board members are expected to maintain content by hand-editing
JSON files, so keep those files simple and keep the build resilient.

## Tech stack

- **Vanilla HTML/CSS/JS** — no framework, no bundler. ES modules loaded
  directly by the browser (`<script type="module">`).
- **Node.js 20** for the build and tooling scripts (`"type": "module"`, so
  `.js`/`.mjs` files are ES modules).
- **Vitest + jsdom** for unit tests.
- **GitHub Actions** for CI, deploy, waitlist sync, and weekly health checks.
- No runtime dependencies; `devDependencies` are only vitest + jsdom + coverage.

## Commands

```bash
npm ci            # install dev dependencies (needed before test/build)
npm test          # run the full vitest suite once
npm run test:watch # vitest in watch mode
npm run coverage  # vitest with v8 coverage
npm run build     # node build.js → writes the deployable site to ./dist
```

There is no dev server. To preview locally, run `npm run build` and serve
`./dist` with any static file server (e.g. `npx serve dist`), or open
`index.html` directly (note: the un-built `index.html` still shows the
placeholder markers instead of generated content).

## How the build works (`build.js` + `build-lib.js`)

`build.js` is the heart of the project. It:

1. Reads `data/*.json` (`meetings`, `waitlist`, `notices`, `updates`).
2. Uses the **pure render helpers in `build-lib.js`** to turn that data into
   HTML fragments.
3. Injects those fragments into `index.html` by replacing **HTML-comment
   marker blocks** — the build *fails loudly* (`process.exit(1)`) if a marker
   is missing. The markers are:
   - `<!-- MEETINGS-LIST-START -->` … `<!-- MEETINGS-LIST-END -->`
   - `<!-- UPDATES-LIST-START -->` … `<!-- UPDATES-LIST-END -->`
   - `<!-- FILTERS-START -->` … `<!-- FILTERS-END -->`
   - `<!-- NOTICE-BAR -->` (single marker; replaced with the notice bar or left as-is)
   - `<!-- NEXT-MEETING-START -->` … `<!-- NEXT-MEETING-END -->`
   - `<!-- LAST-UPDATED -->` (single marker; replaced with the build date)
4. Rewrites the `WL_DATA` block in `main.js` from `data/waitlist.json`.
5. **Cache-busting:** stamps a per-build version (`Date.now().toString(36)`)
   onto `styles.css`, `main.js`, `ui.js`, and `assistant.js` URLs so returning
   visitors always fetch fresh assets after a deploy.
6. Writes everything to `./dist` (gitignored) along with static assets, the
   PWA manifest/icons, a version-stamped `sw.js` (`__BUILD_VERSION__` →
   version), and the `docs/*.html` pages.

**Key convention: keep file I/O in `build.js` and pure logic in `build-lib.js`.**
The `-lib` files (`build-lib.js`, `ui.js`, `scripts/check-lib.mjs`,
`scripts/sync-lib.mjs`) contain no file reads/writes or `process.exit`, so they
can be unit-tested in isolation. Do the same when adding logic: extract the
testable core into a lib module and keep the thin I/O wrapper separate.

## Repository layout

```
index.html            Main page. Content is injected at build time via markers.
                      Inline <script type="module"> wires main.js/ui.js/assistant.js
                      to the DOM and exposes handlers on window for inline onclick=.
styles.css            All styles (light/dark themes). Copied to dist as-is.
main.js               Client logic: waitlist queues + sign-up wizard, maintenance
                      request wizard, form submission (form-service POST or mailto
                      fallback), localStorage prefill, scroll animations. init() runs
                      on load. WL_DATA is overwritten by the build from waitlist.json.
ui.js                 Pure UI helpers (date labels, countdowns, .ics generation,
                      filter predicates, theme default). Unit-tested.
assistant.js          Client-side "ask the portal" search (no API). Ranks the query
                      against live FAQ + Updates DOM plus ASSISTANT_TOPICS.
build.js              Build script (file I/O). See "How the build works".
build-lib.js          Pure render helpers used by build.js. Unit-tested.
sw.js                 Service worker (PWA). __BUILD_VERSION__ replaced at build.
manifest.webmanifest  PWA manifest.
data/                 Board-editable content (see below). Contract-tested.
docs/                 PUBLIC resident document pages (HTML) + docs/README.md.
                      Anything committed here is publicly served — no private docs.
icons/                PWA icons.
scripts/              Tooling: waitlist CSV sync + CI health-check scripts,
                      each split into a pure *-lib.mjs + thin *.mjs wrapper.
__tests__/            Vitest suites (jsdom).
.github/workflows/    CI, deploy, sync-waitlist, weekly health-check.
TODO.md               Board-facing to-do list (what still needs real data).
```

## Data files (`data/*.json`) — board-editable content

These are edited by hand (often by non-developers) and drive the build. The
suite in `__tests__/data.test.js` enforces their shape — **run `npm test`
after editing them**.

- **`meetings.json`** — array of meetings. Required: `day`, `month`, `title`,
  `detail`. Optional: `next` (at most one), `isoDate` (`YYYY-MM-DD`), `badge`,
  and a `calendar` block (`location`, `startTime`/`endTime` as `HH:MM`) which
  enables the "Add to Calendar" button and the countdown chip.
- **`updates.json`** — array of news cards. Required: `date`, `category`,
  `title`, `body`. `category` **must** be a key in `CATEGORY_LABELS`
  (`build-lib.js`). Optional `eventDate` (`YYYY-MM-DD`, renders a relative
  Today/Tomorrow badge) or `badge`.
- **`notices.json`** — single object for the top notice bar. `active` (bool),
  `type` (must have an icon in `ICONS`: `info`/`warning`/`urgent`), `message`,
  optional `dismissible` and `expires` (ISO datetime; the bar auto-hides after).
- **`waitlist.json`** — `{ "parking": ["APT", …] }`. Only apartment
  identifiers, no personal data. May be auto-synced (see below).

To change a category label or notice icon, edit `CATEGORY_LABELS` / `ICONS` in
`build-lib.js` (and the data-test will confirm they stay in sync).

## Testing conventions

- Tests live in `__tests__/*.test.js`, run under **vitest with the jsdom
  environment** and `globals: true` (no need to import `describe`/`it`/`expect`,
  though existing files do).
- Test the **pure lib modules** directly. DOM-touching code (`main.js`) is
  tested by building a jsdom fixture; see `__tests__/main.test.js`.
- `__tests__/data.test.js` are **contract tests** guarding the hand-edited JSON.
  Keep them green — they are the safety net for board edits.
- Coverage is scoped to hand-written source: `main.js`, `build-lib.js`, `ui.js`,
  `scripts/check-lib.mjs` (see `vitest.config.js`). Thin I/O wrappers
  (`build.js`, `scripts/*.mjs`) are intentionally excluded.
- When you add logic, add or extend a test. Prefer extracting a pure function
  so it can be tested without the DOM or the filesystem.

## CI/CD (GitHub Actions)

- **`ci.yml`** — on every pull request: `npm ci`, `npm test`, `npm run build`.
- **`deploy.yml`** — on push to `main` (and `workflow_dispatch`): runs tests,
  then builds and deploys `./dist` to GitHub Pages, then a non-blocking
  Lighthouse audit (`.lighthouserc.json`).
- **`sync-waitlist.yml`** — every 15 min (and manual): runs
  `scripts/sync-waitlist.mjs` to pull the board's published Google-Form
  responses CSV into `data/waitlist.json`, commits if changed, and triggers a
  redeploy. **Safe no-op** until the `WAITLIST_CSV_URL` secret is set.
- **`health-check.yml`** — weekly (Mon): runs tests, checks for stale meeting
  dates (`scripts/check-stale.mjs`) and leftover placeholder contact info
  (`scripts/check-placeholders.mjs`), opening a GitHub issue when either fires.

`dependabot.yml` keeps GitHub Actions and npm deps updated.

## Form submissions (waitlist + maintenance)

Both the waitlist sign-up and the maintenance request use the same pattern in
`main.js`: if a form-service URL is configured (`WL_SUBMIT.url` /
`MAINT_SUBMIT.url`) the data is POSTed there (`no-cors`, fire-and-forget);
**otherwise it falls back to a pre-filled `mailto:` draft** so the form always
works with zero configuration. Contact addresses (`BOARD_EMAIL`,
`MAINT_EMAIL`) live as constants at the top of the relevant section in
`main.js`.

## Conventions & gotchas

- **Escape user/data text.** Rendering helpers use `escapeHTML`/`escapeAttr`
  (`build-lib.js`) or local `escapeText`/`esc` helpers. Follow suit — content
  can come from JSON or user input.
- **Guard `localStorage` and DOM lookups.** `main.js` wraps `localStorage` in
  try/catch (private mode) and null-checks elements so helpers are safe to call
  on pages missing those fields.
- **Don't hand-edit generated regions** of `index.html` (between the markers) or
  the `WL_DATA` block in `main.js` — the build overwrites them. Edit the data
  or the templates instead.
- **`dist/` is gitignored** and produced by the build; never commit it. Deploys
  build it fresh in CI.
- **`docs/` is public.** Never put sensitive documents (proprietary lease,
  bylaws, sublet/alteration forms) there — those belong in the private Google
  Drive folder referenced in `docs/README.md` and `TODO.md`.
- **PWA cache:** if you rename or add a top-level asset, update the `SHELL`
  precache list in `sw.js` and make sure the build copies it into `dist`.
- `TODO.md` tracks outstanding *content* tasks the board still owes (real
  emergency numbers, PDFs, permanent board email) — consult it before assuming
  a placeholder is a bug.

## Working in this repo

- Keep changes small and dependency-free; this site is deliberately
  build-tool-light. Don't introduce a framework or bundler without a strong
  reason.
- After any change: `npm ci` (first time), `npm test`, then `npm run build` to
  confirm the markers still match and the site builds.
- Match the surrounding style: concise comments that explain *why*, small pure
  helpers, and the lib/wrapper split described above.
