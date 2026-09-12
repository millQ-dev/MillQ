import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    env: { NODE_ENV: 'test' },
    // Acceptance suites share one Postgres DB and runMigrations — avoid concurrent DDL races.
    fileParallelism: false,
  },
});
