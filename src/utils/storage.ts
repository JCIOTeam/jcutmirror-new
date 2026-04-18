// src/utils/storage.ts
// 安全的 localStorage 工具函数
// Safari 隐私模式、部分嵌入环境下 localStorage 访问会抛出异常，需统一兜底

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 存储失败时静默降级，不影响运行时状态
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
