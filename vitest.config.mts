import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: [...configDefaults.exclude, 'tests/timing/**'],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
