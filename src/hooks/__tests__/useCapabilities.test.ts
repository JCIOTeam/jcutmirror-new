import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { probeEndpoint } from '../useCapabilities';

// probeEndpoint 是 useCapabilities 的核心：决定能力探测的三态结果。
// 重点覆盖各 HTTP 状态分支，防止 logStream 探测 regression 复发
// （曾因用占位 id 探测导致 logStream 永远误判为 false）。

describe('probeEndpoint', () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.useRealTimers();
  });

  const mockFetch = (status: number, ok?: boolean) => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: ok ?? (status >= 200 && status < 300),
      status,
    }) as unknown as typeof globalThis.fetch;
  };

  it('2xx 返回 true', async () => {
    mockFetch(200);
    expect(await probeEndpoint('/jobs/ubuntu')).toBe(true);
  });

  it('3xx 重定向：当前实现 res.ok 仅对 2xx 为 true，3xx 落到 return false', async () => {
    // 注：probeEndpoint 用 res.ok || status===405 判断，res.ok 不含 3xx。
    // 这意味着 3xx 重定向会被判为「不存在」。这是当前实现行为（与原版一致），
    // 若未来需把 3xx 视为存在，应改为 res.status < 400。
    mockFetch(302, false);
    expect(await probeEndpoint('/jobs/ubuntu')).toBe(false);
  });

  it('405 Method Not Allowed 视为可用（老版不支持 HEAD 但 GET 可能可用）', async () => {
    mockFetch(405, false);
    expect(await probeEndpoint('/jobs/ubuntu/log/stream')).toBe(true);
  });

  it('404 返回 false（明确不存在）', async () => {
    mockFetch(404, false);
    expect(await probeEndpoint('/jobs/ubuntu/log/stream')).toBe(false);
  });

  it('403 返回 false', async () => {
    mockFetch(403, false);
    expect(await probeEndpoint('/jobs/forbidden')).toBe(false);
  });

  it('网络错误（fetch reject）返回 unknown，不降级为 false', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof globalThis.fetch;
    expect(await probeEndpoint('/jobs/ubuntu')).toBe('unknown');
  });

  it('AbortError 超时返回 unknown', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    globalThis.fetch = vi
      .fn()
      .mockImplementation((_url, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          // 模拟 5s 超时触发 abort
          if (init?.signal) {
            init.signal.addEventListener('abort', () => reject(abortError));
          }
        });
      }) as unknown as typeof globalThis.fetch;

    const promise = probeEndpoint('/jobs/ubuntu');
    // 推进 fake timer 触发 AbortController.abort()
    await vi.advanceTimersByTimeAsync(5000);
    expect(await promise).toBe('unknown');
  });

  it('对路径调用 fetch 且用 HEAD 方法', async () => {
    mockFetch(200);
    const fetchSpy = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    await probeEndpoint('/jobs/ubuntu/log/stream');
    expect(fetchSpy).toHaveBeenCalledWith('/jobs/ubuntu/log/stream', {
      method: 'HEAD',
      signal: expect.any(AbortSignal),
    });
  });
});
