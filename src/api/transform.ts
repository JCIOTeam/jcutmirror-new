// src/api/transform.ts
// 将后端原始 /jobs 数据转换为前端 Mirror 类型

import type { Mirror, MirrorFile, MirrorStatus } from '@/types';

/**
 * 后端 /jobs 返回的原始条目结构
 */
export interface RawJob {
  name: string;
  upstream: string;
  size?: string;
  status: string;
  error_msg?: string;
  last_update_ts?: number | string;
  next_schedule_ts?: number | string;
  last_ended_ts?: number | string;
}

/**
 * public/local_data.json 中每个镜像的补充信息
 * 所有字段均可选，存在时**逐字段**覆盖（而非整段覆盖）
 *
 * `status` 可选：用于前端强制覆盖后端状态，适合 EOL / 已暂停但仍保留快照的镜像
 * （例如 centos-vault，tunasync 不再同步但文件仍可下载，手动标记为 cached）
 */
export interface LocalMeta {
  name?: Partial<{ zh: string; en: string }>;
  desc?: Partial<{ zh: string; en: string }>;
  type?: string;
  files?: { name: string; url: string }[];
  helpUrl?: string;
  status?: MirrorStatus;
}

/** 状态映射：将后端状态值转换为前端枚举 */
const STATUS_MAP: Record<string, MirrorStatus> = {
  success: 'succeeded',
  succeeded: 'succeeded',
  'pre-syncing': 'cached',
  cached: 'cached',
  failed: 'failed',
  syncing: 'syncing',
  paused: 'paused',
};

const SAFE_URL_RE = /^(https?:\/\/|\/)/i;
function sanitizeFileUrl(url: unknown): string | null {
  if (typeof url !== 'string' || !SAFE_URL_RE.test(url)) return null;
  return url;
}

function sanitizeFiles(files: unknown): MirrorFile[] {
  if (!Array.isArray(files)) return [];
  return files
    .map((f): MirrorFile | null => {
      if (!f || typeof f !== 'object') return null;
      const name = (f as { name?: unknown }).name;
      const url = sanitizeFileUrl((f as { url?: unknown }).url);
      if (typeof name !== 'string' || !url) return null;
      return { name, url };
    })
    .filter((f): f is MirrorFile => f !== null);
}

/**
 * 将单条 RawJob + LocalMeta 转换为前端 Mirror 对象
 * 显式合并避免 Object.assign 把 base.name 整体覆盖（导致 zh/en 缺失）
 */
function convertItem(raw: RawJob, local: LocalMeta = {}): Mirror {
  const id = raw.name;
  const defaultLabel = id.charAt(0).toUpperCase() + id.slice(1);

  return {
    id,
    url: `/${id}/`,
    name: {
      zh: local.name?.zh ?? defaultLabel,
      en: local.name?.en ?? defaultLabel,
    },
    desc: {
      zh: local.desc?.zh ?? `${defaultLabel} 镜像`,
      en: local.desc?.en ?? `Mirror of ${defaultLabel}`,
    },
    helpUrl: local.helpUrl ?? `/docs/${id}`,
    upstream: raw.upstream ?? '',
    size: raw.size ?? '1G',
    status: local.status ?? STATUS_MAP[raw.status] ?? 'unknown',
    lastUpdated: String(raw.last_ended_ts ?? ''),
    nextScheduled: String(raw.next_schedule_ts ?? ''),
    lastSuccess: String(raw.last_update_ts ?? ''),
    type: local.type ?? 'none',
    files: sanitizeFiles(local.files),
  };
}

/**
 * 批量转换：将 RawJob[] + LocalData 合并为 Mirror[]
 * 跳过非法条目（字段缺失等）而不是抛错，避免单个坏数据让整页崩溃
 */
export function transformJobs(jobs: RawJob[], localData: Record<string, LocalMeta> = {}): Mirror[] {
  const out: Mirror[] = [];
  for (const job of jobs) {
    if (!job || typeof job.name !== 'string' || !job.name) {
      console.warn('[transform] skipping job with missing name:', job);
      continue;
    }
    out.push(convertItem(job, localData[job.name]));
  }
  return out;
}
