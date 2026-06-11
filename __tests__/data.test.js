// Sanity checks for the hand-edited JSON content files. These catch shape
// mistakes (missing fields, bad date formats) before build.js turns them
// into broken HTML — or crashes the deploy.
import { describe, it, expect } from 'vitest';
import meetings from '../data/meetings.json';
import updates from '../data/updates.json';
import notices from '../data/notices.json';
import waitlist from '../data/waitlist.json';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^\d{2}:\d{2}$/;

describe('data/meetings.json', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(meetings)).toBe(true);
    expect(meetings.length).toBeGreaterThan(0);
  });

  it.each(meetings.map((m, i) => [i, m]))('meeting %i has the required display fields', (i, m) => {
    expect(m.day, 'day').toBeTruthy();
    expect(m.month, 'month').toBeTruthy();
    expect(m.title, 'title').toBeTruthy();
    expect(typeof m.detail, 'detail').toBe('string');
  });

  it('uses YYYY-MM-DD for every isoDate', () => {
    for (const m of meetings) {
      if (m.isoDate !== undefined) expect(m.isoDate).toMatch(ISO_DATE);
    }
  });

  it('gives every calendar entry an isoDate, HH:MM times, and a location', () => {
    for (const m of meetings) {
      if (!m.calendar) continue;
      expect(m.isoDate, `${m.title}: calendar requires isoDate`).toMatch(ISO_DATE);
      expect(m.calendar.startTime).toMatch(HHMM);
      expect(m.calendar.endTime).toMatch(HHMM);
      expect(m.calendar.location).toBeTruthy();
    }
  });

  it('marks at most one meeting as "next"', () => {
    expect(meetings.filter(m => m.next).length).toBeLessThanOrEqual(1);
  });
});

describe('data/updates.json', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(updates)).toBe(true);
    expect(updates.length).toBeGreaterThan(0);
  });

  it.each(updates.map((u, i) => [i, u]))('update %i has date, category, title, and body', (i, u) => {
    expect(u.date, 'date').toBeTruthy();
    expect(u.category, 'category').toBeTruthy();
    expect(u.title, 'title').toBeTruthy();
    expect(u.body, 'body').toBeTruthy();
  });

  it('uses lowercase single-word categories (they double as CSS filter keys)', () => {
    for (const u of updates) expect(u.category).toMatch(/^[a-z]+$/);
  });

  it('uses YYYY-MM-DD for every eventDate', () => {
    for (const u of updates) {
      if (u.eventDate !== undefined) expect(u.eventDate).toMatch(ISO_DATE);
    }
  });
});

describe('data/notices.json', () => {
  it('has an explicit active flag', () => {
    expect(typeof notices.active).toBe('boolean');
  });

  it('uses a known notice type', () => {
    expect(['info', 'warning', 'urgent']).toContain(notices.type);
  });

  it('has a message when active', () => {
    if (notices.active) expect(notices.message).toBeTruthy();
  });

  it('has a parseable expires timestamp when one is set', () => {
    if (notices.expires !== undefined) {
      expect(Number.isNaN(new Date(notices.expires).getTime())).toBe(false);
    }
  });
});

describe('data/waitlist.json', () => {
  it('has parking and storage arrays of non-empty strings', () => {
    for (const key of ['parking', 'storage']) {
      expect(Array.isArray(waitlist[key]), key).toBe(true);
      for (const entry of waitlist[key]) {
        expect(typeof entry).toBe('string');
        expect(entry.trim()).not.toBe('');
      }
    }
  });
});
