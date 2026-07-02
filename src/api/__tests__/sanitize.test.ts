import { describe, expect, it } from 'vitest';

import { sanitizeFileUrl, sanitizeFiles } from '../transform';

// sanitizeFileUrl 是 XSS 防线：必须阻止协议相对 URL（//evil.com）等
// 可绕过校验跳转外站的输入。重点覆盖绕过尝试。

describe('sanitizeFileUrl', () => {
  it('接受以单斜杠开头的相对路径', () => {
    expect(sanitizeFileUrl('/ubuntu/')).toBe('/ubuntu/');
    expect(sanitizeFileUrl('/path/to/file.iso')).toBe('/path/to/file.iso');
  });

  it('接受 https/http 绝对 URL', () => {
    expect(sanitizeFileUrl('https://example.com/file.iso')).toBe('https://example.com/file.iso');
    expect(sanitizeFileUrl('http://example.com/file.iso')).toBe('http://example.com/file.iso');
  });

  it('拒绝协议相对 URL（//evil.com 可绕过跳转外站）', () => {
    expect(sanitizeFileUrl('//evil.com/path')).toBeNull();
  });

  it('拒绝 javascript: 协议（XSS）', () => {
    expect(sanitizeFileUrl('javascript:alert(1)')).toBeNull();
  });

  it('拒绝 data: 协议', () => {
    expect(sanitizeFileUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('拒绝非字符串输入', () => {
    expect(sanitizeFileUrl(null)).toBeNull();
    expect(sanitizeFileUrl(undefined)).toBeNull();
    expect(sanitizeFileUrl(123)).toBeNull();
    expect(sanitizeFileUrl({})).toBeNull();
  });

  it('拒绝空串', () => {
    expect(sanitizeFileUrl('')).toBeNull();
  });

  it('拒绝无协议的多斜杠路径', () => {
    expect(sanitizeFileUrl('///evil.com')).toBeNull();
  });
});

describe('sanitizeFiles', () => {
  it('非数组返回空数组', () => {
    expect(sanitizeFiles(null)).toEqual([]);
    expect(sanitizeFiles('not array')).toEqual([]);
    expect(sanitizeFiles({})).toEqual([]);
  });

  it('过滤非法条目，保留合法的', () => {
    const files = [
      { name: 'ubuntu.iso', url: '/ubuntu/ubuntu.iso' },
      { name: 'evil', url: '//evil.com/x' }, // 协议相对，过滤
      { name: 'xss', url: 'javascript:alert(1)' }, // 过滤
      { name: 'no-url' }, // 缺 url，过滤
      { url: '/no-name' }, // 缺 name，过滤
      { name: 'external', url: 'https://other.com/file' }, // 合法
    ];
    expect(sanitizeFiles(files)).toEqual([
      { name: 'ubuntu.iso', url: '/ubuntu/ubuntu.iso' },
      { name: 'external', url: 'https://other.com/file' },
    ]);
  });

  it('非对象条目被过滤', () => {
    const files = [null, 'string', 123, { name: 'ok', url: '/ok' }];
    expect(sanitizeFiles(files)).toEqual([{ name: 'ok', url: '/ok' }]);
  });
});
