// Builds an iCalendar (.ics) document for a single meeting. Pure string logic,
// kept out of index.html so the escaping and date formatting can be tested.
// `now` (the DTSTAMP source) is injectable for deterministic tests.
export function buildICS({ dateStr, title, location, startTime, endTime, now = new Date() }) {
  const esc = s => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');
  const [y, m, d] = dateStr.split('-');
  const start = `${y}${m}${d}T${startTime.replace(':', '')}00`;
  const end   = `${y}${m}${d}T${endTime.replace(':', '')}00`;
  const pad2  = n => String(n).padStart(2, '0');
  const dtstamp = `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}T${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}${pad2(now.getUTCSeconds())}Z`;
  const uid = `${dateStr}T${startTime.replace(':', '')}@555mclean.github.io`;
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
