// src/news/index.ts
// 新闻系统 —— 用 Vite import.meta.glob 自动发现 src/news/mdx/*.mdx
// 每篇 MDX 文件需要 export const meta = { title, date, summary, tags? }
// 文件名即 slug，建议格式：YYYY-MM-DD-short-title.mdx

import type React from 'react';

export interface NewsMeta {
    slug:    string;
    title:   string;   // 标题（中文）
    titleEn?: string;  // 可选英文标题，缺省时回退到 title
    date:    string;   // YYYY-MM-DD
    summary: string;   // 一行摘要（中文）
    summaryEn?: string;
    tags?:   string[];
}

// ── 元数据 —— 同步 eager 加载，用于列表页和首页 widget ─────────────────────
const metaModules = import.meta.glob<{ meta: Omit<NewsMeta, 'slug'> }>(
    './mdx/*.mdx',
    { eager: true }
);

export const getNewsList = (): NewsMeta[] =>
    Object.entries(metaModules)
        .map(([path, mod]) => ({
            slug: path.replace('./mdx/', '').replace('.mdx', ''),
            // meta 是 MDX 文件里 export const meta = {...} 导出的对象
            ...(mod.meta ?? { title: '(未命名)', date: '1970-01-01', summary: '' }),
        }))
        .sort((a, b) => b.date.localeCompare(a.date)); // 按日期降序

export const getNewsItem = (slug: string): NewsMeta | undefined =>
    getNewsList().find(n => n.slug === slug);

// ── 正文组件 —— 懒加载，只在详情页使用 ──────────────────────────────────────
const componentModules = import.meta.glob<{ default: React.FC }>(
    './mdx/*.mdx',
    { eager: false }
);

export const loadNewsArticle = async (slug: string): Promise<React.FC | null> => {
    const key = `./mdx/${slug}.mdx`;
    const importFn = componentModules[key];
    if (!importFn) return null;
    try {
        const mod = await importFn();
        return mod.default ?? null;
    } catch {
        return null;
    }
};