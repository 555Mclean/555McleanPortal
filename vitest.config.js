import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      // Cover every hand-written source module. build.js and scripts/*.mjs are
      // thin I/O wrappers around the tested *-lib modules and run top-level side
      // effects on import, so the testable logic lives in the -lib files instead.
      include: ['main.js', 'build-lib.js', 'ui.js', 'scripts/check-lib.mjs'],
    },
  },
});
