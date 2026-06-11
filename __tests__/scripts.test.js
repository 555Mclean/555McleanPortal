// The weekly health-check scripts run as standalone processes in CI and
// decide whether GitHub issues get auto-filed, so they're exercised here the
// same way: as child processes against fixture files.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const CHECK_STALE = resolve(process.cwd(), 'scripts/check-stale.mjs');
const CHECK_PLACEHOLDERS = resolve(process.cwd(), 'scripts/check-placeholders.mjs');

let dir;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'portal-scripts-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

function run(script) {
  return spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' });
}

function localISO(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function writeMeetings(meetings) {
  mkdirSync(join(dir, 'data'), { recursive: true });
  writeFileSync(join(dir, 'data/meetings.json'), JSON.stringify(meetings));
}

describe('check-stale.mjs', () => {
  it('passes when a future confirmed meeting exists', () => {
    writeMeetings([{ title: 'Board', isoDate: '2999-01-15' }]);
    const res = run(CHECK_STALE);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('OK: 1 upcoming');
  });

  it('counts a meeting today as upcoming', () => {
    writeMeetings([{ title: 'Board', isoDate: localISO(new Date()) }]);
    const res = run(CHECK_STALE);
    expect(res.status).toBe(0);
  });

  it('fails when the only confirmed meetings are in the past', () => {
    writeMeetings([{ title: 'Board', isoDate: '2020-01-15' }]);
    const res = run(CHECK_STALE);
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('STALE');
  });

  it('fails when no meeting has a confirmed date (all TBD)', () => {
    writeMeetings([{ title: 'Board', day: 'TBD', month: 'Jul' }]);
    const res = run(CHECK_STALE);
    expect(res.status).toBe(1);
  });

  it('counts only dated meetings, ignoring TBD ones', () => {
    writeMeetings([
      { title: 'A', day: 'TBD' },
      { title: 'B', isoDate: '2999-03-01' },
      { title: 'C', isoDate: '2020-01-01' },
    ]);
    const res = run(CHECK_STALE);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('OK: 1 upcoming');
  });
});

describe('check-placeholders.mjs', () => {
  function writeHTML(content) {
    writeFileSync(join(dir, 'index.html'), content);
  }

  it('passes when no placeholder contact info remains', () => {
    writeHTML('<html><body>Contact: board@555mclean.example</body></html>');
    const res = run(CHECK_PLACEHOLDERS);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('OK');
  });

  it('fails when the placeholder board email is present', () => {
    writeHTML('<a href="mailto:board@example.com">Email the board</a>');
    const res = run(CHECK_PLACEHOLDERS);
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('PLACEHOLDERS: 1 item(s)');
    expect(res.stdout).toContain('board@example.com');
  });

  it('reports every placeholder it finds', () => {
    writeHTML(`
      board@example.com info@example.com (914) 555-0000
      Name &amp; contact to be confirmed
    `);
    const res = run(CHECK_PLACEHOLDERS);
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('PLACEHOLDERS: 4 item(s)');
  });
});
