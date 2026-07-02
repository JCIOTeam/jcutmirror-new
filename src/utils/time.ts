// src/utils/time.ts
// 时间工具函数 - 处理后端返回的 Unix 秒级时间戳

import { formatDistanceToNow, format, isValid } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';

import type { Locale } from '../types';

/**
 * 将后端时间戳转换为 Date 对象
 * 后端返回 Unix 秒（如 1772817633），JS Date 需要毫秒
 * 同时兼容 ISO 字符串格式（如 "2024-01-01T00:00:00Z"）
 */
export const parseTimestamp = (value: string | number | null | undefined): Date | null => {
  if (!value) return null;

  const num = typeof value === 'string' ? Number(value) : value;
  // 能被 Number() 解析为有限数字的字符串（含 '0'、'-1'、'1.5' 等）一律按数字处理，
  // 不走 ISO 字符串 fallback——否则 new Date('0') 会被 V8 当作 ISO 8601 偏移
  // 解析成 1999 年、new Date('-1') 解析成 2000 年，导致非法时间戳误判为合法。
  const isNumericString =
    typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value));

  // 数字或数字字符串：按 Unix 时间戳处理（>0 才视为合法，0/负数排除）
  if (!isNaN(num) && num > 0) {
    // 10位数 = 秒级时间戳（< 1e12）；13位数 = 毫秒时间戳
    const ms = num < 1e12 ? num * 1000 : num;
    const date = new Date(ms);
    if (isValid(date)) return date;
  }

  // 仅非数字字符串才尝试 ISO 解析（如 '2024-01-01T00:00:00Z'）
  if (typeof value === 'string' && !isNumericString) {
    const date = new Date(value);
    if (isValid(date)) return date;
  }

  return null;
};

/**
 * 格式化为相对时间（如"3小时前"）
 */
export const formatRelativeTime = (
  value: string | number | null | undefined,
  locale: Locale
): string => {
  const date = parseTimestamp(value);
  if (!date) return '-';
  try {
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: locale === 'zh' ? zhCN : enUS,
    });
  } catch {
    return '-';
  }
};

/**
 * 格式化为绝对时间（如"2024-01-01 12:00:00"）
 */
export const formatAbsoluteTime = (
  value: string | number | null | undefined,
  locale: Locale,
  fmt = 'yyyy-MM-dd HH:mm:ss'
): string => {
  const date = parseTimestamp(value);
  if (!date) return '-';
  try {
    return format(date, fmt, { locale: locale === 'zh' ? zhCN : enUS });
  } catch {
    return '-';
  }
};
