import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Use Node.js environment (no browser globals).
    environment: 'node',

    // Discover all tests under the tests/ directory.
    include: ['tests/**/*.test.ts'],

    // Global test timeout (ms).
    testTimeout: 10_000,

    // Show verbose output.
    reporter: ['verbose'],

    // Coverage configuration (used with `npm run test:coverage`).
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },

  // Allow importing .ts files directly without compilation.
  resolve: {
    extensions: ['.ts', '.js'],
  },
})
