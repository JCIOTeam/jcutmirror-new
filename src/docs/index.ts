// src/docs/index.ts
// 帮助文档 - 使用 Vite import.meta.glob 自动发现 MDX 文件

import React from 'react';

/**
 * 使用 Vite 的 import.meta.glob 自动发现 MDX 文档
 * 只需将 .mdx 文件放入对应目录，无需手动注册
 */
const zhDocsRaw = import.meta.glob<{ default: React.FC }>(
  './mdx/zh/*.mdx',
  { eager: false }
) as Record<string, () => Promise<{ default: React.FC }>>;

const enDocsRaw = import.meta.glob<{ default: React.FC }>(
  './mdx/en/*.mdx',
  { eager: false }
) as Record<string, () => Promise<{ default: React.FC }>>;

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

/**
 * 获取指定镜像的帮助文档内容（向后兼容，返回 Markdown 字符串）
 * @param mirrorId 镜像 ID
 * @returns Markdown 文档内容，不存在则返回 null
 * @deprecated 请使用 loadHelpDoc 加载 MDX 文档
 */
export const getHelpDoc = (mirrorId: string): string | null => {
  // 保留原有的硬编码文档作为回退方案
  const helpDocs: Record<string, string> = {
    ubuntu: `
# Ubuntu 镜像使用帮助

## 简介

Ubuntu 是一个以桌面应用为主的 GNU/Linux 操作系统。

## 配置方法

### Ubuntu 22.04 LTS (Jammy)

编辑 \`/etc/apt/sources.list\` 文件，将其中的 \`archive.ubuntu.com\` 替换为 \`mirrors.jcut.edu.cn\`：

\`\`\`bash
# 备份原始文件
sudo cp /etc/apt/sources.list /etc/apt/sources.list.bak

# 使用 sed 替换
sudo sed -i 's|archive.ubuntu.com|mirrors.jcut.edu.cn|g' /etc/apt/sources.list
sudo sed -i 's|security.ubuntu.com|mirrors.jcut.edu.cn|g' /etc/apt/sources.list
\`\`\`

或直接写入以下内容：

\`\`\`
deb https://mirrors.jcut.edu.cn/ubuntu/ jammy main restricted universe multiverse
deb https://mirrors.jcut.edu.cn/ubuntu/ jammy-updates main restricted universe multiverse
deb https://mirrors.jcut.edu.cn/ubuntu/ jammy-backports main restricted universe multiverse
deb https://mirrors.jcut.edu.cn/ubuntu/ jammy-security main restricted universe multiverse
\`\`\`

### 更新软件包索引

\`\`\`bash
sudo apt update
\`\`\`
  `,

    debian: `
# Debian 镜像使用帮助

## 简介

Debian 是一个自由的操作系统（OS），使用 Linux 内核。

## 配置方法

编辑 \`/etc/apt/sources.list\`：

### Debian 12 (Bookworm)

\`\`\`
deb https://mirrors.jcut.edu.cn/debian/ bookworm main non-free-firmware
deb https://mirrors.jcut.edu.cn/debian/ bookworm-updates main non-free-firmware
deb https://mirrors.jcut.edu.cn/debian/ bookworm-backports main non-free-firmware
deb https://mirrors.jcut.edu.cn/debian-security bookworm-security main non-free-firmware
\`\`\`

\`\`\`bash
sudo apt update
\`\`\`
  `,

    pypi: `
# PyPI 镜像使用帮助

## 简介

PyPI（Python Package Index）是 Python 的官方第三方软件包存储库。

## 临时使用

\`\`\`bash
pip install <package> -i https://mirrors.jcut.edu.cn/pypi/simple/
\`\`\`

## 永久配置

\`\`\`bash
pip config set global.index-url https://mirrors.jcut.edu.cn/pypi/simple/
pip config set global.trusted-host mirrors.jcut.edu.cn
\`\`\`

或编辑 \`~/.pip/pip.conf\`：

\`\`\`ini
[global]
index-url = https://mirrors.jcut.edu.cn/pypi/simple/
trusted-host = mirrors.jcut.edu.cn
\`\`\`
  `,

    npm: `
# npm 镜像使用帮助

## 临时使用

\`\`\`bash
npm install --registry=https://mirrors.jcut.edu.cn/npm/
\`\`\`

## 永久配置

\`\`\`bash
npm config set registry https://mirrors.jcut.edu.cn/npm/
\`\`\`

## 验证配置

\`\`\`bash
npm config get registry
\`\`\`
  `,
  };

  return helpDocs[mirrorId] || null;
};