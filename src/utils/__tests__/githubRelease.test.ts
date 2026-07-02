import { describe, expect, it } from 'vitest';

import { detectPlatform, detectArch, ensureTrailingSlash, platformLabel } from '../githubRelease';

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
