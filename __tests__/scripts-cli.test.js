import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { resolve, join } from 'path';

// Exercises the script CLI runners end-to-end (file read → exit code → output)
// against controlled fixtures in a temp dir, so the assertions don't depend on
// the repo's live content.
const STALE   = resolve(process.cwd(), 'scripts/check-stale.mjs');
const PLACEH  = resolve(process.cwd(), 'scripts/check-placeholders.mjs');

let dir;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'portal-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

// Runs a script with cwd=dir; returns { code, out }.
function run(script) {
  try {
    const out = execFileSync('node', [script], { cwd: dir, encoding: 'utf8' });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

describe('check-stale.mjs CLI', () => {
  function writeMeetings(json) {
    mkdirSync(join(dir, 'data'), { recursive: true });
    writeFileSync(join(dir, 'data/meetings.json'), JSON.stringify(json));
  }

  it('exits 0 and prints OK when an upcoming dated meeting exists', () => {
    writeMeetings([{ isoDate: '2099-01-01', title: 'Future' }]);
    const { code, out } = run(STALE);
    expect(code).toBe(0);
    expect(out).toContain('OK:');
  });

  it('exits 1 and prints STALE when no upcoming dated meeting exists', () => {
    writeMeetings([{ title: 'Undated' }, { isoDate: '2000-01-01', title: 'Old' }]);
    const { code, out } = run(STALE);
    expect(code).toBe(1);
    expect(out).toContain('STALE');
  });
});

describe('check-placeholders.mjs CLI', () => {
  function writeHTML(html) {
    writeFileSync(join(dir, 'index.html'), html);
  }

  it('exits 0 and prints OK for clean markup', () => {
    writeHTML('<html>board@555mclean.org</html>');
    const { code, out } = run(PLACEH);
    expect(code).toBe(0);
    expect(out).toContain('OK:');
  });

  it('exits 1 and lists placeholders when present', () => {
    writeHTML('<html>board@example.com (914) 555-0000</html>');
    const { code, out } = run(PLACEH);
    expect(code).toBe(1);
    expect(out).toContain('PLACEHOLDERS');
    expect(out).toContain('board@example.com');
  });
});
