// Pure rendering helpers used by build.js. Kept free of file I/O so they can be
// unit-tested in isolation — build.js wires these into the actual file reads/writes.

export const escapeHTML = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export const escapeAttr = s => s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;');

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
  return `      <div class="update-card fade-in" data-category="${u.category}">
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
