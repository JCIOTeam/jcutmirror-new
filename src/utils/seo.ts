// src/utils/seo.ts
// SEO 常量与工具函数
// 集中管理站点 SEO 元信息，确保所有页面一致

/** 站点正式域名 */
export const SITE_ORIGIN = 'https://mirrors.jcut.edu.cn';

/** 站点名称 */
export const SITE_NAME = 'JCUT Mirror';

/** 站点全称（中文） */
export const SITE_TITLE_ZH = '荆楚理工学院开源软件镜像站';

/** 站点全称（英文） */
export const SITE_TITLE_EN = 'JCUT Open Source Mirror';

/** 站点关键词（中文） */
export const KEYWORDS_ZH =
  '荆楚理工学院镜像站,JCUT Mirror,开源软件镜像站,Linux镜像,高校镜像站,Ubuntu镜像,Debian镜像,Arch Linux镜像,CentOS镜像,软件源,镜像源,荆门';

/** 站点关键词（英文） */
export const KEYWORDS_EN =
  'JCUT Mirror,open source mirror,Linux mirror,university mirror,Ubuntu mirror,Debian mirror,Arch Linux mirror,software repository,China mirror';

/** 站点描述（中文） */
export const DESC_ZH =
  '荆楚理工学院开源软件镜像站（JCUT Mirror）提供 Ubuntu、Debian、Arch Linux、CentOS 等主流 Linux 发行版及开源软件的高速镜像服务，面向校内外用户免费开放。';

/** 站点描述（英文） */
export const DESC_EN =
  'JCUT Mirror provides high-speed mirrors for Ubuntu, Debian, Arch Linux, CentOS and other major Linux distributions and open source software, freely available to all users.';

/**
 * 生成 canonical URL
 * 确保所有页面都指向带 https 的标准域名
 */
export function canonicalUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_ORIGIN}${cleanPath}`;
}

/**
 * 生成 JSON-LD 结构化数据 —— WebSite 类型（首页用）
 */
export function websiteJsonLd(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_TITLE_ZH,
    alternateName: [SITE_NAME, SITE_TITLE_EN, '荆楚理工学院镜像站'],
    url: SITE_ORIGIN,
    description: DESC_ZH,
    publisher: {
      '@type': 'Organization',
      name: '荆楚理工学院',
      alternateName: 'Jingchu University of Technology',
      url: 'https://www.jcut.edu.cn',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_ORIGIN}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  });
}

/**
 * 生成 JSON-LD 结构化数据 —— SoftwareApplication 类型（镜像详情页用）
 */
export function mirrorJsonLd(name: string, desc: string, url: string): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description: desc,
    url: canonicalUrl(url),
    applicationCategory: 'DeveloperApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CNY',
    },
    provider: {
      '@type': 'Organization',
      name: '荆楚理工学院',
    },
  });
}

/**
 * 生成 JSON-LD 结构化数据 —— BreadcrumbList 类型
 */
export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: canonicalUrl(item.url),
    })),
  });
}
