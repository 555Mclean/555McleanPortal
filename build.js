import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'fs';
import {
  escapeHTML, escapeAttr,
  buildMeetingItem, buildUpdateCard, buildFilterButtons,
  noticeState, nextMeetingTile, adsState, inject,
} from './build-lib.js';

function loadJSON(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { console.error(`ERROR: Could not parse ${path} — ${e.message}`); process.exit(1); }
}

const meetings = loadJSON('./data/meetings.json');
const waitlist = loadJSON('./data/waitlist.json');
const notice   = loadJSON('./data/notices.json');
const updates  = loadJSON('./data/updates.json');
const ads      = existsSync('./data/ads.json') ? loadJSON('./data/ads.json') : { enabled: false };

const meetingsHTML = meetings.map(buildMeetingItem).join('\n');
const updatesHTML  = updates.map(u => buildUpdateCard(u)).join('\n');
const filtersHTML  = buildFilterButtons(updates);

// ── Build notice bar HTML (empty string when inactive or expired) ──
const { expired: noticeExpired, active: noticeActive, html: noticeHTML } = noticeState(notice);

// ── Patch index.html ──
let html = readFileSync('./index.html', 'utf8');

const MEETINGS_RE = /<!-- MEETINGS-LIST-START -->[\s\S]*?<!-- MEETINGS-LIST-END -->/;
if (!MEETINGS_RE.test(html)) { console.error('ERROR: MEETINGS-LIST markers missing'); process.exit(1); }
html = inject(html, MEETINGS_RE,
  `<!-- MEETINGS-LIST-START -->\n${meetingsHTML}\n      <!-- MEETINGS-LIST-END -->`);

const UPDATES_RE = /<!-- UPDATES-LIST-START -->[\s\S]*?<!-- UPDATES-LIST-END -->/;
if (!UPDATES_RE.test(html)) { console.error('ERROR: UPDATES-LIST markers missing'); process.exit(1); }
html = inject(html, UPDATES_RE,
  `<!-- UPDATES-LIST-START -->\n${updatesHTML}\n      <!-- UPDATES-LIST-END -->`);

const FILTERS_RE = /<!-- FILTERS-START -->[\s\S]*?<!-- FILTERS-END -->/;
if (!FILTERS_RE.test(html)) { console.error('ERROR: FILTERS markers missing'); process.exit(1); }
html = inject(html, FILTERS_RE,
  `<!-- FILTERS-START -->\n${filtersHTML}\n      <!-- FILTERS-END -->`);

const NOTICE_RE = /<!-- NOTICE-BAR -->/;
if (!NOTICE_RE.test(html)) { console.error('ERROR: NOTICE-BAR marker missing'); process.exit(1); }
html = inject(html, NOTICE_RE, noticeHTML ? noticeHTML + '\n\n  ' : '<!-- NOTICE-BAR -->');

// ── Next-meeting Quick Actions tile ──
const NEXT_MEETING_RE = /<!-- NEXT-MEETING-START -->[\s\S]*?<!-- NEXT-MEETING-END -->/;
if (!NEXT_MEETING_RE.test(html)) { console.error('ERROR: NEXT-MEETING markers missing'); process.exit(1); }
html = inject(html, NEXT_MEETING_RE,
  `<!-- NEXT-MEETING-START -->${nextMeetingTile(meetings)}<!-- NEXT-MEETING-END -->`);

// ── Sponsor slots (data/ads.json) ──
// All three markers are replaced together: an empty state leaves the markers in
// place, so a page built with ads off is byte-identical to the pre-ads page.
const adState = adsState(ads);

const ADS_HEAD_RE = /<!-- ADS-HEAD -->/;
if (!ADS_HEAD_RE.test(html)) { console.error('ERROR: ADS-HEAD marker missing'); process.exit(1); }
if (adState.headHTML) html = inject(html, ADS_HEAD_RE, adState.headHTML);

const ADS_NAV_RE = /<!-- ADS-NAV -->/;
if (!ADS_NAV_RE.test(html)) { console.error('ERROR: ADS-NAV marker missing'); process.exit(1); }
if (adState.navHTML) html = inject(html, ADS_NAV_RE, adState.navHTML);

const ADS_SECTION_RE = /<!-- ADS-SECTION-START -->[\s\S]*?<!-- ADS-SECTION-END -->/;
if (!ADS_SECTION_RE.test(html)) { console.error('ERROR: ADS-SECTION markers missing'); process.exit(1); }
if (adState.sectionHTML) html = inject(html, ADS_SECTION_RE, adState.sectionHTML);

const LAST_UPDATED_RE = /<!-- LAST-UPDATED -->/;
if (LAST_UPDATED_RE.test(html)) {
  const built = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' });
  html = inject(html, LAST_UPDATED_RE, `Last updated ${built}`);
}

// ── Cache-busting ──
// GitHub Pages serves assets with a cache lifetime, so returning visitors can
// keep running an old styles.css / main.js / ui.js after a deploy. Stamp a
// per-build version onto the asset URLs so each deploy is fetched fresh.
const VERSION = Date.now().toString(36);
html = html
  .replace(/(href="\.\/styles\.css)"/g, `$1?v=${VERSION}"`)
  .replace(/(from '\.\/main\.js)'/g, `$1?v=${VERSION}'`)
  .replace(/(from '\.\/ui\.js)'/g, `$1?v=${VERSION}'`)
  .replace(/(from '\.\/assistant\.js)'/g, `$1?v=${VERSION}'`)
  .replace(/(from '\.\/ads\.js)'/g, `$1?v=${VERSION}'`);

// ── Patch main.js WL_DATA from data/waitlist.json ──
let js = readFileSync('./main.js', 'utf8');
const WL_RE = /export const WL_DATA = \{[\s\S]*?\};/;
if (!WL_RE.test(js)) { console.error('ERROR: WL_DATA block missing'); process.exit(1); }
js = inject(js, WL_RE, `export const WL_DATA = {
  parking: ${JSON.stringify(waitlist.parking)},
};`);

// ── Write dist/ ──
mkdirSync('./dist', { recursive: true });
writeFileSync('./dist/index.html', html);
writeFileSync('./dist/main.js', js);
if (existsSync('./styles.css'))  copyFileSync('./styles.css',  './dist/styles.css');
if (existsSync('./ui.js'))       copyFileSync('./ui.js',       './dist/ui.js');
if (existsSync('./assistant.js')) copyFileSync('./assistant.js', './dist/assistant.js');
if (existsSync('./ads.js'))      copyFileSync('./ads.js',      './dist/ads.js');
if (existsSync('./sitemap.xml')) copyFileSync('./sitemap.xml', './dist/sitemap.xml');
if (existsSync('./robots.txt'))  copyFileSync('./robots.txt',  './dist/robots.txt');
if (existsSync('./.nojekyll'))   copyFileSync('./.nojekyll',   './dist/.nojekyll');

// ── PWA: manifest, icons, and a version-stamped service worker ──
if (existsSync('./manifest.webmanifest')) copyFileSync('./manifest.webmanifest', './dist/manifest.webmanifest');
if (existsSync('./icons')) {
  mkdirSync('./dist/icons', { recursive: true });
  for (const f of readdirSync('./icons')) copyFileSync(`./icons/${f}`, `./dist/icons/${f}`);
}
if (existsSync('./sw.js')) {
  // Stamp the build version so each deploy gets a fresh cache (old ones pruned).
  const sw = readFileSync('./sw.js', 'utf8').replace(/__BUILD_VERSION__/g, VERSION);
  writeFileSync('./dist/sw.js', sw);
}

// ── Copy published document pages (docs/*.html) into dist/docs/ ──
if (existsSync('./docs')) {
  const docPages = readdirSync('./docs').filter(f => f.endsWith('.html'));
  if (docPages.length) {
    mkdirSync('./dist/docs', { recursive: true });
    for (const f of docPages) copyFileSync(`./docs/${f}`, `./dist/docs/${f}`);
  }
}

const noticeStatus = noticeActive ? `notice: "${notice.message}"` : noticeExpired ? 'notice: expired' : 'notice: off';
console.log(
  `Built: ${meetings.length} meetings · ${updates.length} updates · ` +
  `${waitlist.parking.length} parking · ${noticeStatus} · ads: ${adState.enabled ? adState.reason : 'off (' + adState.reason + ')'}`
);
