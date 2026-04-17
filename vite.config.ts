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

          // React 核心：路由 + 文档元数据 + 状态管理
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/react-helmet') ||
            id.includes('node_modules/zustand')
          ) {
            return 'react-vendor';
          }

          // MUI 全家桶 + Emotion，单独一个大 chunk
          // 拆 icons 反而会让首页拆 chunk 数量翻倍；icons tree-shake 已足够
          if (id.includes('@mui/') || id.includes('@emotion/')) {
            return 'mui-vendor';
          }

          // i18n + 数据层
          if (
            id.includes('i18next') ||
            id.includes('@tanstack/react-query') ||
            id.includes('axios')
          ) {
            return 'data-vendor';
          }

          // 文档类（mdx 运行时 + 高亮 + markdown）
          // 这些只在镜像详情/新闻页用到，路由级 lazy 后默认会单独 chunk
          if (
            id.includes('@mdx-js/') ||
            id.includes('react-markdown') ||
            id.includes('react-syntax-highlighter') ||
            id.includes('remark-gfm')
          ) {
            return 'docs-vendor';
          }

          // 其余 node_modules 走默认 vendor
          return 'vendor';
        },
      },
    },
  },
});
