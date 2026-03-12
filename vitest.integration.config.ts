import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    exclude: ['node_modules/', 'test-data/'],
    globals: true,
    testTimeout: 10000,
    reporters: ['basic', 'json'],
    outputFile: {
      json: 'test-results/integration-results.json'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/test-helpers.ts',
        'src/**/*.d.ts',
        'node_modules/**'
      ]
    }
  }
});