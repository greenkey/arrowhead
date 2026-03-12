import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    exclude: ['node_modules/', 'test-data/'],
    globals: true,
    testTimeout: 30000,
    reporters: ['default', 'json'],
    outputFile: {
      json: 'test-results/integration-results.json'
    }
  }
});