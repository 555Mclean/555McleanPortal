// Fetches the board's published responses spreadsheet (CSV) and rewrites
// data/waitlist.json from it. Run by .github/workflows/sync-waitlist.yml on a
// schedule; the resulting commit redeploys the site with the live queue.
//
// Configuration (GitHub repo secret / env):
//   WAITLIST_CSV_URL  – the "Publish to web → CSV" link for the responses Sheet.
//                       If unset, this script is a safe no-op (exit 0), so the
//                       site keeps using the email fallback until the board
//                       wires up the form.
// Optional column-name overrides (only needed if auto-detection guesses wrong):
//   WAITLIST_COL_LIST, WAITLIST_COL_APT, WAITLIST_COL_REMOVE
//
// Privacy: only apartment identifiers are written to the public JSON.

import { readFileSync, writeFileSync } from 'fs';
import { csvToWaitlist } from './sync-lib.mjs';

const url = process.env.WAITLIST_CSV_URL;
if (!url) {
  console.log('WAITLIST_CSV_URL not set — skipping sync (no changes made).');
  process.exit(0);
}

const opts = {
  listKey:   process.env.WAITLIST_COL_LIST   || undefined,
  aptKey:    process.env.WAITLIST_COL_APT    || undefined,
  removeKey: process.env.WAITLIST_COL_REMOVE || undefined,
};

const OUT = new URL('../data/waitlist.json', import.meta.url);

async function main() {
  let res;
  try {
    res = await fetch(url, { redirect: 'follow' });
  } catch (e) {
    console.error(`ERROR: could not fetch WAITLIST_CSV_URL — ${e.message}`);
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`ERROR: responses sheet returned HTTP ${res.status}`);
    process.exit(1);
  }

  const csv = await res.text();
  const next = csvToWaitlist(csv, opts);

  // Guard against a transient empty/garbled fetch wiping a populated queue.
  let current = { parking: [], storage: [] };
  try { current = JSON.parse(readFileSync(OUT, 'utf8')); } catch { /* first run */ }
  const hadData = (current.parking?.length || 0) + (current.storage?.length || 0) > 0;
  const gotData = next.parking.length + next.storage.length > 0;
  if (hadData && !gotData) {
    console.error('ERROR: parsed an empty queue from a non-empty sheet — refusing to overwrite. Check column names.');
    process.exit(1);
  }

  const json = JSON.stringify(next, null, 2) + '\n';
  writeFileSync(OUT, json);
  console.log(`Synced: ${next.parking.length} parking · ${next.storage.length} storage`);
}

main();
