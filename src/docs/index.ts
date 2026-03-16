// src/docs/index.ts
// 帮助文档 - 使用 Vite import.meta.glob 自动发现 MDX 文件

import type React from 'react';

/**
 * 使用 Vite 的 import.meta.glob 自动发现 MDX 文档
 * 只需将 .mdx 文件放入对应目录，无需手动注册
 */
const zhDocsRaw = import.meta.glob<{ default: React.FC }>('./mdx/zh/*.mdx', {
  eager: false,
}) as Record<string, () => Promise<{ default: React.FC }>>;

const enDocsRaw = import.meta.glob<{ default: React.FC }>('./mdx/en/*.mdx', {
  eager: false,
}) as Record<string, () => Promise<{ default: React.FC }>>;

// 转换为 mirrorId -> importFn 映射
const zhDocs: Record<string, () => Promise<{ default: React.FC }>> = {};
const enDocs: Record<string, () => Promise<{ default: React.FC }>> = {};

Object.entries(zhDocsRaw).forEach(([path, importFn]) => {
  const mirrorId = path.replace('./mdx/zh/', '').replace('.mdx', '');
  zhDocs[mirrorId] = importFn;
});

Object.entries(enDocsRaw).forEach(([path, importFn]) => {
  const mirrorId = path.replace('./mdx/en/', '').replace('.mdx', '');
  enDocs[mirrorId] = importFn;
});

/**
 * 获取指定镜像的帮助文档组件
 * @param mirrorId 镜像 ID
 * @param locale 语言环境 'zh' 或 'en'
 * @returns Promise 返回 React 组件，不存在则返回 null
 */
export const loadHelpDoc = async (
  mirrorId: string,
  locale: string = 'zh'
): Promise<React.FC | null> => {
  try {
    const docMap = locale === 'en' ? enDocs : zhDocs;
    const importFn = docMap[mirrorId];
    if (importFn) {
      const module = await importFn();
      return module.default || null;
    }
    return null;
  } catch (error) {
    console.warn(`Failed to load help doc for ${mirrorId} (${locale}):`, error);
    return null;
  }
};

/**
 * 检查指定镜像是否有 MDX 文档
 * @param mirrorId 镜像 ID
 * @param locale 语言环境 'zh' 或 'en'
 * @returns boolean
 */
export const hasMdxDoc = (mirrorId: string, locale: string = 'zh'): boolean => {
  const docMap = locale === 'en' ? enDocs : zhDocs;
  return !!docMap[mirrorId];
};
