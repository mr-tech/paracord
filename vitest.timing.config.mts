import { defineConfig } from 'vitest/config';

// The timeout/time-based cells — `tests/timing/` — collected only by this config, which
// nothing runs by default: `npm run test:timing`. Same per-cell defaults as the standing
// config so a cell reads the same under either.
export default defineConfig({
  test: {
    include: ['tests/timing/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
