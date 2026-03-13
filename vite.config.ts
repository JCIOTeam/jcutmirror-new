import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIRROR_ORIGIN  = 'https://mirrors.jcut.edu.cn';
const BACKEND_ORIGIN = 'http://127.0.0.1:12345';

type BypassReq = { url?: string; headers: Record<string, string | string[] | undefined> };

const proxyConfig = {
  // 后端镜像状态数据（nginx 在生产中已将 /jobs 代理至后端，dev 模式也保持同一路径）
  '/jobs': {
    target: MIRROR_ORIGIN,
    changeOrigin: true,
  },

  // 校园网检测（生产由 nginx 直接返回，dev 回退到主站）
  '/api/is_campus_network': {
    target: MIRROR_ORIGIN,
    changeOrigin: true,
  },

  // 镜像文件目录浏览（FancyIndex）
  '^/(?!@|__vite|node_modules|src|assets|jobs)[a-zA-Z0-9_-]+/': {
    target: MIRROR_ORIGIN,
    changeOrigin: true,
    bypass(req: BypassReq) {
      const url = req.url ?? '';
      if (url.startsWith('/@') || url.startsWith('/__')) return url;
      const accept = String(req.headers['accept'] ?? '');
      if (!accept.includes('text/html')) return url;
      return null;
    },
  },
};

export default defineConfig({
  plugins: [
    react(),
    mdx({ providerImportSource: '@mdx-js/react', remarkPlugins: [remarkGfm] }),
  ],

  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },

  server:  { port: 3000, proxy: proxyConfig },
  preview: { port: 4173, proxy: proxyConfig },

  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom', 'react-helmet-async'],
          'i18n':         ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          'mui-core':     ['@mui/material', '@mui/system', '@mui/utils', '@emotion/react', '@emotion/styled'],
          'mui-icons':    ['@mui/icons-material'],
          'query':        ['@tanstack/react-query'],
          'mdx-runtime':  ['@mdx-js/react'],
          'date-fns':     ['date-fns'],
        },
      },
    },
  },
});
