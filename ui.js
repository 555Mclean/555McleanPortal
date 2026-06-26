// Pure UI helpers extracted from the inline <script> in index.html so the fiddly,
// format-sensitive logic (date math, .ics generation, filter predicates) can be
// unit-tested. The DOM wiring stays inline in index.html and calls into these.

// Relative date label for event badges — Today / Tomorrow / "Jun 12".
// Returns null when the date is in the past (caller removes the badge).
export function relativeDateLabel(iso, now = new Date()) {
  const [y, m, d] = iso.split('-').map(Number);
  const ev = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((ev - today) / 86400000);
  if (diff < 0) return null;
  return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow'
    : ev.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Countdown chip text for the next meeting. Returns null once the event has
// ended (caller removes the chip), 'Happening Now' while live, else "in 3d 4h".
export function countdownLabel(start, end, now = new Date()) {
  if (now > end) return null;
  if (now >= start) return 'Happening Now';
  const diff = start - now;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return 'in ' + (d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`);
}

// First-visit theme: honor a saved choice, otherwise follow the OS preference.
export function prefersDarkDefault(saved, prefersDark) {
  return saved ? saved === 'dark' : prefersDark;
}

// Whether an update card should be visible given the active category filter and
// the (already lower-cased, trimmed) search query.
export function updateCardMatches(text, category, activeCategory, query) {
  const matchesCat   = activeCategory === 'all' || category === activeCategory;
  const matchesQuery = !query || text.toLowerCase().includes(query);
  return matchesCat && matchesQuery;
}

// Build an RFC-5545 VCALENDAR document for a single meeting (\r\n separated).
export function buildICS(dateStr, title, location, startTime, endTime, now = new Date()) {
  const esc = s => s.replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,');
  const [y, m, d] = dateStr.split('-');
  const start = `${y}${m}${d}T${startTime.replace(':', '')}00`;
  const end   = `${y}${m}${d}T${endTime.replace(':', '')}00`;
  const pad2  = n => String(n).padStart(2, '0');
  const dtstamp = `${now.getUTCFullYear()}${pad2(now.getUTCMonth()+1)}${pad2(now.getUTCDate())}T${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}${pad2(now.getUTCSeconds())}Z`;
  const uid = `${dateStr}T${startTime.replace(':','')}@555mclean.github.io`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//555 McLean Ave//Resident Portal//EN',
    'BEGIN:VEVENT',
    'DTSTAMP:' + dtstamp,
    'UID:' + uid,
    'DTSTART:' + start,
    'DTEND:'   + end,
    'SUMMARY:' + esc(title),
    'LOCATION:' + esc(location),
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}
