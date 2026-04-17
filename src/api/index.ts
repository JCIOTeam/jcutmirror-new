// src/api/index.ts
// API 请求封装 — 直接对接后端
//
// 数据流：
//   GET /jobs                       → RawJob[]（nginx 已反代到 tunasync manager）
//   GET /local_data.json            → LocalMeta（本地补充元数据，随前端构建发布）
//   transformJobs()                 → Mirror[]（前端完成格式转换）
//
// GET /api/is_campus_network 由 nginx 直接判断客户端 IP 并返回

import axios, { type AxiosInstance } from 'axios';

import type { Mirror, CampusNetworkStatus } from '../types';

import { transformJobs } from './transform';
import type { RawJob, LocalMeta } from './transform';

// ── 工厂：每个域一个独立 axios 实例，避免每次 get 都传 baseURL ─────────────
function createClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 15_000,
    headers: { 'Content-Type': 'application/json' },
  });
  client.interceptors.response.use(
    (res) => res,
    (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      // 仅记录基础信息，避免把响应体打到 console（可能含敏感信息）
      console.error(`[API ${baseURL}]`, msg);
      return Promise.reject(err);
    }
  );
  return client;
}

// 后端镜像状态接口（nginx 已将 /jobs 反代）
const backend = createClient('/');

// 校园网检测（nginx 直接返回）
const internal = createClient('/api');

// ── 本地元数据缓存（只需加载一次）────────────────────────────────────────────
// 缓存 Promise 本身而非结果，避免并发请求时重复发起网络请求（竞态）
let _localDataPromise: Promise<Record<string, LocalMeta>> | null = null;

/**
 * 失败时回到空对象作为兜底，但**保留** Promise 拒绝信息给上层 logger
 * （上次实现把 catch 吞掉了 —— 现在保留警告并允许一次性重试）
 */
function getLocalData(): Promise<Record<string, LocalMeta>> {
  if (_localDataPromise) return _localDataPromise;

  _localDataPromise = fetch('/local_data.json', { cache: 'no-cache' })
    .then(async (res) => {
      if (!res.ok) throw new Error(`local_data.json HTTP ${res.status}`);
      const json = (await res.json()) as unknown;
      // 防御：必须是非数组的对象
      if (!json || typeof json !== 'object' || Array.isArray(json)) {
        throw new Error('local_data.json: invalid root, expected object');
      }
      return json as Record<string, LocalMeta>;
    })
    .catch((e) => {
      // 失败时清空缓存，下一次调用会重试（避免一次失败导致整次会话都没补充信息）
      _localDataPromise = null;
      console.warn(
        '[API] local_data.json 加载失败，镜像名称/描述将退回到默认值。重试将在下次请求触发。',
        e
      );
      return {};
    });
  return _localDataPromise;
}

// ── 公开 API ──────────────────────────────────────────────────────────────────

/**
 * 获取所有镜像列表
 */
export const fetchMirrors = async (): Promise<Mirror[]> => {
  const [{ data: jobs }, localData] = await Promise.all([
    backend.get<RawJob[]>('/jobs'),
    getLocalData(),
  ]);
  if (!Array.isArray(jobs)) {
    throw new Error('Backend /jobs response is not an array');
  }
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
  const { data } = await internal.get<CampusNetworkStatus>('/is_campus_network');
  const val = String(data).trim() as CampusNetworkStatus;
  return (['1', '0', '6'] as const).includes(val) ? val : '0';
};
