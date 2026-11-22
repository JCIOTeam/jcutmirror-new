import { defineConfig } from '@rstest/core';
import { withRsbuildConfig } from '@rstest/adapter-rsbuild';

export default defineConfig({
  extends: withRsbuildConfig(),
  testEnvironment: 'jsdom',
  globals: true,
  setupFiles: ['./src/test/setup.ts'],
  testTimeout: 15_000,
  include: ['src/**/*.{test,spec}.{ts,tsx}'],
  coverage: {
    provider: 'v8',
    reporters: ['text', 'html', 'lcov'],
    exclude: [
      'node_modules/',
      'dist/',
      '**/*.config.{js,ts,mjs}',
      'src/test/',
      '**/*.d.ts',
      'src/**/*.mdx',
    ],
  },
});
