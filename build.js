import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';

const escapeHTML = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const escapeAttr = s => s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;');

function loadJSON(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { console.error(`ERROR: Could not parse ${path} — ${e.message}`); process.exit(1); }
}

const meetings = loadJSON('./data/meetings.json');
const waitlist = loadJSON('./data/waitlist.json');
const notice   = loadJSON('./data/notices.json');
const updates  = loadJSON('./data/updates.json');

// ── Build meeting list HTML ──
function buildMeetingItem(m) {
  const dateClass = 'meeting-date' + (m.next ? ' next' : '');
  const badge = m.badge ? ` <span class="badge">${escapeHTML(m.badge)}</span>` : '';
  const calBtn = m.calendar
    ? `\n            <button class="cal-btn" onclick="addToCalendar('${m.isoDate}','${escapeAttr(m.title + ' — 555 McLean Ave')}','${escapeAttr(m.calendar.location)}','${m.calendar.startTime}','${m.calendar.endTime}')">+ Add to Calendar</button>`
    : '';
  return `        <li class="meeting-item fade-in">
          <div class="${dateClass}">
            <div class="day">${m.day}</div>
            <div class="month">${m.month}</div>
          </div>
          <div class="meeting-info">
            <h4>${escapeHTML(m.title)}${badge}</h4>
            <p>${m.detail}</p>${calBtn}
          </div>
        </li>`;
}

// ── Build update cards HTML ──
const CATEGORY_LABELS = {
  election: 'Election', general: 'General Notice',
  maintenance: 'Maintenance', reminder: 'Reminder',
  safety: 'Safety Notice', notice: 'Notice',
};

function buildUpdateCard(u) {
  const label = CATEGORY_LABELS[u.category] || u.category;
  const badge = u.badge ? ` <span class="badge">${escapeHTML(u.badge)}</span>` : '';
  return `      <div class="update-card fade-in" data-category="${u.category}">
        <div class="update-meta">${u.date} · ${label}${badge}</div>
        <h4>${escapeHTML(u.title)}</h4>
        <p>${escapeHTML(u.body)}</p>
        <span class="arrow">›</span>
      </div>`;
}

// ── Build filter buttons from unique categories in updates.json ──
function buildFilterButtons(updates) {
  const seen = new Set();
  const cats = updates.map(u => u.category).filter(c => { if (seen.has(c)) return false; seen.add(c); return true; });
  const allBtn = `      <button class="filter-btn active" data-filter="all" onclick="filterUpdates(this)">All</button>`;
  const catBtns = cats.map(c => {
    const label = CATEGORY_LABELS[c] || c.charAt(0).toUpperCase() + c.slice(1);
    return `      <button class="filter-btn" data-filter="${c}" onclick="filterUpdates(this)">${label}</button>`;
  });
  return [allBtn, ...catBtns].join('\n');
}

const meetingsHTML = meetings.map(buildMeetingItem).join('\n');
const updatesHTML  = updates.map(buildUpdateCard).join('\n');
const filtersHTML  = buildFilterButtons(updates);

// ── Build notice bar HTML (empty string when inactive or expired) ──
// Optional "expires" (e.g. "2026-06-10T14:00") hides the bar after that time:
// skipped here if already past at build time, otherwise removed client-side.
const ICONS = { info: 'ℹ️', warning: '⚠️', urgent: '🚨' };
const noticeExpired = notice.expires && new Date(notice.expires) <= new Date();
const noticeActive  = notice.active && notice.message && !noticeExpired;
const noticeHTML = noticeActive
  ? `<div class="notice-bar notice-${notice.type}" id="notice-bar"${notice.expires ? ` data-expires="${escapeHTML(notice.expires)}"` : ''}>
    <div class="notice-bar-inner">
      <span>${ICONS[notice.type] || 'ℹ️'}</span>
      <span>${escapeHTML(notice.message)}</span>
      ${notice.dismissible ? '<button class="notice-bar-close" onclick="dismissNotice()" aria-label="Dismiss">✕</button>' : ''}
    </div>
  </div>`
  : '';

// ── Patch index.html ──
let html = readFileSync('./index.html', 'utf8');

const MEETINGS_RE = /<!-- MEETINGS-LIST-START -->[\s\S]*?<!-- MEETINGS-LIST-END -->/;
if (!MEETINGS_RE.test(html)) { console.error('ERROR: MEETINGS-LIST markers missing'); process.exit(1); }
html = html.replace(MEETINGS_RE,
  `<!-- MEETINGS-LIST-START -->\n${meetingsHTML}\n      <!-- MEETINGS-LIST-END -->`);

const UPDATES_RE = /<!-- UPDATES-LIST-START -->[\s\S]*?<!-- UPDATES-LIST-END -->/;
if (!UPDATES_RE.test(html)) { console.error('ERROR: UPDATES-LIST markers missing'); process.exit(1); }
html = html.replace(UPDATES_RE,
  `<!-- UPDATES-LIST-START -->\n${updatesHTML}\n      <!-- UPDATES-LIST-END -->`);

const FILTERS_RE = /<!-- FILTERS-START -->[\s\S]*?<!-- FILTERS-END -->/;
if (!FILTERS_RE.test(html)) { console.error('ERROR: FILTERS markers missing'); process.exit(1); }
html = html.replace(FILTERS_RE,
  `<!-- FILTERS-START -->\n${filtersHTML}\n      <!-- FILTERS-END -->`);

const NOTICE_RE = /<!-- NOTICE-BAR -->/;
if (!NOTICE_RE.test(html)) { console.error('ERROR: NOTICE-BAR marker missing'); process.exit(1); }
html = html.replace(NOTICE_RE, noticeHTML ? noticeHTML + '\n\n  ' : '<!-- NOTICE-BAR -->');

// ── Next-meeting Quick Actions tile ──
// First meeting with an isoDate that hasn't ended yet wins; the countdown chip
// only renders when calendar times exist. Falls back to "<month> · Date TBD".
function nextMeetingTile() {
  const now = new Date();
  for (const m of meetings) {
    if (!m.isoDate) continue;
    const endTime = m.calendar?.endTime || '23:59';
    if (new Date(`${m.isoDate}T${endTime}:00`) < now) continue;
    const chip = m.calendar
      ? ` <span id="meeting-countdown" class="countdown-chip" data-start="${m.isoDate}T${m.calendar.startTime}:00" data-end="${m.isoDate}T${m.calendar.endTime}:00"></span>`
      : '';
    return `${m.month} ${m.day} · ${escapeHTML(m.title)}${chip}`;
  }
  return meetings.length ? `${meetings[0].month} · Date TBD` : 'Date TBD';
}

const NEXT_MEETING_RE = /<!-- NEXT-MEETING-START -->[\s\S]*?<!-- NEXT-MEETING-END -->/;
if (!NEXT_MEETING_RE.test(html)) { console.error('ERROR: NEXT-MEETING markers missing'); process.exit(1); }
html = html.replace(NEXT_MEETING_RE,
  `<!-- NEXT-MEETING-START -->${nextMeetingTile()}<!-- NEXT-MEETING-END -->`);

const LAST_UPDATED_RE = /<!-- LAST-UPDATED -->/;
if (LAST_UPDATED_RE.test(html)) {
  const built = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' });
  html = html.replace(LAST_UPDATED_RE, `· Last updated ${built}`);
}

// ── Patch main.js WL_DATA from data/waitlist.json ──
let js = readFileSync('./main.js', 'utf8');
const WL_RE = /export const WL_DATA = \{[\s\S]*?\};/;
if (!WL_RE.test(js)) { console.error('ERROR: WL_DATA block missing'); process.exit(1); }
js = js.replace(WL_RE, `export const WL_DATA = {
  parking: ${JSON.stringify(waitlist.parking)},
  storage: ${JSON.stringify(waitlist.storage)},
};`);

// ── Write dist/ ──
mkdirSync('./dist', { recursive: true });
writeFileSync('./dist/index.html', html);
writeFileSync('./dist/main.js', js);
if (existsSync('./sitemap.xml')) copyFileSync('./sitemap.xml', './dist/sitemap.xml');
if (existsSync('./robots.txt'))  copyFileSync('./robots.txt',  './dist/robots.txt');
if (existsSync('./.nojekyll'))   copyFileSync('./.nojekyll',   './dist/.nojekyll');

const noticeStatus = noticeActive ? `notice: "${notice.message}"` : noticeExpired ? 'notice: expired' : 'notice: off';
console.log(
  `Built: ${meetings.length} meetings · ${updates.length} updates · ` +
  `${waitlist.parking.length} parking · ${waitlist.storage.length} storage · ${noticeStatus}`
);
