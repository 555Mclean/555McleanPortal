import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      // build.js and scripts/*.mjs are exercised end-to-end as child
      // processes (see __tests__/build.test.js and scripts.test.js), so v8
      // can't instrument them; their logic lives in lib/ where it's covered.
      include: ['main.js', 'page.js', 'lib/**/*.js'],
      thresholds: {
        lines: 90,
        branches: 85,
        functions: 90,
        statements: 90,
      },
    },
  },
});
