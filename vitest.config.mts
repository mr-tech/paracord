import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // `tests/timing/` holds the timeout/time-based cells; the standing suite never
    // collects them. They run only under `vitest.timing.config.mts` (`npm run test:timing`).
    exclude: [...configDefaults.exclude, 'tests/timing/**'],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
