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
    filename: {
      js: 'assets/[name]-[contenthash:8].js',
      css: 'assets/[name]-[contenthash:8].css',
    },
  },

  performance: {
    chunkSplit: {
      strategy: 'split-by-experience',
      forceSplitting: {
        'mui-core': /[\\/]node_modules[\\/]@mui[\\/]material[\\/]/,
        'mui-icons': /[\\/]node_modules[\\/]@mui[\\/]icons-material[\\/]/,
        'emotion': /[\\/]node_modules[\\/]@emotion[\\/]/,
        'react-core': /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
      },
    },
  },
});
