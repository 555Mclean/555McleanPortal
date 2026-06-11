import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const BUILD_JS = resolve(process.cwd(), 'build.js');

const FIXTURE_HTML = `<!doctype html>
<html><body>
  <!-- NOTICE-BAR -->
  <span><!-- NEXT-MEETING-START -->old<!-- NEXT-MEETING-END --></span>
  <div><!-- FILTERS-START -->old<!-- FILTERS-END --></div>
  <div><!-- UPDATES-LIST-START -->old<!-- UPDATES-LIST-END --></div>
  <ul><!-- MEETINGS-LIST-START -->old<!-- MEETINGS-LIST-END --></ul>
  <footer><!-- LAST-UPDATED --></footer>
</body></html>`;

const FIXTURE_MAIN_JS = `export const WL_DATA = {
  parking: ['OLD'],
  storage: ['OLD'],
};
export function init() {}
`;

const FIXTURE_DATA = {
  'meetings.json': [
    { day: '15', month: 'Jul', next: true, title: 'Board Meeting', detail: '7 PM',
      isoDate: '2999-07-15',
      calendar: { location: 'Community Room', startTime: '19:00', endTime: '20:30' } },
    { day: 'TBD', month: 'Aug', title: 'Monthly Board Meeting', detail: 'TBA' },
  ],
  'updates.json': [
    { date: 'June 2026', category: 'general', title: 'Welcome', body: 'Hello & welcome' },
    { date: 'June 2026', category: 'safety', badge: 'Action Required', title: 'Tree', body: 'Careful' },
  ],
  'notices.json': { active: true, type: 'warning', message: 'Elevator out', dismissible: true },
  'waitlist.json': { parking: ['P1', 'P2'], storage: ['S1'] },
};

let dir;

function writeFixture(overrides = {}) {
  mkdirSync(join(dir, 'data'), { recursive: true });
  for (const [name, content] of Object.entries({ ...FIXTURE_DATA, ...overrides.data })) {
    writeFileSync(join(dir, 'data', name), typeof content === 'string' ? content : JSON.stringify(content));
  }
  writeFileSync(join(dir, 'index.html'), overrides.html ?? FIXTURE_HTML);
  writeFileSync(join(dir, 'main.js'), overrides.mainJs ?? FIXTURE_MAIN_JS);
  writeFileSync(join(dir, 'page.js'), '// page module stub\n');
}

function runBuild() {
  return spawnSync(process.execPath, [BUILD_JS], { cwd: dir, encoding: 'utf8' });
}

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'portal-build-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('build.js end-to-end', () => {
  it('exits 0 and reports what it built', () => {
    writeFixture();
    const res = runBuild();
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Built: 2 meetings · 2 updates · 2 parking · 1 storage');
    expect(res.stdout).toContain('notice: "Elevator out"');
  });

  it('injects meetings between the markers, keeping them for the next build', () => {
    writeFixture();
    runBuild();
    const html = readFileSync(join(dir, 'dist/index.html'), 'utf8');
    expect(html).toContain('<!-- MEETINGS-LIST-START -->');
    expect(html).toContain('<!-- MEETINGS-LIST-END -->');
    expect(html).toContain('Board Meeting');
    expect(html).toContain("addToCalendar('2999-07-15'");
    expect(html).not.toContain('<!-- MEETINGS-LIST-START -->old');
  });

  it('injects update cards and filter buttons', () => {
    writeFixture();
    runBuild();
    const html = readFileSync(join(dir, 'dist/index.html'), 'utf8');
    expect(html).toContain('data-category="general"');
    expect(html).toContain('Hello &amp; welcome');
    expect(html).toContain('data-filter="all"');
    expect(html).toContain('data-filter="safety"');
  });

  it('injects the notice bar when active', () => {
    writeFixture();
    runBuild();
    const html = readFileSync(join(dir, 'dist/index.html'), 'utf8');
    expect(html).toContain('notice-bar notice-warning');
    expect(html).toContain('Elevator out');
  });

  it('keeps the NOTICE-BAR marker when the notice is off', () => {
    writeFixture({ data: { 'notices.json': { active: false, type: 'info', message: '' } } });
    const res = runBuild();
    expect(res.stdout).toContain('notice: off');
    const html = readFileSync(join(dir, 'dist/index.html'), 'utf8');
    expect(html).toContain('<!-- NOTICE-BAR -->');
  });

  it('fills the next-meeting tile with the upcoming dated meeting', () => {
    writeFixture();
    runBuild();
    const html = readFileSync(join(dir, 'dist/index.html'), 'utf8');
    expect(html).toMatch(/<!-- NEXT-MEETING-START -->Jul 15 · Board Meeting/);
    expect(html).toContain('id="meeting-countdown"');
  });

  it('stamps the footer with a build date', () => {
    writeFixture();
    runBuild();
    const html = readFileSync(join(dir, 'dist/index.html'), 'utf8');
    expect(html).toMatch(/· Last updated \w+ \d{1,2}, \d{4}/);
  });

  it('patches WL_DATA in dist/main.js from waitlist.json', () => {
    writeFixture();
    runBuild();
    const js = readFileSync(join(dir, 'dist/main.js'), 'utf8');
    expect(js).toContain('parking: ["P1","P2"]');
    expect(js).toContain('storage: ["S1"]');
    expect(js).not.toContain('OLD');
    expect(js).toContain('export function init');
  });

  it('copies page.js into dist', () => {
    writeFixture();
    runBuild();
    expect(existsSync(join(dir, 'dist/page.js'))).toBe(true);
  });

  it('fails with a clear error on malformed JSON', () => {
    writeFixture({ data: { 'meetings.json': '{ not json' } });
    const res = runBuild();
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('Could not parse ./data/meetings.json');
  });

  it('fails when an injection marker is missing from index.html', () => {
    writeFixture({ html: FIXTURE_HTML.replace('<!-- MEETINGS-LIST-START -->', '') });
    const res = runBuild();
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('MEETINGS-LIST markers missing');
  });

  it('fails when main.js has no WL_DATA block to patch', () => {
    writeFixture({ mainJs: 'export function init() {}\n' });
    const res = runBuild();
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('WL_DATA block missing');
  });
});
