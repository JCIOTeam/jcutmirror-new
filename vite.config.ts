import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import path from 'path';
import { fileURLToPath, URL } from 'node:url';

// 代理配置复用（dev 和 preview 均需要）
const proxyConfig = {
  '/api': {
    target: 'https://mirrors.jcut.edu.cn',
    changeOrigin: true,
    // 开发时指向真实后端，避免 CORS
    // 生产构建后由 Nginx 负责代理，此处仅用于本地预览
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    mdx({
      providerImportSource: '@mdx-js/react',
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
    rollupOptions: {
      output: {
        // 代码分割优化
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});
