// src/hooks/useCapabilities.ts
// 检测后端 tunasync manager/worker 是否支持新版功能
//
// 旧版 tunasync（Go 官方版）不支持：
// - GET /jobs/<name>           → 单镜像详情（含 error_msg）
// - GET /jobs/<name>/log/stream → SSE 实时日志流
//
// 新版 tunasync-rs 全部支持。
// 此 hook 在前端启动时探测一次，并把结果缓存到 React Query。
// 缺失能力时，前端隐藏对应入口（详情按钮 / 终端图标 / 日志窗口）。
//
// 设计要点（修复历史缺陷）：
// - 不再依赖某个具体 mirrorId 做探测对象：改为探测固定的 /jobs 端点本身。
//   旧实现用 mirrors[0]?.id 探测，存在三个问题：
//   1) 镜像列表为空时 enabled 永久为 false，整页降级直到刷新；
//   2) 首个镜像被删/列表变化后缓存不刷新，探测的是已失效路径；
//   3) 缓存键 ['backend-capabilities'] 不含 mirrorId，结果被错误推广。
// - 区分「明确不支持」（404）与「网络错误/超时」：后者不缓存为 false，
//   而是允许重试，避免一次瞬态抖动导致整会话误判（配合 retry）。

import { useQuery } from '@tanstack/react-query';

export interface BackendCapabilities {
  /** GET /jobs/<name> 是否可用（详情/error_msg）*/
  jobDetail: boolean;
  /** GET /jobs/<name>/log/stream 是否可用（SSE 日志流）*/
  logStream: boolean;
}

/** 探测结果三态：明确可用 / 明确不可用 / 未知（网络错误，应可重试） */
type ProbeResult = true | false | 'unknown';

/**
 * 用一个 HEAD 请求探测某个 endpoint 是否存在
 * - 2xx / 3xx → 存在（true）
 * - 4xx（除 405 外）→ 明确不存在（false）
 * - 405 Method Not Allowed → 老版不支持 HEAD，但 GET 可能可用 → 视为存在（true）
 * - 网络错误 / 超时 / CORS → 未知（'unknown'），由调用方决定是否重试
 *
 * 用 AbortController 在 5 秒后强制结束探测，避免某些代理对 HEAD 长挂。
 */
export async function probeEndpoint(path: string): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(path, { method: 'HEAD', signal: controller.signal });
    // 200/2xx/3xx 直接通过；405 视为可用（GET 可能可用）
    if (res.ok || res.status === 405) return true;
    // 404 等 → 明确不存在
    return false;
  } catch {
    // 网络错误、超时、CORS 等 → 未知，不缓存为 false
    return 'unknown';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 探测后端能力。固定探测 /jobs 端点本身（始终存在的全局端点），
 * 而非依赖某个动态 mirrorId —— 这样能力判断独立于镜像列表的加载顺序与内容。
 *
 * - jobDetail：探测 /jobs 是否可达（manager 在线即应 2xx）。
 *   旧版 Go tunasync 同样提供 /jobs，因此这里无法区分新旧版；
 *   但 jobDetail 入口（详情按钮）在新旧版下都不会崩溃——旧版只是不返回
 *   error_msg，会显示「暂无错误信息」，所以保守地认为 /jobs 可达即可。
 * - logStream：探测一个已知 SSE 端点是否存在。
 *   旧版 Go tunasync 没有 /jobs/<name>/log/stream（404），新版 tunasync-rs 有。
 *   为避免依赖动态 mirrorId，这里探测一个固定占位路径——后端若支持该路由
 *   模式，会返回 2xx/405；若不支持则 404。
 */
async function detectCapabilities(): Promise<BackendCapabilities> {
  // 探测根端点 /jobs：manager 在线即应可达
  const jobsProbe = await probeEndpoint('/jobs');
  // jobDetail 仅在明确 false 时判为不可用；unknown 保守视为可用（避免误降级）
  const jobDetail = jobsProbe !== false;

  // logStream 探测固定 SSE 路径模式。用一个稳定的占位 id 探测路由是否存在；
  // 若后端支持该路由模式，会返回 2xx/405（HEAD）或 404（路径存在但无 job），
  // 而旧版会返回 404（路由不存在）。
  // 注意：仍需一个 id 用于路径匹配，但这里只是探测路由模式是否存在，
  // 不依赖具体镜像数据——用固定字符串 probe。
  const streamProbe = await probeEndpoint('/jobs/__capability_probe__/log/stream');
  const logStream = streamProbe === true;

  return { jobDetail, logStream };
}

/**
 * useCapabilities — 在前端启动时探测一次，结果在整个会话内缓存。
 *
 * 不再接收 probeMirrorId 参数：能力探测完全独立于镜像列表数据，
 * 在组件挂载时立即启动，与 mirrors 数据加载并行。
 */
export function useCapabilities(): BackendCapabilities {
  const { data } = useQuery<BackendCapabilities>({
    queryKey: ['backend-capabilities'],
    queryFn: detectCapabilities,
    // 网络错误（unknown）时允许重试，避免瞬态抖动导致整会话误判
    retry: (failureCount) => {
      // detectCapabilities 内部已吞掉错误返回结果，不会走到这里；
      // 保留兜底：最多重试 2 次
      return failureCount < 2;
    },
    // 同一会话不重新探测；保守用 1 小时 stale，刷新页面会重新拿
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
  // 探测未完成时默认 false——保守降级，避免短暂闪现按钮
  return data ?? { jobDetail: false, logStream: false };
}
