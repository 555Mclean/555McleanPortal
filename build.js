import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const meetings = JSON.parse(readFileSync('./data/meetings.json', 'utf8'));
const waitlist = JSON.parse(readFileSync('./data/waitlist.json', 'utf8'));

// ── Build meeting list HTML ──
function buildMeetingItem(m) {
  const dateClass = 'meeting-date' + (m.next ? ' next' : '');
  const badge = m.badge ? ` <span class="badge">${m.badge}</span>` : '';
  return `        <li class="meeting-item fade-in">
          <div class="${dateClass}">
            <div class="day">${m.day}</div>
            <div class="month">${m.month}</div>
          </div>
          <div class="meeting-info">
            <h4>${m.title}${badge}</h4>
            <p>${m.detail}</p>
          </div>
        </li>`;
}

const meetingsHTML = meetings.map(buildMeetingItem).join('\n');

// ── Patch index.html ──
let html = readFileSync('./index.html', 'utf8');
const MEETINGS_RE = /<!-- MEETINGS-LIST-START -->[\s\S]*?<!-- MEETINGS-LIST-END -->/;
if (!MEETINGS_RE.test(html)) {
  console.error('ERROR: MEETINGS-LIST-START/END markers not found in index.html');
  process.exit(1);
}
html = html.replace(
  MEETINGS_RE,
  `<!-- MEETINGS-LIST-START -->\n${meetingsHTML}\n      <!-- MEETINGS-LIST-END -->`
);

// ── Patch main.js WL_DATA from data/waitlist.json ──
let js = readFileSync('./main.js', 'utf8');
const WL_RE = /export const WL_DATA = \{[\s\S]*?\};/;
if (!WL_RE.test(js)) {
  console.error('ERROR: WL_DATA block not found in main.js');
  process.exit(1);
}
const wlBlock = `export const WL_DATA = {
  parking: ${JSON.stringify(waitlist.parking)},
  storage: ${JSON.stringify(waitlist.storage)},
};`;
js = js.replace(WL_RE, wlBlock);

// ── Write dist/ ──
mkdirSync('./dist', { recursive: true });
writeFileSync('./dist/index.html', html);
writeFileSync('./dist/main.js', js);

console.log(
  `Built: ${meetings.length} meetings · ` +
  `${waitlist.parking.length} parking · ${waitlist.storage.length} storage`
);
