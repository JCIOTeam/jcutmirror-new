#!/usr/bin/env node
// scripts/generate-sitemap.mjs
// 构建后自动生成 sitemap.xml
// 在 package.json 的 build 脚本中追加调用：tsc && vite build && node scripts/generate-sitemap.mjs

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ORIGIN = 'https://mirrors.jcut.edu.cn';
const DIST_DIR = resolve(__dirname, '..', 'dist');

/**
 * 从 local_data.json 中提取所有镜像 ID
 */
function getMirrorIds() {
  try {
    const localDataPath = resolve(__dirname, '..', 'public', 'local_data.json');
    const data = JSON.parse(readFileSync(localDataPath, 'utf-8'));
    return Object.keys(data);
  } catch {
    console.warn('[sitemap] Failed to read local_data.json, using empty mirror list');
    return [];
  }
}

/**
 * 从 src/news/mdx/ 目录提取新闻 slug
 */
function getNewsSlugs() {
  try {
    const newsDir = resolve(__dirname, '..', 'src', 'news', 'mdx');
    if (!existsSync(newsDir)) return [];
    return readdirSync(newsDir)
      .filter((f) => f.endsWith('.mdx'))
      .map((f) => f.replace('.mdx', ''));
  } catch {
    return [];
  }
}

/**
 * 从 src/docs/mdx/zh/ 目录提取有文档的镜像列表（用于帮助页面）
 */
function getDocIds() {
  try {
    const docsDir = resolve(__dirname, '..', 'src', 'docs', 'mdx', 'zh');
    if (!existsSync(docsDir)) return [];
    return readdirSync(docsDir)
      .filter((f) => f.endsWith('.mdx'))
      .map((f) => f.replace('.mdx', ''));
  } catch {
    return [];
  }
}

function generateSitemap() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // 静态页面
  const staticPages = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/status', changefreq: 'hourly', priority: '0.6' },
    { loc: '/news', changefreq: 'weekly', priority: '0.7' },
  ];

  // 镜像详情页
  const mirrorIds = getMirrorIds();
  const docIds = new Set(getDocIds());
  const mirrorPages = mirrorIds.map((id) => ({
    loc: `/mirrors/${id}`,
    changefreq: 'weekly',
    // 有文档的镜像优先级更高
    priority: docIds.has(id) ? '0.8' : '0.6',
  }));

  // 新闻详情页
  const newsSlugs = getNewsSlugs();
  const newsPages = newsSlugs.map((slug) => ({
    loc: `/news/${slug}`,
    changefreq: 'monthly',
    priority: '0.5',
  }));

  const allPages = [...staticPages, ...mirrorPages, ...newsPages];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...allPages.map(
      (page) =>
        `  <url>
    <loc>${SITE_ORIGIN}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    ),
    '</urlset>',
    '',
  ].join('\n');

  const outPath = resolve(DIST_DIR, 'sitemap.xml');
  writeFileSync(outPath, xml, 'utf-8');
  console.log(`[sitemap] Generated ${outPath} with ${allPages.length} URLs`);
}

// 确保 dist 目录存在
if (!existsSync(DIST_DIR)) {
  console.warn('[sitemap] dist/ not found — run after vite build');
  process.exit(0);
}

generateSitemap();
