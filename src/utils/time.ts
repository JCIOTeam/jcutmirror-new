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

  // 判断是否是合法的 Unix 秒时间戳（10位数字，1970年之后的合理范围）
  if (!isNaN(num) && num > 0) {
    // 10位数 = 秒级时间戳（< 1e12）；13位数 = 毫秒时间戳
    const ms = num < 1e12 ? num * 1000 : num;
    const date = new Date(ms);
    if (isValid(date)) return date;
  }

  // 尝试作为 ISO 字符串解析
  if (typeof value === 'string') {
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
