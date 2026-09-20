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

// ── Sponsors / local vendor ads ────────────────────────────────────────────
// Rendered from data/sponsors.json. The board adds a vendor by appending an
// object to "sponsors"; nothing else needs editing. Every value is escaped and
// links are scheme-checked here, because the file is hand-edited and the ad
// copy comes from outside the building.

// Where sponsorship enquiries go (the board's address).
export const SPONSOR_EMAIL = '555mcleanboard@gmail.com';

// Only http(s) links are rendered — a "javascript:" or "data:" href supplied by
// a vendor must never reach the page.
export function safeUrl(url) {
  const u = String(url || '').trim();
  return /^https?:\/\/\S+$/i.test(u) ? u : '';
}

// "(914) 654-1414" → "+19146541414". Returns '' when there aren't enough
// digits to dial, so the caller can skip the link.
export function telHref(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return digits.length >= 7 ? '+' + digits : '';
}

// A sponsor shows when it has a name, hasn't been switched off, and its run
// hasn't ended. "expires" is an ISO date (inclusive — live through that day) or
// a full ISO datetime.
export function sponsorIsLive(s, now = new Date()) {
  if (!s || !s.name || s.active === false) return false;
  if (!s.expires) return true;
  const end = String(s.expires).includes('T')
    ? new Date(s.expires)
    : new Date(`${s.expires}T23:59:59`);
  return !(end <= now);
}

// Live sponsors, featured ones first (order within a tier is preserved).
export function activeSponsors(data, now = new Date()) {
  const list = (data && Array.isArray(data.sponsors) ? data.sponsors : []).filter(s => sponsorIsLive(s, now));
  return [...list.filter(s => s.tier === 'featured'), ...list.filter(s => s.tier !== 'featured')];
}

export function buildSponsorCard(s) {
  const featured = s.tier === 'featured';
  const url = safeUrl(s.url);
  const tel = telHref(s.phone);
  const links = [
    url ? `<a class="sponsor-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer sponsored">Visit website <span aria-hidden="true">↗</span></a>` : '',
    tel ? `<a class="sponsor-link" href="tel:${escapeAttr(tel)}">${escapeHTML(String(s.phone))}</a>` : '',
  ].filter(Boolean).join('\n            ');
  return `        <article class="sponsor-card fade-in${featured ? ' sponsor-featured' : ''}">
${featured ? '          <span class="sponsor-ribbon">Featured</span>\n' : ''}          <span class="sponsor-logo" aria-hidden="true">${escapeHTML(String(s.icon || '🏪'))}</span>
          <div class="sponsor-body">
${s.category ? `            <span class="sponsor-cat">${escapeHTML(String(s.category))}</span>\n` : ''}            <h3 class="sponsor-name">${escapeHTML(String(s.name))}</h3>
${s.tagline ? `            <p class="sponsor-tagline">${escapeHTML(String(s.tagline))}</p>\n` : ''}${s.offer ? `            <p class="sponsor-offer">🎟️ ${escapeHTML(String(s.offer))}</p>\n` : ''}${links ? `            <div class="sponsor-links">\n            ${links}\n            </div>\n` : ''}          </div>
        </article>`;
}

// Shown in place of the grid while no sponsor is live, so the section always
// reads as an open invitation rather than an empty shelf.
export function buildSponsorsEmpty() {
  const subject = encodeURIComponent('Sponsorship enquiry — 555 McLean Ave portal');
  return `        <div class="sponsor-empty fade-in">
          <span class="sponsor-empty-icon" aria-hidden="true">🤝</span>
          <h3>This space is open</h3>
          <p>Local businesses can reach every household at 555 McLean Ave here. Sponsorships are arranged by the board — get in touch for placement and rates.</p>
          <a class="btn-primary" href="mailto:${SPONSOR_EMAIL}?subject=${subject}">Become a Sponsor →</a>
        </div>`;
}

// The whole section — or '' when the board switches sponsors off in
// data/sponsors.json, in which case build.js also drops the nav links to it.
export function buildSponsorsSection(data, now = new Date()) {
  if (!data || data.enabled === false) return '';
  const live = activeSponsors(data, now);
  const intro = data.intro
    ? `      <p class="section-sub">${escapeHTML(String(data.intro))}</p>\n`
    : '';
  const body = live.length
    ? `      <div class="sponsor-grid">\n${live.map(buildSponsorCard).join('\n')}\n      </div>\n` +
      `      <p class="sponsor-cta">Interested in sponsoring? <a href="mailto:${SPONSOR_EMAIL}?subject=${encodeURIComponent('Sponsorship enquiry — 555 McLean Ave portal')}">Email the board</a> for placement and rates.</p>\n`
    : buildSponsorsEmpty() + '\n';
  return `  <section id="sponsors">
    <div class="inner">
      <div class="section-eyebrow">Community Sponsors</div>
      <h2 class="section-title">Local Businesses<br>Supporting Us</h2>
${intro}${body}    </div>
  </section>`;
}

// With the section gone, its "Sponsors" links would scroll nowhere — strip the
// anchors the header and footer mark with data-section="sponsors".
export function stripSponsorNavLinks(html) {
  return html.replace(/[ \t]*<a [^>]*data-section="sponsors"[^>]*>[\s\S]*?<\/a>\n?/g, '');
}
