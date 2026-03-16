// src/news/index.ts
// 新闻系统 —— 用 Vite import.meta.glob 自动发现 src/news/mdx/*.mdx
// 每篇 MDX 文件需要 export const meta = { title, date, summary, tags? }
// 文件名即 slug，建议格式：YYYY-MM-DD-short-title.mdx

import type React from 'react';

export interface NewsMeta {
  slug: string;
  title: string;
  titleEn?: string;
  date: string; // YYYY-MM-DD
  summary: string;
  summaryEn?: string;
  tags?: string[];
}

// 一次 eager glob，同时拿到 meta（列表/首页）和 default（详情页正文）
const modules = import.meta.glob<{
  meta: Omit<NewsMeta, 'slug'>;
  default: React.FC;
}>('./mdx/*.mdx', { eager: true });

// ── 元数据列表（同步，供列表页 / 首页 widget 使用）────────────────────────────
export const getNewsList = (): NewsMeta[] =>
  Object.entries(modules)
    .map(([path, mod]) => ({
      slug: path.replace('./mdx/', '').replace('.mdx', ''),
      ...(mod.meta ?? { title: '(未命名)', date: '1970-01-01', summary: '' }),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

export const getNewsItem = (slug: string): NewsMeta | undefined =>
  getNewsList().find((n) => n.slug === slug);

// ── 正文组件（同步，详情页直接取，无需 async）────────────────────────────────
export const getNewsArticle = (slug: string): React.FC | null => {
  const key = `./mdx/${slug}.mdx`;
  return modules[key]?.default ?? null;
};
