import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIRROR_ORIGIN  = 'https://mirrors.jcut.edu.cn';

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
      if (url.startsWith('/mirrors/') || url.startsWith('/news') || url === '/') return url;
      // Grafana 相关路径（含 HEAD 探测请求）不代理，由 nginx 或本地服务处理
      if (url.startsWith('/grafana/')) return url;
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
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        manualChunks(id) {
          // ── node_modules vendor 分组 ──────────────────────────────────────
          if (id.includes('node_modules')) {
            // React 核心（最先判断，路径精确匹配避免误判）
            if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/react-helmet')) {
              return 'react-vendor';
            }
            // MUI 图标（先判断，避免被 mui-core 规则吞掉）
            if (id.includes('@mui/icons-material')) return 'mui-icons';
            // MUI 核心 + Emotion（放在一起避免循环依赖）
            if (id.includes('@mui/') || id.includes('@emotion/')) return 'mui-core';
            // i18n
            if (id.includes('i18next')) return 'i18n';
            // React Query
            if (id.includes('@tanstack/react-query')) return 'query';
            // MDX 运行时
            if (id.includes('@mdx-js/react')) return 'mdx-runtime';
            // date-fns
            if (id.includes('date-fns')) return 'date-fns';
            // 代码高亮（较大，单独分组）
            if (id.includes('react-syntax-highlighter')) return 'syntax-highlighter';
            // simple-icons
            if (id.includes('simple-icons')) return 'simple-icons';
          }

          // ── 应用代码分割 ──────────────────────────────────────────────────
          // 页面组件按路由分割
          if (id.includes('/pages/')) {
            const match = id.match(/pages\/([^/]+)\.tsx?$/);
            if (match) return `page-${match[1].toLowerCase()}`;
          }
          // MDX 文档按语言分组
          if (id.includes('/docs/mdx/')) {
            return id.includes('/zh/') ? 'docs-zh' : 'docs-en';
          }
          // News MDX 单独分组
          if (id.includes('/news/mdx/')) return 'news-mdx';
          // 镜像组件按文件分组
          if (id.includes('/components/mirrors/')) {
            const match = id.match(/components\/mirrors\/([^/]+)\.tsx?$/);
            if (match && match[1] !== 'MirrorList') {
              return `mirror-${match[1].toLowerCase()}`;
            }
          }
        },
      },
    },
  },
});
