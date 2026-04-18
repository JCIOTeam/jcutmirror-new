import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    // MDX 插件必须放进来：src/docs/index.ts 和 src/news/index.ts 用 import.meta.glob
    // 加载 .mdx 文件，没有这个插件会导致 vitest transform 阶段 hang 死
    mdx({ providerImportSource: '@mdx-js/react', remarkPlugins: [remarkGfm] }),
  ],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // 单测默认 5s 太短，页面渲染会触发懒加载 + 异步 query
    testTimeout: 15_000,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.{js,ts,mjs}',
        'src/test/',
        '**/*.d.ts',
        'src/**/*.mdx',
      ],
    },
  },
});
