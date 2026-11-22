import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginMdx } from '@rsbuild/plugin-mdx';
import remarkGfm from 'remark-gfm';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIRROR_ORIGIN = 'https://mirrors.jcut.edu.cn';

const proxyConfig = {
  '/jobs': { target: MIRROR_ORIGIN, changeOrigin: true },
  '/api/is_campus_network': { target: MIRROR_ORIGIN, changeOrigin: true },
  // 正则匹配其他可能的镜像路径，但排除 Vite/Rsbuild 内部路径
  '^/(?!@|__vite|__rsbuild|node_modules|src|assets|jobs)[a-zA-Z0-9_-]+/': {
    target: MIRROR_ORIGIN,
    changeOrigin: true,
    bypass(req: { url?: string; headers: Record<string, string | string[] | undefined> }) {
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
  plugins: [
    pluginReact(),
    pluginMdx({
      mdxLoaderOptions: {
        providerImportSource: '@mdx-js/react',
        remarkPlugins: [remarkGfm],
      },
    }),
  ],

  html: {
    template: './index.html',
  },

  source: {
    entry: {
      index: './src/main.tsx',
    },
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  server: {
    port: 3000,
    proxy: proxyConfig,
  },

  output: {
    distPath: {
      root: 'dist',
    },
    sourceMap: false,
    // filename 配置可按需调整
    filename: {
      js: 'assets/[name]-[contenthash:8].js',
      css: 'assets/[name]-[contenthash:8].css',
    },
  },

  // 分包策略（简化版，避免循环依赖问题）
  tools: {
    rspack: {
      optimization: {
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            reactCore: {
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              name: 'react-core',
              priority: 40,
              reuseExistingChunk: true,
            },
            syntaxHighlighter: {
              test: /[\\/]node_modules[\\/](react-syntax-highlighter|refractor)[\\/]/,
              name: 'syntax-highlighter',
              priority: 30,
              reuseExistingChunk: true,
            },
            muiIcons: {
              test: /[\\/]node_modules[\\/]@mui[\\/]icons-material[\\/]/,
              name: 'mui-icons',
              priority: 20,
              reuseExistingChunk: true,
            },
          },
        },
      },
    },
  },
});
