// Pure rendering helpers used by build.js. Kept free of file I/O so they can be
// unit-tested in isolation — build.js wires these into the actual file reads/writes.

export const escapeHTML = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export const escapeAttr = s => s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;');

// Replace a build marker with generated HTML.
// String.replace treats "$" sequences in the replacement as patterns — "$&"
// re-inserts the marker and "$'" splices in the whole rest of the file — so a
// board member writing a dollar amount into data/*.json could silently corrupt
// the built page. A replacer function is passed through verbatim.
export function inject(html, pattern, replacement) {
  return html.replace(pattern, () => replacement);
}

export const CATEGORY_LABELS = {
  election: 'Election', general: 'General Notice',
  maintenance: 'Maintenance', reminder: 'Reminder',
  safety: 'Safety Notice', notice: 'Notice',
};

export const ICONS = { info: 'ℹ️', warning: '⚠️', urgent: '🚨' };

// ── Build meeting list HTML ──
export function buildMeetingItem(m) {
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

// Optional "eventDate" (YYYY-MM-DD) renders a relative badge — Today / Tomorrow /
// "Jun 12" — recomputed client-side so it stays accurate without a rebuild.
export function eventBadgeLabel(iso, now = new Date()) {
  const [y, m, d] = iso.split('-').map(Number);
  const ev = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((ev - today) / 86400000);
  if (diff < 0) return null;
  return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow'
    : ev.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Build update cards HTML ──
export function buildUpdateCard(u, now = new Date()) {
  const label = CATEGORY_LABELS[u.category] || u.category;
  let badge = '';
  if (u.eventDate) {
    const rel = eventBadgeLabel(u.eventDate, now);
    if (rel) badge = ` <span class="badge" data-event-date="${u.eventDate}">${rel}</span>`;
  } else if (u.badge) {
    badge = ` <span class="badge">${escapeHTML(u.badge)}</span>`;
  }
  // data-date lets the client filter the feed by date range.
  return `      <div class="update-card fade-in" data-category="${u.category}" data-date="${escapeAttr(u.date)}">
        <div class="update-meta">${u.date} · ${label}${badge}</div>
        <h4>${escapeHTML(u.title)}</h4>
        <p>${escapeHTML(u.body)}</p>
        <span class="arrow">›</span>
      </div>`;
}

// ── Build filter buttons from unique categories in updates.json ──
export function buildFilterButtons(updates) {
  const seen = new Set();
  const cats = updates.map(u => u.category).filter(c => { if (seen.has(c)) return false; seen.add(c); return true; });
  const allBtn = `      <button class="filter-btn active" data-filter="all" onclick="filterUpdates(this)">All</button>`;
  const catBtns = cats.map(c => {
    const label = CATEGORY_LABELS[c] || c.charAt(0).toUpperCase() + c.slice(1);
    return `      <button class="filter-btn" data-filter="${c}" onclick="filterUpdates(this)">${label}</button>`;
  });
  return [allBtn, ...catBtns].join('\n');
}

// ── Notice bar (empty string when inactive or expired) ──
// Optional "expires" (e.g. "2026-06-10T14:00") hides the bar after that time:
// skipped here if already past at build time, otherwise removed client-side.
export function noticeState(notice, now = new Date()) {
  const expired = Boolean(notice.expires && new Date(notice.expires) <= now);
  const active  = Boolean(notice.active && notice.message && !expired);
  const html = active
    ? `<div class="notice-bar notice-${notice.type}" id="notice-bar"${notice.expires ? ` data-expires="${escapeHTML(notice.expires)}"` : ''}>
    <div class="notice-bar-inner">
      <span>${ICONS[notice.type] || 'ℹ️'}</span>
      <span>${escapeHTML(notice.message)}</span>
      ${notice.dismissible ? '<button class="notice-bar-close" onclick="dismissNotice()" aria-label="Dismiss">✕</button>' : ''}
    </div>
  </div>`
    : '';
  return { expired, active, html };
}

// ── Next-meeting Quick Actions tile ──
// First meeting with an isoDate that hasn't ended yet wins; the countdown chip
// only renders when calendar times exist. Falls back to "<month> · Date TBD".
export function nextMeetingTile(meetings, now = new Date()) {
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

// ── Sponsor (ad) section ──
// The board runs Google AdSense from data/ads.json. Nothing renders until the
// config is switched on AND carries a real publisher id plus at least one slot
// id — an ad script with placeholder ids just prints console errors for every
// visitor, so an unconfigured file is treated as "off" rather than half-wired.
export const AD_CLIENT_RE = /^ca-pub-\d{10,}$/;
export const AD_SLOT_RE = /^\d{6,}$/;

export function adUnits(config) {
  return (config.units || []).filter(u => AD_SLOT_RE.test(String(u.slot || '')));
}

export function adsState(config = {}) {
  const client = String(config.client || '');
  const units = adUnits(config);

  if (!config.enabled) return { enabled: false, reason: 'off', headHTML: '', navHTML: '', sectionHTML: '' };
  if (!AD_CLIENT_RE.test(client)) return { enabled: false, reason: 'no publisher id', headHTML: '', navHTML: '', sectionHTML: '' };
  if (!units.length) return { enabled: false, reason: 'no ad slots', headHTML: '', navHTML: '', sectionHTML: '' };

  const headHTML =
    `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${escapeAttr(client)}" crossorigin="anonymous"></script>`;

  const navHTML = `<a href="#sponsors" id="sponsors-nav" hidden>Sponsors</a>`;

  const insHTML = units.map(u => `        <div class="ad-unit">
          <ins class="adsbygoogle"
               style="display:block"
               aria-label="${escapeAttr(u.label || 'Advertisement')}"
               data-ad-client="${escapeAttr(client)}"
               data-ad-slot="${escapeAttr(String(u.slot))}"
               data-ad-format="${escapeAttr(u.format || 'auto')}"
               data-full-width-responsive="${u.responsive === false ? 'false' : 'true'}"></ins>
        </div>`).join('\n');

  // Ships "pending": full-width and in the flow so AdSense has a width to
  // measure, but collapsed to no visible height with its heading hidden.
  // ads.js reveals it only once a unit actually fills, so blocked or unsold ads
  // leave no empty gap — and a visitor with JS off never sees it at all.
  const sectionHTML = `<section id="sponsors" class="ads-pending">
    <div class="inner">
      <div class="section-eyebrow">${escapeHTML(config.eyebrow || 'Supporting the Portal')}</div>
      <h2 class="section-title">${escapeHTML(config.heading || 'Local Sponsors')}</h2>
      <p class="section-sub">${escapeHTML(config.blurb || '')}</p>
      <div class="ad-stack">
${insHTML}
      </div>
      <p class="ad-disclosure">${escapeHTML(config.disclosure || 'Advertisement.')}</p>
    </div>
  </section>`;

  return { enabled: true, reason: `${units.length} unit(s)`, headHTML, navHTML, sectionHTML };
}
