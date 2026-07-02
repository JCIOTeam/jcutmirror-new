import { describe, expect, it } from 'vitest';

import { parseTimestamp, formatRelativeTime, formatAbsoluteTime } from '../time';

describe('parseTimestamp', () => {
  it('秒级时间戳（10 位）转为毫秒', () => {
    const d = parseTimestamp('1700000000');
    expect(d?.getTime()).toBe(1700000000 * 1000);
  });

  it('毫秒级时间戳（13 位）直接用', () => {
    const d = parseTimestamp('1700000000000');
    expect(d?.getTime()).toBe(1700000000000);
  });

  it('数字类型同样处理', () => {
    expect(parseTimestamp(1700000000)?.getTime()).toBe(1700000000 * 1000);
    expect(parseTimestamp(1700000000000)?.getTime()).toBe(1700000000000);
  });

  it('ISO 字符串可解析', () => {
    const d = parseTimestamp('2024-01-01T00:00:00Z');
    expect(d).toBeInstanceOf(Date);
    expect(d?.getTime()).toBe(Date.parse('2024-01-01T00:00:00Z'));
  });

  it('空值返回 null', () => {
    expect(parseTimestamp('')).toBeNull();
    expect(parseTimestamp(null)).toBeNull();
    expect(parseTimestamp(undefined)).toBeNull();
  });

  it('0 和负数返回 null（不当作合法时间戳）', () => {
    expect(parseTimestamp('0')).toBeNull();
    expect(parseTimestamp('-1')).toBeNull();
  });

  it('非数字非 ISO 字符串返回 null', () => {
    expect(parseTimestamp('not a date')).toBeNull();
  });
});

describe('formatRelativeTime', () => {
  it('非法时间返回 -', () => {
    expect(formatRelativeTime('', 'zh')).toBe('-');
    expect(formatRelativeTime(null, 'en')).toBe('-');
  });
  it('合法时间返回非空字符串', () => {
    // 用一个过去的时间戳，确保 formatDistanceToNow 能算出相对时间
    const past = Math.floor((Date.now() - 3600 * 1000) / 1000).toString();
    const zh = formatRelativeTime(past, 'zh');
    const en = formatRelativeTime(past, 'en');
    expect(zh.length).toBeGreaterThan(0);
    expect(en.length).toBeGreaterThan(0);
    expect(zh).not.toBe('-');
    expect(en).not.toBe('-');
  });
});

describe('formatAbsoluteTime', () => {
  it('非法时间返回 -', () => {
    expect(formatAbsoluteTime('', 'zh')).toBe('-');
  });
  it('合法时间按 yyyy-MM-dd HH:mm:ss 格式化', () => {
    const d = parseTimestamp('1700000000');
    const formatted = formatAbsoluteTime(d ? d.getTime().toString() : '', 'zh');
    // 格式应为 YYYY-MM-DD HH:MM:SS
    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});
