import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import path from 'path';
import { fileURLToPath, URL } from 'node:url';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// 代理配置复用（dev 和 preview 均需要）
const MIRROR_ORIGIN = 'https://mirrors.jcut.edu.cn';

const proxyConfig: Record<string, object> = {
  // API 代理
  '/api': {
    target: MIRROR_ORIGIN,
    changeOrigin: true,
  },
  // 镜像目录代理 —— 使开发环境也能加载目录列表（fancyindex HTML）
  // 匹配所有形如 /xxx/ 的路径（不含 @vite/@fs 等内部路径）
  // bypass 函数：只有 Accept: text/html 且不是 SPA 路由时才转发，
  // 普通 SPA 导航由 vite 自己处理
  '^/(?!@|__vite|node_modules|src|assets)[a-zA-Z0-9_\\-]+/': {
    target: MIRROR_ORIGIN,
    changeOrigin: true,
    bypass(req: { url?: string; headers: Record<string, string | string[] | undefined> }) {
      const url = req.url ?? '';
      // 排除 vite 内部请求
      if (url.startsWith('/@') || url.startsWith('/__')) return url;
      // 仅当请求带有明确的 text/html Accept 时才转发（fetch 目录列表场景）
      // 否则让 vite SPA fallback 处理（react-router 路由）
      const accept = String(req.headers['accept'] ?? '');
      if (!accept.includes('text/html')) return url;
      return null; // null = 走代理
    },
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    mdx({
      providerImportSource: '@mdx-js/react',
    }),
    // 提供 Node.js 模块的浏览器兼容实现，解决 MDX 等插件依赖的问题
    nodePolyfills({
      include: ['url', 'path', 'buffer', 'process'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(fileURLToPath(import.meta.url), './src'),
    },
  },
  server: {
    port: 3000,
    proxy: proxyConfig,
  },
  // vite preview（npm run preview）同样需要代理，否则 CORS 报错
  preview: {
    port: 4173,
    proxy: proxyConfig,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // 提高 chunk 大小警告阈值（gzip 后实际大小约为原始的 1/3）
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      // 显式外部化 Node.js 模块，消除警告
      external: ['path', 'url', 'fs', 'module', 'events', 'util', 'buffer'],
      output: {
        // 更精细的代码分割优化 - 使用静态配置避免循环依赖
        manualChunks: {
          // React 生态（包含所有 React 相关依赖）
          'react-vendor': [
            'react', 
            'react-dom', 
            'react-router-dom', 
            'react-is',
            'react-helmet-async',
          ],
          // 国际化相关
          'i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          // MUI 核心组件
          'mui-core': [
            '@mui/material', 
            '@mui/system', 
            '@mui/types', 
            '@mui/utils',
            '@emotion/react',
            '@emotion/styled',
          ],
          // MUI 图标
          'mui-icons': ['@mui/icons-material'],
          // TanStack Query
          'query': ['@tanstack/react-query'],
          // MDX 相关
          'mdx-vendor': ['@mdx-js/react', '@mdx-js/rollup'],
          // 日期处理
          'date-fns': ['date-fns'],
        },
      },
    },
  },
});
