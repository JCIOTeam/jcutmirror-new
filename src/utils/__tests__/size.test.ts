import { describe, expect, it } from 'vitest';

import { parseSize, formatBytes } from '../size';

describe('parseSize', () => {
  it('解析各单位为字节（十进制）', () => {
    expect(parseSize('1K')).toBe(1e3);
    expect(parseSize('1M')).toBe(1e6);
    expect(parseSize('1G')).toBe(1e9);
    expect(parseSize('1T')).toBe(1e12);
  });

  it('支持带 B 后缀', () => {
    expect(parseSize('500MB')).toBe(5e8);
    expect(parseSize('1.2TB')).toBe(1.2e12);
  });

  it('支持小数', () => {
    expect(parseSize('1.5G')).toBe(1.5e9);
    expect(parseSize('0.5M')).toBe(5e5);
  });

  it('忽略前后空格', () => {
    expect(parseSize('  1G  ')).toBe(1e9);
  });

  it('空串或非法格式返回 0', () => {
    expect(parseSize('')).toBe(0);
    expect(parseSize('abc')).toBe(0);
    expect(parseSize('1P')).toBe(0); // P 不在支持范围
  });

  it('大小写不敏感', () => {
    expect(parseSize('1g')).toBe(1e9);
    expect(parseSize('1t')).toBe(1e12);
  });
});

describe('formatBytes', () => {
  it('T 量级', () => {
    expect(formatBytes(1.2e12)).toBe('1.2 T');
  });
  it('G 量级', () => {
    expect(formatBytes(5e9)).toBe('5.0 G');
  });
  it('M 量级', () => {
    expect(formatBytes(1.5e6)).toBe('1.5 M');
  });
  it('小于 1M 显示 B', () => {
    expect(formatBytes(500)).toBe('500 B');
  });
  it('边界值：恰好 1e6 显示 M', () => {
    expect(formatBytes(1e6)).toBe('1.0 M');
  });
});

describe('parseSize / formatBytes 互逆', () => {
  it('parseSize 后 formatBytes 量级一致', () => {
    const bytes = parseSize('3.5T');
    expect(formatBytes(bytes)).toBe('3.5 T');
  });
});
