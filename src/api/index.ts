// src/api/index.ts
// API 请求封装 — 直接对接后端
//
// 数据流：
//   GET /jobs               → RawJob[]（nginx 已将 /jobs 反向代理至后端）
//   GET /local_data.json    → LocalMeta（本地补充元数据，随前端构建发布）
//   transformJobs()         → Mirror[]（前端完成格式转换）
//
// GET /api/is_campus_network 由 nginx 直接判断客户端 IP 并返回

import axios from 'axios';

import type { Mirror, CampusNetworkStatus } from '../types';

import { transformJobs } from './transform';
import type { RawJob, LocalMeta } from './transform';

// ── 统一的 axios 实例 ─────────────────────────────────────────────────────────
// 使用一个实例管理所有请求，通过 baseURL 参数区分不同接口
const apiClient = axios.create({
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 错误拦截器
const errorInterceptor = (err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('[API Error]', msg);
  return Promise.reject(err);
};

apiClient.interceptors.response.use((res) => res, errorInterceptor);

// ── 本地元数据缓存（只需加载一次）────────────────────────────────────────────
let _localDataCache: Record<string, LocalMeta> | null = null;

async function getLocalData(): Promise<Record<string, LocalMeta>> {
  if (_localDataCache) return _localDataCache;
  try {
    const res = await fetch('/local_data.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _localDataCache = await res.json();
  } catch (e) {
    console.warn('[API] Failed to load local_data.json, using empty metadata', e);
    _localDataCache = {};
  }
  return _localDataCache as Record<string, LocalMeta>;
}

// ── 公开 API ──────────────────────────────────────────────────────────────────

/**
 * 获取所有镜像列表
 * GET /jobs（nginx 已代理，无需额外前缀）
 */
export const fetchMirrors = async (): Promise<Mirror[]> => {
  const [{ data: jobs }, localData] = await Promise.all([
    // 使用 baseURL='' 覆盖默认配置，直接访问 /jobs
    apiClient.get<RawJob[]>('/jobs', { baseURL: '' }),
    getLocalData(),
  ]);
  return transformJobs(jobs, localData);
};

/**
 * 获取单个镜像详情（从全量列表查找，不额外发请求）
 */
export const fetchMirrorByName = async (name: string): Promise<Mirror> => {
  const mirrors = await fetchMirrors();
  const mirror = mirrors.find((m) => m.id.toLowerCase() === name.toLowerCase());
  if (!mirror) throw new Error(`Mirror not found: ${name}`);
  return mirror;
};

/**
 * 判断客户端网络类型
 * GET /api/is_campus_network → "1"(校内) | "0"(校外) | "6"(IPv6)
 */
export const fetchCampusNetworkStatus = async (): Promise<CampusNetworkStatus> => {
  const { data } = await apiClient.get<CampusNetworkStatus>('/is_campus_network', {
    baseURL: '/api',
  });
  const val = String(data).trim() as CampusNetworkStatus;
  return (['1', '0', '6'] as const).includes(val) ? val : '0';
};
