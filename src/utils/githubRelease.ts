// src/utils/githubRelease.ts
// Github Release 目录解析与平台/架构检测的纯逻辑
// 从 GithubReleaseViewer.tsx 抽出，便于单测且让组件专注 UI

export interface DirEntry {
  name: string;
  href: string;
  size: string;
  date: string;
  isDir: boolean;
}

export interface Project {
  org: string;
  repo: string;
  orgDate: string;
}

export interface Release {
  name: string;
  path: string;
  date: string;
  isLatest: boolean;
}

export interface FileEntry {
  name: string;
  href: string;
  size: string;
  date: string;
  platform: 'windows' | 'linux' | 'macos' | 'android' | 'checksum' | 'other';
  arch: string;
}

// ─── 平台检测 ─────────────────────────────────────────────────────────────────

export function detectPlatform(name: string): FileEntry['platform'] {
  const f = name.toLowerCase();
  if (
    f.includes('windows') ||
    f.includes('_win') ||
    f.endsWith('.exe') ||
    f.endsWith('.msi') ||
    f.endsWith('.msix')
  )
    return 'windows';
  if (
    f.includes('darwin') ||
    f.includes('macos') ||
    f.includes('osx') ||
    f.endsWith('.dmg') ||
    f.endsWith('.pkg')
  )
    return 'macos';
  if (
    f.includes('linux') ||
    f.endsWith('.deb') ||
    f.endsWith('.rpm') ||
    f.endsWith('.appimage') ||
    f.endsWith('.flatpak')
  )
    return 'linux';
  if (f.includes('android') || f.endsWith('.apk') || f.endsWith('.aab')) return 'android';
  // 校验文件：sha256、md5、sig、asc 等
  if (
    f.endsWith('.sha256') ||
    f.endsWith('.sha512') ||
    f.endsWith('.md5') ||
    f.endsWith('.sha1') ||
    f.endsWith('.sig') ||
    f.endsWith('.asc') ||
    f.includes('checksum') ||
    f.includes('sha256sum') ||
    f.includes('md5sum') ||
    f === 'shasums' ||
    f.startsWith('sha256sums') ||
    f.startsWith('md5sums') ||
    f.includes('hash')
  )
    return 'checksum';
  return 'other';
}

export function detectArch(name: string): string {
  const f = name.toLowerCase();
  if (f.includes('amd64') || f.includes('x86_64') || f.includes('x64')) return 'x64';
  if (f.includes('arm64') || f.includes('aarch64')) return 'arm64';
  if (f.includes('armv7') || f.includes('arm32') || f.includes('armv6') || f.includes('armv5'))
    return f.match(/arm(v\d)/)?.[1] ?? 'arm';
  if (f.includes('386') || f.includes('x86') || f.includes('i386')) return 'x86';
  if (f.includes('riscv64')) return 'riscv64';
  if (f.includes('ppc64')) return 'ppc64';
  if (f.includes('mips')) return f.match(/mips\w*/)?.[0] ?? 'mips';
  return '';
}

// ─── fancyindex HTML 解析 ────────────────────────────────────────────────────

/** 解析 nginx fancyindex 页面，提取目录条目 */
export function parseDirEntries(html: string, baseUrl: string): DirEntry[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.getElementById('list');
  if (!table) return [];

  return Array.from(table.querySelectorAll('tbody tr'))
    .map((row): DirEntry | null => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) return null;
      const anchor = cells[0].querySelector('a');
      if (!anchor) return null;
      const name = anchor.textContent?.trim() ?? '';
      const href = anchor.getAttribute('href') ?? '';
      if (!href || href === '../' || name === 'Parent Directory') return null;
      const size = cells[1]?.textContent?.trim() ?? '';
      const date = cells[2]?.textContent?.trim() ?? '';
      const isDir = href.endsWith('/');
      const absHref = href.startsWith('http') ? href : new URL(href, baseUrl).href;
      return { name: decodeURIComponent(name), href: absHref, size, date, isDir };
    })
    .filter((e): e is DirEntry => e !== null);
}

/** 拉取 fancyindex 目录页面并解析为 DirEntry[] */
export async function fetchDir(path: string): Promise<DirEntry[]> {
  const url = path.startsWith('http') ? path : `${window.location.origin}${path}`;
  const res = await fetch(url, { headers: { Accept: 'text/html' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return parseDirEntries(html, url);
}

// ─── 平台展示顺序与标签 ───────────────────────────────────────────────────────

export const PLATFORM_ORDER: FileEntry['platform'][] = [
  'windows',
  'linux',
  'macos',
  'android',
  'other',
  'checksum',
];

/**
 * 平台显示标签：windows/linux/macos/android 是品牌名不随语言变化；
 * checksum/other 走 i18n，由组件传入 t。
 */
export function platformLabel(
  platform: FileEntry['platform'],
  t: (key: string) => string
): string {
  switch (platform) {
    case 'checksum':
      return t('githubRelease.platform.checksum');
    case 'other':
      return t('githubRelease.platform.other');
    default:
      return { windows: 'Windows', linux: 'Linux', macos: 'macOS', android: 'Android' }[platform];
  }
}

/** 尾部斜杠标准化：确保路径以 / 结尾 */
export function ensureTrailingSlash(p: string): string {
  return p.endsWith('/') ? p : p + '/';
}
