// src/hooks/useCapabilities.ts
// 检测后端 tunasync manager/worker 是否支持新版功能
//
// 旧版 tunasync（Go 官方版）不支持：
// - GET /jobs/<name>           → 单镜像详情（含 error_msg）
// - GET /jobs/<name>/log/stream → SSE 实时日志流
//
// 新版 tunasync-rs 全部支持。
// 此 hook 用一个真实存在的 mirrorId 探测，结果缓存到 React Query。
// 缺失能力时，前端隐藏对应入口（详情按钮 / 终端图标 / 日志窗口）。
//
// 设计要点（修复历史缺陷）：
// - queryKey 包含 probeMirrorId：旧版 queryKey=['backend-capabilities'] 不含
//   mirrorId，首个镜像被删/列表变化后缓存不刷新，探测的是已失效路径。
//   现在缓存随探测对象变化而刷新。
// - probeMirrorId 变化时（如首个镜像被删，mirrors[0] 变成新 id）会重新探测，
//   不再有"缓存与探测对象脱节"的问题。
// - 区分「明确不支持」（404）与「网络错误/超时」：后者不缓存为 false，
//   允许重试，避免一次瞬态抖动导致整会话误判。
// - mirrors 为空时 enabled 为 false，不探测；mirrors 加载后自动启动。
//
// 注意：logStream 探测必须用真实存在的 mirrorId——SSE 端点 /jobs/<name>/log/stream
// 是否可达取决于 <name> 这个 job 是否存在，不能用占位 id（占位 id 在新版后端
// 也会因 job 不存在而 404，导致 logStream 永远误判为 false）。

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
 * - 2xx → 存在（true）（res.ok 仅对 2xx 为 true）
 * - 405 Method Not Allowed → 老版不支持 HEAD，但 GET 可能可用 → 视为存在（true）
 * - 其余 4xx（404/403 等）→ 明确不存在（false）
 * - 网络错误 / 超时 / CORS → 未知（'unknown'），由调用方决定是否重试
 *
 * 注：3xx 重定向会落到 false（res.ok 不含 3xx）。tunasync 的 /jobs 端点
 * 正常返回 2xx，不存在 3xx 场景，故当前无需特殊处理。
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
 * 探测后端能力。需要一个真实存在的 mirrorId 作为探测对象——
 * SSE 端点 /jobs/<name>/log/stream 是否可达取决于该 job 是否存在。
 *
 * - jobDetail：探测 /jobs/<name> 是否返回 2xx。
 *   旧版 Go tunasync 对存在的 job 也会返回数据，因此 jobDetail 在新旧版都为 true；
 *   详情按钮在新旧版下都不会崩溃，旧版只是不返回 error_msg（显示「暂无错误信息」）。
 * - logStream：探测 /jobs/<name>/log/stream。
 *   旧版 Go tunasync 没有该路由（404），新版 tunasync-rs 有（2xx/405）。
 *   用真实 job 探测，job 存在时路由可达性才有意义。
 */
async function detectCapabilities(probeMirrorId: string): Promise<BackendCapabilities> {
  const encoded = encodeURIComponent(probeMirrorId);
  const [jobDetailProbe, logStreamProbe] = await Promise.all([
    probeEndpoint(`/jobs/${encoded}`),
    probeEndpoint(`/jobs/${encoded}/log/stream`),
  ]);
  // jobDetail：明确 false 才判不可用；unknown（网络错误）保守视为可用，避免误降级
  const jobDetail = jobDetailProbe !== false;
  // logStream：仅明确 true 才判可用；unknown 保守视为不可用（避免对不支持的后端
  // 误显示终端图标，点击后连接失败体验更差）
  const logStream = logStreamProbe === true;
  return { jobDetail, logStream };
}

/**
 * useCapabilities — 用一个真实存在的 mirrorId 探测后端能力，结果缓存到 React Query。
 *
 * @param probeMirrorId 用作探测的镜像 ID。通常传第一个 mirror.id；
 *                       mirrors 列表为空时传 undefined，跳过探测（返回全 false），
 *                       mirrors 加载后自动启动。
 *
 * 缓存键含 probeMirrorId：探测对象变化（如首个镜像被删）时缓存自动刷新，
 * 不再有"缓存与探测对象脱节"的旧缺陷。
 */
export function useCapabilities(probeMirrorId: string | undefined): BackendCapabilities {
  const { data } = useQuery<BackendCapabilities>({
    queryKey: ['backend-capabilities', probeMirrorId ?? ''],
    enabled: !!probeMirrorId,
    queryFn: () => detectCapabilities(probeMirrorId as string),
    // 网络错误（unknown）时允许重试，避免瞬态抖动导致整会话误判
    retry: (failureCount) => failureCount < 2,
    // 同一会话不重新探测；保守用 1 小时 stale，刷新页面会重新拿
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
  // 探测未完成时默认 false——保守降级，避免短暂闪现按钮
  return data ?? { jobDetail: false, logStream: false };
}
