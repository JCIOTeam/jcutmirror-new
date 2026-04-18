import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIRROR_ORIGIN = 'https://mirrors.jcut.edu.cn';

type BypassReq = { url?: string; headers: Record<string, string | string[] | undefined> };

const proxyConfig = {
  '/jobs': { target: MIRROR_ORIGIN, changeOrigin: true },
  '/api/is_campus_network': { target: MIRROR_ORIGIN, changeOrigin: true },
  '^/(?!@|__vite|node_modules|src|assets|jobs)[a-zA-Z0-9_-]+/': {
    target: MIRROR_ORIGIN,
    changeOrigin: true,
    bypass(req: BypassReq) {
      const url = req.url ?? '';
      if (url.startsWith('/@') || url.startsWith('/__')) return url;
      if (url.startsWith('/mirrors/') || url.startsWith('/news') || url === '/') return url;
      if (url.startsWith('/grafana/')) return url;
      const accept = String(req.headers['accept'] ?? '');
      if (!accept.includes('text/html')) return url;
      return null;
    },
  },
};

export default defineConfig({
  plugins: [react(), mdx({ providerImportSource: '@mdx-js/react', remarkPlugins: [remarkGfm] })],

  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },

  server: { port: 3000, proxy: proxyConfig },
  preview: { port: 4173, proxy: proxyConfig },

  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // 简化分包：vendor 大块，业务交给路由级 React.lazy
        // 旧方案 11 个手动 chunk 在 HTTP/2 下也带来不必要的请求开销
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          // ⚠ 谨慎拆包：之前把 react-router / zustand / react-helmet 塞进 react-vendor
          // 触发 Vite 7 + Rollup 4 的循环依赖检测漏洞，导致 minified `let` 在初始化前
          // 被引用 (TDZ: "Cannot access 'jt' before initialization")，全站白屏。
          // 现在只拆 **反向无引用、tree 末端** 的库；让 vite 自动处理其余。

          // 1. React 运行时 (react / react-dom / scheduler) —— 最叶子
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react-core';
          }

          // 2. 代码高亮（最大、且只详情页需要，自然就单 chunk 更好）
          if (id.includes('react-syntax-highlighter') || id.includes('refractor')) {
            return 'syntax-highlighter';
          }

          // 3. MUI icons —— 大量小图标，单独 chunk 利于浏览器并行
          if (id.includes('@mui/icons-material')) {
            return 'mui-icons';
          }

          // 其他全部由 Vite 默认处理（按入口/动态 import 自动分组）
          return undefined;
        },
      },
    },
  },
});
