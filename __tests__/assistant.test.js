import { describe, it, expect } from 'vitest';
import { tokenize, scoreEntry, rankEntries, ASSISTANT_TOPICS } from '../assistant.js';

describe('tokenize', () => {
  it('lowercases, strips punctuation, and drops stopwords', () => {
    expect(tokenize('How do I get a PARKING spot?')).toEqual(['parking', 'spot']);
  });
  it('returns an empty array for stopword-only input', () => {
    expect(tokenize('how do i')).toEqual([]);
  });
});

describe('scoreEntry', () => {
  const entry = { title: 'Parking waiting list', keywords: ['parking', 'spot'], body: 'Join the queue' };
  it('weights keyword hits highest', () => {
    expect(scoreEntry(['parking'], entry)).toBe(3 + 2); // keyword + title word
  });
  it('scores zero when nothing matches', () => {
    expect(scoreEntry(['insurance'], entry)).toBe(0);
  });
  it('scores zero for an empty query', () => {
    expect(scoreEntry([], entry)).toBe(0);
  });
});

describe('rankEntries', () => {
  it('returns the best-matching topic first', () => {
    const hits = rankEntries('how do I report a leak', ASSISTANT_TOPICS);
    expect(hits[0].id).toBe('maintenance');
  });
  it('matches parking questions to the parking topic', () => {
    expect(rankEntries('parking spot', ASSISTANT_TOPICS)[0].id).toBe('parking');
  });
  it('matches payment questions to the pay topic', () => {
    expect(rankEntries('how do I pay my fees', ASSISTANT_TOPICS)[0].id).toBe('pay');
  });
  it('returns nothing when there is no match', () => {
    expect(rankEntries('xyzzy nonsense', ASSISTANT_TOPICS)).toEqual([]);
  });
  it('respects the result limit', () => {
    expect(rankEntries('board meeting parking move insurance', ASSISTANT_TOPICS, 2).length).toBeLessThanOrEqual(2);
  });
});

describe('ASSISTANT_TOPICS data', () => {
  it('every topic has an id, title, keywords, body, and link', () => {
    for (const t of ASSISTANT_TOPICS) {
      expect(typeof t.id).toBe('string');
      expect(typeof t.title).toBe('string');
      expect(Array.isArray(t.keywords)).toBe(true);
      expect(t.keywords.length).toBeGreaterThan(0);
      expect(typeof t.body).toBe('string');
      expect(typeof t.link).toBe('string');
    }
  });
});
