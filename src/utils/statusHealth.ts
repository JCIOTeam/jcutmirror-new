// src/utils/statusHealth.ts
// 系统健康度计算 —— 从 StatusPage 抽出的纯逻辑，便于单测

export type HealthLevel = 'operational' | 'degraded' | 'outage';

/**
 * 仅 failed 视为不可用；syncing/cached/succeeded/paused 都对外可访问
 * - cached: 历史快照可正常下载
 * - syncing: 服务在跑，旧文件依然可访问
 * - paused: 维护中但内容仍在
 */
export function calcHealth(total: number, unavailable: number): HealthLevel {
  if (total === 0) return 'operational';
  const ratio = unavailable / total;
  if (ratio === 0) return 'operational';
  if (ratio < 0.2) return 'degraded';
  return 'outage';
}
