// src/utils/size.ts
// 存储大小解析与格式化 —— 从 StatusPage 抽出，便于单测与复用

/**
 * 解析存储大小字符串（"1.2T" / "500G" / "1024M" / "8K" 等）为字节数。
 * 用于排序和加总。无法解析时返回 0。
 *
 * 单位映射：B=1, K=1e3, M=1e6, G=1e9, T=1e12（十进制，与磁盘厂商一致）。
 */
export function parseSize(s: string): number {
  if (!s) return 0;
  const m = s.trim().match(/^([\d.]+)\s*([KMGT]?B?|[KMGT])$/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const u = m[2].toUpperCase().replace('B', '');
  const map: Record<string, number> = { '': 1, K: 1e3, M: 1e6, G: 1e9, T: 1e12 };
  return n * (map[u] ?? 1);
}

/**
 * 将字节数格式化为人类可读字符串（如 "1.2 T" / "500.0 G"）。
 * 与 parseSize 互为逆运算（精度损失除外）。
 */
export function formatBytes(bytes: number): string {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} T`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} G`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} M`;
  return `${bytes} B`;
}
