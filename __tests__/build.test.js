import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { build } from '../build.js';

// Integration test: run the real build against the repo's data + templates and
// assert the generated dist/ output. dist/ is gitignored, so this is safe.
describe('build()', () => {
  let status;

  beforeAll(() => {
    status = build();
  });

  const dist = p => readFileSync(resolve(process.cwd(), 'dist', p), 'utf8');

  it('returns a status summary string', () => {
    expect(status).toMatch(/^Built: \d+ meetings · \d+ updates/);
  });

  it('writes dist/index.html and dist/main.js', () => {
    expect(existsSync(resolve(process.cwd(), 'dist/index.html'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'dist/main.js'))).toBe(true);
  });

  it('copies the shared lib modules into dist/lib', () => {
    expect(existsSync(resolve(process.cwd(), 'dist/lib/dates.js'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'dist/lib/ics.js'))).toBe(true);
  });

  it('replaces the meetings marker with rendered meeting items', () => {
    const html = dist('index.html');
    expect(html).toContain('<!-- MEETINGS-LIST-START -->');
    expect(html).toContain('class="meeting-item');
  });

  it('replaces the updates marker with rendered update cards', () => {
    expect(dist('index.html')).toContain('class="update-card');
  });

  it('replaces the filters marker with the All button', () => {
    expect(dist('index.html')).toContain('data-filter="all"');
  });

  it('fills the next-meeting tile from the data', () => {
    const html = dist('index.html');
    const tile = html.match(/<!-- NEXT-MEETING-START -->([\s\S]*?)<!-- NEXT-MEETING-END -->/);
    expect(tile).not.toBeNull();
    expect(tile[1].length).toBeGreaterThan(0);
  });

  it('stamps the last-updated date', () => {
    expect(dist('index.html')).toContain('Last updated');
  });

  it('patches WL_DATA in dist/main.js from waitlist.json', () => {
    const js = dist('main.js');
    const waitlist = JSON.parse(readFileSync(resolve(process.cwd(), 'data/waitlist.json'), 'utf8'));
    expect(js).toContain('export const WL_DATA');
    for (const id of waitlist.parking) expect(js).toContain(id);
  });
});
