// src/api/transform.ts
// 将后端原始 /api/jobs 数据转换为前端 Mirror 类型

import type { Mirror, MirrorStatus } from '@/types';

/**
 * 后端 /api/jobs 返回的原始条目结构
 */
export interface RawJob {
  name: string;
  upstream: string;
  size?: string;
  status: string;
  last_update_ts?: number | string;
  next_schedule_ts?: number | string;
  last_ended_ts?: number | string;
}

/**
 * public/local_data.json 中每个镜像的补充信息
 * 所有字段均可选，存在时会覆盖/扩充 RawJob 生成的默认值
 */
export interface LocalMeta {
  name?: { zh: string; en: string };
  desc?: { zh: string; en: string };
  type?: string;
  files?: { name: string; url: string }[];
  [key: string]: unknown;
}

/** 状态映射：将后端状态值转换为前端枚举 */
const STATUS_MAP: Record<string, MirrorStatus> = {
  success: 'succeeded',
  'pre-syncing': 'cached',
  succeeded: 'succeeded',
  failed: 'failed',
  syncing: 'syncing',
  cached: 'cached',
};

/**
 * 将单条 RawJob + LocalMeta 转换为前端 Mirror 对象
 */
function convertItem(raw: RawJob, local: LocalMeta = {}): Mirror {
  const defaultName = raw.name.charAt(0).toUpperCase() + raw.name.slice(1);

  const base: Mirror = {
    id: raw.name,
    url: `/${raw.name}/`,
    name: { zh: defaultName, en: defaultName },
    desc: {
      zh: `${defaultName} 镜像`,
      en: `Mirror of ${defaultName}`,
    },
    helpUrl: `/docs/${raw.name}`,
    upstream: raw.upstream ?? '',
    size: raw.size ?? '1G',
    status: STATUS_MAP[raw.status] ?? (raw.status as MirrorStatus),
    lastUpdated: String(raw.last_ended_ts ?? ''),
    nextScheduled: String(raw.next_schedule_ts ?? ''),
    lastSuccess: String(raw.last_update_ts ?? ''),
    type: 'none',
    files: [],
  };

  // local_data.json 中的字段深度合并（优先级高于默认值）
  return Object.assign(base, local) as Mirror;
}

/**
 * 批量转换：将 RawJob[] + LocalData 合并为 Mirror[]
 */
export function transformJobs(jobs: RawJob[], localData: Record<string, LocalMeta> = {}): Mirror[] {
  return jobs.map((job) => convertItem(job, localData[job.name]));
}
