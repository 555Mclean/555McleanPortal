import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// sw.js is a classic service-worker script, not an ES module — it can't be
// imported. The shell-navigation predicate is the part worth pinning down (it
// decides what gets served offline), so it's lifted out of the source and
// evaluated against a stubbed `self.location`.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(resolve(root, 'sw.js'), 'utf8');

function shellNavigationPredicate(swUrl) {
  const fn = SRC.match(/function isShellNavigation\(url\) \{[\s\S]*?\n\}/);
  if (!fn) throw new Error('isShellNavigation not found in sw.js');
  const factory = new Function('self', `${fn[0]}; return isShellNavigation;`);
  const isShell = factory({ location: new URL(swUrl) });
  return path => isShell(new URL(path, swUrl));
}

describe('sw.js — isShellNavigation', () => {
  describe('served from a project subpath (GitHub Pages)', () => {
    const isShell = (...a) =>
      shellNavigationPredicate('https://555mclean.github.io/555McleanPortal/sw.js')(...a);

    it('treats the project root as the shell', () => {
      expect(isShell('https://555mclean.github.io/555McleanPortal/')).toBe(true);
    });

    it('treats index.html as the shell', () => {
      expect(isShell('https://555mclean.github.io/555McleanPortal/index.html')).toBe(true);
    });

    it('does not treat a document page as the shell', () => {
      // The bug this guards: caching docs/house-rules.html under './index.html'
      // meant an offline visitor opening the portal got the house rules page.
      expect(isShell('https://555mclean.github.io/555McleanPortal/docs/house-rules.html')).toBe(false);
    });

    it('does not treat any other docs page as the shell', () => {
      for (const page of ['emergency-contacts', 'clickpay-guide', 'move-policy']) {
        expect(isShell(`https://555mclean.github.io/555McleanPortal/docs/${page}.html`)).toBe(false);
      }
    });

    it('ignores the query string when deciding', () => {
      expect(isShell('https://555mclean.github.io/555McleanPortal/?v=abc')).toBe(true);
    });
  });

  describe('served from a domain root', () => {
    const isShell = (...a) =>
      shellNavigationPredicate('https://portal.example.org/sw.js')(...a);

    it('treats the site root as the shell', () => {
      expect(isShell('https://portal.example.org/')).toBe(true);
    });

    it('treats index.html as the shell', () => {
      expect(isShell('https://portal.example.org/index.html')).toBe(true);
    });

    it('does not treat a document page as the shell', () => {
      expect(isShell('https://portal.example.org/docs/house-rules.html')).toBe(false);
    });
  });
});

describe('sw.js — navigation caching', () => {
  it('only writes a navigation into the cache when the response is ok', () => {
    // A 404 or a 502 from a flaky connection must not become the offline page.
    expect(SRC).toMatch(/if \(res && res\.ok\) \{[\s\S]*?isShellNavigation/);
  });

  it('no longer caches every navigation under the shell key', () => {
    expect(SRC).not.toMatch(/c\.put\('\.\/index\.html', copy\)/);
  });
});
