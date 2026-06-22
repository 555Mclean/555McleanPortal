import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  buildMeetingItem, buildUpdateCard, buildFilterButtons,
  buildNoticeHTML, nextMeetingTile,
} from '../lib/build-lib.js';

function load(name) {
  return JSON.parse(readFileSync(resolve(process.cwd(), 'data', name), 'utf8'));
}

const meetings = load('meetings.json');
const updates  = load('updates.json');
const notice   = load('notices.json');
const waitlist = load('waitlist.json');

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

describe('meetings.json', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(meetings)).toBe(true);
    expect(meetings.length).toBeGreaterThan(0);
  });

  it('every meeting has the required display fields', () => {
    for (const m of meetings) {
      expect(typeof m.day).toBe('string');
      expect(typeof m.month).toBe('string');
      expect(typeof m.title).toBe('string');
      expect(typeof m.detail).toBe('string');
    }
  });

  it('any isoDate / calendar times are well-formed', () => {
    for (const m of meetings) {
      if (m.isoDate) expect(m.isoDate).toMatch(ISO_RE);
      if (m.calendar) {
        expect(m.calendar.startTime).toMatch(TIME_RE);
        expect(m.calendar.endTime).toMatch(TIME_RE);
        expect(typeof m.calendar.location).toBe('string');
      }
    }
  });

  it('has at most one meeting flagged as next', () => {
    expect(meetings.filter(m => m.next).length).toBeLessThanOrEqual(1);
  });

  it('renders without throwing', () => {
    expect(() => meetings.map(buildMeetingItem).join('\n')).not.toThrow();
    expect(() => nextMeetingTile(meetings)).not.toThrow();
  });
});

describe('updates.json', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(updates)).toBe(true);
    expect(updates.length).toBeGreaterThan(0);
  });

  it('every update has the required fields', () => {
    for (const u of updates) {
      expect(typeof u.date).toBe('string');
      expect(typeof u.category).toBe('string');
      expect(u.category.length).toBeGreaterThan(0);
      expect(typeof u.title).toBe('string');
      expect(typeof u.body).toBe('string');
    }
  });

  it('any eventDate is well-formed', () => {
    for (const u of updates) {
      if (u.eventDate) expect(u.eventDate).toMatch(ISO_RE);
    }
  });

  it('renders cards and filters without throwing', () => {
    expect(() => updates.map(u => buildUpdateCard(u)).join('\n')).not.toThrow();
    expect(() => buildFilterButtons(updates)).not.toThrow();
  });
});

describe('notices.json', () => {
  it('has the expected shape', () => {
    expect(typeof notice.active).toBe('boolean');
    expect(typeof notice.type).toBe('string');
    expect(typeof notice.message).toBe('string');
  });

  it('uses a known notice type', () => {
    expect(['info', 'warning', 'urgent']).toContain(notice.type);
  });

  it('has a parseable expiry when one is set', () => {
    if (notice.expires) expect(Number.isNaN(Date.parse(notice.expires))).toBe(false);
  });

  it('builds without throwing', () => {
    expect(() => buildNoticeHTML(notice)).not.toThrow();
  });
});

describe('waitlist.json', () => {
  it('has parking and storage arrays of strings', () => {
    expect(Array.isArray(waitlist.parking)).toBe(true);
    expect(Array.isArray(waitlist.storage)).toBe(true);
    for (const id of [...waitlist.parking, ...waitlist.storage]) {
      expect(typeof id).toBe('string');
    }
  });
});
