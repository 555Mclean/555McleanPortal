import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { CATEGORY_LABELS, ICONS } from '../build-lib.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const load = name => JSON.parse(readFileSync(resolve(root, 'data', name), 'utf8'));

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const TIME = /^\d{2}:\d{2}$/;

// These contract tests guard against malformed data/*.json — board members edit
// these JSON files by hand, and build.js trusts their shape.

// ─── meetings.json ─────────────────────────────────────────────────────────────

describe('data/meetings.json', () => {
  const meetings = load('meetings.json');

  it('is a non-empty array', () => {
    expect(Array.isArray(meetings)).toBe(true);
    expect(meetings.length).toBeGreaterThan(0);
  });

  it('gives every meeting the fields build.js renders', () => {
    for (const m of meetings) {
      expect(typeof m.day, JSON.stringify(m)).toBe('string');
      expect(typeof m.month).toBe('string');
      expect(typeof m.title).toBe('string');
      expect(typeof m.detail).toBe('string');
    }
  });

  it('uses a valid ISO date wherever isoDate is present', () => {
    for (const m of meetings) {
      if (m.isoDate !== undefined) expect(m.isoDate).toMatch(ISO_DATE);
    }
  });

  it('marks at most one meeting as "next"', () => {
    expect(meetings.filter(m => m.next).length).toBeLessThanOrEqual(1);
  });

  it('gives any calendar block a location and valid HH:MM times', () => {
    for (const m of meetings) {
      if (!m.calendar) continue;
      expect(m.isoDate, 'a calendar block needs an isoDate').toMatch(ISO_DATE);
      expect(typeof m.calendar.location).toBe('string');
      expect(m.calendar.startTime).toMatch(TIME);
      expect(m.calendar.endTime).toMatch(TIME);
    }
  });
});

// ─── updates.json ──────────────────────────────────────────────────────────────

describe('data/updates.json', () => {
  const updates = load('updates.json');

  it('is a non-empty array', () => {
    expect(Array.isArray(updates)).toBe(true);
    expect(updates.length).toBeGreaterThan(0);
  });

  it('gives every update a date, category, title and body', () => {
    for (const u of updates) {
      expect(typeof u.date, JSON.stringify(u)).toBe('string');
      expect(typeof u.category).toBe('string');
      expect(typeof u.title).toBe('string');
      expect(typeof u.body).toBe('string');
    }
  });

  it('only uses categories that have a known label', () => {
    for (const u of updates) {
      expect(CATEGORY_LABELS, `unknown category "${u.category}"`).toHaveProperty(u.category);
    }
  });

  it('uses a valid ISO date wherever eventDate is present', () => {
    for (const u of updates) {
      if (u.eventDate !== undefined) expect(u.eventDate).toMatch(ISO_DATE);
    }
  });
});

// ─── notices.json ──────────────────────────────────────────────────────────────

describe('data/notices.json', () => {
  const notice = load('notices.json');

  it('is an object with a boolean "active" flag', () => {
    expect(typeof notice).toBe('object');
    expect(typeof notice.active).toBe('boolean');
  });

  it('uses a type that has a matching icon', () => {
    expect(ICONS, `unknown notice type "${notice.type}"`).toHaveProperty(notice.type);
  });

  it('has a message string', () => {
    expect(typeof notice.message).toBe('string');
  });

  it('uses an ISO datetime for expires when present', () => {
    if (notice.expires !== undefined) {
      expect(notice.expires).toMatch(ISO_DATETIME);
      expect(Number.isNaN(Date.parse(notice.expires))).toBe(false);
    }
  });
});

// ─── waitlist.json ─────────────────────────────────────────────────────────────

describe('data/waitlist.json', () => {
  const waitlist = load('waitlist.json');

  it('has parking and storage arrays of strings', () => {
    for (const key of ['parking', 'storage']) {
      expect(Array.isArray(waitlist[key]), `${key} should be an array`).toBe(true);
      for (const entry of waitlist[key]) expect(typeof entry).toBe('string');
    }
  });

  it('has no duplicate entries within a list', () => {
    for (const key of ['parking', 'storage']) {
      expect(new Set(waitlist[key]).size).toBe(waitlist[key].length);
    }
  });
});
