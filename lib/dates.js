// Shared date helpers used by both the build pipeline (build.js, Node) and the
// in-page scripts (index.html, browser). Keeping a single copy here avoids the
// two implementations of the same relative-date math drifting apart.

// Relative label for an event date string ("YYYY-MM-DD"):
//   Today / Tomorrow / "Jun 12"   — or null when the date is in the past.
// `now` is injectable so the logic can be tested deterministically.
export function eventBadgeLabel(iso, now = new Date()) {
  const [y, m, d] = iso.split('-').map(Number);
  const ev = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((ev - today) / 86400000);
  if (diff < 0) return null;
  return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow'
    : ev.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Countdown text for the next-meeting chip. `start`/`end` are Date objects.
// Returns null once the event has ended (caller removes the chip),
// 'Happening Now' while it's in progress, otherwise "in 2d 3h" / "in 4h 5m" /
// "in 6m".
export function countdownLabel(start, end, now = new Date()) {
  if (now > end) return null;
  if (now >= start) return 'Happening Now';
  const diff = start - now;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return 'in ' + (d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`);
}
