import { describe, expect, it } from 'vitest';

import { detectPlatform, detectArch, ensureTrailingSlash, platformLabel, parseDirEntries } from '../githubRelease';

describe('detectPlatform', () => {
  it('识别 Windows 安装包', () => {
    expect(detectPlatform('app-1.0.0-x64.exe')).toBe('windows');
    expect(detectPlatform('Setup.msi')).toBe('windows');
    expect(detectPlatform('windows_build.zip')).toBe('windows');
  });

  it('识别 macOS 安装包', () => {
    expect(detectPlatform('app.dmg')).toBe('macos');
    expect(detectPlatform('app-darwin-arm64.tar.gz')).toBe('macos');
  });

  it('识别 Linux 安装包', () => {
    expect(detectPlatform('app.deb')).toBe('linux');
    expect(detectPlatform('app-x86_64.AppImage')).toBe('linux');
    expect(detectPlatform('ubuntu.rpm')).toBe('linux');
  });

  it('识别 Android 安装包', () => {
    expect(detectPlatform('app-arm64-v8a.apk')).toBe('android');
  });

  it('识别校验文件', () => {
    expect(detectPlatform('SHA256SUMS')).toBe('checksum');
    expect(detectPlatform('app.exe.sha256')).toBe('checksum');
    expect(detectPlatform('app.sig')).toBe('checksum');
    expect(detectPlatform('checksums.txt')).toBe('checksum');
  });

  it('其余归为 other', () => {
    expect(detectPlatform('README.md')).toBe('other');
    expect(detectPlatform('source.tar.gz')).toBe('other');
  });
});

describe('detectArch', () => {
  it('识别 x64', () => {
    expect(detectArch('app-amd64.deb')).toBe('x64');
    expect(detectArch('app-x86_64.AppImage')).toBe('x64');
  });

  it('识别 arm64', () => {
    expect(detectArch('app-darwin-arm64.dmg')).toBe('arm64');
    expect(detectArch('app-aarch64.rpm')).toBe('arm64');
  });

  it('无架构信息返回空串', () => {
    expect(detectArch('README.md')).toBe('');
  });
});

describe('ensureTrailingSlash', () => {
  it('已有斜杠则不变', () => {
    expect(ensureTrailingSlash('/github-release/')).toBe('/github-release/');
  });
  it('无斜杠则补齐', () => {
    expect(ensureTrailingSlash('/github-release')).toBe('/github-release/');
  });
});

describe('platformLabel', () => {
  const t = (key: string) => key;
  it('品牌名不翻译', () => {
    expect(platformLabel('windows', t)).toBe('Windows');
    expect(platformLabel('linux', t)).toBe('Linux');
    expect(platformLabel('macos', t)).toBe('macOS');
    expect(platformLabel('android', t)).toBe('Android');
  });
  it('checksum/other 走 i18n key', () => {
    expect(platformLabel('checksum', t)).toBe('githubRelease.platform.checksum');
    expect(platformLabel('other', t)).toBe('githubRelease.platform.other');
  });
});

describe('parseDirEntries', () => {
  // 模拟 nginx fancyindex 的 HTML 结构
  const fancyIndexHtml = (rows: string) => `
    <table id="list">
      <thead><tr><th>Name</th><th>Size</th><th>Date</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  const row = (name: string, href: string, size: string, date: string) =>
    `<tr><td><a href="${href}">${name}</a></td><td>${size}</td><td>${date}</td></tr>`;

  it('解析目录与文件条目，正确识别 isDir', () => {
    const html = fancyIndexHtml(
      row('ubuntu/', 'ubuntu/', '-', '2024-01-01 10:00') +
        row('debian.iso', 'debian.iso', '500M', '2024-01-02 11:00')
    );
    const entries = parseDirEntries(html, 'https://example.com/github-release/');
    expect(entries).toHaveLength(2);
    // name 保留原样（含尾斜杠），调用方负责 .replace(/\/$/,'')
    expect(entries[0]).toEqual({
      name: 'ubuntu/',
      href: 'https://example.com/github-release/ubuntu/',
      size: '-',
      date: '2024-01-01 10:00',
      isDir: true,
    });
    expect(entries[1].isDir).toBe(false);
    expect(entries[1].name).toBe('debian.iso');
  });

  it('过滤 Parent Directory 与 ../ 条目', () => {
    const html = fancyIndexHtml(
      row('Parent Directory', '../', '-', '-') + row('repo/', 'repo/', '-', '-')
    );
    const entries = parseDirEntries(html, 'https://example.com/org/');
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('repo/');
  });

  it('无 #list 表格时返回空数组', () => {
    const html = '<html><body>no fancyindex</body></html>';
    expect(parseDirEntries(html, 'https://example.com/')).toEqual([]);
  });

  it('decodeURIComponent 解码中文/空格文件名', () => {
    const html = fancyIndexHtml(row('我的 文件.iso', '%E6%88%91%E7%9A%84%20%E6%96%87%E4%BB%B6.iso', '1G', '-'));
    const entries = parseDirEntries(html, 'https://example.com/');
    expect(entries[0].name).toBe('我的 文件.iso');
  });

  it('相对 href 补全为绝对 URL', () => {
    const html = fancyIndexHtml(row('sub/', 'sub/', '-', '-'));
    const entries = parseDirEntries(html, 'https://example.com/github-release/org/');
    expect(entries[0].href).toBe('https://example.com/github-release/org/sub/');
  });

  it('已是绝对 URL 的 href 不被改动', () => {
    const html = fancyIndexHtml(row('ext/', 'https://other.com/ext/', '-', '-'));
    const entries = parseDirEntries(html, 'https://example.com/');
    expect(entries[0].href).toBe('https://other.com/ext/');
  });
});
