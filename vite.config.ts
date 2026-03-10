import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 代理配置复用（dev 和 preview 均需要）
const MIRROR_ORIGIN = 'https://mirrors.jcut.edu.cn';

const proxyConfig = {
  '/api': {
    target: MIRROR_ORIGIN,
    changeOrigin: true,
  },
  '^/(?!@|__vite|node_modules|src|assets)[a-zA-Z0-9_-]+/': {
    target: MIRROR_ORIGIN,
    changeOrigin: true,
    bypass(req: { url?: string; headers: Record<string, string | string[] | undefined> }) {
      const url = req.url ?? '';
      if (url.startsWith('/@') || url.startsWith('/__')) return url;
      const accept = String(req.headers['accept'] ?? '');
      if (!accept.includes('text/html')) return url;
      return null; // null = 走代理
    },
  },
};

export default defineConfig({
  plugins: [
    react(),
    mdx({ providerImportSource: '@mdx-js/react' }),
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  server: {
    port: 3000,
    proxy: proxyConfig,
  },

  preview: {
    port: 4173,
    proxy: proxyConfig,
  },

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
