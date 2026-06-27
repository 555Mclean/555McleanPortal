// Pure helpers for turning a published responses spreadsheet (CSV) into the
// data/waitlist.json shape the site renders. Kept free of I/O so the parsing
// and queue-building rules can be unit-tested without the network.
//
// The flow this supports: residents submit the on-site form → it feeds a
// Google Form → that form's responses Sheet is "Published to web" as CSV →
// scripts/sync-waitlist.mjs fetches the CSV and calls these helpers → the
// resulting data/waitlist.json is committed and the site redeploys.
//
// Privacy note: only the apartment identifier ends up in the public JSON. Names,
// emails and phone numbers stay in the board's private responses Sheet.

// ── CSV parsing ──────────────────────────────────────────────────────────────
// A small RFC-4180-ish parser: handles quoted fields, embedded commas/newlines,
// and "" escaped quotes. Returns an array of arrays (rows of cells).
export function parseCSVRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  // Normalise newlines so \r\n and \r behave like \n.
  const s = String(text).replace(/\r\n?/g, '\n');

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }   // escaped quote
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += c;
    }
  }
  // Flush the trailing field/row unless the input ended on a clean newline.
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// Parse CSV text into objects keyed by the (trimmed) header row.
export function parseCSV(text) {
  const rows = parseCSVRows(text).filter(r => r.some(c => c.trim() !== ''));
  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(cells => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] ?? '').trim(); });
    return obj;
  });
}

// ── Column detection ─────────────────────────────────────────────────────────
// Board members name their form questions however they like, so match column
// headers loosely (case-insensitive substring) with sensible fallbacks.
function findKey(headers, candidates) {
  const lower = headers.map(h => h.toLowerCase());
  for (const want of candidates) {
    const idx = lower.findIndex(h => h.includes(want));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

const REMOVED_VALUES = new Set([
  'yes', 'y', 'x', 'true', 'done', 'removed', 'remove', 'assigned',
  'complete', 'completed', 'off', 'fulfilled',
]);

function listOf(value) {
  const v = String(value).toLowerCase();
  if (v.includes('park')) return 'parking';
  if (v.includes('stor')) return 'storage';
  return null;
}

// ── Build the waitlist payload ───────────────────────────────────────────────
// rows: array of objects from parseCSV. Returns { parking: [...], storage: [...] }
// preserving submission order, de-duplicated by apartment, dropping rows whose
// "remove/assigned/status" column marks them as no longer waiting.
export function rowsToWaitlist(rows, opts = {}) {
  const out = { parking: [], storage: [] };
  if (!rows || rows.length === 0) return out;

  const headers = Object.keys(rows[0]);
  const listKey   = opts.listKey   || findKey(headers, ['list', 'type', 'parking', 'queue', 'request']);
  const aptKey    = opts.aptKey    || findKey(headers, ['apartment', 'apt', 'unit']);
  const removeKey = opts.removeKey || findKey(headers, ['remove', 'assigned', 'status', 'fulfilled']);

  if (!aptKey) return out; // can't build a queue without an apartment identifier

  const seen = { parking: new Set(), storage: new Set() };

  for (const row of rows) {
    if (removeKey) {
      const flag = String(row[removeKey] || '').trim().toLowerCase();
      if (flag && REMOVED_VALUES.has(flag)) continue;
    }
    const apt = String(row[aptKey] || '').trim();
    if (!apt) continue;

    const list = listKey ? listOf(row[listKey]) : 'parking';
    if (!list) continue;

    const dedupeKey = apt.toUpperCase();
    if (seen[list].has(dedupeKey)) continue;
    seen[list].add(dedupeKey);
    out[list].push(apt);
  }
  return out;
}

// Convenience: CSV text → waitlist payload.
export function csvToWaitlist(text, opts = {}) {
  return rowsToWaitlist(parseCSV(text), opts);
}
