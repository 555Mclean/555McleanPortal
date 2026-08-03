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

// ── Holiday greetings ─────────────────────────────────────────────────────────
// The portal is a static site that is only rebuilt on deploy, so the greeting is
// picked in the browser from the visitor's own date rather than stamped in at
// build time — otherwise it would go stale between deploys. Everything below is
// pure and date-driven so it can be unit-tested.

// Day of the month for the nth `weekday` (0 = Sunday) of a month. `month` is
// 1-based. Pass n = -1 for the last one in the month (e.g. Memorial Day).
export function nthWeekday(year, month, weekday, n) {
  if (n < 0) {
    const last = new Date(year, month, 0).getDate();
    return last - ((new Date(year, month - 1, last).getDay() - weekday + 7) % 7);
  }
  const firstDow = new Date(year, month - 1, 1).getDay();
  return 1 + ((weekday - firstDow + 7) % 7) + (n - 1) * 7;
}

// Western (Gregorian) Easter Sunday — the anonymous computus. Returns [month, day].
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return [Math.floor(n / 31), (n % 31) + 1];
}

// Observances that follow the Hebrew or a lunar calendar can't be derived from
// the Gregorian year, so they're listed here as [month, day] per year. THESE
// NEED TO BE VERIFIED AND EXTENDED — when a year is missing the portal simply
// skips that observance (no wrong date is ever shown), and `npm run build`
// prints a warning once the table stops covering the current year.
export const OBSERVANCE_DATES = {
  'Lunar New Year': { 2026: [2, 17], 2027: [2, 6],  2028: [1, 26] },
  'Rosh Hashanah':  { 2026: [9, 12], 2027: [10, 2], 2028: [9, 21] },
  'Hanukkah':       { 2026: [12, 4], 2027: [12, 24], 2028: [12, 12] },
  'Eid al-Fitr':    { 2026: [3, 20], 2027: [3, 9],  2028: [2, 26] },
  'Diwali':         { 2026: [11, 8], 2027: [10, 29], 2028: [11, 15] },
};

function observance(name) {
  return year => OBSERVANCE_DATES[name][year] || null;
}

// The greeting calendar. `on(year)` returns [month, day] (1-based) or null when
// the holiday has no known date that year. `lead` is how many days early the
// greeting starts showing, `span` how many days it stays up from its own date.
export const HOLIDAYS = [
  { name: "New Year's Day",  message: 'Happy New Year',                        emoji: '🎉', on: () => [1, 1] },
  { name: 'Lunar New Year',  message: 'Happy Lunar New Year',                  emoji: '🧧', on: observance('Lunar New Year'), span: 2 },
  { name: 'MLK Day',         message: 'Honoring Dr. Martin Luther King Jr.',   emoji: '🕊️', on: y => [1, nthWeekday(y, 1, 1, 3)] },
  { name: "Valentine's Day", message: "Happy Valentine's Day",                 emoji: '💐', on: () => [2, 14] },
  { name: "Presidents' Day", message: "Happy Presidents' Day",                 emoji: '🇺🇸', on: y => [2, nthWeekday(y, 2, 1, 3)] },
  { name: "St. Patrick's",   message: "Happy St. Patrick's Day",               emoji: '☘️', on: () => [3, 17] },
  { name: 'Eid al-Fitr',     message: 'Eid Mubarak',                           emoji: '🌙', on: observance('Eid al-Fitr'), span: 2 },
  { name: 'Easter',          message: 'Happy Easter',                          emoji: '🐣', on: easterSunday },
  { name: "Mother's Day",    message: "Happy Mother's Day",                    emoji: '💐', on: y => [5, nthWeekday(y, 5, 0, 2)] },
  { name: 'Memorial Day',    message: 'Remembering those who served',          emoji: '🇺🇸', on: y => [5, nthWeekday(y, 5, 1, -1)] },
  { name: 'Juneteenth',      message: 'Happy Juneteenth',                      emoji: '🕊️', on: () => [6, 19] },
  { name: "Father's Day",    message: "Happy Father's Day",                    emoji: '💙', on: y => [6, nthWeekday(y, 6, 0, 3)] },
  { name: 'Independence Day',message: 'Happy Fourth of July',                  emoji: '🎆', on: () => [7, 4] },
  { name: 'Labor Day',       message: 'Happy Labor Day',                       emoji: '🛠️', on: y => [9, nthWeekday(y, 9, 1, 1)] },
  { name: 'Rosh Hashanah',   message: 'Shanah Tovah — happy New Year',         emoji: '🍎', on: observance('Rosh Hashanah'), span: 2 },
  { name: 'Halloween',       message: 'Happy Halloween',                       emoji: '🎃', on: () => [10, 31] },
  { name: 'Diwali',          message: 'Happy Diwali',                          emoji: '🪔', on: observance('Diwali'), span: 2 },
  { name: 'Veterans Day',    message: 'Honoring our veterans',                 emoji: '🇺🇸', on: () => [11, 11] },
  { name: 'Thanksgiving',    message: 'Happy Thanksgiving',                    emoji: '🦃', on: y => [11, nthWeekday(y, 11, 4, 4)], lead: 1 },
  { name: 'Hanukkah',        message: 'Happy Hanukkah',                        emoji: '🕎', on: observance('Hanukkah'), span: 8 },
  { name: 'Christmas',       message: 'Merry Christmas',                       emoji: '🎄', on: () => [12, 25], lead: 4 },
  { name: 'Kwanzaa',         message: 'Happy Kwanzaa',                         emoji: '🕯️', on: () => [12, 26], span: 7 },
  { name: "New Year's Eve",  message: 'Wishing you a happy and healthy year',  emoji: '🥂', on: () => [12, 31] },
];

// The greeting to show today, or null on an ordinary day. Neighbouring years are
// checked too so an observance that runs across New Year's (Kwanzaa) is caught.
export function holidayGreeting(now = new Date(), holidays = HOLIDAYS) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let best = null;
  for (const year of [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]) {
    for (const h of holidays) {
      const md = h.on(year);
      if (!md) continue;
      const date  = new Date(year, md[0] - 1, md[1]);
      const start = new Date(year, md[0] - 1, md[1] - (h.lead || 0));
      const end   = new Date(year, md[0] - 1, md[1] + (h.span || 1) - 1);
      if (today < start || today > end) continue;
      // When two greetings overlap, the one whose own date is nearest wins, so a
      // multi-day observance never buries the day-of greeting (Kwanzaa vs Jan 1).
      const distance = Math.abs(date - today);
      if (!best || distance < best.distance) best = { distance, holiday: h };
    }
  }
  if (!best) return null;
  const { name, message, emoji } = best.holiday;
  return { name, message, emoji };
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
