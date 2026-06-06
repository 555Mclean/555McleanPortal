import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const meetings = JSON.parse(readFileSync('./data/meetings.json', 'utf8'));
const waitlist = JSON.parse(readFileSync('./data/waitlist.json', 'utf8'));
const notice   = JSON.parse(readFileSync('./data/notices.json',  'utf8'));

// ── Build meeting list HTML ──
function buildMeetingItem(m) {
  const dateClass = 'meeting-date' + (m.next ? ' next' : '');
  const badge = m.badge ? ` <span class="badge">${m.badge}</span>` : '';
  const calBtn = m.calendar
    ? `\n            <button class="cal-btn" onclick="addToCalendar('${m.isoDate}','${m.title} — 555 McLean Ave','${m.calendar.location}','${m.calendar.startTime}','${m.calendar.endTime}')">+ Add to Calendar</button>`
    : '';
  return `        <li class="meeting-item fade-in">
          <div class="${dateClass}">
            <div class="day">${m.day}</div>
            <div class="month">${m.month}</div>
          </div>
          <div class="meeting-info">
            <h4>${m.title}${badge}</h4>
            <p>${m.detail}</p>${calBtn}
          </div>
        </li>`;
}

const meetingsHTML = meetings.map(buildMeetingItem).join('\n');

// ── Build notice bar HTML (empty string when inactive) ──
const ICONS = { info: 'ℹ️', warning: '⚠️', urgent: '🚨' };
const noticeHTML = notice.active && notice.message
  ? `<div class="notice-bar notice-${notice.type}" id="notice-bar">
    <div class="notice-bar-inner">
      <span>${ICONS[notice.type] || 'ℹ️'}</span>
      <span>${notice.message}</span>
      ${notice.dismissible ? '<button class="notice-bar-close" onclick="dismissNotice()" aria-label="Dismiss">✕</button>' : ''}
    </div>
  </div>`
  : '';

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

const NOTICE_RE = /<!-- NOTICE-BAR -->/;
if (!NOTICE_RE.test(html)) {
  console.error('ERROR: NOTICE-BAR marker not found in index.html');
  process.exit(1);
}
html = html.replace(NOTICE_RE, noticeHTML ? noticeHTML + '\n\n  ' : '<!-- NOTICE-BAR -->');

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

const noticeStatus = notice.active ? `notice: "${notice.message}"` : 'notice: off';
console.log(
  `Built: ${meetings.length} meetings · ` +
  `${waitlist.parking.length} parking · ${waitlist.storage.length} storage · ${noticeStatus}`
);
