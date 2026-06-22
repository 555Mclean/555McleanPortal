import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['main.js', 'build.js', 'lib/*.js', 'scripts/*.mjs'],
    },
  },
});
