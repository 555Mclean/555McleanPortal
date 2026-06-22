import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'fs';
import { pathToFileURL } from 'url';
import {
  buildMeetingItem, buildUpdateCard, buildFilterButtons,
  buildNoticeHTML, nextMeetingTile, replaceRegion,
} from './lib/build-lib.js';

function loadJSON(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// Reads data + templates, patches the markers, and writes dist/. Returns a
// short status string. Throws on any failure so callers decide how to exit.
export function build() {
  const meetings = loadJSON('./data/meetings.json');
  const waitlist = loadJSON('./data/waitlist.json');
  const notice   = loadJSON('./data/notices.json');
  const updates  = loadJSON('./data/updates.json');

  const meetingsHTML = meetings.map(buildMeetingItem).join('\n');
  const updatesHTML  = updates.map(u => buildUpdateCard(u)).join('\n');
  const filtersHTML  = buildFilterButtons(updates);
  const noticeResult = buildNoticeHTML(notice);

  let html = readFileSync('./index.html', 'utf8');

  html = replaceRegion(html,
    /<!-- MEETINGS-LIST-START -->[\s\S]*?<!-- MEETINGS-LIST-END -->/,
    `<!-- MEETINGS-LIST-START -->\n${meetingsHTML}\n      <!-- MEETINGS-LIST-END -->`,
    'MEETINGS-LIST');

  html = replaceRegion(html,
    /<!-- UPDATES-LIST-START -->[\s\S]*?<!-- UPDATES-LIST-END -->/,
    `<!-- UPDATES-LIST-START -->\n${updatesHTML}\n      <!-- UPDATES-LIST-END -->`,
    'UPDATES-LIST');

  html = replaceRegion(html,
    /<!-- FILTERS-START -->[\s\S]*?<!-- FILTERS-END -->/,
    `<!-- FILTERS-START -->\n${filtersHTML}\n      <!-- FILTERS-END -->`,
    'FILTERS');

  html = replaceRegion(html, /<!-- NOTICE-BAR -->/,
    noticeResult.html ? noticeResult.html + '\n\n  ' : '<!-- NOTICE-BAR -->',
    'NOTICE-BAR');

  html = replaceRegion(html,
    /<!-- NEXT-MEETING-START -->[\s\S]*?<!-- NEXT-MEETING-END -->/,
    `<!-- NEXT-MEETING-START -->${nextMeetingTile(meetings)}<!-- NEXT-MEETING-END -->`,
    'NEXT-MEETING');

  const LAST_UPDATED_RE = /<!-- LAST-UPDATED -->/;
  if (LAST_UPDATED_RE.test(html)) {
    const built = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' });
    html = html.replace(LAST_UPDATED_RE, `· Last updated ${built}`);
  }

  // ── Patch main.js WL_DATA from data/waitlist.json ──
  let js = readFileSync('./main.js', 'utf8');
  js = replaceRegion(js, /export const WL_DATA = \{[\s\S]*?\};/, `export const WL_DATA = {
  parking: ${JSON.stringify(waitlist.parking)},
  storage: ${JSON.stringify(waitlist.storage)},
};`, 'WL_DATA');

  // ── Write dist/ ──
  mkdirSync('./dist', { recursive: true });
  writeFileSync('./dist/index.html', html);
  writeFileSync('./dist/main.js', js);

  // Copy the shared ESM helpers the page imports at runtime.
  if (existsSync('./lib')) {
    mkdirSync('./dist/lib', { recursive: true });
    for (const f of readdirSync('./lib')) {
      if (f.endsWith('.js')) copyFileSync(`./lib/${f}`, `./dist/lib/${f}`);
    }
  }
  if (existsSync('./sitemap.xml')) copyFileSync('./sitemap.xml', './dist/sitemap.xml');
  if (existsSync('./robots.txt'))  copyFileSync('./robots.txt',  './dist/robots.txt');
  if (existsSync('./.nojekyll'))   copyFileSync('./.nojekyll',   './dist/.nojekyll');

  const noticeStatus = noticeResult.active ? `notice: "${notice.message}"`
    : noticeResult.expired ? 'notice: expired' : 'notice: off';
  return `Built: ${meetings.length} meetings · ${updates.length} updates · ` +
    `${waitlist.parking.length} parking · ${waitlist.storage.length} storage · ${noticeStatus}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(build());
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}
